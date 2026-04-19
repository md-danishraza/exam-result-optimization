// Handles CSV uploads, writes the master record to PostgreSQL,
// and instantly pushes a lightweight JSON copy to Redis.

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { Pool } from "pg";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

// Database Connections
const pool = new Pool({ connectionString: process.env.SUPABASE_URL });
const redis = new Redis(process.env.UPSTASH_REDIS_URL as string, {
  family: 4, // CRITICAL: Forces IPv4 to bypass the Node 18/Docker networking bug
  maxRetriesPerRequest: null, // Highly recommended by rate-limit-redis to prevent queue blocking
});

app.post("/api/admin/upload-results", upload.single("file"), (req, res) => {
  const results: any[] = [];

  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        // 1. Write to PostgreSQL (The Command)
        const client = await pool.connect();
        for (const row of results) {
          await client.query(
            `INSERT INTO results (roll_number, student_name, marks, total_score) 
                         VALUES ($1, $2, $3, $4) 
                         ON CONFLICT (roll_number) DO UPDATE SET marks = $3, total_score = $4`,
            [
              row.roll_number,
              row.student_name,
              JSON.stringify(row.marks),
              row.total_score,
            ]
          );

          // 2. Push to Redis Cache (Preparing the Read Model)
          // We store it as a simple stringified JSON for microsecond retrieval
          await redis.set(`result:${row.roll_number}`, JSON.stringify(row));
        }
        client.release();

        // Cleanup temp file
        fs.unlinkSync(req.file!.path);
        res
          .status(200)
          .json({ message: "Results successfully processed and cached." });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database transaction failed" });
      }
    });
});

app.listen(3001, () => console.log("Generation Service running on port 3001"));
