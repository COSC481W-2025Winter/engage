import React, { useState, useEffect } from "react";
import axios from "axios";
import "./styles/searchVideo.scss";

// Define the upload server URL
let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}

// Function to search for videos based on title
async function searchVideos(searchTerm: string) {
  if (!searchTerm.trim()) {
    return []; // Return empty array for empty search
  }

  try {
    // Fetch all videos from the server
    const response = await axios.get(`${uploadServer}/video-list`);
    const allVideos = response.data;

    if (!allVideos || !allVideos.length) {
      return [];
    }
    // Score each video based on how well it matches the search term
    const scoredVideos = allVideos.map((video: any) => {
      // Calculate match score based on various factors
      const title = video.title || "";
      const description = video.description || "";

      // Calculate basic match score - case insensitive
      const searchTermLower = searchTerm.toLowerCase();
      const titleLower = title.toLowerCase();

      let score = 0;

      // Exact match gets highest score
      if (titleLower === searchTermLower) {
        score += 100;
      }
      // Title starts with search term
      else if (titleLower.startsWith(searchTermLower)) {
        score += 75;
      }
      // Title contains search term as a whole word
      else if (new RegExp(`\\b${searchTermLower}\\b`).test(titleLower)) {
        score += 50;
      }
      // Title contains search term
      else if (titleLower.includes(searchTermLower)) {
        score += 25;
      }
      // Secondary match in description
      if (description.toLowerCase().includes(searchTermLower)) {
        score += 10;
      }

      // Additional points based on number of tokens matched
      const searchTokens = searchTermLower.split(/\s+/);
      const titleTokens = titleLower.split(/\s+/);

      for (const token of searchTokens) {
        if (token.length > 2) {
          // Ignore very short tokens
          for (const titleToken of titleTokens) {
            if (titleToken.includes(token)) {
              score += 5;
            }
          }
        }
      }

      return {
        ...video,
        score,
      };
    });
    // Filter videos with any match score and sort by score (highest first)
    const matchedVideos = scoredVideos
      .filter((video: any) => video.score > 0)
      .sort((a: any, b: any) => b.score - a.score);

    return matchedVideos;
  } catch (error) {
    console.error("Error searching videos:", error);
    return [];
  }
}

// Component for video search functionality
const VideoSearch = ({
  onResultSelect,
}: {
  onResultSelect: (video: string) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounce search to prevent too many requests
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm) {
        setIsSearching(true);
        const results = await searchVideos(searchTerm);
        setSearchResults(results);
        setIsSearching(false);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleResultClick = (fileName: string) => {
    onResultSelect(fileName);
    setSearchTerm("");
    setShowResults(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="search-container" onClick={(e) => e.stopPropagation()}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search videos..."
          value={searchTerm}
          onChange={handleSearchChange}
          onClick={(e) => e.stopPropagation()}
        />
        <i
          className={`fa-solid ${
            isSearching ? "fa-spinner fa-spin" : "fa-search"
          }`}
        ></i>
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((video) => (
            <div
              key={video.id}
              className="search-result-item"
              onClick={() => handleResultClick(video.fileName)}
            >
              <div className="search-result-title">{video.title}</div>
              {video.description && (
                <div className="search-result-description">
                  {video.description.length > 50
                    ? `${video.description.substring(0, 50)}...`
                    : video.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && searchTerm && searchResults.length === 0 && (
        <div className="search-results no-results">
          <div className="no-results-message">
            No videos found matching "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSearch;
