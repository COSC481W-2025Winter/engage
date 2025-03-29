import express from "express";
import mysql from "mysql2";
import multer from "multer";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import fs from "fs";
import child_process from "child_process";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your front-end domain
    methods: ["GET", "POST"],
  },
});
const port = 3001;

const { spawn } = child_process;

let dbHost = "localhost";
if (process.env.DATABASE_HOST) {
  dbHost = process.env.DATABASE_HOST;
}

app.use(express.json());
app.use(cors());

import dbRequest from "./db.js";

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
    req.user = decoded; // Attach decoded user info to request
    next();
  });
};

// Socket connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// VIDEO UPLOAD & RELATED ENDPOINTS

app.post("/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const { title, description } = req.body;
  const creatorId = req.user.userId;
  const sessionId = req.body.sessionId || "unknown"; // Client should send a sessionId to identify the connection

  if (!creatorId) {
    deleteFile(req.file.path);
    return res.status(400).json({ message: "Invalid creator ID" });
  }

  if (!title) {
    deleteFile(req.file.path);
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  const filePath = path.join("./media", req.file.filename);
  // Replace the .(insert file extension) with trans.mp4
  const outputPath = filePath.replace(/\.[^/.]+$/, "trans.mp4");
  const outputFile = req.file.filename.replace(/\.[^/.]+$/, "trans.mp4");

  // Get duration of the video to calculate progress
  const ffprobe = spawn("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  let duration = 0;
  ffprobe.stdout.on("data", (data) => {
    duration = parseFloat(data.toString().trim());
    console.log(`Video duration: ${duration} seconds`);
  });

  ffprobe.on("close", (code) => {
    if (code !== 0) {
      console.log("Could not determine video duration");
    }

    // Now start the transcoding process
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
      "-progress",
      "pipe:1",
      outputPath,
    ]);

    let lastProgress = 0;

    ffmpeg.stdout.on("data", (data) => {
      const output = data.toString();
      const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/);

      if (timeMatch && duration > 0) {
        const timeStr = timeMatch[1];
        const [hours, minutes, seconds] = timeStr.split(":").map(parseFloat);
        const currentTime = hours * 3600 + minutes * 60 + seconds;
        const progressPercent = Math.min(
          Math.round((currentTime / duration) * 100),
          99
        );

        if (progressPercent > lastProgress) {
          lastProgress = progressPercent;
          io.emit("transcode-progress", {
            sessionId: sessionId,
            progress: progressPercent,
          });
          console.log(`Transcoding progress: ${progressPercent}%`);
        }
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      const output = data.toString();
      console.log(`ffmpeg stderr: ${output}`);

      const timeMatch = output.match(/time=\s*(\d+:\d+:\d+\.\d+)/);

      if (timeMatch && duration > 0) {
        const timeStr = timeMatch[1];
        const [hours, minutes, seconds] = timeStr.split(":").map(parseFloat);
        const currentTime = hours * 3600 + minutes * 60 + seconds;
        const progressPercent = Math.min(
          Math.round((currentTime / duration) * 100),
          99
        );

        if (progressPercent > lastProgress) {
          lastProgress = progressPercent;
          io.emit("transcode-progress", {
            sessionId: sessionId,
            progress: progressPercent,
          });
        }
      }
    });

    ffmpeg.on("close", (code) => {
      console.log(`Transcoding process exited with code ${code}`);
      io.emit("transcode-progress", {
        sessionId: sessionId,
        progress: 100,
        complete: true,
      });

      if (code === 0) {
        const db = dbRequest(dbHost);
        const insertQuery =
          "INSERT INTO videos (creator_id, title, description, fileName) VALUES (?, ?, ?, ?)";
        db.query(
          insertQuery,
          [creatorId, title, description, outputFile],
          (err, result) => {
            deleteFile(filePath);

            if (err) {
              console.error("Error inserting video into database: ", err);
              deleteFile(outputPath);
              db.destroy();
              return res
                .status(500)
                .json({ message: "Database error", error: err });
            }

            console.log("Insert result:", result);
            db.destroy();
            return res.status(200).json({
              message: "File uploaded and transcoded successfully!",
              videoId: result.insertId,
            });
          }
        );
      } else {
        deleteFile(filePath);
        deleteFile(outputPath);
        return res.status(400).json({ message: "Transcoding failed" });
      }
    });
  });
});

