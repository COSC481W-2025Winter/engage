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

// **** ADDED LINE: Serve static files from the media folder ****
app.use("/media", express.static(path.join(process.cwd(), "media")));

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
  // console.log("Token received:", token);
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
  // console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    // console.log("Client disconnected:", socket.id);
  });
});

// ------------------------------
// VIDEO UPLOAD & RELATED ENDPOINTS
// ------------------------------

// Upload video with authentication
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
    // console.log(`Video duration: ${duration} seconds`);
  });

  ffprobe.on("close", (code) => {
    if (code !== 0) {
      // console.log("Could not determine video duration");
      // Continue with transcoding anyway
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
      "pipe:1", // Output progress information to stdout
      outputPath,
    ]);

    let lastProgress = 0;

    // Extract progress information from ffmpeg output
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
      }
      }
    });

    // ffmpeg.stderr.on("data", (data) => {
    //   // ffmpeg outputs detailed information to stderr
    //   const output = data.toString();
    //   // console.log(`ffmpeg stderr: ${output}`);

    //   // Parse progress from stderr if needed (as alternative to stdout progress)
    //   const frameMatch = output.match(/frame=\s*(\d+)/);
    //   const fpsMatch = output.match(/fps=\s*(\d+)/);
    //   const timeMatch = output.match(/time=\s*(\d+:\d+:\d+\.\d+)/);

    //   if (timeMatch && duration > 0) {
    //     const timeStr = timeMatch[1];
    //     const [hours, minutes, seconds] = timeStr.split(":").map(parseFloat);
    //     const currentTime = hours * 3600 + minutes * 60 + seconds;
    //     const progressPercent = Math.min(
    //       Math.round((currentTime / duration) * 100),
    //       99
    //     );

    //     if (progressPercent > lastProgress) {
    //       lastProgress = progressPercent;
    //       io.emit("transcode-progress", {
    //         sessionId: sessionId,
    //         progress: progressPercent,
    //       });
    //     }
    //   }
    // });

    ffmpeg.on("close", (code) => {
      // console.log(`Transcoding process exited with code ${code}`);
      io.emit("transcode-progress", {
        sessionId: sessionId,
        progress: 100,
        complete: true,
      });

      if (code === 0) {
        // Transcoding successful - now insert into database
        const db = dbRequest(dbHost);
        const insertQuery =
          "INSERT INTO videos (creator_id, title, description, fileName) VALUES (?, ?, ?, ?)";
        db.query(
          insertQuery,
          [creatorId, title, description, outputFile],
          (err, result) => {
            // Delete original file regardless of DB outcome
            deleteFile(filePath);

            if (err) {
              console.error("Error inserting video into database: ", err);
              // If DB insertion fails, also delete the transcoded file
              deleteFile(outputPath);
              db.destroy();
              return res
                .status(500)
                .json({ message: "Database error", error: err });
            }
            // Get the username from creator_id
            const getUsernameQuery = "SELECT username FROM users WHERE id = ?";
            db.query(getUsernameQuery, [creatorId], (err, userResults) => {
              if (err) {
                console.error("Error fetching username from database: ", err);
                deleteFile(outputPath);
                db.destroy();
                return res.status(500).json({ message: "Database error", error: err });
              }

              if (userResults.length === 0) {
                console.error("Creator not found");
                deleteFile(outputPath);
                db.destroy();
                return res.status(404).json({ message: "Creator not found" });
              }

              const username = userResults[0].username;
              console.log(`Video "${title}" uploaded by: ${username}`);
            });
            // console.log("Insert result:", result);
            db.destroy();
            return res.status(200).json({
              message: "File uploaded and transcoded successfully!",
              videoId: result.insertId,
            });
          }
        );
      } else {
        // Transcoding failed - clean up files and return error
        deleteFile(filePath);
        deleteFile(outputPath);
        return res.status(400).json({ message: "Transcoding failed" });
      }
    });
  });
});

// Function to get videoId from fileName
function getVideoIdFromFileName(db, fileName) {
  return new Promise((resolve, reject) => {
    if (!fileName) {
      reject(new Error("Video file name is required"));
      return;
    }

    const getVideoIdQuery = "SELECT id FROM videos WHERE fileName = ?";
    db.query(getVideoIdQuery, [fileName], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        reject(err);
        return;
      }

      if (results.length === 0) {
        reject(new Error("Video not found"));
        return;
      }

      const videoId = results[0].id;
      // console.log("Found videoId:", videoId);
      resolve(videoId);
    });
  });
}

