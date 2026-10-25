import {Repository} from '../../src/repository/Repository.js';
import {RepositoryBuilder} from '../../src/repository/builder.js';
import {RedisHashCache} from '../../src/stores/RedisHashCache.js';
import type {RedisHashCacheClient} from '../../src/stores/RedisHashCache.js';
import type {Storage, PaginationOptions, Nullable, Cache} from '../../src/types.js';
import RedisStore from './redis.js';
import type {Model, UpdateQuery} from 'mongoose';
import { Types} from 'mongoose';
import connectMongo, {UserModel} from './mongo.js';
import type {User} from './mongo.js';
import {config} from 'dotenv';
import assert from 'node:assert/strict'
//import { chain } from '../../src/helpers.js';
config();



class Redis implements RedisHashCacheClient {
  private readonly redis: RedisStore;

  constructor(url: string) {
    this.redis = new RedisStore(url);
  }

  ping(): Promise<string> {
    return this.redis.init();
  }

  close(): void {
    this.redis.close();
  }

  hgetField(key: string, field: string): Promise<string | null> {
    return this.redis.hgetField(key, field);
  }

  hgetAll(key: string): Promise<Record<string, string>> {
    return this.redis.hgetAll(key);
  }

  hsetFields(key: string, data: Record<string, string>): Promise<void> {
    return this.redis.hsetFields(key, data);
  }

  hdeleteFields(key: string, ...fields: string[]): Promise<void> {
    return this.redis.hdeleteFields(key, ...fields);
  }

  hlen(key: string): Promise<number> {
    return this.redis.hlen(key);
  }

  replaceHash(key: string, data: Record<string, string>): Promise<void> {
    return this.redis.replaceHash(key, data);
  }

  deleteKey(key: string): Promise<number> {
    return this.redis.deleteKey(key);
  }
}

 class MongoStorage<Entity extends {_id: Types.ObjectId}>
  implements Storage<Entity>
{
  constructor(private readonly model: Model<Entity>) {}

  count(query: Partial<Entity> = {}): Promise<number> {
    return this.model.countDocuments(query).exec();
  }

  findById(id: string): Promise<Nullable<Entity>> {
    return this.model.findById(this.toObjectId(id)).lean<Entity>().exec();
  }

  find(query: Partial<Entity>, options?: PaginationOptions): Promise<Entity[]> {
    const request = this.model.find(query);

    if (options?.skip !== undefined) {
      request.skip(options.skip);
    }

    if (options?.limit !== undefined) {
      request.limit(options.limit);
    }

    return request.lean<Entity[]>().exec();
  }

  updateById(
    id: string,
    entity: Partial<Entity>,
  ): Promise<Nullable<Entity>> {
    return this.model.findByIdAndUpdate(
      this.toObjectId(id),
      {$set: entity} as UpdateQuery<Entity>,
      {new: true},
    ).lean<Entity>().exec();
  }

  async insert(entity: Entity): Promise<Nullable<Entity>> {
    const created = await this.model.create(entity);
    return created.toObject<Entity>();
  }

  deleteById(id: string): Promise<Nullable<Entity>> {
    return this.model.findByIdAndDelete(
      this.toObjectId(id),
    ).lean<Entity>().exec();
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }
}

class UserRepository extends Repository<User> {
  // protected enrichEntities(entity: User): Promise<User>;
  // protected enrichEntities(entities: User[]): Promise<User[]>;
  // protected enrichEntities(entityOrEntities: Entity | Entity[]): Promise<Entity | Entity[]> {
    
  // }
}

(async () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL missing');
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing');
  }

  const redisClient = new Redis(process.env.REDIS_URL);
  assert(await redisClient.ping() === 'PONG', 'redis check');

  const mongoConnection = await connectMongo(process.env.MONGODB_URI);

  const userStore = new MongoStorage<User>(UserModel);
  const userId = new Types.ObjectId();
  const user = {
    _id: userId,
    name: 'Alex',
    email: 'alex@example.com',
  }
  const insertedUser = await userStore.insert(user);
  const foundUser = await userStore.findById(String(userId));

  assert(insertedUser?._id.equals(userId) === true, 'insert user check');
  assert(foundUser?.email === insertedUser.email, 'findById user check');

  const cache = new RedisHashCache<User>({client: redisClient, storageKey: 'users'});
  const userRepository = new RepositoryBuilder<User, UserRepository>(UserRepository)
    .setStorage(userStore)
    .setCache(cache)
    .build();
    
  {
    const userId = String(insertedUser._id);
    const repositoryUser = await userRepository.findById(userId);
    assert(repositoryUser?.email === insertedUser.email, 'repository findById user check');
    const deleted = await userRepository.deleteById(userId);
    assert(deleted);
    {
      const repositoryUser = await userRepository.findById(userId);
      assert(repositoryUser === null);
      const created = await userRepository.insert(user);
      assert(created);
      {
        const repositoryUser = await userRepository.findById(userId);
        assert(repositoryUser);
        const repositoryUsers = await userRepository.all({"email": user.email});
        assert(repositoryUsers);
        assert([...repositoryUsers.values()].every(i => i.email === user.email));
      }

      await userRepository.insert(user).catch(e => {
        if (e instanceof Error) {
          assert(e.message.includes('duplicate'))
        }
      })
    }

 }




  console.log('finished check');
  await mongoConnection.close();
  redisClient.close();
})();


export default {};

//  docker build -t omnirepo-example .
// docker run --rm -p 27017:27017 -p 6379:6379 omnirepo-example
