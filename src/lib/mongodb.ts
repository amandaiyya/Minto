import "server-only";

import mongoose from "mongoose";

type MongooseCache = {
  connection: typeof mongoose | null;
  connectionPromise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache =
  globalForMongoose.mongooseCache ??
  (globalForMongoose.mongooseCache = {
    connection: null,
    connectionPromise: null,
  });

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.connectionPromise) {
    cache.connectionPromise = mongoose.connect(getMongoUri());
  }

  try {
    cache.connection = await cache.connectionPromise;
    return cache.connection;
  } catch (error) {
    cache.connectionPromise = null;
    throw error;
  }
}
