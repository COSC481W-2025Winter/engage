import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  function navigateToVideoPlayer() {
    navigate("/videoplayer"); // Navigate to the VideoPlayer page
  }

  function logoutSubmit() {
    localStorage.removeItem("login");
    localStorage.removeItem("loginStatus"); // Optional: Clear any login status message

    navigate("/"); // Redirect to the login page after logout
  }

  return (
    <div className="form">
      <h3>Dashboard Page</h3>
      <button onClick={navigateToVideoPlayer}>Go to Video Player</button>
      <p onClick={logoutSubmit}>Logout</p>
    </div>
  );
}

export default Dashboard;
