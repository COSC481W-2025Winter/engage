import "./style.css";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  function logoutSubmit() {
    // Remove login information from localStorage
    localStorage.removeItem("login");
    localStorage.removeItem("userData"); // Optional: Remove any user-specific data

    // Optionally, set a message for the user (e.g., "You have logged out successfully")
    localStorage.setItem("loginStatus", "Logout successfully");

    // Redirect to the login page
    navigate("/login");
  }

  return (
    <div className="form">
      <h3>Dashboard Page</h3>
      <p onClick={logoutSubmit}>Logout</p>
    </div>
  );
}

export default Dashboard;
