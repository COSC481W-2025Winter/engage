// Import necessary dependencies
import "./styles/User.scss"; // Import styles for component layout
import { useState, useEffect } from "react"; // React hook for managing state
import { useNavigate } from "react-router-dom"; // Hook for programmatic navigation
import { motion, AnimatePresence } from "framer-motion"; // Animation library for smooth UI transitions
import { useSwipeable } from "react-swipeable"; // Library for handling touch and mouse swipe gestures
import axios from "axios";

// Define the props interface for the `User` component
// interface UserProps {
//   userVideos: string[]; // Array of video URLs for the user
// }

// Set the number of videos displayed per page
const VIDEOS_PER_PAGE = 9;

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

function User() {
  // Grab, and set videos
  const [userVideos, setUserVideos] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);

  async function loadUserVideos() {
    const token = localStorage.getItem("authToken");
    if (token) {
      const userVideoArray: string[] = [];
      try {
        const response = await axios.get(`${loginServer}/get-user-videos`, {
          params: {
            auth: token ? token : "",
          },
        });
        response.data.videos.forEach((element: { fileName: string }) => {
          userVideoArray.push("./media/" + element.fileName);
        });
        // console.log(userVideoArray);
        setUserVideos(userVideoArray as string[]);
      } catch (error) {
        console.error("Error fetching user videos:", error);
      }
    }
  }

  useEffect(() => {
    loadUserVideos();
  }, []);

  // Get logged in user ID
  async function getLoggedInUserId() {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        await axios
          .get(`${loginServer}/current-user-id`, {
            params: {
              auth: token ? token : "",
            },
          })
          .then((response) => {
            // id = response.data.userId;
            setUserID(response.data.userId as number);
          });
        // userChanged = true;
      } catch (error) {
        console.error("Error fetching user ID:", error);
        return null;
      }
    } else {
      return null;
    }
  }

  async function getUsername(userid: number) {
    let username = "";
    await axios
      .get(`${uploadServer}/user`, {
        params: {
          userID: userid,
        },
      })
      .then((response) => {
        username = response.data.username;
      });
    setUsername(username as string);
  }

  useEffect(() => {
    getLoggedInUserId();
    getUsername(userID);
  });

  const navigate = useNavigate(); // Hook for navigating between routes

  // State variables to manage video selection, page navigation, and animations
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null); // Stores the currently selected video for fullscreen view
  const [currentPage, setCurrentPage] = useState(0); // Tracks the current page number in the video list
  const [isJittering, setIsJittering] = useState(false); // Triggers a "jitter" effect if the user reaches the last/first page
  const [direction, setDirection] = useState(0); // Tracks swipe direction: -1 (left) or 1 (right) for smooth transitions

  // Calculate the total number of pages based on the number of videos
  const totalPages = Math.ceil(userVideos.length / VIDEOS_PER_PAGE);

  /**
   * Opens a fullscreen overlay with the selected video.
   * @param videoSrc - The URL of the video to be displayed in fullscreen.
   */
  const handleOpenVideo = (videoSrc: string) => {
    setSelectedVideo(videoSrc);
  };

  /**
   * Closes the fullscreen video overlay.
   */
  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  /**
   * Navigates to the next page of videos.
   * If already on the last page, it triggers a "jitter" effect to indicate no further content.
   */
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1); // Set direction to right (next page)
      setCurrentPage((prevPage) => prevPage + 1);
    } else {
      triggerJitter(); // Call jitter effect if no more pages
    }
  };

  const handleLogout = () => {
    // Clear the authentication token from localStorage
    localStorage.removeItem("authToken");
    // Navigate to login page
    navigate("/");
  };

  /**
   * Navigates to the previous page of videos.
   * If already on the first page, it triggers a "jitter" effect.
   */
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setDirection(-1); // Set direction to left (previous page)
      setCurrentPage((prevPage) => prevPage - 1);
    } else {
      triggerJitter(); // Call jitter effect if already on the first page
    }
  };

  /**
   * Triggers a short "jitter" animation when the user tries to go beyond available pages.
   * This gives feedback to indicate there is no more content.
   */
  const triggerJitter = () => {
    setIsJittering(true);
    setTimeout(() => setIsJittering(false), 500); // Reset jitter state after 500ms
  };

  /**
   * Handles swipe gestures (both touch and mouse) for navigation.
   */
  const handlers = useSwipeable({
    onSwipedLeft: () => handleNextPage(), // Swipe left → Go to the next page
    onSwipedRight: () => handlePrevPage(), // Swipe right → Go to the previous page
    preventScrollOnSwipe: true, // Prevents the page from scrolling when swiping
    trackMouse: true, // Enables swipe gestures using the mouse
  });

  // Calculate the index range of videos for the current page
  const startIndex = currentPage * VIDEOS_PER_PAGE;
  const currentVideos = userVideos.slice(
    startIndex,
    startIndex + VIDEOS_PER_PAGE
  );

  return (
    <div className="user-page-wrapper">
      {/* Main content container with swipe handlers */}
      <div
        className={`user-container ${selectedVideo ? "blur" : ""} ${
          isJittering ? "jitter" : ""
        }`}
        {...handlers}
      >
        <p style={{ color: "white", padding: "0px", top: "0" }}>
          Swipe left and right to navigate
        </p>
        <div className="content-container">
          {/* Section title */}
          <div className="my-videos-container">My Engagements</div>

          {/* AnimatePresence ensures smooth transition between pages */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentPage} // Changes key on each page update to trigger animation
              className="video-grid"
              initial={{ x: direction * 100, opacity: 0 }} // Start position
              animate={{ x: 0, opacity: 1 }} // Target position (smooth slide-in effect)
              exit={{ x: -direction * 100, opacity: 0 }} // Exit animation (smooth slide-out effect)
              transition={{ type: "spring", stiffness: 120, damping: 20 }} // Animation style
            >
              {currentVideos.length > 0 ? (
                currentVideos.map((video, index) => (
                  <div
                    key={index}
                    className="video-thumbnail"
                    onClick={() => handleOpenVideo(video)} // Click to open fullscreen view
                  >
                    <motion.video
                      src={video}
                      className="thumbnail-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      whileHover={{ scale: 1.05 }} // Slight scaling effect on hover
                    />
                  </div>
                ))
              ) : (
                <div className="no-videos-text">No Videos Added</div> // Show text when no videos exist
              )}
            </motion.div>
          </AnimatePresence>

          {/* Home button for navigation */}
          <div className="user-buttons">
            <button className="home-button" onClick={() => navigate("/")}>
              Home
            </button>
            <button className="home-button btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Display username at the bottom */}
        <div className="username-display">
          Engaged as: <span className="username">{username}</span>
        </div>
      </div>

      {/* Fullscreen video overlay (shown when a video is clicked) */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            className="fullscreen-overlay"
            initial={{ opacity: 0 }} // Start with opacity 0
            animate={{ opacity: 1 }} // Fade in smoothly
            exit={{ opacity: 0 }} // Fade out when closed
            onClick={handleCloseVideo} // Clicking outside the video closes it
          >
            <motion.video
              src={selectedVideo}
              className="fullscreen-video"
              initial={{ scale: 0.8 }} // Start smaller
              animate={{ scale: 1 }} // Expand to full size
              exit={{ scale: 0.8 }} // Shrink when closing
              autoPlay
              playsInline
              controls
              loop
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on video
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default User;
