// The ultra-fast microservice that faces the students.
// It has absolutely zero connection to PostgreSQL to prevent database lockups.

import express from "express";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const redis = new Redis(process.env.UPSTASH_REDIS_URL as string, {
  family: 4, // CRITICAL: Forces IPv4 to bypass the Node 18/Docker networking bug
  maxRetriesPerRequest: null, // Highly recommended by rate-limit-redis to prevent queue blocking
});

app.get("/api/results/:rollNumber", async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;

    // 1. Fetch directly from In-Memory Cache
    const cachedResult = await redis.get(`result:${rollNumber}`);

    if (cachedResult) {
      // CQRS Success: Data served from memory in milliseconds
      return res.status(200).json(JSON.parse(cachedResult));
    }

    // 2. If not in cache, we return 404. We DO NOT fall back to Postgres.
    // This strict separation ensures the database never crashes during a cache miss storm.
    return res
      .status(404)
      .json({ message: "Result not found or not yet declared." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3002, () => console.log("Query Service running on port 3002"));
