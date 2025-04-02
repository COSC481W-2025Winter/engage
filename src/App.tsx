import "./styles/App.scss"; // Import global and App-specific styles
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login.tsx";
import Home from "./Home.tsx";
import Signup from "./signup.tsx";
import PrivateRoute from "./PrivateRoute";
import ResetPassword from "./resetPassword.tsx";
import User from "./User";
import path from "path-browserify";
import Upload from "./upload.tsx";
import VerifyEmail from "./VerifyEmail.tsx";
import axios from "axios";
import Terms from "./terms.tsx";
import TopBar from "./components/TopBar.tsx";
import RecoverAccount from "./recoverAccount.tsx";
// import { createContext, useContext } from 'react';
// import VideoPlayer from './components/VideoPlayerUser.tsx';

// Dynamically import all video files from the media folder
const videos = import.meta.glob("../media/*trans.mp4");

let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}


// Function to check if the auth token is expired
function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    return now >= expiry;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

// Remove authToken if it's expired
const token = localStorage.getItem("authToken");
if (token && isTokenExpired(token)) {
  localStorage.removeItem("authToken");
}



function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/recover-account/:token" element={<RecoverAccount />} />
        {/* User Page Route */}

        {/* Protected Route for Dashboard and Video Player */}
        <Route element={<PrivateRoute />}>
          <Route path="/user" element={<User />} />
          <Route path="/upload" element={<Upload />} />
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
