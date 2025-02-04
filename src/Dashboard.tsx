import "./style.css";
import { useNavigate } from "react-router-dom";
function Dashboard() {
  const navigate = useNavigate();
  function logoutSubmit() {
    localStorage.setItem("login", false);
    localStorage.setItem("loginStatus", "Logout successfully  ");
    navigate("/");
  }
  return (
    <div className="form">
      <h3>Dashboard Page</h3>
      <p onClick={logoutSubmit}>Logout</p>
    </div>
  );
}

export default Dashboard;
