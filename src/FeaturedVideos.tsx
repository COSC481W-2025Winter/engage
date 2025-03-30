import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./styles/FeaturedVideos.scss"; // Ensure this path matches your project structure

interface VideoData {
  fileName: string;
  trendingScore: number;
  videoUrl: string;
  viewCount: number;
  likeCount: number;
}

const FeaturedVideos: React.FC = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Define the servers (adjust if using environment variables)
  let uploadServer = "http://localhost:3001";
  if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
    uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
  }
  let loginServer = "http://localhost:8081";
  if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
    loginServer = import.meta.env.VITE_LOGIN_SERVER;
  }

  // Trending score formula: trendingScore = viewCount + (2 * likeCount)
  const computeTrendingScore = (views: number, likes: number): number => {
    return views + likes * 2;
  };

  const fetchTrendingVideos = async () => {
    try {
      // Fetch the list of videos from the upload server
      const videoListResponse = await axios.get(`${uploadServer}/video-list`);
      const videoList = videoListResponse.data; // Assumes an array of objects with a fileName property

      // For each video, fetch its view and like counts concurrently
      const videoDataPromises = videoList.map(async (video: { fileName: string }) => {
        const fileName = video.fileName;
        const videoUrl = `./media/${fileName}`; // Adjust the URL as needed

        // Fetch view count and like count from the login server endpoints
        const [viewsResponse, likesResponse] = await Promise.all([
          axios.get(`${loginServer}/video-views/${fileName}`),
          axios.get(`${loginServer}/video-likes-by-filename/${fileName}`)
        ]);
        const viewCount = viewsResponse.data.viewCount || 0;
        const likeCount = likesResponse.data.likeCount || 0;
        const trendingScore = computeTrendingScore(viewCount, likeCount);
        return { fileName, trendingScore, videoUrl, viewCount, likeCount };
      });

      const videoData = await Promise.all(videoDataPromises);
      // Sort videos by trending score in descending order
      videoData.sort((a, b) => b.trendingScore - a.trendingScore);
      setVideos(videoData);
      setLoading(false);

      // Cache the trending videos in localStorage with today's date to update only once per day
      const today = new Date().toDateString();
      localStorage.setItem("trendingVideosDate", today);
      localStorage.setItem("trendingVideos", JSON.stringify(videoData));
    } catch (err: any) {
      console.error("Error fetching trending videos:", err);
      setError("Failed to load trending videos.");
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedDate = localStorage.getItem("trendingVideosDate");
    const today = new Date().toDateString();
    if (storedDate === today) {
      const storedVideos = localStorage.getItem("trendingVideos");
      if (storedVideos) {
        setVideos(JSON.parse(storedVideos));
        setLoading(false);
        return;
      }
    }
    fetchTrendingVideos();
  }, []);

  if (loading) {
    return <div>Loading trending videos...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="featured-videos-container">
      <div className="navigation">
        <Link to="/" className="button">
          Back to Home
        </Link>
      </div>
      <h2>Featured Trending Videos</h2>
      <div className="featured-grid">
        {videos.map((video, index) => (
          <div key={index} className="featured-video-item">
            <video
              src={video.videoUrl}
              muted
              loop
              playsInline
              className="featured-video-thumbnail"
              onClick={() => (window.location.href = `/video/${video.fileName}`)}
            />
            <div className="video-info">
              <p>Views: {video.viewCount}</p>
              <p>Likes: {video.likeCount}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedVideos;
