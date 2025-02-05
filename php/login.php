<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

$conn = new mysqli("localhost", "react-user", "1234", "user");

if(mysqli_connect_errno()){
    echo "Failed to connect to MySQL: " . mysqli_connect_error();
    exit();
} else {
    $eData = file_get_contents('php://input');
    $data = json_decode($eData, true);

    $user = $data['user'];
    $pass = $data['pass'];
    $result = "";
    $enteredPassword = ""; // This will store the entered password for debugging
    $storedHash = ""; // This will store the stored hash for debugging

    if($user != "" && $pass != ""){
      $sql = "SELECT * FROM user WHERE user = '$user';";
      $res = mysqli_query($conn, $sql);
      
      if(mysqli_num_rows($res) != 0){
        $row = mysqli_fetch_array($res);
        $storedHash = $row['pass']; // Store the retrieved password hash

        // Assuming password verification logic is intact, add the following
        if(password_verify($pass, $row['pass'])){
          $result = "Login Success";
          $enteredPassword = $pass; // Save the entered password
        } else {
          $result = "Password is incorrect";
          $enteredPassword = $pass; // Still return entered password for debugging
        }

      } else {
        $result = "Invalid username";
      }
    } else {
        $result = "Username and password are required";
    }

    $conn->close();

    // Send the result and debugging info in the response
    $response[] = array(
        "result" => $result,
        "enteredPassword" => $enteredPassword, // Send entered password for debugging
        "storedHash" => $storedHash // Send stored hash for debugging
    );

    echo json_encode($response);
}
?>
