import express from "express";

import cors from "cors";
import bcrypt from "bcryptjs"; // For hashing passwords
import jwt from "jsonwebtoken"; // For generating tokens

const app = express();
const port = 8081;

let dbHost = "localhost";
if (process.env.DATABASE_HOST) {
  dbHost = process.env.DATABASE_HOST;
}

// Middleware to parse incoming JSON requests
app.use(express.json());

// Enable CORS
app.use(cors());

import dbRequest from "./db.js";

// Signup Route
export const signup = async (req, res) => {
  const db = dbRequest(dbHost);
  const { username, email, password } = req.body;

  // Basic input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Selects queries to be checked for uniqueness
  const checkUsernameQuery = "SELECT * FROM users WHERE username = ?";
  const checkEmailQuery = "SELECT * FROM users WHERE email = ?";

  // Promise allows multiple checks in succession before an action
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(checkUsernameQuery, [username], (err, results) => {
        // Checks for unique username
        if (err) return reject(err);
        if (results.length > 0) {
          return reject({ status: 409, message: "Username already exists" });
        }
        resolve(); // Continue to the next step if username is unique
      });
    }),
    new Promise((resolve, reject) => {
      db.query(checkEmailQuery, [email], (err, results) => {
        // Checks for unique email
        if (err) return reject(err);
        if (results.length > 0) {
          return reject({ status: 409, message: "Email already exists" });
        }
        resolve(); // Continue to the next step if email is unique
      });
    }),
  ])
    .then(() => {
      // If username and email are unique, hash the password before storing
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password: ", err);
          return res.status(500).json({ message: "Server error" });
        }

        // Insert new user into the database
        const query =
          "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
        const values = [username, email, hashedPassword, "user"];

        db.query(query, values, (err, result) => {
          if (err) {
            console.error("Error inserting data: ", err);
            db.destroy();
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }
          db.destroy();
          return res.status(201).json({
            message: "User signed up successfully",
          });
        });
      });
    })
    .catch((error) => {
      // Handle errors from either username or email check
      if (error.status) {
        db.destroy();
        return res.status(error.status).json({ message: error.message });
      }
      // For any other errors (e.g., database error)
      console.error("Error: ", error);
      db.destroy();
      return res.status(500).json({ message: "Database error", error });
    });
};

const authenticateTokenGet = (req, res, next) => {
  const { auth: token } = req.query;
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

// Login Route (Unchanged)
app.post("/login", (req, res) => {
  const db = dbRequest(dbHost);
  const { usernameOrEmail, password } = req.body;

  // Basic input validation
  if (!usernameOrEmail || !password) {
    db.destroy();
    return res.status(400).json({ message: "All fields are required" });
  }

  // Find user by username or email
  const query = "SELECT * FROM users WHERE username = ? OR email = ? ";
  // UsernameOrEmail fills in for both ?
  db.query(query, [usernameOrEmail, usernameOrEmail], (err, results) => {
    if (err) {
      console.error("Error querying database: ", err);
      db.destroy();
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (results.length === 0) {
      // User not found - return 404
      db.destroy();
      return res.status(404).json({ message: "User does not exist!" });
    }

    const user = results[0];

    // Compare passwords
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Error comparing passwords: ", err);
        db.destroy();
        return res.status(500).json({ message: "Server error" });
      }
      // Passwords don't match
      if (!isMatch) {
        db.destroy();
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // After successfully login, will generate JWT token for authentication in PrivateRoute
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        "secretkey", // Secret key for JWT
        { expiresIn: "1h" } // Token expiration time
      );

      return res.status(200).json({
        message: "Login successful",
        token: token,
      });
    });
  });
});

app.get("/current-user-id", authenticateTokenGet, (req, res) => {
  // req user for requests
  return res.status(200).json({ userId: req.user.userId });
});

app.get("/get-user-videos", authenticateTokenGet, (req, res) => {
  const db = dbRequest(dbHost);
  const userid = req.user.userId;
  const getVideosQuery = "SELECT * FROM videos WHERE creator_id = ?";
  db.query(getVideosQuery, [userid], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      db.destroy();
      return res.status(500).json({ message: "Database error" });
    }
    db.destroy();
    return res.status(200).json({ videos: results });
  });
});

app.post("/reset-password", (req, res) => {
  const db = dbRequest(dbHost);
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    db.destroy();
    return res
      .status(400)
      .json({ message: "Email and new password are required" });
  }

  const findUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(findUserQuery, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      db.destroy();
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      db.destroy();
      return res.status(404).json({ message: "Email does not exist" });
    }

    // Hash the new password
    bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error("Error hashing password:", hashErr);
        db.destroy();
        return res.status(500).json({ message: "Server error" });
      }

      // Update the password in the database
      const updateQuery = "UPDATE users SET password = ? WHERE email = ?";
      db.query(updateQuery, [hashedPassword, email], (updateErr) => {
        if (updateErr) {
          console.error("Error updating password:", updateErr);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }
        db.destroy();
        return res
          .status(200)
          .json({ message: "Password reset successfully! Redirecting..." });
      });
    });
  });
});

