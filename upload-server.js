import express from "express";
import mysql from "mysql2";
import multer from "multer";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import fs from "fs";
import child_process from "child_process";

const app = express();
const port = 3001;
const { spawn } = child_process;

let dbHost = "localhost";
if (process.env.DATABASE_HOST) {
  dbHost = process.env.DATABASE_HOST;
}

app.use(express.json()); // Parse JSON bodies

// Enable CORS for your React app (localhost:5173) – for dev, using wildcard.
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

import dbRequest from "./db.js";

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./media");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  console.log("Token received:", token);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};

// ------------------------------
// VIDEO UPLOAD & RELATED ENDPOINTS
// ------------------------------

// Upload video with authentication
app.post("/upload", authenticateToken, upload.single("file"), (req, res) => {
  const filePath = path.join("./media", req.file.filename);
  const outputPath = filePath.replace(".mp4", "trans.mp4");
  const outputFile = req.file.filename.replace(".mp4", "trans.mp4");

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const { title, description } = req.body;
  const creatorId = req.user.userId;
  if (!creatorId) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file: ", err);
      else console.log("File deleted successfully");
    });
    return res.status(400).json({ message: "Invalid creator ID" });
  }

  if (!title) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file: ", err);
      else console.log("File deleted successfully");
    });
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  // Transcode media with ffmpeg
  const ffmpeg = spawn("ffmpeg", [
    "-i",
    filePath,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "22",
    "-c:a",
    "copy",
    outputPath,
  ]);
  ffmpeg.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });
  ffmpeg.on("close", (code) => {
    console.log(code);
    if (code !== 0) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file: ", err);
      });
      fs.unlink(outputPath, (err) => {
        if (err) console.error("Error deleting file: ", err);
      });
      return res.status(400).json({ message: "Transcoding failed" });
    }
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file: ", err);
      else console.log("File deleted successfully");
    });
  });

  const db = dbRequest(dbHost);
  const insertQuery =
    "INSERT INTO videos (creator_id, title, description, fileName) VALUES (?, ?, ?, ?)";
  db.query(
    insertQuery,
    [creatorId, title, description, outputFile],
    (err, result) => {
      if (err) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file: ", err);
          else console.log("File deleted successfully");
        });
        console.error("Error inserting video into database: ", err);
        db.destroy();
        return res.status(500).json({ message: "Database error", error: err });
      }
      console.log("Insert result:", result);
      db.destroy();
      return res.status(200).json({ message: "File uploaded successfully!" });
    }
  );
});

// Get user info
app.get("/user", (req, res) => {
  const db = dbRequest(dbHost);
  const { userID: userid } = req.query;
  if (!userid) {
    return res.status(400).json({ message: "UserID is required" });
  }
  const selectQuery = "SELECT * FROM users WHERE id = ?";
  db.query(selectQuery, [userid], (err, results) => {
    if (err) {
      console.error("Error fetching user from database: ", err);
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "User not found" });
    }
    db.destroy();
    return res.status(200).json(results[0]);
  });
});

// Get video info
app.get("/video", (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName: filename } = req.query;
  if (!filename) {
    db.destroy();
    return res.status(400).json({ message: "Filename is required" });
  }
  const selectQuery = "SELECT * FROM videos WHERE fileName = ?";
  db.query(selectQuery, [filename], (err, results) => {
    if (err) {
      console.error("Error fetching video from database: ", err);
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }
    db.destroy();
    return res.status(200).json(results[0]);
  });
});

// Get video list
app.get("/video-list", (req, res) => {
  const db = dbRequest(dbHost);
  const selectQuery = "SELECT fileName FROM videos";
  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Error fetching video from database: ", err);
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (results.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }
    db.destroy();
    return res.status(200).json(results);
  });
});

// ------------------------------
// COMMENT & REPLY ENDPOINTS
// ------------------------------

// Post a comment (requires authentication)
app.post("/post-comment", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { video_id, comment } = req.body;
  const userId = req.user.userId;
  console.log("Received Comment Request:");
  console.log("User ID:", userId);
  console.log("Video ID:", video_id);
  console.log("Comment:", comment);
  if (!video_id || !comment) {
    db.destroy();
    return res.status(400).json({ message: "Video ID and comment are required" });
  }
  try {
    const insertQuery = "INSERT INTO comments (user_id, video_id, content) VALUES (?, ?, ?)";
    await db.promise().query(insertQuery, [userId, video_id, comment]);
    console.log("Comment successfully stored in database!");
    db.destroy();
    return res.status(200).json({ message: "Comment posted successfully!" });
  } catch (error) {
    console.error("Error inserting comment:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Get comments for a video
app.get("/get-comments", async (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.query;
  if (!fileName) {
    db.destroy();
    return res.status(400).json({ message: "File name is required" });
  }
  try {
    const videoQuery = "SELECT id FROM videos WHERE fileName = ?";
    const [videoResult] = await db.promise().query(videoQuery, [fileName]);
    if (videoResult.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }
    const videoId = videoResult[0].id;
    const selectQuery = "SELECT * FROM comments WHERE video_id = ?";
    const [results] = await db.promise().query(selectQuery, [videoId]);
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching comments: ", error);
    return res.status(500).json({ message: "Database error", error });
  } finally {
    db.destroy();
  }
});

// Post a reply to a comment (requires authentication)
app.post("/post-reply", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id, reply } = req.body;
  const userId = req.user.userId;
  if (!comment_id || !reply) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID and reply content are required" });
  }
  try {
    const insertQuery = "INSERT INTO reply (creator_id, content, comment_id) VALUES (?, ?, ?)";
    await db.promise().query(insertQuery, [userId, reply, comment_id]);
    db.destroy();
    return res.status(200).json({ message: "Reply posted successfully!" });
  } catch (error) {
    console.error("Error inserting reply:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Get replies for a given comment
app.get("/get-replies", async (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id } = req.query;
  if (!comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID is required" });
  }
  try {
    const selectQuery = "SELECT * FROM reply WHERE comment_id = ?";
    const [results] = await db.promise().query(selectQuery, [comment_id]);
    db.destroy();
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching replies:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Upload Server is running at http://localhost:${port}`);
})
// Add this endpoint below your other comment endpoints (e.g., after "/post-reply" or "/get-replies")
app.post("/toggle-comment-like", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id } = req.body;
  const userId = req.user.userId;

  if (!comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID is required" });
  }
  try {
    // Check if this comment is already liked by the user
    const [rows] = await db.promise().query(
      "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?",
      [comment_id, userId]
    );
    if (rows.length > 0) {
      // Already liked – remove the like (unlike)
      await db.promise().query(
        "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [comment_id, userId]
      );
      db.destroy();
      return res.status(200).json({ message: "Comment unliked" });
    } else {
      // Not yet liked – add a like entry
      await db.promise().query(
        "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
        [comment_id, userId]
      );
      db.destroy();
      return res.status(200).json({ message: "Comment liked" });
    }
  } catch (error) {
    console.error("Error toggling comment like:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

