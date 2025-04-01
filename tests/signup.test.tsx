import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import Signup from "../src/signup"; // Adjust path if necessary

describe("Signup Component", () => {
  // Test case 1: Empty name
  it("should display validation error for missing name", () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Simulate checking the "I agree to the Terms" checkbox to enable the submit button
    const checkbox = screen.getByLabelText(
      /i agree to the terms and conditions/i
    );
    fireEvent.click(checkbox);

    // Simulate form submission without entering a name
    const submitButton = screen.getByRole("button", { name: /sign up/i });
    fireEvent.click(submitButton);

    // Check for name validation error
    const nameError = screen.getByText(/name is required/i);
    expect(nameError).toBeInTheDocument();
  });
  // Test case 2: Invalid password format
  it("should display validation error for password not meeting the requirements", () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Simulate checking the checkbox to enable the submit button
    const checkbox = screen.getByLabelText(
      /i agree to the terms and conditions/i
    );
    fireEvent.click(checkbox);

    // Enter a password that doesn't meet the requirements
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    fireEvent.change(passwordInput, { target: { value: "password" } });

    // Simulate form submission
    const submitButton = screen.getByRole("button", { name: /sign up/i });
    fireEvent.click(submitButton);

    // Check for password validation error
    const passwordError = screen.getByText(
      /password must be at least 8 characters long/i
    );
    expect(passwordError).toBeInTheDocument();
  });
  // Test case 3: Passwords do not match
  it("should display validation error when passwords do not match", () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Simulate checking the checkbox to enable the submit button
    const checkbox = screen.getByLabelText(
      /i agree to the terms and conditions/i
    );
    fireEvent.click(checkbox);

    // Enter different passwords in the password and confirm password fields
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    fireEvent.change(passwordInput, { target: { value: "password123!" } });

    const confirmPasswordInput =
      screen.getByPlaceholderText(/confirm password/i);
    fireEvent.change(confirmPasswordInput, {
      target: { value: "differentPassword123!" },
    });

    // Simulate form submission
    const submitButton = screen.getByRole("button", { name: /sign up/i });
    fireEvent.click(submitButton);

    // Check for password mismatch error
    const confirmPasswordError = screen.getByText(/passwords do not match/i);
    expect(confirmPasswordError).toBeInTheDocument();
  });
  // Test case 4: Disabled submit button
  it("should disable submit button if terms and conditions are not checked", () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Simulate form submission with terms unchecked
    const submitButton = screen.getByRole("button", { name: /sign up/i });
    expect(submitButton).toBeDisabled();
  });
  // Test case 5: Enabled submit button
  it("should enable submit button if terms and conditions are checked", () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Check the checkbox to agree to terms
    const agreeToTermsCheckbox = screen.getByLabelText(
      /i agree to the terms and conditions/i
    );
    fireEvent.click(agreeToTermsCheckbox);

    // Now the submit button should be enabled
    const submitButton = screen.getByRole("button", { name: /sign up/i });
    expect(submitButton).toBeEnabled();
  });
});
