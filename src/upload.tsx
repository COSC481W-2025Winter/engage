// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
import "./styles/upload.scss"; // Import the updated styles
import FileUploader from "./components/FileUploader";
// import {  useEffect } from 'react'; // React hook for managing state
// import axios from "axios";
// import App from "./App";


// let uploadServer = "http://localhost:3001";
// if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
//   // console.log(import.meta.env.VITE_UPLOAD_SERVER);
//   uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
// }
// let loginServer = "http://localhost:8081"

// if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
//   // console.log(import.meta.env.VITE_UPLOAD_SERVER);
//   loginServer = import.meta.env.VITE_LOGIN_SERVER;
// }



function Upload() {
  // const [username, setUsername] = useState("");
  // const [userID, setUserID] = useState(0);
  // Get logged in user ID
// async function getLoggedInUserId(){
//   const token = localStorage.getItem("authToken");
//   if (token) {
//     try {
//       await axios.get(`${loginServer}/current-user-id`, {
//         params: {
//           auth: token ? token : "",
//         }
//       }).then(response => {
//         // id = response.data.userId;
//         setUserID(response.data.userId as number);
//       })
//       // userChanged = true;
      
//     } catch (error) {
//       console.error("Error fetching user ID:", error);
//       return null;
//     }
//   } else {
//     return null;
//   }
// }

// async function getUsername(userid: number){
//   let username = ""
//   await axios.get(`${uploadServer}/user`, {
//     params:{
//       userID: userid
//     }
//   })
//   .then(response => {
//     username = response.data.username;
//   })
//   setUsername(username as string);
// }

// useEffect(() => {
//   // getLoggedInUserId();
//   // getUsername(userID);
// },)
  return (
    <div className="upload-app">
      <div className="upload-container">
        <div className="upload-banner">
        <h1 className="upload-title">Upload Your Video</h1>
        <h3>Disclaimer: The host is not responsible for any content on this site.</h3>
        <p>Max file size is 80MB. <b style={{color: "lightgreen"}}>MOV and MKV are now accepted alongside MP4.</b></p>
        </div>
        <div className="uploader">
        <FileUploader />
        </div>  
    </div>
    </div>
    
  );
}

export default Upload;

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <Upload />
//   </StrictMode>
// );