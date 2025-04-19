import '@testing-library/jest-dom';
// import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import User from '../src/User';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios using Vitest
vi.mock('axios');

// Use vi.mocked to obtain a typed version of axios.get
const mockedAxiosGet = vi.mocked(axios.get, true);

beforeEach(() => {
  localStorage.setItem('authToken', 'dummy-token');

  // Provide a default implementation for axios.get:
  mockedAxiosGet.mockImplementation((url: string) => {
    if (url.includes('/get-user-videos')) {
      return Promise.resolve({
        data: { videos: [{ fileName: 'video1.mp4' }, { fileName: 'video2.mp4' }] }
      });
    }
    if (url.includes('/get-user-liked-videos')) {
      return Promise.resolve({
        data: { videos: [{ fileName: 'liked1.mp4' }] }
      });
    }
    if (url.includes('/current-user-id')) {
      return Promise.resolve({ data: { userId: 123 } });
    }
    if (url.includes('/user')) {
      return Promise.resolve({
        data: {
          username: 'TestUser',
          profilePictureUrl: 'https://via.placeholder.com/100',
          dateCreated: new Date().toISOString()
        }
      });
    }
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

describe('User Component', () => {
  it('renders the component with default elements', async () => {
    render(
      <BrowserRouter>
        <User />
      </BrowserRouter>
    );

    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    expect(screen.getByAltText('Profile')).toBeInTheDocument();
    expect(screen.getByText(/My Videos/i)).toHaveClass('active');
  });

  it('loads and displays user videos on mount', async () => {
    const { container } = render(
      <BrowserRouter>
        <User />
      </BrowserRouter>
    );

    // Wait until video elements appear in the DOM.
    await waitFor(() => {
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to "My Likes" tab and loads liked videos', async () => {
    // Render once
    const { container } = render(
      <BrowserRouter>
        <User />
      </BrowserRouter>
    );

    // Click on the "My Likes" tab to switch
    const likesTab = screen.getByText(/My Likes/i);
    fireEvent.click(likesTab);

    // Wait for the videos to appear using the already rendered container.
    await waitFor(() => {
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('logout button clears token from localStorage', () => {
    render(
      <BrowserRouter>
        <User />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('uploading new profile picture triggers API call and updates profile picture URL', async () => {
    const newProfilePicUrl = 'http://new-profile-pic.com/img.jpg';
    const postSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({ data: { profilePictureUrl: newProfilePicUrl } });

    render(
      <BrowserRouter>
        <User />
      </BrowserRouter>
    );

    const profilePic = screen.getByAltText('Profile');
    fireEvent.click(profilePic);

    // Simulate file selection on the hidden file input.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyFile = new File(['dummy content'], 'dummy.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect((screen.getByAltText('Profile') as HTMLImageElement).src).toContain(newProfilePicUrl);
    });
  });
});
