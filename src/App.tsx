import "./styles/App.scss"; // Import global and App-specific styles

import { BrowserRouter, Routes, Route } from "react-router-dom";
// React Router for navigation between different pages (Home and User page)

import { useState, useEffect } from "react";
// React hooks: useState (state), useEffect (side effects), useRef (persistent value)
import Login from "./login.tsx";
import Signup from "./signup.tsx";
// import Dashboard from "./Dashboard";
import PrivateRoute from "./PrivateRoute"; //
import ResetPassword from "./resetPassword.tsx";
import ReactPlayer from "react-player"; // Library for embedding and playing videos
import User from "./User";
import path from "path-browserify"; // Path library to work with file paths in the browser
import Upload from "./upload.tsx";
import axios from "axios";
import Terms from "./terms.tsx";
import TopBar from "./components/TopBar.tsx";
// import { createContext, useContext } from 'react';
// import VideoPlayer from './components/VideoPlayerUser.tsx';

// Dynamically import all video files from the media folder
const videos = import.meta.glob("../media/*trans.mp4");

let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}
let loginServer = "http://localhost:8081";

if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}

// Asynchronously create an array of video paths from imported media folder
async function createVideoArray() {
  const vidPaths: Array<string | null> = []; // Array to hold video paths
  const dbPaths: Array<string> = [];
  try {
    const response = await axios.get(`${uploadServer}/video-list`);
    // console.log(response.data);
    response.data.forEach((video: { fileName: string }) => {
      dbPaths.push(video.fileName);
    });
  } catch (error) {
    console.error(`Error fetching video info:`, error);
    return []; // Continue to the next video if the request fails
  }

  // console.log(dbPaths);
  // Loop through all imported videos
  for (const videoKey of Object.keys(videos)) {
    const ext = path.extname(videoKey).toLowerCase(); // Get the extension (e.g., .mp4)
    if (ext === ".mp4") {
      const videoFileName: string = path.posix.basename(videoKey);
      // console.log(videoFileName)
      // console.log(dbPaths.includes(videoFileName))
      if (dbPaths.includes(videoFileName)) {
        vidPaths.push(videoKey);
      }
    }
    // console.log(vidPaths);
  }
  return vidPaths;
}
//randomize the elements of an array
function randomizeArray(array: Array<string | null>) {
  let index = array.length;

  // While elements remain to shuffle
  while (index !== 0) {
    const randomIndex = Math.floor(Math.random() * index);

    // Shuffle the positions
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];

    // Bring the index down by 1
    index--;
  }
}

// Create a randomized array of video paths
const array: Array<string | null> = await createVideoArray();
randomizeArray(array);

// Remove any undefined items (extra safety)
const filteredArray = array.filter((item) => item !== undefined);

