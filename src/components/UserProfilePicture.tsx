import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

interface Props {
  userId: number;
  loginServer: string;
  mode?: "upload" | "display";
  username?: string;
}

const UserProfilePicture: React.FC<Props> = ({
  userId,
  loginServer,
  mode = "display",
  username = "",
}) => {
  const [imageUrl, setImageUrl] = useState(`${loginServer}/profile-picture/default.png`);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [showUpload, setShowUpload] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) {
      setImageUrl(`${loginServer}/profile-picture/default.png`);
    } else {
      setImageUrl(`${loginServer}/profile-picture/${userId}?v=${refreshKey}`);
    }
  }, [userId, loginServer, refreshKey]);

  // Hide upload controls when clicking outside of the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowUpload(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      console.warn("No file selected!");
      return;
    }
    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("profilePicture", selectedFile);

    try {
      await axios.post(`${loginServer}/upload-profile-picture`, formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });
      setRefreshKey(Date.now());
      setSelectedFile(null);
      setShowUpload(false);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return (
    <div className="profile-picture-wrapper" ref={wrapperRef}>
      {/* Only the image is clickable to toggle upload controls */}
      <img
        src={imageUrl}
        alt="Profile"
        className="profile-img"
        onClick={() => {
          if (mode === "upload") {
            setShowUpload((prev) => !prev);
          }
        }}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = `${loginServer}/profile-picture/default.png`;
        }}
      />
      <div className="upload-or-username">
      {
  showUpload ? (
    <div className="upload-controls">
      {/* Hidden native file input */}
      <input
        type="file"
        accept="image/*"
        id="hiddenFileInput"
        onChange={(e) =>
          setSelectedFile(e.target.files ? e.target.files[0] : null)
        }
        style={{ display: "none" }} // Hide it with inline style or in CSS
      />

      {/* Custom label that looks like a button */}
      <label htmlFor="hiddenFileInput" className="file-button">
        Select
      </label>

      <button onClick={handleUpload}>Upload</button>
    </div>
  ) : (
    <p className="username-text">{username}</p>
  )
}
      </div>
    </div>
  );
};

export default UserProfilePicture;
