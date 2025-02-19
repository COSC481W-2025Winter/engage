import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles/signup.scss";
import validation from "./signupValidation";
import axios from "axios";

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
        .post("http://localhost:8081/signup", formValues)
        .then(() => {
          setSuccessMessage("You have successfully signed up! Redirecting...");
          setTimeout(() => {
            navigate("/login"); // Redirect after 1.5 seconds
          }, 1500);
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
            } else {
              setErrorMessage(
                "An unexpected error occurred. Please try again."
              );
            }
          }
        });
    }
  };

  return (
    <div className="signup__body">
      <div className="signup__form">
        <h2>Sign up</h2>
        <div className="signup__container">
          {successMessage && (
            <div className="signup__success-message">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="signup__error-message">{errorMessage}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="signup__form-group">
              <label htmlFor="name" className="signup__label">
                <strong>Username</strong>
              </label>
              <input
                type="text"
                id="name"
                value={username}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Username"
                className="signup__form-control"
              />
              {errors.username && (
                <span className="signup__text-danger">{errors.username}</span>
              )}
            </div>

            <div className="signup__form-group">
              <label htmlFor="email" className="signup__label">
                <strong>Email</strong>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="signup__form-control"
              />
              {errors.email && (
                <span className="signup__text-danger">{errors.email}</span>
              )}
            </div>

            <div className="signup__form-group">
              <label htmlFor="password" className="signup__label">
                <strong>Password</strong>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="signup__form-control"
              />
              {errors.password && (
                <span className="signup__text-danger">{errors.password}</span>
              )}
            </div>

            <div className="signup__form-group">
              <label htmlFor="confirmPassword" className="signup__label">
                <strong>Confirm Password</strong>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="signup__form-control"
              />
              {errors.confirmPassword && (
                <span className="signup__text-danger">
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="signup__terms">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={agreeToTerms}
                onChange={() => setAgreeToTerms(!agreeToTerms)}
              />
              <label htmlFor="agreeToTerms" className="signup__terms-label">
                I agree to the <Link to="/terms">Terms and Conditions</Link>
              </label>
            </div>

            <div className="signup__buttons-container">
              <button
                type="submit"
                className="signup__btn signup__btn--success"
                disabled={!agreeToTerms} // Disable the button if the checkbox is unchecked
              >
                Sign up
              </button>
              <Link to="/login" className="signup__button">
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
