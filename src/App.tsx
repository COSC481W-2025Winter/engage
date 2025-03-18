import "./styles/App.scss";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./login.tsx";
import Signup from "./signup.tsx";
import PrivateRoute from "./PrivateRoute";
import ResetPassword from "./resetPassword.tsx";
import ReactPlayer from "react-player";
import User from "./User";
import path from "path-browserify";
import Upload from "./upload.tsx";
import axios from "axios";
import Terms from "./terms.tsx";

// Dynamically import all video files from the media folder
const videos = import.meta.glob("../media/*trans.mp4");

let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}
let loginServer = "http://localhost:8081";
if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}

// Asynchronously create an array of video paths from imported media folder
async function createVideoArray() {
  const vidPaths: Array<string | null> = [];
  const dbPaths: Array<string> = [];
  try {
    const response = await axios.get(`${uploadServer}/video-list`);
    response.data.forEach((video: { fileName: string }) => {
      dbPaths.push(video.fileName);
    });
  } catch (error) {
    console.error(`Error fetching video info:`, error);
    return [];
  }
  for (const videoKey of Object.keys(videos)) {
    const ext = path.extname(videoKey).toLowerCase();
    if (ext === ".mp4") {
      const videoFileName: string = path.posix.basename(videoKey);
      if (dbPaths.includes(videoFileName)) {
        vidPaths.push(videoKey);
      }
    }
  }
  return vidPaths;
}

function randomizeArray(array: Array<string | null>) {
  let index = array.length;
  while (index !== 0) {
    const randomIndex = Math.floor(Math.random() * index);
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
    index--;
  }
}

const array: Array<string | null> = await createVideoArray();
randomizeArray(array);
const filteredArray = array.filter((item) => item !== undefined);

// Function to check if the auth token is expired
function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    return now >= expiry;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

// Remove authToken if it's expired
const token = localStorage.getItem("authToken");
if (token && isTokenExpired(token)) {
  localStorage.removeItem("authToken");
}