function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file ${filePath}: `, err);
    } else {
      console.log(`File ${filePath} deleted successfully`);
    }
  });
}


// USER & VIDEO INFORMATION ENDPOINTS

app.get("/user", (req, res) => {
  const db = dbRequest(dbHost);
  const { userID: userid } = req.query;
  if (!userid) {
    db.destroy();
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


// COMMENT & REPLY ENDPOINTS

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
    const insertQuery =
      "INSERT INTO comments (user_id, video_id, content) VALUES (?, ?, ?)";
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

app.post("/post-reply", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id, reply } = req.body;
  const userId = req.user.userId;
  if (!comment_id || !reply) {
    db.destroy();
    return res
      .status(400)
      .json({ message: "Comment ID and reply content are required" });
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


// COMMENT LIKE ENDPOINTS

app.post("/like-comment", authenticateToken, (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id } = req.body;
  const userId = req.user.userId;

  if (!comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID is required" });
  }

  const checkQuery = "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?";
  db.query(checkQuery, [comment_id, userId], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (results.length > 0) {
      const deleteQuery = "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?";
      db.query(deleteQuery, [comment_id, userId], (err2) => {
        if (err2) {
          db.destroy();
          return res.status(500).json({ message: "Database error", error: err2 });
        }
        db.destroy();
        return res.status(200).json({ message: "Comment unliked" });
      });
    } else {
      const insertQuery = "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)";
      db.query(insertQuery, [comment_id, userId], (err2) => {
        if (err2) {
          db.destroy();
          return res.status(500).json({ message: "Database error", error: err2 });
        }
        db.destroy();
        return res.status(200).json({ message: "Comment liked" });
      });
    }
  });
});

app.get("/comment-like-count", (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id } = req.query;
  if (!comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID is required" });
  }
  const selectQuery = "SELECT COUNT(*) AS likeCount FROM comment_likes WHERE comment_id = ?";
  db.query(selectQuery, [comment_id], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    db.destroy();
    return res.status(200).json({ likeCount: results[0].likeCount });
  });
});

app.get("/fetch-comment-liked", authenticateToken, (req, res) => {
  const db = dbRequest(dbHost);
  const { comment_id } = req.query;
  const userId = req.user.userId;
  if (!comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Comment ID is required" });
  }
  const checkQuery = "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?";
  db.query(checkQuery, [comment_id, userId], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    db.destroy();
    if (results.length > 0) {
      return res.status(200).json({ liked: true });
    } else {
      return res.status(200).json({ liked: false });
    }
  });
});


// REPLY LIKE ENDPOINTS (NEW) so we can see the likes

app.post("/like-reply", authenticateToken, (req, res) => {
  const db = dbRequest(dbHost);
  const { reply_id } = req.body;
  const userId = req.user.userId;

  if (!reply_id) {
    db.destroy();
    return res.status(400).json({ message: "Reply ID is required" });
  }

  const checkQuery = "SELECT * FROM reply_likes WHERE reply_id = ? AND user_id = ?";
  db.query(checkQuery, [reply_id, userId], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (results.length > 0) {
      const deleteQuery = "DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?";
      db.query(deleteQuery, [reply_id, userId], (err2) => {
        if (err2) {
          db.destroy();
          return res.status(500).json({ message: "Database error", error: err2 });
        }
        db.destroy();
        return res.status(200).json({ message: "Reply unliked" });
      });
    } else {
      const insertQuery = "INSERT INTO reply_likes (reply_id, user_id) VALUES (?, ?)";
      db.query(insertQuery, [reply_id, userId], (err2) => {
        if (err2) {
          db.destroy();
          return res.status(500).json({ message: "Database error", error: err2 });
        }
        db.destroy();
        return res.status(200).json({ message: "Reply liked" });
      });
    }
  });
});

app.get("/reply-like-count", (req, res) => {
  const db = dbRequest(dbHost);
  const { reply_id } = req.query;
  if (!reply_id) {
    db.destroy();
    return res.status(400).json({ message: "Reply ID is required" });
  }
  const selectQuery = "SELECT COUNT(*) AS likeCount FROM reply_likes WHERE reply_id = ?";
  db.query(selectQuery, [reply_id], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    db.destroy();
    return res.status(200).json({ likeCount: results[0].likeCount });
  });
});

app.get("/fetch-reply-liked", authenticateToken, (req, res) => {
  const db = dbRequest(dbHost);
  const { reply_id } = req.query;
  const userId = req.user.userId;
  if (!reply_id) {
    db.destroy();
    return res.status(400).json({ message: "Reply ID is required" });
  }
  const checkQuery = "SELECT * FROM reply_likes WHERE reply_id = ? AND user_id = ?";
  db.query(checkQuery, [reply_id, userId], (err, results) => {
    if (err) {
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }
    db.destroy();
    if (results.length > 0) {
      return res.status(200).json({ liked: true });
    } else {
      return res.status(200).json({ liked: false });
    }
  });
});

// ------------------------------
// START THE SERVER
// ------------------------------

server.listen(port, () => {
  console.log(`Upload Server is running at http://localhost:${port}`);
});
