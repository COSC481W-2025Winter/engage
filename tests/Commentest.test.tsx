// tests/Home.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { describe, it, beforeEach, expect } from "vitest";
import App from "/Users/Maksim/engage/src/App";

// Create an axios mock adapter instance.
const axiosMock = new AxiosMockAdapter(axios);

describe("Home Component - Comment Like and Replies", () => {
  beforeEach(() => {
    axiosMock.reset();
    localStorage.clear();
  });

  it("toggles a comment like correctly", async () => {
    // Simulate a logged-in user.
    localStorage.setItem("authToken", "dummy.jwt.token");

    // --- Mock backend responses ---
    // GET /video-list: return one video.
    axiosMock.onGet("http://localhost:3001/video-list").reply(200, [
      { fileName: "sample-trans.mp4" }
    ]);

    // GET /get-comments: return one comment with id 1, 0 likes.
    axiosMock.onGet("http://localhost:3001/get-comments").reply((config) => {
      // Expect fileName query param to be "sample-trans.mp4"
      return [
        200,
        [
          {
            id: 1,
            user_id: 2,
            content: "Test comment",
            created_at: "2025-01-01",
            likeCount: 0,
            liked: 0,
            replies: []
          }
        ]
      ];
    });

    // GET /user: return username for the comment's user.
    axiosMock.onGet("http://localhost:3001/user").reply((config) => {
      return [200, { id: 2, username: "TestUser" }];
    });

    // Render the App (which contains Home)
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for the comment to appear
    await waitFor(() => {
      expect(screen.getByText("Test comment")).toBeInTheDocument();
    });

    // Find the like button by its text (which displays the like count)
    const likeButton = screen.getByRole("button", { name: /0/i });
    expect(likeButton).toBeInTheDocument();

    // --- Mock the POST /toggle-comment-like response ---
    axiosMock.onPost("http://localhost:3001/toggle-comment-like").reply(200, {
      message: "Comment liked"
    });

    // Simulate clicking the like button
    fireEvent.click(likeButton);

    // Wait for UI update: like count should increase to 1 and style changes (e.g., red)
    await waitFor(() => {
      expect(likeButton).toHaveTextContent("1");
      expect(likeButton).toHaveStyle({ color: "red" });
    });
  });

  it("posts a reply and updates the UI", async () => {
    // Simulate logged-in user.
    localStorage.setItem("authToken", "dummy.jwt.token");

    // --- Mock responses ---
    // GET /video-list: one video.
    axiosMock.onGet("http://localhost:3001/video-list").reply(200, [
      { fileName: "sample-trans.mp4" }
    ]);

    // GET /get-comments: return one comment (id 1) with no replies initially.
    axiosMock.onGet("http://localhost:3001/get-comments").reply(200, [
      {
        id: 1,
        user_id: 2,
        content: "Test comment for reply",
        created_at: "2025-01-01",
        likeCount: 0,
        liked: 0,
        replies: []
      }
    ]);

    // GET /user: return username for comment author.
    axiosMock.onGet("http://localhost:3001/user").reply(200, {
      id: 2,
      username: "TestUser"
    });

    // GET /get-replies: initially return empty array.
    axiosMock.onGet("http://localhost:3001/get-replies").reply(200, []);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for comment to appear
    await waitFor(() => {
      expect(screen.getByText("Test comment for reply")).toBeInTheDocument();
    });

    // --- Simulate opening the reply input ---
    // We assume the reply toggle button has data-testid="reply-toggle-1"
    const replyToggleButton = screen.getByTestId("reply-toggle-1");
    fireEvent.click(replyToggleButton);

    // The reply input should appear (it uses the placeholder "Write a reply...")
    const replyInput = screen.getByPlaceholderText("Write a reply...");
    expect(replyInput).toBeInTheDocument();

    // Type a reply
    fireEvent.change(replyInput, { target: { value: "This is a test reply" } });
    expect(replyInput).toHaveValue("This is a test reply");

    // --- Mock POST /post-reply ---
    axiosMock.onPost("http://localhost:3001/post-reply").reply(200, {
      message: "Reply posted successfully!"
    });

    // Also, update GET /get-replies to return the new reply after posting.
    axiosMock.onGet("http://localhost:3001/get-replies").reply(200, [
      {
        id: 101,
        creator_id: 3,
        content: "This is a test reply",
        created_at: "2025-01-02"
      }
    ]);

    // Assume the send button has data-testid="send-reply-1"
    const sendReplyButton = screen.getByTestId("send-reply-1");
    fireEvent.click(sendReplyButton);

    // Wait for the new reply text to appear in the UI.
    await waitFor(() => {
      expect(screen.getByText("This is a test reply")).toBeInTheDocument();
    });
  });
});