// Get video ID from filename
app.get("/video-id-from-filename", async (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.query;

  if (!fileName) {
    db.destroy();
    return res.status(400).json({ message: "File name is required" });
  }

  try {
    // console.log(fileName);
    const videoId = await getVideoIdFromFileName(db, fileName);
    // console.log(videoId);
    db.destroy();
    return res.status(200).json({ videoId });
  } catch (error) {
    console.error("Error fetching video ID from filename:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// **** ADDED ENDPOINT: Upload Profile Picture ****
app.post(
  "/upload-profile-picture",
  upload.single("profilePicture"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    // Construct the full URL for the uploaded file
    const fileUrl = `/media/${req.file.filename}`;

    const db = dbRequest(dbHost);
    const updateQuery = "UPDATE users SET profilePictureUrl = ? WHERE id = ?";
    db.query(updateQuery, [fileUrl, userId], (err, result) => {
      db.destroy();
      if (err) {
        console.error("Error updating user with profile picture: ", err);
        return res.status(500).json({ message: "Database error", error: err });
      }
      return res
        .status(200)
        .json({
          message: "Profile picture uploaded successfully",
          profilePictureUrl: fileUrl,
        });
    });
  }
);

app.post("/revert-profile-picture", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const db = dbRequest(dbHost);
  const updateQuery =
    "UPDATE users SET profilePictureUrl = '/src/assets/engage default pfp.png' WHERE id = ?";
  db.query(updateQuery, [userId], (err) => {
    db.destroy();
    if (err) {
      console.error("Error updating user with profile picture: ", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res
      .status(200)
      .json({ message: "Profile picture reverted successfully" });
  });
});

// app.get("/get-user-id", async (req, res) => {
//   const db = dbRequest(dbHost);
//   const { username } = req.query;

//   if (!username) {
//     return res.status(400).json({ message: "Username is required" });
//   }

//   try {
//     const query = "SELECT id FROM users WHERE username = ?";
//     const [results] = await db.promise().query(query, [username]);

//     if (results.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     return res.status(200).json({ userId: results[0].id });
//   } catch (error) {
//     console.error("Error fetching user ID by username:", error);
//     return res.status(500).json({ message: "Database error", error });
//   } finally {
//     db.destroy();
//   }
// });

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

// Get userId by filename
app.get("/userid-by-filename", async (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.query;

  if (!fileName) {
    db.destroy();
    return res.status(400).json({ message: "File name is required" });
  }

  try {
    // Step 1: Get the videoId from the fileName
    const videoId = await getVideoIdFromFileName(db, fileName);
    if (!videoId) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }

    // Step 2: Get the creator_id (userId of the video creator)
    const getCreatorQuery = "SELECT creator_id FROM videos WHERE id = ?";
    const [creatorResults] = await db
      .promise()
      .query(getCreatorQuery, [videoId]);

    if (creatorResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video creator not found" });
    }

    const userId = creatorResults[0].creator_id; // The userId of the video creator

    db.destroy();
    return res.status(200).json({ userId });
  } catch (error) {
    console.error("Error fetching userId by filename:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Get video list
app.get("/video-list", (req, res) => {
  const db = dbRequest(dbHost);
  const selectQuery = "SELECT id, title, description, fileName FROM videos";
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
  // console.log("Received Comment Request:");
  // console.log("User ID:", userId);
  // console.log("Video ID:", video_id);
  // console.log("Comment:", comment);
  if (!video_id || !comment) {
    db.destroy();
    return res
      .status(400)
      .json({ message: "Video ID and comment are required" });
  }
  try {
    const insertQuery =
      "INSERT INTO comments (user_id, video_id, content) VALUES (?, ?, ?)";
    const [result] = await db
      .promise()
      .query(insertQuery, [userId, video_id, comment]);
    const commentId = result.insertId;

    // Get the username from user_id
    const getUsernameQuery = "SELECT username FROM users WHERE id = ?";
    const [userResults] = await db.promise().query(getUsernameQuery, [userId]);
    if (userResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "User not found" });
    }
    const username = userResults[0].username;

    // Get the video title from video_id
    const getVideoTitleQuery = "SELECT title FROM videos WHERE id = ?";
    const [videos] = await db.promise().query(getVideoTitleQuery, [video_id]);
    if (videos.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }
    const videoTitle = videos[0].title;
    console.log(username + " commented " + '"' + comment + '"' + " on video: " + videoTitle);

    // Get the video creator's ID
    const getVideoCreatorQuery = "SELECT creator_id FROM videos WHERE id = ?";
    const [videoResults] = await db
      .promise()
      .query(getVideoCreatorQuery, [video_id]);

    if (videoResults.length > 0) {
      const videoCreatorId = videoResults[0].creator_id;
      // Don't create a notification if the commenter is the video creator
      if (videoCreatorId !== userId) {
        // Create the notification
        const createNotificationQuery =
          "INSERT INTO notifications (recipient_id, sender_id, content_id, content_type, action_type) VALUES (?, ?, ?, 'video', 'comment')";

        await db
          .promise()
          .query(createNotificationQuery, [videoCreatorId, userId, video_id]);
      }
    }
    db.destroy();
    return res
      .status(200)
      .json({ message: "Comment posted successfully!", commentId: commentId });
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
    return res
      .status(400)
      .json({ message: "Comment ID and reply content are required" });
  }
  try {
    const insertQuery =
      "INSERT INTO reply (creator_id, content, comment_id) VALUES (?, ?, ?)";
    const [result] = await db
      .promise()
      .query(insertQuery, [userId, reply, comment_id]);
    const replyId = result.insertId;

    // Get the comment creator's ID
    const getCommentCreatorQuery = "SELECT user_id FROM comments WHERE id = ?";
    const [commentResults] = await db
      .promise()
      .query(getCommentCreatorQuery, [comment_id]);

    if (commentResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Comment not found" });
    }

    const commentCreatorId = commentResults[0].user_id;

    // Don't create a notification if the replier is the comment creator
    if (commentCreatorId !== userId) {
      // Create the notification
      const createNotificationQuery =
        "INSERT INTO notifications (recipient_id, sender_id, content_id, content_type, action_type) VALUES (?, ?, ?, 'comment', 'reply')";

      await db
        .promise()
        .query(createNotificationQuery, [commentCreatorId, userId, comment_id]);
    }
    // Get the username from user_id
    const getUsernameQuery = "SELECT username FROM users WHERE id = ?";
    const [userResults] = await db.promise().query(getUsernameQuery, [userId]);
    if (userResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "User not found" });
    }
    const username = userResults[0].username;
    // Get the video title from the comment_id
    const getVideoTitleQuery = `
      SELECT v.title 
      FROM videos v 
      JOIN comments c ON v.id = c.video_id 
      WHERE c.id = ?
    `;
    const [videoResults] = await db.promise().query(getVideoTitleQuery, [comment_id]);
    if (videoResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }
    const videoTitle = videoResults[0].title;

    console.log(`${username} posted a reply (${replyId}) that says "${reply}" on video: ${videoTitle}`);
    db.destroy();
    return res
      .status(200)
      .json({ message: "Reply posted successfully!", replyId: replyId });
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

// ------------------------------
// FOLLOW / UNFOLLOW ENDPOINTS
// ------------------------------

// Follow a user (requires authentication)
app.post("/follow-user", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { targetUserId, fileName } = req.body;
  const userId = req.user.userId; // Get the logged-in user's ID from the token

  // console.log("Received fileName in /follow-user:", fileName);

  if (!targetUserId) {
    db.destroy();
    return res.status(400).json({ message: "targetUserId is required" });
  }
  if (!fileName) {
    db.destroy();
    return res.status(400).json({ message: "fileName is required" });
  }

  try {
    // Check if already following
    const checkQuery =
      "SELECT * FROM follows WHERE follower_id = ? AND following_id = ?";
    const [existing] = await db
      .promise()
      .query(checkQuery, [userId, targetUserId]);
    if (existing.length > 0) {
      db.destroy();
      return res.status(200).json({ message: "Already following" });
    }

    // Insert follow record
    const insertQuery =
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)";
    await db.promise().query(insertQuery, [userId, targetUserId]);

    const videoId = await getVideoIdFromFileName(db, fileName);
    if (!videoId) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }

    // Optionally, create a notification for the followed user
    const notifQuery = `
      INSERT INTO notifications (recipient_id, sender_id, content_id, content_type, action_type)
      VALUES (?, ?, ?, 'video', 'follow')
    `;
    await db.promise().query(notifQuery, [targetUserId, userId, videoId]);

    db.destroy();
    return res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Error following user:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Unfollow a user (requires authentication)
app.post("/unfollow-user", authenticateToken, async (req, res) => {
  // alert("unfollow-user endpoint hit");
  const db = dbRequest(dbHost);
  const { targetUserId } = req.body;
  const userId = req.user.userId; // Get the logged-in user's ID from the token

  if (!userId) {
    db.destroy();
    return res.status(400).json({ message: "User ID is required" });
  }
  if (!targetUserId) {
    db.destroy();
    return res.status(400).json({ message: "Target User ID is required" });
  }
  try {
    const deleteQuery = `
      DELETE FROM follows WHERE follower_id = ? AND following_id = ?
    `;
    const [followResults] = await db
      .promise()
      .query(deleteQuery, [userId, targetUserId]);

    db.destroy();
    return res.status(200).json({ message: "Successfully unfollowed" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

app.get("/get-follow-status", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { targetUserId } = req.query;
  const userId = req.user.userId; // Get the logged-in user's ID from the token

  if (!targetUserId) {
    db.destroy();
    return res.status(400).json({ message: "Target User ID is required" });
  }

  try {
    // Check if the logged-in user is following the video creator
    const selectQuery = `
      SELECT * FROM follows WHERE follower_id = ? AND following_id = ?
    `;
    const [followResults] = await db
      .promise()
      .query(selectQuery, [userId, targetUserId]);

    db.destroy();
    return res.status(200).json({ following: followResults.length > 0 });
  } catch (error) {
    console.error("Error fetching follow status:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

app.get("/get-is-self", authenticateToken, async (req, res) => {
  const { targetUserId } = req.query;
  const userId = req.user.userId; // Get the logged-in user's ID from the token

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!targetUserId) {
    return res.status(400).json({ message: "Target User ID is required" });
  }
  // console.log(userId + " " + targetUserId);
  // console.log(userId == targetUserId);
  return res.status(200).json({ isSelf: userId == targetUserId });
});

app.get("/get-follow-count", async (req, res) => {
  const db = dbRequest(dbHost);
  const { targetUserId } = req.query;
  // console.log(targetUserId);

  if (!targetUserId) {
    return res.status(400).json({ message: "Target User Id is required" });
  }

  try {
    const selectQuery = `
      SELECT COUNT(*) AS follow_count FROM follows WHERE following_id = ?
    `;
    const [result] = await db.promise().query(selectQuery, [targetUserId]);
    return res.status(200).json({ follow_count: result[0].follow_count }); // Return the count
  } catch (error) {
    console.error("Error displaying follower count:", error);
    return res.status(500).json({ message: "Database error", error });
  } finally {
    db.destroy(); // Ensure the connection is closed in the `finally` block
  }
});

app.get("/get-follow-count-user", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const userID = req.user.userId;

  try {
    const selectQuery = `
      SELECT COUNT(*) AS follow_count FROM follows WHERE following_id = ?
    `;
    const [result] = await db.promise().query(selectQuery, [userID]);

    // console.log("Follows fetched: ", result[0].follow_count);

    db.destroy();
    return res.status(200).json({ follow_count: result[0].follow_count }); // Return the count
  } catch (error) {
    console.error("Error displaying follower count:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

app.post("/follow-user-profile", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { targetUserId } = req.body;
  const userId = req.user.userId; // Get the logged-in user's ID from the token

  // console.log("Received fileName in /follow-user:", fileName);

  if (!targetUserId) {
    db.destroy();
    return res.status(400).json({ message: "targetUserId is required" });
  }

  try {
    // Check if already following
    const checkQuery =
      "SELECT * FROM follows WHERE follower_id = ? AND following_id = ?";
    const [existing] = await db
      .promise()
      .query(checkQuery, [userId, targetUserId]);
    if (existing.length > 0) {
      db.destroy();
      return res.status(200).json({ message: "Already following" });
    }

    // Insert follow record
    const insertQuery =
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)";
    await db.promise().query(insertQuery, [userId, targetUserId]);

    db.destroy();
    return res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Error following user:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

// Delete video (requires authentication)
app.delete("/delete-video-admin", authenticateToken, async (req, res) => {
  const db = dbRequest(dbHost);
  const { videoId } = req.body;
  const userId = req.user.userId; // Get the logged-in user's ID from the token
  if (!videoId) {
    db.destroy();
    return res.status(400).json({ message: "Video ID is required" });
  }


  try {
    // Check if the video exists and belongs to the user
    
    const selectQuery = "SELECT fileName FROM videos WHERE id = ?";
    const [videoResults] = await db.promise().query(selectQuery, videoId);

    // Check if the user is a Developer
    const userQuery = "SELECT role FROM users WHERE id = ?";
    const [userResults] = await db.promise().query(userQuery, [userId]);

    if (userResults.length === 0 || userResults[0].role !== "developer") {
      db.destroy();
      return res.status(403).json({ message: "Unauthorized: Not a Developer" });
    }
    if (videoResults.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Video not found" });
    }

    const fileName = videoResults[0].fileName;
    const filePath = path.join("./media/", fileName);

    // Delete the video record from the database
    const deleteQuery = "DELETE FROM videos WHERE id = ?";
    await db.promise().query(deleteQuery, [videoId]);

    // Delete the video file from the filesystem
    deleteFile(filePath);

    db.destroy();
    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    db.destroy();
    return res.status(500).json({ message: "Database error", error });
  }
});

function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file ${filePath}: `, err);
    } else {
      // console.log(`File ${filePath} deleted successfully`);
    }
  });
}

// Use server.listen instead of app.listen to enable socket.io
server.listen(port, () => {
  console.log(`Upload Server is running at http://localhost:${port}`);
});
