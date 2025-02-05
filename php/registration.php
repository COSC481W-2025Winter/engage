<?php
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, Accept");

  // ✅ Enable error reporting for debugging (Remove this in production)
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  // ✅ Connect to MySQL
  $con = new mysqli("localhost", "react-user", "1234", "user");

  if ($con->connect_error) {
    die(json_encode(["error" => "Failed to connect to MySQL: " . $con->connect_error]));
  }

  // ✅ Read JSON input
  $eData = file_get_contents('php://input');
  $dData = json_decode($eData, true);

  if (!$dData || !isset($dData['user'], $dData['email'], $dData['pass'])) {
    die(json_encode(["error" => "Invalid JSON received"]));
  }

  $user = trim($dData['user']);
  $email = trim($dData['email']);
  $pass = password_hash(trim($dData['pass']), PASSWORD_DEFAULT); // Hash password

  if ($user === "" || $email === "" || $pass === "") {
    die(json_encode(["error" => "All fields are required"]));
  }

  // ✅ Check if email or username already exists
  $stmt = $con->prepare("SELECT * FROM user WHERE email = ? OR user = ?");
  $stmt->bind_param("ss", $email, $user);
  $stmt->execute();
  $stmt->store_result();

  if ($stmt->num_rows > 0) {
    die(json_encode(["error" => "Username or email is already taken"]));
  }

  $stmt->close();

  // ✅ Insert new user (Using prepared statement)
  $stmt = $con->prepare("INSERT INTO user (user, email, pass) VALUES (?, ?, ?)");
  $stmt->bind_param("sss", $user, $email, $pass);

  if ($stmt->execute()) {
    echo json_encode(["success" => "Registration Successful"]);
  } else {
    echo json_encode(["error" => "Failed to register user"]);
  }

  $stmt->close();
  $con->close();
?>
