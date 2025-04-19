import React, { useState } from "react";
import axios from "axios";
import "./styles/auth.scss";
import { Link } from "react-router-dom";

// let uploadServer = "http://localhost:3001";
// if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
//   // console.log(import.meta.env.VITE_UPLOAD_SERVER);
//   uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
// }
let loginServer = "http://localhost:8081"

if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}



const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      await axios.post(
      `${loginServer}/send-recovery-link`,
      {
        email,
      }
      );
      setMessage("Recovery link sent successfully.");
      setEmailMessage("Please check your email and spam folder.");
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="auth__body">
      <div className="auth__form">
        <h2>Reset Password</h2>
        {message && <div className="auth__success">{message}<br />{emailMessage}</div>}
        {error && <div className="auth__error">{error}</div>}
        <form onSubmit={handleSubmit}>

          <div className="auth__container">

          <label>
            <strong>Email:</strong>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="auth__form-control"
          />
          </div>
          
        <button type="submit" className="button warning">Send Recovery Email</button>
        <br /> <br />
          <Link to="/login">
            <button className="button primary">Go to Login</button>
          </Link>
          
        </form>

        <div>
          
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
