import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import LikeButton from "../src/components/likeButton";

// Mock axios
vi.mock("axios");

describe("Like Functionality", () => {
  const originalEnv = process.env;
  const mockLoginServer = "http://test-login-server";

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv("VITE_UPLOAD_SERVER", "http://test-upload-server");
    vi.stubEnv("VITE_LOGIN_SERVER", mockLoginServer);

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // Mock localStorage for logged-in user
    vi.spyOn(window.localStorage, "getItem").mockImplementation((key) => {
      if (key === "authToken") return "mock-token";
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });
  // Test 1: Test case for like functionality for logged-in user
  it("should call like-video API when like button is clicked by logged-in user", async () => {
    // Mock responses for API calls
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes("/video-likes-by-filename/")) {
        return Promise.resolve({ data: { likeCount: 5 } });
      } else if (url.includes("/check-like-status")) {
        return Promise.resolve({ data: { liked: false } });
      }
      return Promise.resolve({ data: {} });
    });

    vi.mocked(axios.post).mockImplementation((url) => {
      if (url.includes("/like-video")) {
        return Promise.resolve({
          data: { message: "Video liked successfully" },
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Render just the LikeButton component (avoiding the whole App with router)
    render(
      <LikeButton
        fileName="video1.mp4"
        loggedIn={true}
        userId={123}
        initialLikeCount={5}
        loginServer={mockLoginServer}
      />
    );

    // Find and click the like button
    const likeButton = screen.getByTestId("like-button");
    fireEvent.click(likeButton);

    // Verify that the like API was called
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        `${mockLoginServer}/like-video`,
        { fileName: "video1.mp4" },
        { params: { auth: "mock-token" } }
      );
    });
  });
  // Test 2: Test case for like functionality for logged-out user
  it("should show alert if user is not logged in", async () => {
    // Mock alert
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <LikeButton
        fileName="video1.mp4"
        loggedIn={false}
        userId={0}
        initialLikeCount={5}
        loginServer={mockLoginServer}
      />
    );

    // Find and click the like button
    const likeButton = screen.getByTestId("like-button");
    fireEvent.click(likeButton);

    // Verify alert was shown
    expect(alertMock).toHaveBeenCalledWith(
      "You must be logged in to like videos."
    );
  });

  // Test 3: Test case for updating UI after liking a video
  it("should update UI after liking a video", async () => {
    // Mock responses
    vi.mocked(axios.get).mockImplementation((url) => {
      if (url.includes("/video-likes-by-filename/")) {
        return Promise.resolve({ data: { likeCount: 5 } });
      } else if (url.includes("/check-like-status")) {
        return Promise.resolve({ data: { liked: false } });
      }
      return Promise.resolve({ data: {} });
    });

    vi.mocked(axios.post).mockImplementation((url) => {
      if (url.includes("/like-video")) {
        return Promise.resolve({
          data: { message: "Video liked successfully" },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <LikeButton
        fileName="video1.mp4"
        loggedIn={true}
        userId={123}
        initialLikeCount={5}
        loginServer={mockLoginServer}
      />
    );

    // Find and click the like button
    const likeButton = screen.getByTestId("like-button");
    fireEvent.click(likeButton);

    // Verify that the UI updates
    await waitFor(() => {
      expect(likeButton).toHaveStyle("color: rgb(255, 0, 0)");
      expect(likeButton).toHaveTextContent("6 Likes");
    });
  });
});
