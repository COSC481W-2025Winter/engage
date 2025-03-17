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

app.use(express.json()); // Add this line to parse JSON bodies

app.use(cors());

import dbRequest from "./db.js";

// Enable CORS for your React app (localhost:5173)
app.use(
  cors({
    origin: "*", // This is the origin of your React app
    // ! ORIGIN IS WILDCARD FOR DEV ONLY
    methods: ["GET", "POST"], // Allow only GET and POST methods (you can customize this)
    allowedHeaders: ["Content-Type", "Authorization"], // Allow necessary headers
  })
);

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./media"); // Set the folder where the files will be uploaded
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Name the file with a timestamp
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

// Upload video with authentication
app.post("/upload", authenticateToken, upload.single("file"), (req, res) => {
  // console.log("File data:", req.file);
  // console.log("Request body:", req.body);
  // console.log("Decoded JWT:", req.user);
  // Delete the video file from the server

  const filePath = path.join("./media", req.file.filename);
  const outputPath = filePath.replace(".mp4", "trans.mp4");

  const outputFile = req.file.filename.replace(".mp4", "trans.mp4");

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const { title, description } = req.body;
  const creatorId = req.user.userId; // Extract user ID from JWT
  if (!creatorId) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file: ", err);
      } else {
        console.log("File deleted successfully");
      }
    });
    return res.status(400).json({ message: "Invalid creator ID" });
  }

  if (!title) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file: ", err);
      } else {
        console.log("File deleted successfully");
      }
    });
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  // transcode media
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
    if (code === 0) {
      // const file = fs.readFileSync(outputPath);
      // writeHead(200, { 'Content-Type': 'video/webm' });
      // end(file);
      // fs.unlinkSync(outputPath);
    } else {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file: ", err);
        } else {
          console.log("File deleted successfully");
        }
      });
      fs.unlink(outputPath, (err) => {
        if (err) {
          console.error("Error deleting file: ", err);
        } else {
          console.log("File deleted successfully");
        }
      });
      return res.status(400).json({ message: "Transcoding failed" });
    }
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file: ", err);
      } else {
        console.log("File deleted successfully");
      }
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
          if (err) {
            console.error("Error deleting file: ", err);
          } else {
            console.log("File deleted successfully");
          }
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
// Get Video info
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

// Get Video info
app.get("/video-list", (req, res) => {
  // const { fileName: filename } = req.query;

  // if (!filename) {
  //   return res.status(400).json({ message: "Filename is required" });
  // }
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
    // Insert comment with video_id
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

app.post("/post-reply", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { user_id, video_id, comment_id, content } = req.body;
  

  if (!user_id || !video_id || !comment_id) {
    db.destroy();
    return res.status(400).json({ message: "Video ID, user id, and comment are required" });
  }

  try {
    // Insert comment with video_id
    const insertQuery = "INSERT INTO reply (user_id, video_id, content, comment_id) VALUES (?, ?, ?, ?)";
    await db.promise().query(insertQuery, [userId, video_id, content, comment_id]);

    console.log("Reply successfully stored in database!");
    db.destroy();
    return res.status(200).json({ message: "Reply posted successfully!" });
  } catch (error) {
    console.error("Error inserting reply:", error);
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
    // Get the video_id from fileName
    const videoQuery = "SELECT id FROM videos WHERE fileName = ?";
    const [videoResult] = await db.promise().query(videoQuery, [fileName]);

    if (videoResult.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }

    const videoId = videoResult[0].id;

    // Fetch comments
    // const selectQuery = `
    //   SELECT users.username, comments.content 
    //   FROM comments 
    //   JOIN users ON comments.user_id = users.id 
    //   WHERE comments.video_id = ?`;

      const selectQuery = "SELECT * FROM comments WHERE video_id = ?"

    const [results] = await db.promise().query(selectQuery, [videoId]);

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching comments: ", error);
    return res.status(500).json({ message: "Database error", error });
  } finally {
    db.destroy();
  }
});






app.listen(port, () => {
  console.log(`Upload Server is running at http://localhost:${port}`);
});
