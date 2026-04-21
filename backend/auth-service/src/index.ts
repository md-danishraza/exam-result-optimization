// Acts as a gateway. Generates access tokens and throttles requests
// using a Token Bucket algorithm backed by Redis to enforce a "Virtual Waiting Room".

import express from "express";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis"; // <-- New
import { Ratelimit } from "@upstash/ratelimit";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, "1 s"), // 100 requests per 1 second
});

// 3. Custom Middleware for the Waiting Room
const waitingRoomLimiter = async (req: any, res: any, next: any) => {
  // Identify user by IP (or token if available)
  const identifier = req.ip || "127.0.0.1";

  // Check limit against Upstash
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return res.status(429).json({
      status: "queued",
      message:
        "Traffic is high. You are in the virtual waiting room. Please hold.",
      retryAfter: 5, // seconds
    });
  }
  next();
};

app.post("/api/auth/token", (req, res) => {
  const token = jwt.sign({ active: true }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Apply our new Upstash middleware
app.get("/api/gateway/results", waitingRoomLimiter, async (req, res) => {
  try {
    const rollNumber = req.query.roll;
    // const queryResponse = await fetch(
    //   `http://query-service:3002/api/results/${rollNumber}`
    // );
    const QUERY_SERVICE_URL =
      process.env.QUERY_SERVICE_URL || "http://localhost:3002";
    const queryResponse = await fetch(
      `${QUERY_SERVICE_URL}/api/results/${rollNumber}`
    );
    const data = await queryResponse.json();
    return res.status(queryResponse.status).json(data);
  } catch (error) {
    console.error("Gateway routing error:", error);
    return res
      .status(500)
      .json({ message: "Gateway failed to reach the Query Service." });
  }
});

const PORT = Number(process.env.PORT) || 3003;
app.listen(PORT, "0.0.0.0", () =>
  console.log("Auth & Rate Limit Service running on port 3003")
);
