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

  // 🔍 Toggle popup state
  const togglePopup = () => {
    console.log("✅ React onClick triggered (togglePopup)");
    setShowPopup((prev) => !prev);
  };

  // 🧪 Confirm component mounts and userId is passed in
  useEffect(() => {
    console.log("✅ ProfileWidget mounted with userId:", userId);
    console.log("✅ loginServer:", loginServer);

    // Add native listener to test if JS interference is causing issues
    const el = document.getElementById("homepage-profile-pic");
    if (el) {
      el.addEventListener("click", () => {
        console.log("🧪 Native JS listener triggered!");
      });
    }

    // Optional cleanup
    return () => {
      if (el) {
        el.removeEventListener("click", () => {});
      }
    };
  }, []);

  // Load profile image from server
  useEffect(() => {
    if (userId) {
      const url = `${loginServer}/profile-picture/${userId}`;
      setImageUrl(url);
      console.log("🔁 Image URL set to:", url);
    }
  }, [userId, loginServer]);

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("profilePicture", selectedFile);

    console.log("🚀 Uploading to:", `${loginServer}/upload-profile-picture`);

    try {
      const res = await axios.post(`${loginServer}/upload-profile-picture`, formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Upload success:", res.data);
      setImageUrl(`${loginServer}/profile-picture/${userId}?v=${Date.now()}`);
      setSelectedFile(null);
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  };

  return (
    <div style={{ border: "4px dashed red", padding: "10px", zIndex: 9999 }}>
      <img
        id="homepage-profile-pic"
        src={imageUrl || "/profile-pics/default.png"}
        alt="Profile"
        onClick={() => {
          console.log("IMG CLICK from React!");
          togglePopup();
        }}
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          cursor: "pointer",
          border: "2px solid limegreen",
          position: "relative",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      />

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
            zIndex: 10000,
            width: "200px",
            textAlign: "center",
          }}
        >
          {isLoggedIn ? (
            <>
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
