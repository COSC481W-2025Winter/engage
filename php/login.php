<?php
    header(("Access-Control-Allow-Origin: *"));
    header(("Access-Control-Allow-Methods: GET,POST"));
    header(("Access-Control-Allow-Headers: Content-Type"));

    $conn = new mysqli("localhost", "react-user", "1234", "user");
    if(mysqli_connect_errno()){
        echo "Failed to connect to MySQL: " . mysqli_connect_error();
        exit();
    } else{
      $eData = file_get_contents('php://input');
      $data = json_decode($eData, true);
      
      $user = $data['user'];
      $pass = $data['pass'];
      $result ="";

      if($user != "" || $pass != ""){
        $sql = "SELECT * FROM user WHERE user = '$user';";
        $res = mysqli_query($conn, $sql);

        if(mysqli_num_rows($res) != 0){
          $row = mysqli_fetch_array($res);
          if($pass != $row['pass']){
            $result = "Password is incorrect";
          } else{
            $result = "Login Success";
          }
          
        } else{
          $result = "Invalid username";
        }
    }
    else{
      $result = "";
    }
    $conn->close();
    $response[] = array("result" => $result);
    echo json_encode($response);
  }
?>