import { ChangeEvent, useState, useEffect } from "react";
import axios from "axios";
import "dotenv";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";


import "../styles/auth.scss";


let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}

interface FormValues {
  title: string;
  desc: string;
  fileName: string;
}

import "../styles/upload.scss";

type UploadStatus = "idle" | "uploading" | "transcoding" | "success" | "error";

const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80MB

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [values, setValues] = useState<FormValues>({
    title: "",
    desc: "",
    fileName: "",
  });
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [sessionId] = useState<string>(uuidv4()); // Generate unique session ID
  // const [socket, setSocket] = useState<Socket | null>(null);

  // Connect to socket.io server
  useEffect(() => {
    const newSocket = io(uploadServer);

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("transcode-progress", (data) => {
      if (data.sessionId === sessionId || data.sessionId === "unknown") {
        console.log(`Transcoding progress: ${data.progress}%`);
        setTranscodingProgress(data.progress);

        if (data.complete) {
          setStatus("success");
        } else if (status !== "transcoding" && data.progress > 0) {
          setStatus("transcoding");
        }
      }
    });

    // setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setValues({ ...values, title: e.target.value });
  }

  function handleDescChange(e: ChangeEvent<HTMLInputElement>) {
    setDesc(e.target.value);
    setValues({ ...values, desc: e.target.value });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setValues({ ...values, fileName: e.target.files[0].name });
    }
  }

  function isValidFile(file: File) {
    const fileName: string = file.name;
    const fileExtension = fileName?.split(".").pop()?.toLowerCase();
    return fileExtension === "mp4" || fileExtension === "mkv" || fileExtension === "mov";
  }

  // function durationLimit(file: File) {
  //   return new Promise<boolean>((resolve) => {
  //     const video = document.createElement("video");
  //     video.preload = "metadata";

  //     video.onloadedmetadata = () => {
  //     window.URL.revokeObjectURL(video.src);
  //     const duration = video.duration;
  //     resolve(duration <= 60); // Check if duration is under a minute
  //     };

  //     video.onerror = () => {
  //     resolve(false); // If there's an error, consider it invalid
  //     };

  //     video.src = URL.createObjectURL(file);
  //   });
  // }
  async function handleFileUpload() {
    if (!file) return;
    if (!title){
      alert("Title is required");
      return;
    }
    // console.log("File size: " + file.size);
    // console.log("Max file size: " + MAX_FILE_SIZE);
    if (!isValidFile(file)) {
      alert("File is not an valid video file.\nAcceptable files: mp4, mkv, mov");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too big. Max file size is 80MB");
      return;
    }

    setStatus("uploading");
    setUploadProgress(0);
    setTranscodingProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", desc);
    formData.append("sessionId", sessionId);

    const token = localStorage.getItem("authToken"); // Retrieve JWT token
    try {
      await axios.post(`${uploadServer}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? token : "", // Send token in header
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      // After successful upload, the server will start transcoding
      // We'll now show transcoding progress through socket.io
      setStatus("transcoding");
      setStatus("success");
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
    }
  }

  // Get the overall progress based on current status
  const getOverallProgress = () => {
    if (status === "uploading") {
      return uploadProgress;
    } else if (status === "transcoding") {
      return transcodingProgress;
    } else if (status === "success") {
      return 100;
    }
    return 0;
  };

  // Watch the status and redirect to home if successful
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        window.location.href = "/"; // Redirect to home
      }, 1500); // Wait for 3 seconds before redirecting

      return () => clearTimeout(timer); // Cleanup the timer on unmount
    }
  }, [status]);
  // Get the progress message based on status
  const getProgressMessage = () => {
    if (status === "uploading") {
      return `Uploading: ${uploadProgress}%`;
    } else if (status === "transcoding") {
      return `Transcoding: ${transcodingProgress}%`;
    } else if (status === "success") {
      return "Success! Video uploaded and processed.";
    } else if (status === "error") {
      return "Upload error, please try again.";
    }
    return "";
  };

  return (
    <div className="">
      <div className="auth__container">
      <div className="form-group">
        <label htmlFor="title">Title: </label>
        <input name="title" className="auth__form-control" value={title} onChange={handleTitleChange} />

      </div>
      </div>

      <div className="auth__container">
      <div className="form-group">
        <label htmlFor="desc">Description: </label>
        <input name="desc" className="auth__form-control" value={desc} onChange={handleDescChange} />
      </div>
        
      </div>


      <div className="form-group ">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
        <br />
        {file && status === "idle" && (
          <button
        style={{ margin: "15px auto" }}
        className="button success"
        onClick={handleFileUpload}
          >
        Upload
          </button>
        )}
      </div>

      {status !== "idle" && (
        <div className="progress-container">
          <p className="progress-message">{getProgressMessage()}</p>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${getOverallProgress()}%` }}
            />
          </div>

          {status === "transcoding" && (
            <p className="info-text">
              Transcoding may take a while depending on video size...
            </p>
          )}
          
        </div>
      )}

      {status === "success" && (
        <p className="info-text">
        Redirecting back to home...
      </p>
      )}

      {/* <style>{`
        
      `}</style> */}
    </div>
  );
}