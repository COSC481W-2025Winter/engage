import { ChangeEvent, useState } from "react";
import axios from "axios";
import "dotenv";


import "../styles/auth.scss";


let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}
// let loginServer = "http://localhost:8081"

// if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
//   // console.log(import.meta.env.VITE_UPLOAD_SERVER);
//   loginServer = import.meta.env.VITE_LOGIN_SERVER;
// }
interface FormValues {
  title: string;
  desc: string;
  fileName: string;
}

<<<<<<< HEAD
import "../styles/upload.scss";

type UploadStatus = "idle" | "uploading" | "transcoding" | "success" | "error";
=======
type UploadStatus = "idle" | "uploading" | "success" | "error";
>>>>>>> like-reply

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
  /**
   * Checks to see if a file is an MP4
   * @param file
   * @returns
   */
  function isMP4(file: File) {
    const fileName: string = file.name;
    const fileExtension = fileName?.split(".").pop()?.toLowerCase();
    return fileExtension === "mp4";
  }

  async function handleFileUpload() {
    if (!file) return;
    if (!title){
      alert("Title is required");
      return;
    }
    // console.log("File size: " + file.size);
    // console.log("Max file size: " + MAX_FILE_SIZE);
    if (!isMP4(file)) {
      alert("File is not an mp4.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too big. Max file size is 80MB");
      return;
    }

    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", desc);

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

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

<<<<<<< HEAD
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
        <input type="file" accept="video/mp4" onChange={handleFileChange} />
        <br />
        {file && status === "idle" && (
          <button style={{margin: "15px auto"}} className="button primary" onClick={handleFileUpload}>Upload</button>
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
=======
  return (
    <div>
      <br></br>
      <label htmlFor="title">Title: </label>
      <input name="title" value={title} onChange={handleTitleChange} />
      <br></br>
      <label htmlFor="desc">Description: </label>
      <input name="desc" value={desc} onChange={handleDescChange} />
      <br></br>
      <input type="file" accept="video/mp4" onChange={handleFileChange} />
      {file && status !== "uploading" && (
        <button onClick={handleFileUpload}>Upload</button>
      )}
      {status === "uploading" && (
        <div>
          <p>Progress: {uploadProgress}%</p>
          <div
            className="upload-bar"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      {status === "success" && <p>Success!</p>}
      {status === "error" && <p>Upload error, please try again. (Title is required)</p>}
>>>>>>> like-reply
    </div>
  );
}