// let userChanged:boolean = false;

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
  // Home Page Component - Displays random videos, "Next", "Engager", and "Download" buttons

  const initState = filteredArray.length < 2 ? 0 : 1; // Set initial video

  const [videoIndex, setVideoIndex] = useState(initState); // State for current video index
  const [currentVideo, setCurrentVideo] = useState("");
  // const currentVideoRef = useRef(filteredArray[0] || ''); // Reference to the current video path

  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [viewRecorded, setViewRecorded] = useState(false);


  // current video use states
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [currentVideoDesc, setCurrentVideoDesc] = useState("");
  const [currentVideoDate, setCurrentVideoDate] = useState("");
  const [currentVideoCreatorName, setCurrentVideoCreatorName] = useState("");

  useEffect(() => {
    // Immediately reset states when changing videos
    setLiked(false);
    setViewRecorded(false);

    // Set the current video
    setCurrentVideo(filteredArray[videoIndex] || "");

    // Use a separate effect for fetching like data to ensure it runs AFTER the currentVideo is set
  }, [videoIndex]);

  // Add a separate useEffect that depends on currentVideo
  useEffect(() => {
    // Only fetch like data if there's a valid video
    if (currentVideo) {
      console.log("Video changed to:", currentVideo.split("/").pop());
      getLikeCount();
      getViewCount();
      // Only check if user has liked if they're logged in
      if (loggedIn && userID) {
        checkIfLiked();
      }
    }
  }, [currentVideo, loggedIn, userID]);

  // Switch to the next video in the array
  const handleNext = () => {
    setVideoIndex(
      (prevIndex) => (prevIndex + initState) % filteredArray.length
    );
    // console.log(videoIndex);
  };

  // const navigate = useNavigate(); // Hook to navigate to other pages
  // const handleBackToDashboard = () => {
  //   navigate("/dashboard");
  // };
  // const handleBackToLogin = () => {
  //   navigate("/login");
  // };

  // Function to get user info from API
  async function getUsername(userid: number) {
    let creatorName = "";
    await axios
      .get(`${uploadServer}/user`, {
        params: {
          userID: userid,
        },
      })
      .then((response) => {
        creatorName = response.data.username;
      });
    return creatorName as string;
  }
  // Function to grab video information from API
  async function setVideoInfo() {

    // Get video info
    try {
      const response = await axios.get(`${uploadServer}/video`, {
      params: {
        fileName: currentVideo.substring(currentVideo.lastIndexOf("/") + 1),
      },
      });

      // get user info
      setCurrentVideoTitle(response.data.title);
      setCurrentVideoDesc(response.data.description);
      const username = await getUsername(response.data.creator_id);
      setCurrentVideoCreatorName(username);
      // translate the timestamp in created_at
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

  // const token = localStorage.getItem("authToken");
  // useEffect(() => {
  //   setLoggedIn(!!token);
  // }, []);

  async function getLoggedInUserId() {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const response = await axios.get(`${loginServer}/current-user-id`, {
          params: {
            auth: token ? token : "",
          },
        });
        setUserID(response.data.userId);
        setLoggedIn(true);
        // userChanged = true;
        return response.data.userId;
      } catch (error) {
        console.error("Error fetching user ID:", error);
        return null;
      }
    } else {
      return null;
    }
  }

  // const authButtons = async ()=>{
  //   let button = "";
  //   const userId = await getLoggedInUserId()

  //    if (userId !== null) {

  //     const username = await getUsername(userId);
  //     button = "<button className='control-button' onClick={() => navigate('/user')}" + username + " <i className='fa-solid fa-user'></i> </button>"

  //   } else {
  //     button = "<button className='control-button' onClick={handleBackToLogin}>Log In <i className='fa solid fa-right-to-bracket'></i></button>"
  //   }
  //   const sanitizedHTML = DOMPurify.sanitize(button);
  //   return (
  //     <div className="login-button-section" dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
  //   )

  // }

  getLoggedInUserId();

  async function assignUsername() {
    if (loggedIn) {
      const username = await getUsername(userID);
      setUsername(username);
      // console.log(username);
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
      setLikeCount(0); // Default to 0 if there's an error
    }
  }

  async function checkIfLiked() {
    // console.log("Checking if liked for:", currentVideo.split("/").pop());

    if (!loggedIn) {
      // console.log("Not logged in, setting liked to false");
      setLiked(false);
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      // console.log("No token, setting liked to false");
      setLiked(false);
      return;
    }

    const fileName = currentVideo.split("/").pop();
    if (!fileName) {
      // No fileName, setting liked to false
      setLiked(false);
      return;
    }

    try {
      console.log("Making API request to check like status for:", fileName);
      const response = await axios.get(`${loginServer}/check-like-status`, {
        params: {
          auth: token,
          fileName: fileName,
        },
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
        { fileName: fileName }, // Send fileName in the request body
        {
          params: { auth: token }, // Send token as a query parameter
        }
      );

      // Update UI based on the response message
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

      const response = await axios.get(
        `${loginServer}/video-views/${fileName}`
      );
      setViewCount(response.data.viewCount);
    } catch (error) {
      console.error("Error fetching view count:", error);
      setViewCount(0); // Default to 0 if there's an error
    }
  }

  async function recordView() {
    try {
      if (viewRecorded) return; // Prevent multiple view records for the same video session

      const fileName = currentVideo.split("/").pop();
      if (!fileName) {
        console.error("Error: fileName is missing.");
        return;
      }

      if (loggedIn) {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        // For logged-in users
        await axios.post(
          `${loginServer}/record-view`,
          { fileName },
          {
            params: { auth: token },
          }
        );
      } else {
        // For anonymous users
        await axios.post(`${loginServer}/record-anonymous-view`, { fileName });
      }

      // Update view count locally after recording
      setViewCount((prev) => prev + 1);
      setViewRecorded(true);
    } catch (error) {
      console.error("Error recording view:", error);
    }
  }

  const handleVideoStart = () => {
    recordView();
  };
  useEffect(() => {
    if (currentVideo) {
      setVideoInfo();
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
          height="65vh"
          onStart={handleVideoStart}
        />
        {/* 1. Video control buttons */}
      <div className="controls">
        <div className="video-stats">
        <a onClick={handleLike} className={ liked ? "button liked" : "button not-liked" }>
          <i className="fa-solid fa-heart"></i> {likeCount}<span className="desktop__text"> Likes</span>
        </a>
        <span className="views">
          <i className="fa-solid fa-eye"></i> {viewCount}<span className="desktop__text"> Views</span>
        </span>
        
        </div>
        <div className="download-next">
          
        {filteredArray.length > 0 && (
          <a className="button" href={currentVideo} download>
        <i className="fa-solid fa-download"></i><span className="desktop__text"> DOWNLOAD</span>
          </a>
        )}
        {filteredArray.length == 0 && (
          <a className="button greyed">
        <i className="fa-solid fa-download"></i><span className="desktop__text"> DOWNLOAD</span>
          </a>
        )}
        <a
          className={filteredArray.length < 2 ? "button greyed" : "button"}
          onClick={() => {
        const videoElement = document.getElementById("video");
        if (videoElement) {
          videoElement.classList.remove("fade-in");
          videoElement.classList.add("fade-out");
          setTimeout(() => {
            handleNext();
            videoElement.classList.remove("fade-out");
            videoElement.classList.add("fade-in");
          }, 200); // Match the duration of the fade-out animation
        } else {
          handleNext();
        }
          }}
        >
        <span className="desktop__text">NEXT </span><i className="fa-solid fa-arrow-right"></i>
        </a>
        </div>
      </div>
      </div>
      <div className="video-details">
        <div className="details-metadata">
          {filteredArray.length > 0 && (
            <>
              <h1>{currentVideoTitle}</h1>
              <h2>Engager: {currentVideoCreatorName}</h2>
              <h3>Uploaded: {currentVideoDate}</h3>
              <p>{currentVideoDesc !== "" ? currentVideoDesc : "No Description Provided"}</p>
            </>
          )}
          {filteredArray.length == 0 && (
            <>
              <h2>There are no videos available</h2>
              <h3>Upload one to kick things off.</h3>
            </>
          )}
        </div>
        <div className="details-comments">

        </div>
      </div>
      </div>
    </div>
  );
}

// Main App Component - Sets up routing between Home and User page

function App() {
  // const [userVideos, setUserVideos] = useState<string[]>([]);

  // useEffect(() => {

  // }, []);

  //   return (
  //     <Router>
  //       <Routes>
  //         {/* Home Page Route */}
  //         <Route path="/" element={<Home />} />
  //         {/* User Page Route */}
  //         <Route path="/user" element={<User userVideos={userVideos} />} />
  //       </Routes>
  //     </Router>
  //   );
  // }

  return (
    <BrowserRouter>
        <TopBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* User Page Route */}

          {/* Protected Route for Dashboard and Video Player */}
          <Route element={<PrivateRoute />}>
        <Route path="/user" element={<User />} />
        <Route path="/upload" element={<Upload />} />
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
          </Route>
        </Routes>
    </BrowserRouter>
  );
}

export default App;
