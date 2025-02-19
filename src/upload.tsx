// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
import "./styles/upload.scss"; // Import the updated styles
import FileUploader from "./components/FileUploader";
import { useState, useEffect } from 'react'; // React hook for managing state
import axios from "axios";


let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}
let loginServer = "http://localhost:8081"

if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}



function Upload() {
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  // Get logged in user ID
async function getLoggedInUserId(){
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      await axios.get(`${loginServer}/current-user-id`, {
        params: {
          auth: token ? token : "",
        }
      }).then(response => {
        // id = response.data.userId;
        setUserID(response.data.userId as number);
      })
      // userChanged = true;
      
    } catch (error) {
      console.error("Error fetching user ID:", error);
      return null;
    }
  } else {
    return null;
  }
}

async function getUsername(userid: number){
  let username = ""
  await axios.get(`${uploadServer}/user`, {
    params:{
      userID: userid
    }
  })
  .then(response => {
    username = response.data.username;
  })
  setUsername(username as string);
}

useEffect(() => {
  getLoggedInUserId();
  getUsername(userID);
},)
  return (
    <div className="upload-container">
      <h3 style={{ color: "green" }}>Disclaimer: The host is not responsible for any content on this site.</h3>
      <button
        className="back-button"
        onClick={() => (window.location.href = "/")}
        >
        Home
      </button>
      <h4>Engager: <span>{username}</span></h4>
      <h1 className="upload-title">Upload Your Video</h1>
      <FileUploader />
        <p>Transcoding is now done server side. Max file size is 80MB.</p>
    </div>
  );
}

export default Upload;

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <Upload />
//   </StrictMode>
// );
