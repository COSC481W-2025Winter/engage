import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/App.scss";
interface LikeButtonProps {
  fileName: string;
  loggedIn: boolean;
  userId: number;
  initialLikeCount?: number;
  initialLiked?: boolean;
  loginServer: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  fileName,
  loggedIn,
  userId,
  initialLikeCount = 0,
  initialLiked = false,
  loginServer,
}) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);

  useEffect(() => {
    getLikeCount();
    if (loggedIn && userId) {
      checkIfLiked();
    }
  }, [fileName, loggedIn, userId]);

  async function getLikeCount() {
    try {
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
      setLikeCount(initialLikeCount);
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

    if (!fileName) {
      setLiked(false);
      return;
    }

    try {
      const response = await axios.get(`${loginServer}/check-like-status`, {
        params: {
          auth: token,
          fileName: fileName,
        },
      });

      setLiked(response.data.liked);
    } catch (error) {
      console.error("Error checking like status:", error);
      setLiked(false);
    }
  }

  async function handleLike() {
    if (!userId || !loggedIn) {
      alert("You must be logged in to like videos.");
      return;
    }

    if (!fileName) {
      console.error("Error: fileName is missing.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Authentication error. Please log in again.");
      return;
    }

    try {
      const response = await axios.post(
        `${loginServer}/like-video`,
        { fileName: fileName },
        {
          params: { auth: token },
        }
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
    const homeElement = document.querySelector(".app");
    if (homeElement) {
      if (liked) {
        homeElement.classList.add("reverse-barrel-roll");
        setTimeout(() => {
          homeElement.classList.remove("reverse-barrel-roll");
        }, 2000);
      } else {
        homeElement.classList.add("barrel-roll");
        setTimeout(() => {
          homeElement.classList.remove("barrel-roll");
        }, 2000);
      }
    }
  }

  return (
    <a onClick={handleLike} className={ liked ? "button liked" : "button not-liked" }>
          <i className="fa-solid fa-heart"></i> {likeCount}<span className="desktop__text"> Likes</span>
        </a>
    // <button
    //   onClick={handleLike}
    //   style={{ color: liked ? "red" : "black" }}
    //   data-testid="like-button"
    // >
    //   <i className="fa-solid fa-heart"></i> {likeCount} Likes
    // </button>
  );
};

export default LikeButton;
