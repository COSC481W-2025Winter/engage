import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/upload.scss"; // Import the updated styles
import FileUploader from "./components/FileUploader";

function Upload() {
  return (
    <div className="upload-container">
      <h3 style={{ color: "green" }}>Disclaimer: The host is not responsible for any content on this site.</h3>
      <button
        className="back-button"
        onClick={() => (window.location.href = "/")}
        >
        Home
      </button>
      <h1 className="upload-title">Upload Your Video</h1>
      <FileUploader />
        <p>We only accept .mp4 for now. Max file size is 80MB.</p>
    </div>
  );
}

export default Upload;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Upload />
  </StrictMode>
);
