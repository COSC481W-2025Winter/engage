import "./styles/App.scss"; // Import global and App-specific styles
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
import VerifyEmail from "./VerifyEmail.tsx";
import axios from "axios";
import Terms from "./terms.tsx";
import LikeButton from "./components/likeButton.tsx";
import TopBar from "./components/TopBar.tsx";
import RecoverAccount from "./recoverAccount.tsx";

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
    [array[index - 1], array[randomIndex]] = [array[randomIndex], array[index - 1]];
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

  // State for the comment text, and for toggling the comment input
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  // Comment type now includes an id, username, comment text, created_at, and optional replies.
  interface CommentType {
    id: number;
    username: string;
    comment: string;
    created_at: string;
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

  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [viewRecorded, setViewRecorded] = useState(false);

  // For reply likes
  const [replyLikeCount, setReplyLikeCount] = useState<{ [key: number]: number }>({});
  const [replyLiked, setReplyLiked] = useState<{ [key: number]: boolean }>({});

  // Comment like states
  const [commentLikeCount, setCommentLikeCount] = useState<{ [key: number]: number }>({});
  const [commentLiked, setCommentLiked] = useState<{ [key: number]: boolean }>({});

  const navigate = useNavigate();

  // current video states
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [currentVideoDesc, setCurrentVideoDesc] = useState("");
  const [currentVideoDate, setCurrentVideoDate] = useState("");
  const [currentVideoCreatorName, setCurrentVideoCreatorName] = useState("");

  useEffect(() => {
    setLiked(false);
    setViewRecorded(false);
    setCurrentVideo(filteredArray[videoIndex] || "");
  }, [videoIndex]);

  useEffect(() => {
    if (currentVideo) {
      console.log("Video changed to:", currentVideo.split("/").pop());
      getViewCount();
      if (loggedIn && userID) {
        checkIfLiked();
      }
      // Fetch comments for current video
      displayComments();
    }
  }, [currentVideo]);

  // Fetch comment like counts and liked status
  useEffect(() => {
    const fetchCommentLikes = async () => {
      const newCommentLikeCount: { [key: number]: number } = {};
      for (const comment of comments) {
        try {
          const likeCountResponse = await axios.get(`${uploadServer}/comment-like-count`, {
            params: { comment_id: comment.id },
          });
          newCommentLikeCount[comment.id] = likeCountResponse.data.likeCount;
        } catch (error) {
          newCommentLikeCount[comment.id] = 0;
        }
      }
      setCommentLikeCount(newCommentLikeCount);

      if (loggedIn) {
        const token = localStorage.getItem("authToken");
        const newCommentLiked: { [key: number]: boolean } = {};
        for (const comment of comments) {
          try {
            const likeStatusResponse = await axios.get(`${uploadServer}/fetch-comment-liked`, {
              params: { comment_id: comment.id },
              headers: { Authorization: token },
            });
            newCommentLiked[comment.id] = likeStatusResponse.data.liked;
          } catch (error) {
            newCommentLiked[comment.id] = false;
          }
        }
        setCommentLiked(newCommentLiked);
      } else {
        setCommentLiked({});
      }
    };
    fetchCommentLikes();
  }, [comments, loggedIn]);

  // Fetch reply like counts and liked status for each reply
  useEffect(() => {
    const fetchReplyLikes = async () => {
      const newReplyLikeCount: { [key: number]: number } = {};
      for (const comment of comments) {
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            try {
              const response = await axios.get(`${uploadServer}/reply-like-count`, {
                params: { reply_id: reply.id },
              });
              newReplyLikeCount[reply.id] = response.data.likeCount;
            } catch (error) {
              newReplyLikeCount[reply.id] = 0;
            }
          }
        }
      }
      setReplyLikeCount(newReplyLikeCount);

      if (loggedIn) {
        const token = localStorage.getItem("authToken");
        const newReplyLiked: { [key: number]: boolean } = {};
        for (const comment of comments) {
          if (comment.replies && comment.replies.length > 0) {
            for (const reply of comment.replies) {
              try {
                const response = await axios.get(`${uploadServer}/fetch-reply-liked`, {
                  params: { reply_id: reply.id },
                  headers: { Authorization: token },
                });
                newReplyLiked[reply.id] = response.data.liked;
              } catch (error) {
                newReplyLiked[reply.id] = false;
              }
            }
          }
        }
        setReplyLiked(newReplyLiked);
      } else {
        setReplyLiked({});
      }
    };

    fetchReplyLikes();
  }, [comments, loggedIn]);

  // Toggle like for a comment
  async function handleCommentLike(comment_id: number) {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to like comments.");
      return;
    }
    try {
      await axios.post(
        `${uploadServer}/like-comment`,
        { comment_id },
        { headers: { Authorization: token } }
      );
      setCommentLiked((prev) => {
        const newLiked = { ...prev, [comment_id]: !prev[comment_id] };
        setCommentLikeCount((prevCount) => {
          const currentCount = prevCount[comment_id] || 0;
          return {
            ...prevCount,
            [comment_id]: newLiked[comment_id]
              ? currentCount + 1
              : Math.max(0, currentCount - 1),
          };
        });
        return newLiked;
      });
    } catch (error) {
      console.error("Error liking/unliking comment:", error);
      alert("Failed to process like. Please try again.");
    }
  }

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

  // Grab video info from API
  async function setVideoInfo() {
    try {
      const response = await axios.get(`${uploadServer}/video`, {
        params: {
          fileName: currentVideo.substring(currentVideo.lastIndexOf("/") + 1),
        },
      });
      setCurrentVideoTitle(response.data.title);
      setCurrentVideoDesc(response.data.description);
      const username = await getUsername(response.data.creator_id);
      setCurrentVideoCreatorName(username);
      const date = new Date(response.data.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const time = new Date(response.data.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentVideoDate(`${date} at ${time}`);
    } catch (error) {
      alert(`There was an error fetching the video info!\n\n${error}`);
    }
  }

  async function getLoggedInUserId() {
    const localToken = localStorage.getItem("authToken");
    if (localToken) {
      try {
        const response = await axios.get(`${loginServer}/current-user-id`, {
          params: { auth: localToken },
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
      const response = await axios.get(`${loginServer}/video-likes-by-filename/${fileName}`);
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
    const localToken = localStorage.getItem("authToken");
    if (!localToken) {
      setLiked(false);
      return;
    }
    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      setLiked(false);
      return;
    }
    try {
      const response = await axios.get(`${loginServer}/check-like-status`, {
        params: { auth: localToken, fileName: fileName },
      });
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
    const localToken = localStorage.getItem("authToken");
    if (!localToken) {
      alert("Authentication error. Please log in again.");
      setLoggedIn(false);
      return;
    }
    try {
      const response = await axios.post(
        `${loginServer}/like-video`,
        { fileName },
        { params: { auth: localToken } }
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
      const localToken = localStorage.getItem("authToken");
      if (loggedIn && localToken) {
        await axios.post(
          `${loginServer}/record-view`,
          { fileName },
          { params: { auth: localToken } }
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

  // Updated handleReplyLike: sends only the reply_id along with authentication
  async function handleReplyLike(reply_id: number) {
    if (!userID || !loggedIn) {
      alert("You must be logged in to like replies.");
      return;
    }
    const localToken = localStorage.getItem("authToken");
    if (!localToken) {
      alert("Authentication error. Please log in again.");
      setLoggedIn(false);
      return;
    }
    try {
      await axios.post(
        `${loginServer}/like-reply`,
        { reply_id },
        { params: { auth: localToken } }
      );
      setReplyLiked((prev) => {
        const newState = { ...prev, [reply_id]: !prev[reply_id] };
        setReplyLikeCount((prevCounts) => {
          const currentCount = prevCounts[reply_id] || 0;
          return {
            ...prevCounts,
            [reply_id]: newState[reply_id]
              ? currentCount + 1
              : Math.max(0, currentCount - 1),
          };
        });
        return newState;
      });
    } catch (error) {
      console.error("Error liking/unliking reply:", error);
      alert("Failed to process like. Please try again.");
    }
  }

  const handleNext = () => {
    setVideoIndex((prevIndex) => (prevIndex + initState) % filteredArray.length);
  };

  // Post a comment
  async function postComment() {
    if (comment.trim() === "") return;
    try {
      const localToken = localStorage.getItem("authToken");
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        setNotification("⚠️ Video not found.");
        return;
      }
      // Get video info from server
      const videoRes = await axios.get(`${uploadServer}/video`, {
        params: { fileName },
      });
      if (!videoRes.data || !videoRes.data.id) {
        setNotification("⚠️ Video not found in DB.");
        setTimeout(() => setNotification(""), 3000);
        return;
      }
      const videoId = videoRes.data.id;

      // Attempt to post the comment
      await axios.post(
        `${uploadServer}/post-comment`,
        { video_id: videoId, comment },
        { headers: { Authorization: localToken || "" } }
      );

      setComment("");
      setNotification("✅ Successfully commented!");
      setTimeout(() => setNotification(""), 3000);
      displayComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      setNotification("⚠️ Failed to post comment (are you logged in?).");
      setTimeout(() => setNotification(""), 3000);
    }
  }

  const handleVideoStart = () => {
    recordView();
  };

  // Fetch comments for current video
  async function displayComments() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) return;
      const response = await axios.get(`${uploadServer}/get-comments`, {
        params: { fileName },
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
            replies: replies,
          };
        })
      );
      setComments(commentsWithUsernames);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }

  // Post a reply to a comment
  async function postReply(commentId: number) {
    const replyText = replyInputs[commentId];
    if (!replyText || replyText.trim() === "") return;
    try {
      const localToken = localStorage.getItem("authToken");
      await axios.post(
        `${uploadServer}/post-reply`,
        { comment_id: commentId, reply: replyText },
        { headers: { Authorization: localToken || "" } }
      );
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
      displayComments();
    } catch (error) {
      console.error("Error posting reply:", error);
      alert("Failed to post reply (are you logged in?).");
    }
    toggleReplyInput(commentId);
  }

  // Show/hide replies
  const toggleRepliesVisible = (commentId: number) => {
    setRepliesVisible((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Show/hide reply input
  const toggleReplyInput = (commentId: number) => {
    setReplyVisible((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  useEffect(() => {
    if (currentVideo) {
      setVideoInfo();
      displayComments();
    }
  }, [currentVideo]);

  return (
    <div className="app">
      <div className="app-container">
        <div className="video-player">
          <ReactPlayer
            id="video"
            url={currentVideo || ""}
            playing={true}
            muted={true}
            controls={true}
            loop={true}
            playsinline={true}
            width="90vw"
            height="60vh"
            onStart={handleVideoStart}
          />
          <div className="controls">
            <div className="video-stats">
              <LikeButton
                fileName={currentVideo ? currentVideo.split("/").pop() || "" : ""}
                loggedIn={loggedIn}
                userId={userID}
                initialLikeCount={likeCount}
                initialLiked={liked}
                loginServer={loginServer}
              />
              <span className="views">
                <i className="fa-solid fa-eye"></i> {viewCount}
                <span className="desktop__text"> Views</span>
              </span>
            </div>
            <div className="download-next">
              {filteredArray.length > 0 ? (
                <a className="button" href={currentVideo} download>
                  <i className="fa-solid fa-download"></i>
                  <span className="desktop__text"> DOWNLOAD</span>
                </a>
              ) : (
                <a className="button greyed">
                  <i className="fa-solid fa-download"></i>
                  <span className="desktop__text"> DOWNLOAD</span>
                </a>
              )}
              <a
                className={filteredArray.length < 2 ? "button greyed" : "button"}
                onClick={() => {
                  const videoElement = document.getElementById("video");
                  if (videoElement && filteredArray.length >= 2) {
                    videoElement.classList.remove("fade-in");
                    videoElement.classList.add("fade-out");
                    setTimeout(() => {
                      handleNext();
                      videoElement.classList.remove("fade-out");
                      videoElement.classList.add("fade-in");
                    }, 200);
                  }
                }}
              >
                <span className="desktop__text">NEXT </span>
                <i className="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="video-details">
          <div className="details-metadata">
            {filteredArray.length > 0 ? (
              <>
                <h1>{currentVideoTitle}</h1>
                <h2>Engager: {currentVideoCreatorName}</h2>
                <h3>Uploaded: {currentVideoDate}</h3>
                <p>{currentVideoDesc !== "" ? currentVideoDesc : "No Description Provided"}</p>
              </>
            ) : (
              <>
                <h2>There are no videos available</h2>
                <h3>Upload one to kick things off.</h3>
              </>
            )}

            <div className="comment-section">
              <button
                onClick={() => setShowCommentInput((prev) => !prev)}
                className="button"
                style={{ marginBottom: "10px" }}
              >
                Comment
              </button>

              {showCommentInput && (
                <div className="comment-input-div" style={{ marginBottom: "20px" }}>
                  <textarea
                    id="comment-input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."
                  />
                  <button onClick={postComment}>
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
              )}

              <div className="comments-list">
                {comments.map((c) => (
                  <div key={c.id} className="comment-box" style={{ color: "black", textAlign: "left" }}>
                    <p>
                      <strong>{c.username}</strong> ({c.created_at}): {c.comment}
                    </p>

                    <div
                      className="comment-like-section"
                      style={{ display: "flex", alignItems: "center", gap: "5px" }}
                    >
                      <button
                        onClick={() => handleCommentLike(c.id)}
                        style={{
                          color: commentLiked[c.id] ? "red" : "black",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <i className="fa-regular fa-thumbs-up"></i>
                      </button>
                      <span>
                        {commentLikeCount[c.id] !== undefined ? commentLikeCount[c.id] : 0}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "5px" }}>
                      {c.replies && c.replies.length > 0 && (
                        <div style={{ width: "24px", textAlign: "left", color: "black" }}>
                          <button
                            onClick={() => toggleRepliesVisible(c.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                          >
                            {repliesVisible[c.id] ? (
                              <i className="fa-solid fa-chevron-up" style={{ fontSize: "1.2em", color: "#333" }} />
                            ) : (
                              <i className="fa-solid fa-chevron-down" style={{ fontSize: "1.2em", color: "#333" }} />
                            )}
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => toggleReplyInput(c.id)}
                        style={{ border: "none", background: "transparent", cursor: "pointer" }}
                      >
                        <i className="fa-regular fa-comments"></i>
                      </button>
                      {replyVisible[c.id] && (
                        <div
                          style={{
                            marginTop: "5px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            minHeight: "40px",
                          }}
                        >
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
                          <button onClick={() => postReply(c.id)}>
                            <i className="fa-regular fa-paper-plane"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {repliesVisible[c.id] && c.replies && c.replies.length > 0 && (
                      <div style={{ marginLeft: "20px" }}>
                        {c.replies.map((r) => (
                          <div key={r.id}>
                            <p>
                              <strong>{r.username}</strong> ({r.created_at}): {r.reply}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: "3px",
                                position: "relative",
                                top: "-10px",
                                marginBottom: "-10px",
                              }}
                            >
                              <button
                                onClick={() => handleReplyLike(r.id)}
                                style={{
                                  color: replyLiked[r.id] ? "red" : "black",
                                }}
                              >
                                <i className="fa-regular fa-thumbs-up"></i>
                              </button>
                              <div id={`like-count-${r.id}`}>
                                {replyLikeCount[r.id] !== undefined ? replyLikeCount[r.id] : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/recover-account/:token" element={<RecoverAccount />} />
        <Route element={<PrivateRoute />}>
          <Route path="/user" element={<User />} />
          <Route path="/upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