app.post("/verifyToken", (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true });
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
      console.log("Found videoId:", videoId);
      resolve(videoId);
    });
  });
}

// Video likes by filename endpoint
app.get("/video-likes-by-filename/:fileName", (req, res) => {
  const { fileName } = req.params;
  const db = dbRequest(dbHost);

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      const likeCountQuery =
        "SELECT COUNT(*) AS likeCount FROM likes WHERE video_id = ?";
      db.query(likeCountQuery, [videoId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }

        db.destroy();
        return res.status(200).json({ likeCount: results[0].likeCount });
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ likeCount: 0, message: error.message });
    });
});

// Check like status endpoint
app.get("/check-like-status", authenticateTokenGet, (req, res) => {
  const userId = req.user.userId;
  const { fileName } = req.query;
  const db = dbRequest(dbHost);

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      const query = "SELECT * FROM likes WHERE user_id = ? AND video_id = ?";
      db.query(query, [userId, videoId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res
            .status(500)
            .json({ liked: false, message: "Database error" });
        }

        db.destroy();
        return res.status(200).json({ liked: results.length > 0 });
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ liked: false, message: error.message });
    });
});

// Updated like-video endpoint
app.post("/like-video", authenticateTokenGet, (req, res) => {
  const { fileName } = req.body;
  const userId = req.user.userId;
  const db = dbRequest(dbHost);

  console.log("User ID:", userId);
  console.log("Video Name:", fileName);

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      // Check if user already liked the video
      const checkLikeQuery =
        "SELECT * FROM likes WHERE user_id = ? AND video_id = ?";
      db.query(checkLikeQuery, [userId, videoId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
          // User already liked the video -> Unlike it
          const unlikeQuery =
            "DELETE FROM likes WHERE user_id = ? AND video_id = ?";
          db.query(unlikeQuery, [userId, videoId], (err) => {
            if (err) {
              console.error("Database error:", err);
              db.destroy();
              return res.status(500).json({ message: "Database error" });
            }
            db.destroy();
            return res
              .status(200)
              .json({ message: "Video unliked successfully" });
          });
        } else {
          // User hasn't liked the video -> Like it
          const likeQuery =
            "INSERT INTO likes (user_id, video_id) VALUES (?, ?)";
          db.query(likeQuery, [userId, videoId], (err) => {
            if (err) {
              console.error("Database error:", err);
              db.destroy();
              return res.status(500).json({ message: "Database error" });
            }
            db.destroy();
            return res
              .status(200)
              .json({ message: "Video liked successfully" });
          });
        }
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ message: error.message });
    });
});

// Record a view when a video is watched
app.post("/record-view", authenticateTokenGet, (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.body;
  const userId = req.user.userId;

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      const recordViewQuery =
        "INSERT INTO video_views (video_id, user_id) VALUES (?, ?)";
      db.query(recordViewQuery, [videoId, userId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }

        db.destroy();
        return res.status(200).json({ message: "View recorded successfully" });
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ message: error.message });
    });
});

// Get total view count for a specific video by fileName
app.get("/video-views/:fileName", (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.params;

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      const viewCountQuery =
        "SELECT COUNT(*) AS viewCount FROM video_views WHERE video_id = ?";
      db.query(viewCountQuery, [videoId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }

        db.destroy();
        return res.status(200).json({ viewCount: results[0].viewCount });
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ viewCount: 0, message: error.message });
    });
});

// Anonymous version of record-view that doesn't require authentication
app.post("/record-anonymous-view", (req, res) => {
  const db = dbRequest(dbHost);
  const { fileName } = req.body;

  if (!fileName) {
    db.destroy();
    return res.status(400).json({ message: "Video file name is required" });
  }

  getVideoIdFromFileName(db, fileName)
    .then((videoId) => {
      const recordViewQuery =
        "INSERT INTO video_views (video_id, user_id) VALUES (?, NULL)";
      db.query(recordViewQuery, [videoId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }

        db.destroy();
        return res
          .status(200)
          .json({ message: "Anonymous view recorded successfully" });
      });
    })
    .catch((error) => {
      console.error("Error:", error.message);
      db.destroy();
      return res.status(400).json({ message: error.message });
    });
});

// Register routes
app.post("/signup", signup);
// app.post("/login", login);

// Start the Server
app.listen(port, () => {
  console.log(`Login Server is running at http://localhost:${port}`);
});
