import "./style.css";
import { useState, useEffect, ChangeEvent } from "react";

function Registration() {
  const [user, setUser] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pass1, setPass1] = useState<string>("");
  const [pass2, setPass2] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

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

  const handleSubmit = () => {
    if (user && email && pass1 && pass2) {
      const url = "http://localhost/php/registration.php";
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const Data = { user, email, pass2 };
      fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(Data),
      })
        .then((response) => response.json())
        .then((response) => {
          setMsg(response[0].result);
        })
        .catch((err) => {
          setError(err.message);
          console.log(err);
        });
      setUser("");
      setEmail("");
      setPass1("");
      setPass2("");
    } else {
      setError("All fields are required");
    }
  };

  const checkEmail = () => {
    const url = "https://localhost/php/checkemail.php";
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const Data = { email: email };
    fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ Data }),
    })
      .then((response) => response.json())
      .then((response) => setError(response[0].result))
      .catch((err) => {
        setError(err.message);
        console.log(err);
      });
  };

  const checkUser = () => {
    const url = "https://localhost/php/checkuser.php";
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const Data = { user: user };
    fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ Data }),
    })
      .then((response) => response.json())
      .then((response) => setError(response[0].result))
      .catch((err) => {
        setError(err.message);
        console.log(err);
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
    </div>
  );
}

export default Registration;
