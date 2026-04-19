// Acts as a gateway. Generates access tokens and throttles requests
// using a Token Bucket algorithm backed by Redis to enforce a "Virtual Waiting Room".

import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const redis = new Redis(process.env.UPSTASH_REDIS_URL as string, {
  family: 4, // CRITICAL: Forces IPv4 to bypass the Node 18/Docker networking bug
  maxRetriesPerRequest: null, // Highly recommended by rate-limit-redis to prevent queue blocking
});

// Generate a session token for the student
app.post("/api/auth/token", (req, res) => {
  // In a real app, you might verify a captcha here to prevent bots
  const token = jwt.sign({ active: true }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Redis-backed Rate Limiter
const waitingRoomLimiter = rateLimit({
  // @ts-ignore - rate-limit-redis types can sometimes be tricky with ioredis
  store: new RedisStore({
    // Split the args to satisfy ioredis, and cast to 'any' to satisfy rate-limit-redis
    sendCommand: (...args: string[]) =>
      redis.call(args[0], ...args.slice(1)) as any,
  }),
  windowMs: 1000, // 1 second window
  max: 100, // Limit each IP to 100 requests per second
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // This specific 429 response triggers the "Waiting Room" UI on the frontend
    res.status(429).json({
      status: "queued",
      message:
        "Traffic is high. You are in the virtual waiting room. Please hold.",
      retryAfter: 5, // seconds
    });
  },
});

// Apply the limiter to an API gateway route (which would route to the Query Service)
app.use("/api/gateway/results", waitingRoomLimiter, (req, res) => {
  // If they pass the rate limit, they would be proxied to the Query Service
  // For this prototype, you can just redirect or implement a simple proxy
  res.redirect(`http://query-service:3002/api/results/${req.query.roll}`);
});

app.listen(3003, () =>
  console.log("Auth & Rate Limit Service running on port 3003")
);
