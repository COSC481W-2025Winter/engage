import "../styles/topbar.scss";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NotificationBell from "../notificationBell";
import axios from "axios";

let uploadServer = "http://localhost:3001";
if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
}
let loginServer = "http://localhost:8081";

if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}

export default function TopBar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState(0);
  const navigate = useNavigate();

  async function getUsername(userid: number) {
    let creatorName = "";
    await axios
      .get(`${uploadServer}/user`, {
        params: {
          userID: userid,
        },
      })
      .then((response) => {
        creatorName = response.data.username;
      });
    return creatorName as string;
  }

  async function getLoggedInUserId() {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const response = await axios.get(`${loginServer}/current-user-id`, {
          params: {
            auth: token ? token : "",
          },
        });
        setUserID(response.data.userId);
        setLoggedIn(true);
        // userChanged = true;
        return response.data.userId;
      } catch (error) {
        console.error("Error fetching user ID:", error);
        return null;
      }
    } else {
      return null;
    }
  }

  // const authButtons = async ()=>{
  //   let button = "";
  //   const userId = await getLoggedInUserId()

  //    if (userId !== null) {

  //     const username = await getUsername(userId);
  //     button = "<button className='control-button' onClick={() => navigate('/user')}" + username + " <i className='fa-solid fa-user'></i> </button>"

  //   } else {
  //     button = "<button className='control-button' onClick={handleBackToLogin}>Log In <i className='fa solid fa-right-to-bracket'></i></button>"
  //   }
  //   const sanitizedHTML = DOMPurify.sanitize(button);
  //   return (
  //     <div className="login-button-section" dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
  //   )

  // }

  getLoggedInUserId();

  async function assignUsername() {
    if (loggedIn) {
      const username = await getUsername(userID);
      setUsername(username);
      // console.log(username);
    }
  }
  assignUsername();
  return (
    <nav className="topbar">
      <div className="topbar__container">
        <div className="topbar__logo">
          <a onClick={() => navigate("/")}>
            <img className="topbar__icon" src="/src/assets/icon.svg"></img>
            <h1 className="desktop__text">Engage</h1>
          </a>
        </div>
        <div className="topbar__menu">
          <ul className="link__items">
            <li>
              <a className="button" onClick={() => navigate("/upload")}>
                <i className="fa-solid fa-upload persist"></i>{" "}
                <span className="desktop__text">Upload</span>
              </a>
            </li>
            <li>
              <a
                className={loggedIn ? "button user" : "button"}
                onClick={
                  loggedIn ? () => navigate("/user") : () => navigate("/login")
                }
              >
                {loggedIn ? (
                  <>
                    <i className="fa-solid fa-user persist"></i>{" "}
                    <span className="username">{username}</span>
                  </>
                ) : (
                  <>
                    <i className="fa solid fa-right-to-bracket persist"></i>{" "}
                    <span className="desktop__text">Log In</span>
                  </>
                )}
              </a>
            </li>
            <li>
              <NotificationBell />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
