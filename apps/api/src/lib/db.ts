import mongoose from 'mongoose';

export async function connectDb(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export const toId = (value: string) => new mongoose.Types.ObjectId(value);
export const isId = (value: string) => mongoose.isValidObjectId(value) && /^[a-f0-9]{24}$/i.test(value);
