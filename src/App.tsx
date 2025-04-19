import "./styles/App.scss"; // Import global and App-specific styles
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// import Search from "./components/search.tsx";
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
import UserProfile from "./userProfile.tsx";
import CombinedSearch from "./combinedSearch.tsx";
// import UsernameLink from "./components/UsernameLink";
import About from "./About.tsx";
import Follow from "./components/follow.tsx"; // Import the Follow component
// import { color } from "framer-motion";

// Dynamically import all video files from the media folder
const videos = import.meta.glob("/media/*trans.mp4", { eager: true });

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
      // vidPaths.push(videoKey);
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
  // const authToken = localStorage.getItem("authToken") || ""; // Retrieve the token from localStorage

  const initState = filteredArray.length < 2 ? 0 : 1;
  const [videoIndex, setVideoIndex] = useState(initState);
  const [currentVideo, setCurrentVideo] = useState("");
  const [notification, setNotification] = useState("");
  const [comment, setComment] = useState("");
  // Add a new state for showing/hiding comments
  const [showComments, setShowComments] = useState(false);

  // interface Notification {
  //   id: number;
  //   is_read: boolean;
  //   [key: string]: any;
  // }
  // const [notifications, setNotifications] = useState<Notification[]>([]);
  // const [unreadCount, setUnreadCount] = useState(0);
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState(null);

  

  
  // Comment type now includes an id, username, comment text, created_at, and optional replies.
  interface CommentType {
    id: number;
    username: string;
    comment: string;
    created_at: string;
    replies?: ReplyType[];
    replyCount?: number;
  }
  interface ReplyType {
    id: number;
    username: string;
    reply: string;
    created_at: string;
  }
  const [comments, setComments] = useState<CommentType[]>([]);
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [replyVisible, setReplyVisible] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [repliesVisible, setRepliesVisible] = useState<{
    [key: number]: boolean;
  }>({});

  const [loggedIn, setLoggedIn] = useState(false);
  // const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  const [role, setRole] = useState("user")
  // const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [viewRecorded, setViewRecorded] = useState(false);

  const [replyLikeCount, setReplyLikeCount] = useState<{
    [key: number]: number;
  }>({});
  const [replyLiked, setReplyLiked] = useState<{ [key: number]: boolean }>({});
  // const [replyCount, setReplyCount] = useState(0);

  const [commentLikeCount, setCommentLikeCount] = useState<{
    [key: number]: number;
  }>({});
  const [commentLiked, setCommentLiked] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [commentCount, setCommentCount] = useState(0);

  const navigate = useNavigate();

  // current video use states
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [currentVideoDesc, setCurrentVideoDesc] = useState("");
  const [currentVideoDate, setCurrentVideoDate] = useState("");
  const [currentVideoCreatorName, setCurrentVideoCreatorName] = useState("");
  // New state for storing the creator ID (for the Follow button)
  // const [currentVideoCreatorId, setCurrentVideoCreatorId] = useState(0);

  // Extract fileName from currentVideo
  const fileName = currentVideo.split("/").pop() || "";

  function DeleteVideo() {
    async function handleDelete() {
      if (!loggedIn) {
        alert("You must be logged in to delete videos.");
        return;
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Authentication error. Please log in again.");
        setLoggedIn(false);
        return;
      }

      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        alert("Error: No video selected for deletion.");
        return;
      }

      const confirmDelete = window.confirm(
        "Are you sure you want to delete this video? This action cannot be undone."
      );
      if (!confirmDelete) return;

      // const fileNameWithoutExtension = fileName.split(".").slice(0, -1).join(".");
      const videoIdResponse = await axios.get(`${uploadServer}/video-id-from-filename`, {
        params: { fileName: fileName },
      });
      const videoId = videoIdResponse.data.videoId;
      try {
        await axios.delete(`${uploadServer}/delete-video-admin`, {
          headers: { Authorization: token },
          data: { videoId },
        });

        alert("Video deleted successfully.");
        setVideoIndex((prevIndex) => (prevIndex + 1) % filteredArray.length);
      } catch (error) {
        console.error("Error deleting video:", error);
        alert("Failed to delete video. Please try again.");
      }
    }

    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <a
          onClick={handleDelete}
          className="button danger delete-button"
          style={{ maxWidth: "200px" }}
        >
          <i className="fas fa-trash"></i> Delete Video
        </a>
      </div>
    );
  }
  // Function to grab video information from API
  async function setVideoInfo() {
    try {
      const response = await axios.get(`${uploadServer}/video`, {
        params: {
          fileName: fileName, // Use extracted fileName
        },
      });
      // Set creator id for Follow button
      // setCurrentVideoCreatorId(response.data.creator_id);
      setCurrentVideoTitle(response.data.title);
      setCurrentVideoDesc(response.data.description);
      const username = await getUsername(response.data.creator_id);
      setCurrentVideoCreatorName(username);
      const date = new Date(response.data.created_at).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
      const time = new Date(response.data.created_at).toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      setCurrentVideoDate(`${date} at ${time}`);
    } catch (error) {
      alert(`There was an error fetching the video info!\n\n${error}`);
    }
  }

  useEffect(() => {
    setLiked(false);
    setViewRecorded(false);
    setCurrentVideo(filteredArray[videoIndex] || "");
  }, [videoIndex]);

  useEffect(() => {
    if (currentVideo) {
      // console.log("Video changed to:", currentVideo.split("/").pop());
      getViewCount();
      getCommentCount();
      if (loggedIn && userID) {
        checkIfLiked();
      }
      displayComments();
    }
  }, [currentVideo]);

  useEffect(() => {
    const fetchReplyLikes = async () => {
      if (!comments.length) return;
      const token = localStorage.getItem("authToken");
      const initialLikedState = { ...replyLiked };
      const initialLikeCountState = { ...replyLikeCount };

      for (const comment of comments) {
        if (Array.isArray(comment.replies)) {
          for (const reply of comment.replies) {
            if (initialLikeCountState[reply.id] === undefined) {
              try {
                const likeCountResponse = await axios.get(
                  `${loginServer}/reply-like-count`,
                  {
                    params: { reply_id: reply.id },
                  }
                );
                initialLikeCountState[reply.id] =
                  likeCountResponse.data.like_count;
              } catch (err) {
                console.error(
                  `Error fetching like count for reply ${reply.id}:`,
                  err
                );
                initialLikeCountState[reply.id] = 0;
              }
            }
            if (
              loggedIn &&
              token &&
              initialLikedState[reply.id] === undefined
            ) {
              try {
                const likeStatusResponse = await axios.get(
                  `${loginServer}/fetch-reply-liked`,
                  {
                    params: { auth: token, reply_id: reply.id },
                  }
                );
                initialLikedState[reply.id] = likeStatusResponse.data.liked;
              } catch (err) {
                console.error(
                  `Error fetching like status for reply ${reply.id}:`,
                  err
                );
                initialLikedState[reply.id] = false;
              }
            }
          }
        }
      }
      if (loggedIn) {
        setReplyLiked(initialLikedState);
      }
      setReplyLikeCount(initialLikeCountState);
    };
    fetchReplyLikes();
  }, [comments, loggedIn]);

  useEffect(() => {
    const fetchCommentLikes = async () => {
      if (!comments.length) return;
      const token = localStorage.getItem("authToken");
      const initialLikedState = { ...commentLiked };
      const initialLikeCountState = { ...commentLikeCount };

      for (const comment of comments) {
        if (initialLikeCountState[comment.id] === undefined) {
          try {
            const likeCountResponse = await axios.get(
              `${loginServer}/comment-like-count`,
              {
                params: { comment_id: comment.id },
              }
            );
            initialLikeCountState[comment.id] =
              likeCountResponse.data.like_count;
          } catch (err) {
            console.error(
              `Error fetching like count for comment ${comment.id}:`,
              err
            );
            initialLikeCountState[comment.id] = 0;
          }
        }
        if (loggedIn && token && initialLikedState[comment.id] === undefined) {
          try {
            const likeStatusResponse = await axios.get(
              `${loginServer}/fetch-comment-liked`,
              {
                params: { auth: token, comment_id: comment.id },
              }
            );
            initialLikedState[comment.id] = likeStatusResponse.data.liked;
          } catch (err) {
            console.error(
              `Error fetching like status for comment ${comment.id}:`,
              err
            );
            initialLikedState[comment.id] = false;
          }
        }
      }
      if (loggedIn) {
        setCommentLiked(initialLikedState);
      }
      setCommentLikeCount(initialLikeCountState);
    };
    fetchCommentLikes();
  }, [comments, loggedIn]);

  const handleNext = () => {
    setVideoIndex(
      (prevIndex) => (prevIndex + initState) % filteredArray.length
    );
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


  // async function assignUsername() {
  //   if (loggedIn) {
  //     const name = await getUsername(userID);
  //     setUsername(name);
  //   }
  // }
  // assignUsername();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await axios.get(
          `${loginServer}/user-profile/${userID}`
        );
        setRole(response.data.profile.role);
        // console.log(role);
      } catch (err) {
        console.error("Error fetching role:", err);
      }
    };

    if (userID) {
      fetchRole();
    }
  }, [userID]);

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
      // console.log("Making API request to check like status for:", fileName);
      const response = await axios.get(`${loginServer}/check-like-status`, {
        params: { auth: token, fileName: fileName },
      });
      // console.log("Like status response:", response.data);
      setLiked(response.data.liked);
    } catch (error) {
      console.error("Error checking like status:", error);
      setLiked(false);
    }
  }

  async function getViewCount() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }
      const response = await axios.get(
        `${loginServer}/video-views/${fileName}`
      );
      setViewCount(response.data.viewCount);
    } catch (error) {
      console.error("Error fetching view count:", error);
      setViewCount(0);
    }
  }

  async function getCommentCount() {
    try {
      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }
      const response = await axios.get(
        `${loginServer}/comment-count/${fileName}`
      );
      setCommentCount(response.data.commentCount);
    } catch (error) {
      console.error("Error fetching comment count:", error);
      setCommentCount(0);
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

  async function handleReplyLike(reply_id: number) {
    if (!userID || !loggedIn) {
      alert("You must be logged in to like replies.");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Authentication error. Please log in again.");
      setLoggedIn(false);
      return;
    }
    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      console.error("Error: fileName is missing.");
      return;
    }
    try {
      await axios.post(
        `${loginServer}/like-reply`,
        { fileName, reply_id },
        { params: { auth: token } }
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

  async function handleCommentLike(comment_id: number) {
    if (!userID || !loggedIn) {
      alert("You must be logged in to like comments.");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Authentication error. Please log in again.");
      setLoggedIn(false);
      return;
    }
    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      console.error("Error: fileName is missing.");
      return;
    }
    try {
      await axios.post(
        `${loginServer}/like-comment`,
        { fileName, comment_id },
        { params: { auth: token } }
      );
      setCommentLiked((prev) => {
        const newState = { ...prev, [comment_id]: !prev[comment_id] };
        setCommentLikeCount((prevCounts) => {
          const currentCount = prevCounts[comment_id] || 0;
          return {
            ...prevCounts,
            [comment_id]: newState[comment_id]
              ? currentCount + 1
              : Math.max(0, currentCount - 1),
          };
        });
        return newState;
      });
    } catch (error) {
      console.error("Error liking/unliking comment:", error);
      alert("Failed to process like. Please try again.");
    }
  }

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

      displayComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      setNotification("⚠️ Failed to post comment.");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const handleVideoStart = () => {
    recordView();
  };

  async function fetchReplyCount(commentId: number) {
    try {
      const response = await axios.get(
        `${loginServer}/reply-count/${commentId}`
      );
      return response.data.replyCount;
    } catch (error) {
      console.error("Error fetching reply count:", error);
      return 0;
    }
  }

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
            const repliesResponse = await axios.get(
              `${uploadServer}/get-replies`,
              { params: { comment_id: comment.id } }
            );
            replies = await Promise.all(
              repliesResponse.data.map(async (reply: any) => {
                const replyUserResponse = await axios.get(
                  `${uploadServer}/user`,
                  { params: { userID: reply.creator_id } }
                );
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
      const commentsWithReplyCounts = await Promise.all(
        commentsWithUsernames.map(async (comment) => {
          const replyCount = await fetchReplyCount(comment.id);
          return { ...comment, replyCount: replyCount };
        })
      );
      setComments(commentsWithReplyCounts);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }

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

  useEffect(() => {
    if (currentVideo) {
      setVideoInfo();
      displayComments();
    }
  }, [currentVideo]);

  const toggleComments = () => {
    setShowComments((prev) => !prev);
  };

  // Function to handle search result selection
  const handleSearchResultSelect = (fileName: string) => {
    // Find the video index in array
    const index = filteredArray.findIndex(
      (path) => path && path.includes(fileName)
    );

    if (index !== -1) {
      setVideoIndex(index);
      // If needed, navigate to home page showing the video
      if (window.location.pathname !== "/") {
        navigate("/");
      }
    }
  };
  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      hour: "numeric",
      day: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  };

  return (
    <div className="app">
      {/* Search container here */}
      {/* <VideoSearch onResultSelect={handleSearchResultSelect} /> */}
      <CombinedSearch onVideoSelect={handleSearchResultSelect} />
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
                fileName={
                  currentVideo ? currentVideo.split("/").pop() || "" : ""
                }
                loggedIn={loggedIn}
                userId={userID}
                // initialLikeCount={likeCount}
                initialLiked={liked}
                loginServer={loginServer}
              />
              <span className="views">
                <i className="fa-solid fa-eye"></i> {viewCount}
                <span className="desktop__text"> Views</span>
              </span>
              <span
                className={`comment-button ${
                  showComments ? "clicked" : "not-clicked"
                }`}
              >
                <button onClick={toggleComments} className="comment-btn">
                  <i className="fa-solid fa-comment"></i>
                  <span>{commentCount}</span>
                  <span className="comment-text">
                    {commentCount === 1 ? "Comment" : "Comments"}
                  </span>
                </button>
              </span>
            </div>
            <div className="download-next">
              {filteredArray.length > 0 && (
                <a className="button" href={currentVideo} download>
                  <i className="fa-solid fa-download"></i>
                  <span className="desktop__text"> DOWNLOAD</span>
                </a>
              )}
              {filteredArray.length === 0 && (
                <a className="button greyed">
                  <i className="fa-solid fa-download"></i>
                  <span className="desktop__text"> DOWNLOAD</span>
                </a>
              )}
              <a
                className={
                  filteredArray.length < 2 ? "button greyed" : "button"
                }
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
            {filteredArray.length > 0 && (
              <>
              
                <Follow
                  fileName={currentVideo.split("/").pop() || ""}
                  loggedIn={loggedIn}
                />
                {(loggedIn) && (role != "user") &&(
                <>
                <DeleteVideo />
                </>
              )}
                <h1>{currentVideoTitle}</h1>
                <h2>
                  Engager:{" "}
                  <a
                    onClick={() =>
                      navigate(`/profile/${currentVideoCreatorName}`)
                    }
                    className="engager-link"
                  >
                    {currentVideoCreatorName}
                  </a>
                </h2>
                <h3>Uploaded: {currentVideoDate}</h3>
                <p>
                  {currentVideoDesc !== ""
                    ? currentVideoDesc
                    : "No Description Provided"}
                </p>
              </>
            )}
            {filteredArray.length === 0 && (
              <>
                <h2>There are no videos available</h2>
                <h3>Upload one to kick things off.</h3>
              </>
            )}
            {showComments && (
              <>
                <div className="comment-section">
                  <div className="comments-list">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="comment-box"
                        style={{ color: "black", textAlign: "left" }}
                      >
                        <strong>
                          <a
                            onClick={() => navigate(`/profile/${c.username}`)}
                            className="username-link"
                          >
                            {c.username}
                          </a>
                        </strong>
                        : <span>{c.comment}</span>
                        <br />
                        <span className="comment-date">
                          ({formatDate(c.created_at)})
                        </span>
                        <div
                          className="comment-like-section"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <button
                            onClick={() => handleCommentLike(c.id)}
                            style={{
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px",
                              transition: "background-color 0.2s ease",
                              color: commentLiked[c.id] ? "red" : "black",
                            }}
                          >
                            <i className="fa-regular fa-thumbs-up"></i>
                          </button>
                          <div id={`comment-count-${c.id}`}>
                            {commentLikeCount[c.id] !== undefined
                              ? commentLikeCount[c.id]
                              : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            width: "100%",
                          }}
                        >
                          {/* Row for reply count and toggle button */}
                          {c.replies && c.replies.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "black",
                              }}
                            >
                              <button
                                onClick={() => toggleRepliesVisible(c.id)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                {repliesVisible[c.id] ? (
                                  <i
                                    className="fa-solid fa-chevron-up"
                                    style={{ fontSize: "1.2em", color: "#333" }}
                                  ></i>
                                ) : (
                                  <i
                                    className="fa-solid fa-chevron-down"
                                    style={{ fontSize: "1.2em", color: "#333" }}
                                  ></i>
                                )}
                              </button>
                              <span className="reply-count">
                                {c.replyCount}{" "}
                                {c.replyCount === 1 ? "reply" : "replies"}
                              </span>
                            </div>
                          )}

                          {/* Reply button on its own line */}
                          {loggedIn && (
                            <div style={{ width: "100%" }}>
                              <div style={{ marginBottom: "8px" }}>
                                <button onClick={() => toggleReplyInput(c.id)}>
                                  <i className="fa-regular fa-comment-dots"></i>
                                </button>
                              </div>

                              {/* Input and send button */}
                              {replyVisible[c.id] && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    width: "100%",
                                    gap: "8px",
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
                                    style={{
                                      padding: "8px",
                                      width: "80%",
                                      boxSizing: "border-box",
                                    }}
                                  />

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <button onClick={() => postReply(c.id)}>
                                      <i className="fa-regular fa-paper-plane"></i>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {repliesVisible[c.id] &&
                          c.replies &&
                          c.replies.length > 0 && (
                            <div style={{ marginLeft: "20px" }}>
                              {c.replies.map((r) => (
                                <div>
                                  <div>
                                    <p key={r.id}>
                                      <strong>
                                        <a
                                          onClick={() =>
                                            navigate(`/profile/${r.username}`)
                                          }
                                          className="username-link"
                                        >
                                          {r.username}
                                        </a>
                                      </strong>
                                      : {r.reply}
                                      <br />
                                      <span className="comment-date">
                                        ({formatDate(r.created_at)})
                                      </span>
                                    </p>
                                  </div>
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
                                        backgroundColor: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        color: replyLiked[r.id]
                                          ? "red"
                                          : "black",
                                      }}
                                    >
                                      <i className="fa-regular fa-thumbs-up"></i>
                                    </button>
                                    <div id={`like-count-${r.id}`}>
                                      {replyLikeCount[r.id] !== undefined
                                        ? replyLikeCount[r.id]
                                        : ""}
                                    </div>{" "}
                                    {/* Unique ID for like count */}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                  {loggedIn && (
                    <div
                      //className="comment-input-div"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        width: "100%",
                        gap: "8px",
                      }}
                    >
                      <input
                        //id="comment-input"
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write a comment..."
                        style={{
                          padding: "5px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      ></input>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button onClick={postComment}>
                          <i className="fa-solid fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
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
        <Route path="/profile/:userName" element={<UserProfile />} />
        <Route path="/about" element={<About />} />
        {/* User Page Route */}

        {/* Protected Route for Dashboard and Video Player */}
        <Route element={<PrivateRoute />}>
          <Route path="/user" element={<User />} />
          <Route path="/upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
