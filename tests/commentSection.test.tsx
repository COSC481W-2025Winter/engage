import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import App from "../src/App";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ReactPlayer from 'react-player';
import '@testing-library/jest-dom';


// Create an axios mock adapter instance.
const mock = new AxiosMockAdapter(axios);

vi.mock('react-player', () => {
  return {
    __esModule: true,
    default: () => <div>Mocked ReactPlayer</div>,
  };
});

describe("Comment Section Interactions", () => {
    beforeEach(() => {
      mock.reset();
    });


  it("Comment input field does not exist if user is not logged in", async () => {

    render(<App />);

    // Click the COMMENT button to reveal the comment section.
    const commentButton = screen.getByRole("button", { name: /comment/i });
    fireEvent.click(commentButton);

    expect(screen.queryByPlaceholderText("Write a comment...")).toBeNull()
  });


  it("Comment input field exists if user is logged in", async () => {
    localStorage.setItem("authToken", "dummy.jwt.token");

    mock.onGet("http://localhost:8081/current-user-id").reply(200, { userId: 1 });

    // --- Mock backend responses ---
    mock.onGet("http://localhost:3001/video-list").reply(200, [
      { fileName: "video.mp4" }
    ]);
    mock.onGet("http://localhost:3001/get-comments").reply(200, [
      {
        id: 1,
        user_id: 1,
        content: "Test comment",
        created_at: "2025-01-01",
        likeCount: 0,
        liked: 0,
        replies: []
      }
    ]);
    mock.onGet("http://localhost:3001/user").reply(200, { id: 1, username: "TestUser" });

    // Render the App with the loggedIn state set to true
    render(<App />);

    // Click the COMMENT button to reveal the comment section.
    const commentButton = screen.getByRole("button", { name: /comment/i });
    fireEvent.click(commentButton);

     // Wait until the comment section is visible (by checking for the comment input).
     await waitFor(() => {
      expect(screen.getByPlaceholderText("Write a comment...")).toBeInTheDocument();
    });
  });

  // it("submits a new comment successfully", async () => {
  //   mock.onPost("/api/comments").reply(201, {
  //     id: 2,
  //     username: "User2",
  //     created_at: "2025-03-18",
  //     comment: "New comment",
  //   });

  //   render(<App />);

  //   // Simulate login
  //   const loginButton = screen.queryByText(/log in/i);
  //   if (loginButton) {
  //     fireEvent.click(loginButton);
  //   }

  //   // Open comment section
  //   const commentButton = screen.getByRole("button", { name: /comment/i });
  //   fireEvent.click(commentButton);

  //   // Enter a comment
  //   const input = screen.getByPlaceholderText("Write a comment...");
  //   fireEvent.change(input, { target: { value: "New comment" } });

  //   // Submit comment
  //   const submitButton = screen.getByRole("button", { name: /send/i });
  //   fireEvent.click(submitButton);

  //   // Wait for the comment to appear
  //   await waitFor(() => {
  //     expect(screen.getByText("New comment")).toBeInTheDocument();
  //   });
  // });
});
