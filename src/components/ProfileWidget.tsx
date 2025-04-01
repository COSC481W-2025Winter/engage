import React, { useState, useEffect } from "react";
import axios from "axios";

interface ProfileWidgetProps {
  userId: number;
  loginServer: string;
  isLoggedIn: boolean;
}

const ProfileWidget: React.FC<ProfileWidgetProps> = ({
  userId,
  loginServer,
  isLoggedIn,
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(`${loginServer}/profile-picture/default.png`);
  const [uploadStatus, setUploadStatus] = useState<"" | "success" | "fail">("");
  const [refreshKey, setRefreshKey] = useState(0); // Forces re-render to refresh image

  // Update image URL – use default if not logged in or no valid userId.
  useEffect(() => {
    if (!isLoggedIn || userId === 0) {
      setImageUrl(`${loginServer}/profile-picture/default.png`);
    } else {
      // Append a query parameter to force refresh when updated.
      const newUrl = `${loginServer}/profile-picture/${userId}?v=${Date.now()}`;
      setImageUrl(newUrl);
    }
  }, [userId, isLoggedIn, loginServer, refreshKey]);

  const handleClick = () => {
    if (!isLoggedIn) {
      alert("Please log in to update your profile picture");
      return;
    }
    setShowUpload((prev) => !prev);
  };

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

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

      // Force the image to refresh by updating refreshKey
      setRefreshKey((prev) => prev + 1);

      // Optional: dispatch an event to notify other parts of the app
      const refreshEvent = new CustomEvent("profile-updated");
      window.dispatchEvent(refreshEvent);

      setUploadStatus("success");
    } catch (err) {
      console.error("Upload failed", err);
      setUploadStatus("fail");
    }

    setTimeout(() => setUploadStatus(""), 3000);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: isLoggedIn ? "pointer" : "default",
        zIndex: 9999,
        padding: "3px",
        borderRadius: "50%",
        backgroundColor: "#202020",
        boxShadow: "0 0 4px rgba(0, 0, 0, 0.2)",
        marginLeft: "auto",
        marginRight: "20px",
      }}
    >
      <img
        key={refreshKey}
        src={imageUrl}
        alt="Profile"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = `${loginServer}/profile-picture/default.png`;
        }}
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {isLoggedIn && showUpload && (
        <div
          style={{
            position: "absolute",
            top: "100px",
            right: "0",
            backgroundColor: "#2a2a2a",
            color: "#fff",
            padding: "10px 15px",
            borderRadius: "10px",
            boxShadow: "0 0 12px rgba(0, 0, 0, 0.4)",
            zIndex: 10000,
            width: "220px",
            textAlign: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p>Change Profile Picture</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={handleUpload}
            style={{ marginTop: "8px" }}
            disabled={!selectedFile}
          >
            Upload
          </button>

          {uploadStatus === "success" && (
            <p style={{ color: "lightgreen", marginTop: "8px" }}>
              Upload successful!
            </p>
          )}
          {uploadStatus === "fail" && (
            <p style={{ color: "red", marginTop: "8px" }}>Upload failed.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileWidget;
