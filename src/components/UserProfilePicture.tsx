import React, { useEffect, useState } from "react";
import axios from "axios";

interface Props {
  userId: number;
  loginServer: string;
  mode?: "upload" | "display"; // 👈 Optional mode control
}

const UserProfilePicture: React.FC<Props> = ({ userId, loginServer, mode = "display" }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setImageUrl(`${loginServer}/profile-picture/${userId}`);
  }, [userId, loginServer]);

  const handleUpload = async () => {
    if (!selectedFile) return;
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
      setImageUrl(`${loginServer}/profile-picture/${userId}?v=${Date.now()}`); // refresh cache
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={imageUrl}
        alt="Profile"
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          border: "2px solid #444",
          objectFit: "cover",
        }}
      />
      {mode === "upload" && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ marginTop: "8px" }}
          />
          <button onClick={handleUpload} style={{ marginTop: "8px" }}>
            Upload
          </button>
        </>
      )}
    </div>
  );
};

export default UserProfilePicture;
