import React, { useState, useEffect } from "react";
import axios from "axios";

interface Props {
  isLoggedIn: boolean;
  userId?: number;
  loginServer: string;
}

const ProfileWidget: React.FC<Props> = ({ isLoggedIn, userId, loginServer }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  const handleToggle = () => setShowPopup(!showPopup);

  useEffect(() => {
    if (userId) {
      setImageUrl(`${loginServer}/profile-picture/${userId}`);
    } else {
      setImageUrl("/profile-pics/default.png");
    }
  }, [userId, loginServer]);

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    console.log("Triggered upload!");
    console.log("Target:", `${loginServer}/upload-profile-picture`);

    const formData = new FormData();
    formData.append("profilePicture", selectedFile);

    try {
      await axios.post(`${loginServer}/upload-profile-picture`, formData, {
        headers: {
          Authorization: localStorage.getItem("authToken"),
          "Content-Type": "multipart/form-data",
        },
      });

      // Force reload image to bypass cache
      setImageUrl(`${loginServer}/profile-picture/${userId}?v=${Date.now()}`);
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Profile Image */}
      <img
        src={imageUrl}
        alt="Profile"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          cursor: "pointer",
          border: "2px solid #555",
        }}
        onClick={handleToggle}
      />

      {/* Popup UI */}
      {showPopup && (
        <div
          style={{
            position: "absolute",
            top: "70px",
            right: 0,
            backgroundColor: "#1a1a1a",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 1000,
            width: "200px",
            textAlign: "center",
          }}
        >
          {isLoggedIn ? (
            <>
              <p>Change your profile picture</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <button
                style={{ marginTop: "8px" }}
                onClick={handleUpload}
                disabled={!selectedFile}
              >
                Upload
              </button>
            </>
          ) : (
            <p>Please log in to update profile picture</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileWidget;
