import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles/auth.scss";
import validation from "./components/signupValidation";
import axios from "axios";

// let uploadServer = "http://localhost:3001";
// if (import.meta.env.VITE_UPLOAD_SERVER !== undefined) {
//   // console.log(import.meta.env.VITE_UPLOAD_SERVER);
//   uploadServer = import.meta.env.VITE_UPLOAD_SERVER;
// }
let loginServer = "http://localhost:8081";

if (import.meta.env.VITE_LOGIN_SERVER !== undefined) {
  // console.log(import.meta.env.VITE_UPLOAD_SERVER);
  loginServer = import.meta.env.VITE_LOGIN_SERVER;
}

const Signup: React.FC = () => {
  const [username, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false); // New state for the checkbox
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");

  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formValues = { username, email, password, confirmPassword };
    const validationErrors = validation(formValues);
    setErrors(validationErrors);
    setErrorMessage("");
    setSuccessMessage("");

    if (
      !validationErrors.username &&
      !validationErrors.email &&
      !validationErrors.password &&
      !validationErrors.confirmPassword &&
      agreeToTerms // Ensure checkbox is checked
    ) {
      axios
        .post(`${loginServer}/signup`, formValues)
        .then(() => {
          setSuccessMessage(
            "You have successfully signed up! Please check your email SPAM folder to verify your email."
          );
          setEmailMessage("Check your spam folder if you don't see the email.");
          setTimeout(() => {
            navigate("/login"); // Redirect after 3 seconds
          }, 3000);
          setName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setAgreeToTerms(false);
        })
        .catch((error) => {
          // Check if the status is 409 (Conflict) or some other error
          if (error.response) {
            if (error.response.status === 409) {
              setErrorMessage(error.response.data.message); // Sets error message to error message as written in route
            } else if (error.response.status === 400)
              setErrorMessage(error.response.data.message);
            else {
              setErrorMessage(
                "An unexpected error occurred. Please try again."
              );
            }
          }
        });
    }
  };

  return (
    <div className="auth__body">
      <div className="auth__form">
        <h2>Sign up</h2>
        <p>
          Password requirements:
          <ul>
            <li>At least 8 characters long</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </p>
        <div className="auth__container">
          {successMessage && (
            <div className="auth__success-message">{successMessage}<br />{emailMessage}</div>
          )}
          {errorMessage && (
            <div className="auth__error-message">{errorMessage}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="auth__form-group">
              <label htmlFor="name" className="auth__label">
                <strong>Username</strong>
              </label>
              <input
                type="text"
                id="name"
                value={username}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Username"
                className="auth__form-control"
              />
              {errors.username && (
                <span className="auth__text-danger">{errors.username}</span>
              )}
            </div>

            <div className="auth__form-group">
              <label htmlFor="email" className="auth__label">
                <strong>Email</strong>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="auth__form-control"
              />
              {errors.email && (
                <span className="auth__text-danger">{errors.email}</span>
              )}
            </div>

            <div className="auth__form-group">
              <label htmlFor="password" className="auth__label">
                <strong>Password</strong>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="auth__form-control"
              />
              {errors.password && (
                <span className="auth__text-danger">{errors.password}</span>
              )}
            </div>

            <div className="auth__form-group">
              <label htmlFor="confirmPassword" className="auth__label">
                <strong>Confirm Password</strong>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="auth__form-control"
              />
              {errors.confirmPassword && (
                <span className="auth__text-danger">
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="auth__terms">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={agreeToTerms}
                onChange={() => setAgreeToTerms(!agreeToTerms)}
              />
              <label htmlFor="agreeToTerms" className="auth__terms-label">
                I agree to the{" "}
                <Link className="terms-text" to="/terms">
                  Terms and Conditions
                </Link>
              </label>
            </div>

            <div className="auth__buttons-container">
              <button
                type="submit"
                className={`button ${!agreeToTerms ? "greyed" : "success"}`}
                disabled={!agreeToTerms} // Disable the button if the checkbox is unchecked
              >
                Sign up
              </button>
              <Link to="/login" className="button primary">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
