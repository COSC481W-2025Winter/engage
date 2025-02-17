import { ChangeEvent, useState } from "react";
import axios from "axios";
import "dotenv";
// import "mysql2";

let uploadServer = "http://localhost:3000/upload";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80MB

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  // const [title, setTitle] = useState<string | null>(null);
  // const [desc, setDesc] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleDescChange(e: ChangeEvent<HTMLInputElement>) {
    setDesc(e.target.value);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  }
  function isMP4(file: File) {
    const fileName: string = file.name;
    const fileExtension = fileName?.split(".").pop()?.toLowerCase();
    return fileExtension === "mp4";
  }

  async function handleFileUpload() {
    if (!file) return;
    console.log("File size: " + file.size);
    console.log("Max file size: " + MAX_FILE_SIZE);
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

    try {
      await axios.post(uploadServer, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
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

  return (
    <div>
      <br></br>
      <label htmlFor="title">Title: </label>
      <input name="title" onChange={handleTitleChange} />
      <br></br>
      <label htmlFor="desc">Description: </label>
      <input name="desc" onChange={handleDescChange} />
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
      {status === "error" && <p>Upload error, please try again</p>}
    </div>
  );
}
