import type {RedisHashCacheClient} from '../../src/stores/RedisHashCache.js';
import type {Storage, FindOptions, Nullable} from '../../src/types.js';
import RedisStore from './redisStore.js';
import type {Model, UpdateQuery} from 'mongoose';
import {Schema, Types, model} from 'mongoose';
import connectMongo from './mongoConnector.js';
import {config} from 'dotenv';
config();

interface User {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

const userSchema = new Schema<User>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
}, {
  versionKey: false,
});

const UserModel = model<User>('User', userSchema);

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

export class MongoStorage<Entity extends {_id: Types.ObjectId}>
  implements Storage<Entity>
{
  constructor(private readonly model: Model<Entity>) {}

  count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  findById(id: string): Promise<Nullable<Entity>> {
    return this.model.findById(this.toObjectId(id)).lean<Entity>().exec();
  }

  find(query: Partial<Entity>, options?: FindOptions): Promise<Entity[]> {
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

(async () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL missing');
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing');
  }

  const redis = new Redis(process.env.REDIS_URL);
  console.log(await redis.ping() === 'PONG', 'redis check');

  const mongoConnection = await connectMongo(process.env.MONGODB_URI);

  const userStore = new MongoStorage(UserModel);
  const userId = new Types.ObjectId();
  const insertedUser = await userStore.insert({
    _id: userId,
    name: 'Alex',
    email: 'alex@example.com',
  });
  const foundUser = await userStore.findById(String(userId));

  console.log(insertedUser?._id.equals(userId) === true, 'insert user check');
  console.log(foundUser?.email === 'alex@example.com', 'findById user check');

  await mongoConnection.close();
  redis.close();
})();


export default Redis;

//  docker build -t omnirepo-example .
// docker run --rm -p 27017:27017 -p 6379:6379 omnirepo-example
