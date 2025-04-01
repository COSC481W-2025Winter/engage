import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import Login from "../src/login.tsx";

describe("Login Component", () => {
  // Test case 1: Empty email and password
  it("should display validation errors for empty email and password", () => {
    // Step 1: Render the component wrapped in BrowserRouter
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Step 2: Simulate form submission without filling in the fields
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);

    // Step 3: Check for email validation error
    const emailError = screen.getByText(/email is required/i);
    expect(emailError).toBeInTheDocument();

    // Step 4: Check for password validation error
    const passwordError = screen.getByText(/password is required/i);
    expect(passwordError).toBeInTheDocument();
  });
  // Test case 2: Invalid password format
  it("should display validation error for invalid password format", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Enter an invalid password
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    fireEvent.change(passwordInput, { target: { value: "weak" } });

    // Simulate form submission
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);

    // Check for password validation error
    const passwordError = screen.getByText(/password is invalid/i);
    expect(passwordError).toBeInTheDocument();
  });
  // Test case 3: Valid email and password
  it("should not display validation errors for valid email and password", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Enter a valid email
    const uesrnameOrEmail = screen.getByPlaceholderText(/Enter Username OR Email/i);
    fireEvent.change(uesrnameOrEmail, { target: { value: "valid@example.com" } });

    // Enter a valid password
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    fireEvent.change(passwordInput, { target: { value: "StrongPassword1@" } });

    // Simulate form submission
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);

    // Check that no validation errors are displayed
    const emailError = screen.queryByText(/email is required/i);
    expect(emailError).not.toBeInTheDocument();

    const passwordError = screen.queryByText(/password is required/i);
    expect(passwordError).not.toBeInTheDocument();
  });
});
