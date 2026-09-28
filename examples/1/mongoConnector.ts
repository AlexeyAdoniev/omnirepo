import mongoose from 'mongoose';

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
