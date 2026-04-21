// The ultra-fast microservice that faces the students.
// It has absolutely zero connection to PostgreSQL to prevent database lockups.

import express from "express";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

app.get("/api/results/:rollNumber", async (req, res) => {
  try {
    const rollNumber = req.params.rollNumber;
    const cachedResult = await redis.get(`result:${rollNumber}`);

    if (cachedResult) {
      // NO NEED for JSON.parse(). Upstash already parsed it into an object!
      return res.status(200).json(cachedResult);
    }

    return res
      .status(404)
      .json({ message: "Result not found or not yet declared." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, "0.0.0.0", () =>
  console.log("Query Service running on port 3002")
);
