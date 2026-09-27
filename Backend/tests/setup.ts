import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

// Mock ioredis globally so cache.service.ts talks to an in-memory fake,
// never a real Redis instance, during tests. Must run before any import
// of ioredis happens (Jest hoists jest.mock calls to the top automatically).
jest.mock("ioredis", () => require("ioredis-mock"));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterEach(async () => {
  // Clear all collections between tests so one test's data
  // doesn't leak into the next (e.g. duplicate-email false positives)
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});