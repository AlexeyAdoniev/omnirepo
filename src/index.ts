import type {ObjectId} from 'mongoose';
import  {Types} from 'mongoose';
import {InMemoryCache} from './stores/InMemoryCache.js';
import {InMemoryStorage} from './stores/InMemoryStorage.js';
import {RepositoryBuilder} from './repository/Repository.js';



export type {
  Cache,
  DegradationPolicy,
  Nullable,
  Storage,
  WithId,
} from './types.js';


interface User {
  _id: ObjectId;
  name?: string;
}

const user: User = {"_id": new Types.ObjectId() as unknown as ObjectId, name: "alex"};
const cache = new InMemoryCache<User>();
const store = new InMemoryStorage<User>([user]);
const userRepo = new RepositoryBuilder<User>()
  .setStorage(store)
  .setCache(cache)
  .setDegradationPolicy('fallback')
  .setFallbackCache(new InMemoryCache<User>())
  .build();
console.log(await userRepo.findById(String(user._id)));