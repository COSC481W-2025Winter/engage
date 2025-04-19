import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/search.scss";

interface Video {
  id: number;
  title: string;
  thumbnail: string;
  videoUrl: string;
  views: number;
  uploadDate: string;
}

export default function Search() {
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTrendingVideos() {
      try {
        // Fetch all videos from your backend.
        const response = await axios.get("http://localhost:3001/video-list");
        // Here we assume response.data is an array of objects each containing at least a fileName.
        // For demonstration, we convert the file list into video objects with dummy data.
        const videos: Video[] = response.data.map((video: any, index: number) => ({
          id: index,
          title: `Video ${index + 1}`,
          thumbnail: `/media/${video.fileName}`, // using the video file as thumbnail for now
          videoUrl: `/media/${video.fileName}`,
          // Generate a random view count to simulate trending data; in a real scenario, these values would come from your database.
          views: Math.floor(Math.random() * 1000),
          // Dummy upload date (could be used in a more advanced trending algorithm)
          uploadDate: new Date().toISOString(),
        }));

        // Simple trending algorithm: sort videos by view count in descending order.
        // In a real implementation, you might use more factors and update these results daily via a backend process.
        const sortedVideos = videos.sort((a, b) => b.views - a.views);
        setTrendingVideos(sortedVideos);
      } catch (error) {
        console.error("Error fetching trending videos:", error);
      }
    }

    fetchTrendingVideos();
  }, []);

  return (
    <div className="search-page">
      <header className="search-header">
        <h1>Featured Videos</h1>
        <button className="back-button" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </header>
      <section className="trending-videos-grid">
        {trendingVideos.length > 0 ? (
          trendingVideos.map((video) => (
            <div key={video.id} className="video-card">
              <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
              <h2 className="video-title">{video.title}</h2>
              <p className="video-views">{video.views} views</p>
            </div>
          ))
        ) : (
          <p>No trending videos available.</p>
        )}
      </section>
    </div>
  );
}
