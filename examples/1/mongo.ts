import mongoose, {model, Schema} from 'mongoose';
import type {InferRawDocType} from 'mongoose';
import {Flatten} from '../../src/types'


export default function connect(url: string): Promise<mongoose.Connection> {
  return new Promise((resolve, reject) => {
    mongoose.connect(url).catch(reject);

    mongoose.connection.once('connected', () => {
      console.log('Mongoose connected to DB');
      resolve(mongoose.connection);
    });

    mongoose.connection.once('error', error => {
      console.error('Mongoose connection error', error);
      reject(error);
    });
  });
}

const schemaDefinition = {
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
} as const;

// Flatten is adapter generic to get rid of mongoose interfaces mismatch
type User =  Flatten<InferRawDocType<typeof schemaDefinition>>;

const userSchema = new Schema<User>(schemaDefinition);
const UserModel = model<User>('User', userSchema);


export {UserModel};
export type {User};
