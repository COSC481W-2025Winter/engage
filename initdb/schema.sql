use engage;


CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
username VARCHAR(30)  UNIQUE,
    email VARCHAR(50) UNIQUE,
    password VARCHAR(250),
    role VARCHAR(10),
    isVerified BOOLEAN DEFAULT FALSE,
    verificationToken VARCHAR(255),  -- This column stores the verification token
    recoveryToken VARCHAR(255), -- This column stores the password recovery token
    dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE videos(
    id int AUTO_INCREMENT,
    creator_id int NOT NULL, -- NOT NULL REMOVED FOR TESTING
    title text NOT NULL,
    description text,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fileName text NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id int NOT NULL,
    video_id int NOT NULL,
    content text NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE reply (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id int NOT NULL,
    content text NOT NULL,
    comment_id int NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reply_likes(
    id INT PRIMARY KEY AUTO_INCREMENT,
    reply_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (reply_id) REFERENCES reply(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    UNIQUE(user_id, video_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
CREATE TABLE video_views (
    id int AUTO_INCREMENT,
    video_id int NOT NULL,
    user_id int, -- Can be NULL for anonymous views
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE comment_likes(
    id INT PRIMARY KEY AUTO_INCREMENT,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  sender_id INT,
  content_id INT NOT NULL,
  content_type ENUM('video', 'comment', 'reply') NOT NULL,
  action_type ENUM('like', 'comment', 'reply', 'follow') NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);