import "./style.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let login = localStorage.getItem("login");
    if (login) {
      navigate("/dashboard");
    }
    let loginStatus = localStorage.getItem("loginStatus");
    if (loginStatus) {
      setError(loginStatus);
      setTimeout(function () {
        localStorage.clear();
        window.location.reload();
      }, 3000);
    }
    setTimeout(function () {
      setMsg("");
    }, 5000);
  }, [msg]);
  const handleInputChange = (e: any, type: string) => {
    switch (type) {
      case "user":
        setError("");
        setUser(e.target.value);
        if (e.target.value.length === "") {
          setError("Username is required");
        }
        break;
      case "pass":
        setError("");
        setPass(e.target.value);
        if (e.target.value.length === "") {
          setError("Password is required");
        }
        break;
      default:
    }
  };
  function loginSubmit() {
    if (user !== "" && pass !== "") {
      var url = "https://localhost/react/login.php";
      var headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      var Data = {
        user: user,
        pass: pass,
      };
      fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(Data),
      })
        .then((response) => response.json())
        .then((response) => {
          if (
            response[0].result === "Invalid username!" ||
            response[0].result === "Invalid password!"
          ) {
            setError(response[0].result);
          } else {
            setMsg(response[0].result);
            setTimeout(function () {
              localStorage.setItem("login", "true");
              navigate("/dashboard");
            }, 5000);
          }
        })
        .catch((err) => {
          setError(err);
          console.log(err);
        });
    } else {
      setError("Username and Password are required");
    }
  }
  return (
    <div className="form">
      <p>
        {error !== "" ? (
          <span className="error">{error}</span>
        ) : (
          <span className="success">{msg}</span>
        )}
      </p>
      <label>Username</label>
      <input
        type="text"
        value={user}
        onChange={(e) => handleInputChange(e, "user")}
      />
      <label>Password</label>
      <input
        type="password"
        value={pass}
        onChange={(e) => handleInputChange(e, "pass")}
      />
      <input
        type="submit"
        value="Login"
        className="button"
        onClick={loginSubmit}
      />
    </div>
  );
}

export default Login;
