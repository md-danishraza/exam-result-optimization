// Handles CSV uploads, writes the master record to PostgreSQL,
// and instantly pushes a lightweight JSON copy to Redis.

import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { Pool } from "pg";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

// Database Connections
const pool = new Pool({ connectionString: process.env.SUPABASE_URL });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
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
      // Connect outside the try-catch so we can release it in the finally block
      const client = await pool.connect();

      try {
        for (const row of results) {
          // 1. SKIP EMPTY ROWS: If there's a blank line in the CSV, ignore it.
          if (!row.roll_number || !row.student_name) {
            continue;
          }

          // 2. PARSE DATA CORRECTLY: The CSV provides strings. We must cast them.
          const totalScore = parseInt(row.total_score, 10);
          const marksString = row.marks; // Already a string from the CSV

          // Write to PostgreSQL
          // Notice we pass `marksString` directly, NOT wrapped in JSON.stringify
          await client.query(
            `INSERT INTO exam_system.results (roll_number, student_name, marks, total_score) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (roll_number) DO UPDATE SET marks = $3, total_score = $4`,
            [row.roll_number, row.student_name, marksString, totalScore]
          );

          // 3. PUSH TO REDIS CACHE
          // We build a clean JavaScript object so it stringifies perfectly for the frontend
          const redisData = {
            roll_number: row.roll_number,
            student_name: row.student_name,
            marks: JSON.parse(marksString), // Turn the CSV string back into a real object
            total_score: totalScore,
          };

          await redis.set(`result:${row.roll_number}`, redisData);
        }

        res
          .status(200)
          .json({ message: "Results successfully processed and cached." });
      } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Database transaction failed." });
      } finally {
        // Always release the database connection
        client.release();

        // Always delete the temp file, even if the database crashes
        if (fs.existsSync(req.file!.path)) {
          fs.unlinkSync(req.file!.path);
        }
      }
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () =>
  console.log("Generation Service running on port 3001")
);
