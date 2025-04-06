import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./styles/notification.scss";

// Get the login server URL from environment variables
const loginServer =
  import.meta.env.VITE_LOGIN_SERVER || "http://localhost:8081";

interface Notification {
  id: string;
  sender_username: string;
  action_type: string;
  content_type: string;
  content_preview: string;
  content_id: string;
  is_read: boolean;
  created_at: string;
}

function formatNotificationMessage(notification: Notification): string {
  const { sender_username, action_type, content_type, content_preview } =
    notification;

  switch (action_type) {
    case "like":
      if (content_type === "video") {
        return `${sender_username} liked your video "${content_preview}"`;
      } else if (content_type === "comment") {
        return `${sender_username} liked your comment "${content_preview}..."`;
      } else if (content_type === "reply") {
        return `${sender_username} liked your reply "${content_preview}..."`;
      }
      break;
    case "comment":
      return `${sender_username} commented on your video "${content_preview}"`;
    case "reply":
      return `${sender_username} replied to your comment "${content_preview}..."`;
  }

  return `${sender_username} interacted with your content`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await axios.get<{ notifications: Notification[] }>(
        `${loginServer}/notifications`,
        {
          params: { auth: token },
        }
      );
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await axios.get<{ count: number }>(
        `${loginServer}/notifications/unread-count`,
        {
          params: { auth: token },
        }
      );
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (notificationIds: string[] | null = null) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      await axios.post(
        `${loginServer}/notifications/mark-read`,
        { notificationIds },
        { params: { auth: token } }
      );
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  // Handle notification click with navigation
  const handleNotificationClick = async (notification: Notification) => {
    // Mark the notification as read
    await markAsRead([notification.id]);

    // Close the dropdown
    setShowDropdown(false);

    // Navigate based on content type
    if (notification.content_type === "video") {
      // Navigate to the video page
      navigate(`/video/${notification.content_id}`);
    } else if (
      notification.content_type === "comment" ||
      notification.content_type === "reply"
    ) {
      // Navigate to the video with focus on the comment
      navigate(`/video/${notification.content_id}?comment=true`);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 6000); // Check every 6 seconds

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) fetchNotifications();
        }}
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={() => markAsRead()}>Mark all as read</button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p>No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    !notification.is_read ? "unread" : ""
                  }`}
                  onClick={() => markAsRead([notification.id])}
                >
                  <p>{formatNotificationMessage(notification)}</p>
                  <span className="notification-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
