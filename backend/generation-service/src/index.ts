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
      const client = await pool.connect();

      try {
        for (const row of results) {
          // Skip empty rows
          if (!row.roll_number || !row.student_name) {
            continue;
          }

          const totalScore = parseInt(row.total_score, 10);
          const marksString = row.marks;

          // 1. Write to PostgreSQL with the new extended schema
          await client.query(
            `INSERT INTO exam_system.results 
             (roll_number, student_name, dob, father_name, school_name, marks, total_score, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (roll_number) DO UPDATE SET 
             student_name = $2, dob = $3, father_name = $4, school_name = $5, marks = $6, total_score = $7, status = $8`,
            [
              row.roll_number,
              row.student_name,
              row.dob,
              row.father_name,
              row.school_name,
              marksString,
              totalScore,
              row.status,
            ]
          );

          // 2. Push expanded object to Upstash Redis
          const redisData = {
            roll_number: row.roll_number,
            student_name: row.student_name,
            dob: row.dob,
            father_name: row.father_name,
            school_name: row.school_name,
            marks: JSON.parse(marksString), // Turn complex string back to nested object
            total_score: totalScore,
            status: row.status,
          };

          await redis.set(`result:${row.roll_number}`, redisData);
        }

        res
          .status(200)
          .json({
            message: "Detailed results successfully processed and cached.",
          });
      } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Database transaction failed." });
      } finally {
        client.release();
        if (fs.existsSync(req.file!.path)) {
          fs.unlinkSync(req.file!.path);
        }
      }
    });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () =>
  console.log("Generation Service running on port 3001")
);
