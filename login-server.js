import express from "express";

import cors from "cors";
import bcrypt from "bcryptjs"; // For hashing passwords
import jwt from "jsonwebtoken"; // For generating tokens
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = 8081;

let dbHost = "localhost";
if (process.env.DATABASE_HOST) {
  dbHost = process.env.DATABASE_HOST;
}

let frontendUrl = "http://localhost:5173"; // Default for development
if (process.env.VITE_FRONTEND_URL) {
  frontendUrl = process.env.VITE_FRONTEND_URL; // Use environment variable in production
}

// Middleware to parse incoming JSON requests
app.use(express.json());

// Enable CORS
app.use(cors());

import dbRequest from "./db.js";

// Nodemailer setup
const emailUser = process.env.VITE_EMAIL_USER;
const emailPassword = process.env.VITE_EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser, // Replace with your email
    pass: emailPassword, // Replace with your app password( watch the video to know how to get app password)
  },
});

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

        // Generate a verification token
        const verificationToken = jwt.sign({ email }, "secretkey", {
          expiresIn: "1d",
        });

        // Insert new user into the database
        const query =
          "INSERT INTO users (username, email, password, role, isVerified, verificationToken) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [
          username,
          email,
          hashedPassword,
          "user",
          false,
          verificationToken,
        ];

        db.query(query, values, (err, result) => {
          if (err) {
            console.error("Error inserting data: ", err);
            db.destroy();
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }
          // Send verification email
          const verificationLink = `${frontendUrl}/verify-email/${verificationToken}`; // Change to your frontend URL when deploying
          const mailOptions = {
            from: emailUser, // your email
            to: email,
            subject: "Confirm Your Email for Engage",
            text: `Thank you for signing up! To complete your registration, please confirm your email by following this link: ${verificationLink}. If you didn’t request this, you can ignore this email.`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Error sending email: ", error);
              return res.status(500).json({ message: "Error sending email" });
            }
            db.destroy();
            return res.status(201).json({
              message:
                "User signed up successfully. Please check your email to verify your account.",
            });
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

// Recover Account Route
app.get("/recover-account", (req, res) => {
  const db = dbRequest(dbHost);
  const { token } = req.query;

  if (!token) {
    db.destroy();
    return res.status(400).json({ message: "Recovery token is required" });
  }

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) {
      db.destroy();
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = decoded.email;

    const updateQuery = "UPDATE users SET recoveryToken = NULL WHERE email = ?";
    db.query(updateQuery, [email], (err, result) => {
      if (err) {
        db.destroy();
        return res.status(500).json({ message: "Database error" });
      }
      db.destroy();
      return res.status(200).json({ message: email });
    });
  });
});

// Send Recovery Link Route
app.post("/send-recovery-link", (req, res) => {
  const db = dbRequest(dbHost);
  const { email } = req.body;

  if (!email) {
    db.destroy();
    return res.status(400).json({ message: "Email is required" });
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

    const user = results[0];
    const recoveryToken = jwt.sign({ email: user.email }, "secretkey", {
      expiresIn: "1h",
    });

    const recoveryLink = `${frontendUrl}/recover-account/${recoveryToken}`;
    const mailOptions = {
      from: emailUser,
      to: email,
      subject: "Password Recovery",
      text: `The link will expire in 1 hour. Click this link to reset your password: ${recoveryLink}`,
    };
    const attachTokenQuery =
      "UPDATE users SET recoveryToken = ? WHERE email = ?";
    db.query(attachTokenQuery, [recoveryToken, email], (err) => {
      if (err) {
        console.error("Database error:", err);
        db.destroy();
        return res.status(500).json({ message: "Database error" });
      }
    });

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        db.destroy();
        return res.status(500).json({ message: "Error sending email" });
      }

      db.destroy();
      return res.status(200).json({
        message: "Recovery link sent successfully. Please check your email.",
      });
    });
  });
});

