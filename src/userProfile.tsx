import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Hook for programmatic navigation
import { motion, AnimatePresence } from "framer-motion"; // Animation library for smooth UI transitions
import { useSwipeable } from "react-swipeable"; // Library for handling touch and mouse swipe gestures
import "./styles/userProfile.scss";
import ProfileFollow from "./components/ProfileFollow";

// Set the number of videos displayed per page
const VIDEOS_PER_PAGE = 6;

const UserProfile = () => {
  const { userName } = useParams();
  // const [userVideos, setUserVideos] = useState<string[]>([]);
  // New state for date joined
  // const [dateJoined, setDateJoined] = useState("");

  const [userID, setUserID] = useState(0);
  const [loggedInRole, setLoggedInRole] = useState("user");

  interface UserProfile {
    username: string;
    role: string;
    dateCreated: string | number | Date;
    profilePictureUrl: string;
    videoCount: number;
    commentCount: number;
    replyCount: number;
    videos: {
      id: string;
      fileName: string;
      thumbnail?: string;
      title: string;
      created_at: string | number | Date;
    }[];
  }

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Hook for navigating between routes

  // State variables to manage video selection, page navigation, and animations
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null); // Stores the currently selected video for fullscreen view
  const [currentPage, setCurrentPage] = useState(0); // Tracks the current page number in the video list
  const [isJittering, setIsJittering] = useState(false); // Triggers a "jitter" effect if the user reaches the last/first page
  const [direction, setDirection] = useState(0); // Tracks swipe direction: -1 (left) or 1 (right) for smooth transitions
  // New state for profile picture; using an online placeholder to ensure a visible image.
  // const [profilePictureUrl, setProfilePictureUrl] = useState<string>(
  //   "https://via.placeholder.com/100"
  // );

  // Calculate the total number of pages based on the number of videos
  const totalPages = Math.ceil(
    (profile?.videos?.length || 0) / VIDEOS_PER_PAGE
  );

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
  const currentVideos = profile?.videos.slice(
    startIndex,
    startIndex + VIDEOS_PER_PAGE
  );

  const API_BASE_URL =
    import.meta.env.VITE_LOGIN_SERVER || "http://localhost:8081";

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/user-profile-by-username/${userName}`
        );
        setProfile(response.data.profile);
        // if (response.data.profile.profilePictureUrl) {
        //   // setProfilePictureUrl(response.data.profile.profilePictureUrl);
        // }
        setError("");
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    if (userName) {
      fetchUserProfile();
    }
  }, [userName]);

  
  async function getLoggedInUserId() {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/current-user-id`, {
          params: { auth: token },
        });
        setUserID(response.data.userId);
        // setLoggedIn(true);
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

  useEffect(() => {
      const fetchRole = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/user-profile/${userID}`
          );
          setLoggedInRole(response.data.profile.role);
          // console.log(role);
        } catch (err) {
          console.error("Error fetching role:", err);
        }
      };
  
      if (userID) {
        fetchRole();
      }
    }, [userID]);



  if (loading) {
    return <div className="user-profile__loading">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="user-profile__error">
        <p>{error}</p>
        <Link to="/" className="user-profile__back-link">
          &larr; Back to search
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile__not-found">
        <p>User not found</p>
        <Link to="/" className="user-profile__back-link">
          &larr; Back to search
        </Link>
      </div>
    );
  }

  /**
   * Bans a user by sending a request to the server.
   * Displays an alert on success or failure.
   */
  const handleBanUser = async () => {
    if (!userName) return;

    const confirmBan = window.confirm(
      `Are you sure you want to ban the user "${userName}"?`
    );

    if (!confirmBan) return;

    try {
      const authToken = localStorage.getItem("authToken"); // Retrieve auth token from local storage
      const response = await axios.post(
        `${API_BASE_URL}/ban-user`,
        { username: userName },
        {
          params: {
            auth: authToken, // Pass the token in the Authorization header with Bearer prefix
          },
        }
      );

      if (response.status === 200) {
        alert(`User "${userName}" has been banned successfully.`);
        navigate("/"); // Redirect to home or another page after banning
      } else {
        alert(`Failed to ban user "${userName}".`);
      }
    } catch (err) {
      console.error("Error banning user:", err);
      alert("An error occurred while trying to ban the user.");
    }
  };

  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="user-page-wrapper">
      {/* Main content container with swipe handlers */}
      <div
        className={`user-container ${selectedVideo ? "blur" : ""} ${
          isJittering ? "jitter" : ""
        }`}
        {...handlers}
      >
        <div className="content-container">
          <div className="profile-picture-wrapper">
            <img
              src={
                profile.profilePictureUrl || "https://via.placeholder.com/100"
              }
              alt="Profile"
              className="profile-picture"
            />
            <div className="user-info">
              <div className="username-display">{profile.username}</div>
              {profile.role !== "user" && <div className={`${profile.role}-flair`}>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</div>}
              <div className="date-joined">
                Joined: {formatDate(profile.dateCreated)}
              </div>
              <div>
                <ProfileFollow targetUsername={profile.username} />
              </div>
              {loggedInRole == "developer" && profile.role !== "developer" && <>
                <a
                  style={{
                  // display: "inline-block",
                  padding: "3px",
                  margin: "4px 0px",
                  // fontSize: "12px",
                  textDecoration: "none",
                  cursor: "pointer",
                  textAlign: "center",
                  }}
                  className="button danger"
                  onClick={handleBanUser}
                >
                  <i className="fas fa-gavel"></i> Ban User
                </a>
              </>}
            </div>
          </div>

          <div className="user-profile__stats">
            <div>
              <span>{profile.videoCount}</span>
              <p>Videos</p>
            </div>
            <div>
              <span>{profile.commentCount}</span>
              <p>Comments</p>
            </div>
            <div>
              <span>{profile.replyCount}</span>
              <p>Replies</p>
            </div>
          </div>
          {/* Engagements Section */}
          {/* <div className="my-videos-container">
            <div className="text">
              <h2>Your engagements</h2>
              <p style={{ fontSize: "1rem" }} className="mobile__text">
                Swipe left and right to navigate.<br></br> Touch video to play.{" "}
                <br></br>Tap background to return.
              </p>
              <p className="desktop__text">
                Click and drag left and right to navigate.
                <br></br> Click video to play.
                <br></br>Click background to return.
              </p>
            </div>
          </div> */}

          {/* AnimatePresence ensures smooth transition between pages */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentPage} // Changes key on each page update to trigger animation
              className="video-grid"
              initial={{ x: direction * 100, opacity: 0 }} // Start position
              animate={{ x: 0, opacity: 1 }} // Target position (smooth slide-in effect)
              exit={{ x: direction * 100, opacity: 0 }} // Exit animation (smooth slide-out effect)
              transition={{ type: "spring", stiffness: 120, damping: 20 }} // Animation style
            >
              {currentVideos && currentVideos.length > 0 ? (
                currentVideos.map((video) => (
                  <div
                    key={video.id}
                    className="video-thumbnail"
                    onClick={() => handleOpenVideo(`/media/${video.fileName}`)} // Click to open fullscreen view
                  >
                    <motion.video
                      src={`/media/${video.fileName}`}
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
};

export default UserProfile;
