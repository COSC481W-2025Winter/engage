<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");

// Database connection
$con = new mysqli("localhost", "react-user", "1234", "user");

// Check connection
if ($con->connect_error) {
    die(json_encode([["result" => "Database connection failed"]]));
}

// Get JSON input
$eData = file_get_contents("php://input");
$dData = json_decode($eData, true);

// Validate input
$user = isset($dData["user"]) ? trim($dData["user"]) : "";

if ($user === "") {
    echo json_encode([["result" => "Username is required"]]);
    exit();
}

// Use prepared statements to prevent SQL injection
$stmt = $con->prepare("SELECT * FROM user WHERE user = ?");
$stmt->bind_param("s", $user);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $result = "Username is already taken";
} else {
    $result = "Username available"; // More meaningful response
}

// Close DB connection
$stmt->close();
$con->close();

// Return JSON response
echo json_encode([["result" => $result]]);
?>