// Email Verification Route
app.get("/verify-email", (req, res) => {
  const db = dbRequest(dbHost);
  const { token } = req.query;

  if (!token) {
    db.destroy();
    return res.status(400).json({ message: "Missing token" });
  }

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) {
      db.destroy();
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = decoded.email;
    const updateQuery =
      "UPDATE users SET isVerified = true, verificationToken = NULL WHERE email = ?";

    db.query(updateQuery, [email], (err, result) => {
      if (err) {
        db.destroy();
        return res.status(500).json({ message: "Database error" });
      }
      db.destroy();
      return res
        .status(200)
        .json({ message: "Email verified successfully! You can now log in." });
    });
  });
});

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

    // Check if user is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

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

app.get("/fetch-reply-liked", authenticateTokenGet, (req, res) => {
  const user_id = req.user.userId;
  const { reply_id } = req.query;

  const db = dbRequest(dbHost);

  const query = "SELECT * FROM reply_likes WHERE user_id = ? AND reply_id = ?";
  db.query(query, [user_id, reply_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      db.destroy();
      return res.status(500).json({ message: "Database error" });
    }

    db.destroy();
    return res.status(200).json({ liked: results.length > 0 });
  });
});

// Updated like-video endpoint
app.post("/like-reply", authenticateTokenGet, (req, res) => {
  const { fileName, reply_id } = req.body;
  const userId = req.user.userId;
  const db = dbRequest(dbHost);

  console.log("User ID:", userId);

  // Check if user already liked the reply
  const checkLikeQuery =
    "SELECT * FROM reply_likes WHERE user_id = ? AND reply_id = ?";
  db.query(checkLikeQuery, [userId, reply_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      db.destroy();
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      // User already liked the video -> Unlike it
      const unlikeQuery =
        "DELETE FROM reply_likes WHERE user_id = ? AND reply_id = ?";
      db.query(unlikeQuery, [userId, reply_id], (err) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }
        db.destroy();
        return res.status(200).json({ message: "Reply unliked successfully" });
      });
    } else {
      // User hasn't liked the comment -> Like it
      const likeQuery =
        "INSERT INTO reply_likes (user_id, reply_id) VALUES (?, ?)";
      db.query(likeQuery, [userId, reply_id], (err) => {
        if (err) {
          console.error("Database error:", err);
          db.destroy();
          return res.status(500).json({ message: "Database error" });
        }
        db.destroy();
        return res.status(200).json({ message: "Reply liked successfully" });
      });
    }
  });
});

app.get("/reply-like-count", authenticateTokenGet, (req, res) => {
  const { reply_id } = req.query;
  const db = dbRequest(dbHost);
  const query =
    "SELECT COUNT(*) AS like_count FROM reply_likes WHERE reply_id = ?";
  db.query(query, [reply_id], (err, results) => {
    db.destroy();
    if (err) {
      console.error("Database error:", err);

      return res.status(500).json({ message: "Database error" });
    }
    res.json({ like_count: results[0].like_count }); // Send response
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

// addReply const
export const addReply = async (req, res) => {
  const db = dbRequest(dbHost);
  const { commentId, content } = req.body;
  const userId = req.user.userId;

  if (!commentId || !content) {
    db.destroy();
    return res
      .status(400)
      .json({ message: "Comment ID and content are required" });
  }

  try {
    const addReplyQuery =
      "INSERT INTO REPLY (creator_id, content, comment_id) VALUES (?, ?, ?)";
    db.query(addReplyQuery, [userId, content, commentId], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        db.destroy();
        return res.status(500).json({ message: "Database error" });
      }

      db.destroy();
      return res.status(201).json({
        message: "Reply added successfully",
        replyId: result.insertId,
      });
    });
  } catch (error) {
    console.error("Error:", error.message);
    db.destroy();
    return res.status(400).json({ message: error.message });
  }
};

// Register routes
app.post("/signup", signup);
app.post("/addReply", addReply);
// app.post("/login", login);

// Start the Server
app.listen(port, () => {
  console.log(`Login Server is running at http://localhost:${port}`);
});