function Home() {
  const initState = filteredArray.length < 2 ? 0 : 1;
  const [videoIndex, setVideoIndex] = useState(initState);
  const [currentVideo, setCurrentVideo] = useState("");
  const [notification, setNotification] = useState("");
  const [comment, setComment] = useState("");

  // Updated comment interface to include likeCount and liked status
  interface CommentType {
    id: number;
    username: string;
    comment: string;
    created_at: string;
    likeCount?: number;
    liked?: boolean;
    replies?: ReplyType[];
  }
  interface ReplyType {
    id: number;
    username: string;
    reply: string;
    created_at: string;
  }
  const [comments, setComments] = useState<CommentType[]>([]);

  // For reply functionality:
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [replyVisible, setReplyVisible] = useState<{ [key: number]: boolean }>({});
  const [repliesVisible, setRepliesVisible] = useState<{ [key: number]: boolean }>({});

  // The comment section is toggled by the COMMENT button.
  const [showComments, setShowComments] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [viewRecorded, setViewRecorded] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setLiked(false);
    setViewRecorded(false);
    setCurrentVideo(filteredArray[videoIndex] || "");
  }, [videoIndex]);

  useEffect(() => {
    if (currentVideo) {
      console.log("Video changed to:", currentVideo.split("/").pop());
      getLikeCount();
      getViewCount();
      if (loggedIn && userID) {
        checkIfLiked();
      }
      // Fetch comments for current video.
      displayComments();
    }
  }, [currentVideo, loggedIn, userID]);

  const handleNext = () => {
    setVideoIndex((prevIndex) => (prevIndex + initState) % filteredArray.length);
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  async function getUsername(userid: number) {
    let creatorName = "";
    await axios
      .get(`${uploadServer}/user`, {
        params: { userID: userid },
      })
      .then((response) => {
        creatorName = response.data.username;
      });
    return creatorName as string;
  }

  async function getVideoInfo() {
    let title = "";
    let desc = "";
    let userid = 0;
    let creatorName = "";
    await axios
      .get(`${uploadServer}/video`, {
        params: {
          fileName: currentVideo.substring(currentVideo.lastIndexOf("/") + 1),
        },
      })
      .then((response) => {
        title = response.data.title;
        desc = response.data.description;
        userid = response.data.creator_id;
      })
      .catch((error) => {
        alert(`There was an error fetching the video info!\n\n${error}`);
      });
    creatorName = await getUsername(userid);
    if (!desc) {
      desc = "No description provided";
    }
    alert(
      `Title: ${title}\n--------------------------\nDescription: ${desc}\n--------------------------\nCreator: ${creatorName}\n--------------------------\nViews: ${viewCount}`
    );
  }

  async function getLoggedInUserId() {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const response = await axios.get(`${loginServer}/current-user-id`, {
          params: { auth: token },
        });
        setUserID(response.data.userId);
        setLoggedIn(true);
        return response.data.userId;
      } catch (error) {
        console.error("Error fetching user ID:", error);
        return null;
      }
    } else {
      return null;
    }
  }
  getLoggedInUserId();

  async function assignUsername() {
    if (loggedIn) {
      const name = await getUsername(userID);
      setUsername(name);
    }
  }
  assignUsername();

  async function getLikeCount() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }
      const response = await axios.get(
        `${loginServer}/video-likes-by-filename/${fileName}`
      );
      setLikeCount(response.data.likeCount);
    } catch (error) {
      console.error("Error fetching like count:", error);
      setLikeCount(0);
    }
  }

  async function checkIfLiked() {
    if (!loggedIn) {
      setLiked(false);
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLiked(false);
      return;
    }
    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      setLiked(false);
      return;
    }
    try {
      console.log("Making API request to check like status for:", fileName);
      const response = await axios.get(`${loginServer}/check-like-status`, {
        params: { auth: token, fileName: fileName },
      });
      console.log("Like status response:", response.data);
      setLiked(response.data.liked);
    } catch (error) {
      console.error("Error checking like status:", error);
      setLiked(false);
    }
  }

  async function handleLike() {
    if (!userID || !loggedIn) {
      alert("You must be logged in to like videos.");
      return;
    }
    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      console.error("Error: fileName is missing.");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Authentication error. Please log in again.");
      setLoggedIn(false);
      return;
    }
    try {
      const response = await axios.post(
        `${loginServer}/like-video`,
        { fileName: fileName },
        { params: { auth: token } }
      );
      if (response.data.message.includes("unliked")) {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error liking/unliking video:", error);
      alert("Failed to process like. Please try again.");
    }
  }

  async function getViewCount() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }
      const response = await axios.get(`${loginServer}/video-views/${fileName}`);
      setViewCount(response.data.viewCount);
    } catch (error) {
      console.error("Error fetching view count:", error);
      setViewCount(0);
    }
  }

  async function recordView() {
    try {
      if (viewRecorded) return;
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }
      if (loggedIn) {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        await axios.post(
          `${loginServer}/record-view`,
          { fileName },
          { params: { auth: token } }
        );
      } else {
        await axios.post(`${loginServer}/record-anonymous-view`, { fileName });
      }
      setViewCount((prev) => prev + 1);
      setViewRecorded(true);
    } catch (error) {
      console.error("Error recording view:", error);
    }
  }

  // Toggle the comment section using the COMMENT button.
  // Modified to simply toggle visibility without re-fetching comments.
  const toggleComments = () => {
    setShowComments((prev) => !prev);
  };

  // Post a comment and refresh the comments list.
  const postComment = async () => {
    if (comment.trim() === "") return;
    try {
      const token = localStorage.getItem("authToken");
      const fileName = currentVideo.split("/").pop();
      const videoRes = await axios.get(`${uploadServer}/video`, {
        params: { fileName },
      });
      if (!videoRes.data || !videoRes.data.id) {
        setNotification("⚠️ Video not found.");
        setTimeout(() => setNotification(""), 3000);
        return;
      }
      const videoId = videoRes.data.id;
      await axios.post(
        `${uploadServer}/post-comment`,
        { video_id: videoId, comment },
        { headers: { Authorization: token } }
      );
      setComment("");
      setNotification("✅ Successfully commented!");
      setTimeout(() => setNotification(""), 3000);
    } catch (error) {
      console.error("Error posting comment:", error);
      setNotification("⚠️ Failed to post comment.");
      setTimeout(() => setNotification(""), 3000);
    }
    displayComments();
  };

  // New function to toggle the like status of a comment
  async function toggleCommentLike(commentId: number) {
    if (!loggedIn) {
      alert("You must be logged in to like a comment.");
      return;
    }
    const token = localStorage.getItem("authToken");
    try {
      const response = await axios.post(
        `${uploadServer}/toggle-comment-like`,
        { comment_id: commentId },
        { headers: { Authorization: token } }
      );
      // Update local state for the toggled comment.
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            if (response.data.message === "Comment liked") {
              return { ...comment, liked: true, likeCount: (comment.likeCount || 0) + 1 };
            } else {
              return { ...comment, liked: false, likeCount: Math.max((comment.likeCount || 1) - 1, 0) };
            }
          }
          return comment;
        })
      );
    } catch (error) {
      console.error("Error toggling comment like:", error);
      alert("Failed to toggle comment like. Please try again.");
    }
  }

  // Fetch comments along with their replies.
  async function displayComments() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) return;
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: token } : {};
      const response = await axios.get(`${uploadServer}/get-comments`, {
        params: { fileName },
        headers,
      });
      const fetchedComments = response.data;
      const commentsWithUsernames = await Promise.all(
        fetchedComments.map(async (comment: any) => {
          const userResponse = await axios.get(`${uploadServer}/user`, {
            params: { userID: comment.user_id },
          });
          let replies: any[] = [];
          try {
            const repliesResponse = await axios.get(`${uploadServer}/get-replies`, {
              params: { comment_id: comment.id },
            });
            replies = await Promise.all(
              repliesResponse.data.map(async (reply: any) => {
                const replyUserResponse = await axios.get(`${uploadServer}/user`, {
                  params: { userID: reply.creator_id },
                });
                return {
                  id: reply.id,
                  username: replyUserResponse.data.username,
                  reply: reply.content,
                  created_at: reply.created_at,
                };
              })
            );
          } catch (e) {
            console.error("Error fetching replies for comment", comment.id, e);
          }
          return {
            id: comment.id,
            username: userResponse.data.username,
            comment: comment.content,
            created_at: comment.created_at,
            likeCount: comment.likeCount || 0,
            liked: comment.liked || false,
            replies: replies,
          };
        })
      );
      setComments(commentsWithUsernames);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }

  // Post a reply to a specific comment.
  async function postReply(commentId: number) {
    const replyText = replyInputs[commentId];
    if (!replyText || replyText.trim() === "") return;
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `${uploadServer}/post-reply`,
        { comment_id: commentId, reply: replyText },
        { headers: { Authorization: token } }
      );
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      displayComments();
    } catch (error) {
      console.error("Error posting reply:", error);
    }
    toggleReplyInput(commentId);
  }

  // Toggle visibility of replies for a specific comment.
  const toggleRepliesVisible = (commentId: number) => {
    setRepliesVisible((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Toggle the reply input for a specific comment.
  const toggleReplyInput = (commentId: number) => {
    setReplyVisible((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  return (
    <div className="app-container">
      <h1>Engage</h1>
      <div className="video-player">
        <ReactPlayer
          id="video"
          url={currentVideo || ""}
          playing={true}
          muted={true}
          controls={true}
          loop={true}
          playsinline={true}
          width="80vw"
          height="60vh"
          onStart={recordView}
        />
      </div>
      <div className="video-stats">
        <button onClick={handleLike} style={{ color: liked ? "red" : "black" }}>
          <i className="fa-solid fa-heart"></i> {likeCount} Likes
        </button>
        <span className="view-count">
          <i className="fa-solid fa-eye"></i> {viewCount} Views
        </span>
      </div>
      <div className="controls">
        <a className="control-button" href={currentVideo} download>
          <i className="fa-solid fa-download"></i> DOWNLOAD
        </a>
        <div className="control-button" onClick={getVideoInfo}>
          <i className="fas fa-info-circle"></i> VIDEO INFO
        </div>
        <button className="control-button" onClick={toggleComments}>
          COMMENT <i className="fa-solid fa-comment"></i>
        </button>
        <button className="control-button" onClick={handleNext}>
          NEXT <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
      <div className="upload-section">
        <button className="upload-button" onClick={() => navigate("/upload")}>
          ENGAGE <i className="fa-solid fa-upload"></i>
        </button>
      </div>
      <div className="back-button-section"></div>
      <div className="login-button-section">
        <button
          className="control-button"
          onClick={loggedIn ? () => navigate("/user") : handleBackToLogin}
        >
          {loggedIn ? (
            <>
              <i className="fa-solid fa-user"></i> {username}
            </>
          ) : (
            <>
              <i className="fa-solid fa-right-to-bracket"></i> Log In
            </>
          )}
        </button>
        {showComments && (
          <div
            className="comment-section"
            style={{
              position: "fixed",
              bottom: "13%",
              right: "28%",
              background: "white",
              padding: "10px",
              borderRadius: "5px",
              maxHeight: "40vh",
              overflowY: "auto",
            }}
          > 
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-box">
                  <p>
                    <strong>{c.username}</strong> ({c.created_at}): {c.comment}
                  </p>
                  {/* Toggle button for showing/hiding replies using icons */}
                  {c.replies && c.replies.length > 0 && (
                    <div style={{ width: "24px", textAlign: "center" }}>
                    <button
                      onClick={() => toggleRepliesVisible(c.id)}
                      style={{ border: "none", background: "transparent", cursor: "pointer" }}
                    >
                      {repliesVisible[c.id] ? (
                        <i className="fa-solid fa-chevron-up" style={{ fontSize: "1.2em", color: "#333" }}></i>
                      ) : (
                        <i className="fa-solid fa-chevron-down" style={{ fontSize: "1.2em", color: "#333" }}></i>
                      )}
                    </button>
                    </div>
                  )}
                  {/* Toggle the reply input for each comment */}
                  <button onClick={() => toggleReplyInput(c.id)}><i className="fa-regular fa-comments"></i></button>
                  {replyVisible[c.id] && (
                    <div style={{ marginLeft: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        value={replyInputs[c.id] || ""}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a reply..."
                      />
                      <button onClick={() => postReply(c.id)}><i className="fa-regular fa-paper-plane"></i></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {loggedIn && (
            <div className="comment-input-div">
              <textarea
                id="comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
              ></textarea>
              <button onClick={postComment}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          )}
          </div>
        )}

        {notification && (
          <div
            className="notification"
            style={{
              position: "fixed",
              bottom: "80px",
              right: "20px",
              background: "#28a745",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            {notification}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<App />} />
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/user" element={<User />} />
          <Route path="/upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
