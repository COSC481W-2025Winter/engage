import "./style.css";
import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

function Registration() {
  const [user, setUser] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pass1, setPass1] = useState<string>("");
  const [pass2, setPass2] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const navigate = useNavigate();

  const goToLoginPage = () => {
    navigate("/"); // Navigate to the login page ("/" route)
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMsg("");
    }, 15000);
    return () => clearTimeout(timer);
  }, [msg]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const value = e.target.value;
    setError("");
    switch (type) {
      case "user":
        setUser(value);
        if (value === "") setError("Username is required");
        break;
      case "email":
        setEmail(value);
        if (value === "") setError("Email is required");
        break;
      case "pass1":
        setPass1(value);
        if (value === "") setError("Password is required");
        break;
      case "pass2":
        setPass2(value);
        if (value === "") {
          setError("Confirm password is required");
        } else if (value !== pass1) {
          setError("Password does not match");
        }
        break;
    }
  };

  const handleSubmit = async () => {
    if (!user || !email || !pass1 || !pass2) {
      setError("All fields are required");
      return;
    }

    if (pass1 !== pass2) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://localhost/php/registration.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ user, email, pass: pass2 }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error); // Handle error message properly
      } else if (data.success) {
        setMsg(data.success);
        setUser("");
        setEmail("");
        setPass1("");
        setPass2("");
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      setError("Failed to register: " + err.message);
    }
  };

  const checkEmail = () => {
    const url = "http://localhost/php/checkemail.php";
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email }), // Fix: Send email directly
    })
      .then((response) => response.json())
      .then((response) => setError(response[0]?.result || "Unknown error"))
      .catch((err) => {
        setError("Failed to fetch: " + err.message);
        console.error(err);
      });
  };

  const checkUser = () => {
    const url = "http://localhost/php/checkuser.php";
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ user }), // Fix: Send user directly
    })
      .then((response) => response.json())
      .then((response) => setError(response[0]?.result || "Unknown error"))
      .catch((err) => {
        setError("Failed to fetch: " + err.message);
        console.error(err);
      });
  };
  const checkPassword = () => {
    if (pass1.length < 8) {
      setError("Password must be at least 8 characters long");
    }
  };

  return (
    <div className="form">
      <p>
        {msg ? (
          <span className="success">{msg}</span>
        ) : (
          <span className="error">{error}</span>
        )}
      </p>
      <label>Username</label>
      <input
        type="text"
        value={user}
        onChange={(e) => handleInputChange(e, "user")}
        onBlur={checkUser}
      />
      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => handleInputChange(e, "email")}
        onBlur={checkEmail}
      />
      <label>Password</label>
      <input
        type="password"
        value={pass1}
        onChange={(e) => handleInputChange(e, "pass1")}
        onBlur={checkPassword}
      />
      <label>Confirm Password</label>
      <input
        type="password"
        value={pass2}
        onChange={(e) => handleInputChange(e, "pass2")}
      />
      <label></label>
      <input
        type="submit"
        value="Submit"
        className="button"
        onClick={handleSubmit}
      />
      <button onClick={goToLoginPage} className="button">
        Go to Login
      </button>
    </div>
  );
}

export default Registration;
