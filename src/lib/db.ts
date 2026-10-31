import mongoose from 'mongoose';

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = globalThis as typeof globalThis & { mongooseCache?: Cache };
const cache = globalWithMongoose.mongooseCache ?? { conn: null, promise: null };
globalWithMongoose.mongooseCache = cache;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in your environment to connect to MongoDB.');
  if (cache.conn) return cache.conn;
  if (!cache.promise) cache.promise = mongoose.connect(uri as string, { bufferCommands: false, serverSelectionTimeoutMS: 8000 }).catch((error) => { cache.promise = null; throw error; });
  cache.conn = await cache.promise;
  return cache.conn;
}
