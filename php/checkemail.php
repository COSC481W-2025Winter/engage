<?php
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, Accept");

  // Enable error reporting for debugging
  error_reporting(E_ALL);
  ini_set('display_errors', 1);

  // Connect to MySQL
  $con = new mysqli("localhost", "react-user", "1234", "user");

  if ($con->connect_error) {
    die(json_encode(["error" => "Failed to connect to MySQL: " . $con->connect_error]));
  }

  $email = '';

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    //  Read JSON input from fetch()
    $eData = file_get_contents('php://input');
    $dData = json_decode($eData, true);

    if (!$dData || !isset($dData['email'])) {
      die(json_encode(["error" => "Invalid JSON received"]));
    }

    $email = $dData['email'];
  } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['email'])) {
    //  Allow browser testing with GET requests
    $email = $_GET['email'];
  } else {
    die(json_encode(["error" => "Email parameter missing"]));
  }

  // Check if email exists in the database
  $stmt = $con->prepare("SELECT * FROM user WHERE email = ?");
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $stmt->store_result();

  if ($stmt->num_rows > 0) {
    $result = "Email is already registered";
  } else {
    $result = "Email is available";
  }

  $stmt->close();
  $con->close();

  echo json_encode([["result" => $result]]);
?>
