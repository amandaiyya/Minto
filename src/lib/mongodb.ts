import "server-only";

import mongoose from "mongoose";
import { MongoClient, type Db } from "mongodb";

type MongooseCache = {
  connection: typeof mongoose | null;
  connectionPromise: Promise<typeof mongoose> | null;
  client: MongoClient | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache =
  globalForMongoose.mongooseCache ??
  (globalForMongoose.mongooseCache = {
    connection: null,
    connectionPromise: null,
    client: null,
  });

// Keep compatibility with a connection cached before a development hot reload.
cache.client ??= null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection && mongoose.connection.readyState === mongoose.STATES.connected) {
    cache.client ??= mongoose.connection.getClient();
    return cache.connection;
  }

  if (!cache.connectionPromise) {
    const client = new MongoClient(getMongoUri());
    cache.client = client;
    cache.connectionPromise = (async () => {
      try {
        await client.connect();
        mongoose.connection.setClient(client);
        cache.connection = mongoose;
        return mongoose;
      } catch {
        cache.client = null;
        await client.close().catch(() => undefined);
        throw new Error("Unable to connect to MongoDB.");
      }
    })();
  }

  try {
    cache.connection = await cache.connectionPromise;
    return cache.connection;
  } catch {
    cache.connectionPromise = null;
    throw new Error("Unable to connect to MongoDB.");
  }
}

export async function getMongoDatabase(): Promise<{ client: MongoClient; db: Db }> {
  await connectToDatabase();
  const client = cache.client ?? mongoose.connection.getClient();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database is unavailable.");
  }

  return { client, db };
}
