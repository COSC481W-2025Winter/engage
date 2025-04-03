import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./styles/userSearch.scss";

const UserSearch = () => {
  const [query, setQuery] = useState("");
  interface User {
    id: string;
    username: string;
    role: string;
    profilePictureUrl: string;
  }

  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>(
    "https://via.placeholder.com/100"
  );

  // Get API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/search-users`, {
        params: { query: query.trim() },
      });

      setResults(response.data.users);
      if (response.data.users.profilePictureUrl) {
        setProfilePictureUrl(response.data.user.profilePictureUrl);
      }
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Debounce search to avoid too many requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const viewUserProfile = (userId: any) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="user-search-container">
      <div className="search-box">
        <h2>Search Users</h2>
        <div className="input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username..."
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {results.length > 0 ? (
        <div className="results-container">
          <ul>
            {results.map((user) => (
              <li
                key={user.id}
                className="result-item"
                onClick={() => viewUserProfile(user.id)}
              >
                <div className="avatar">
                  <img
                    src={
                      user.profilePictureUrl ||
                      "https://via.placeholder.com/100"
                    }
                    alt="Profile"
                    className="profile-picture"
                  />
                </div>
                <div className="user-info">
                  <p className="username">{user.username}</p>
                  <p className="role">Role: {user.role}</p>
                </div>
                <span className="arrow">&rarr;</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        query.trim() &&
        !loading && (
          <div className="no-results">No users found matching "{query}"</div>
        )
      )}
    </div>
  );
};

export default UserSearch;
