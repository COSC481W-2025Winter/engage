<?php
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, Accept");

  $con = new mysqli("localhost", "react-user", "1234", "user");
  if(mysqli_connect_error()){
    echo "Failed to connect to MySQL: " . mysqli_connect_error();
    exit();
  }else{
    $eData = file_get_contents('php://input');
    $dData = json_decode($eData, true);

    $user = $dData['user'];
    $email = $dData['email'];
    $pass = $dData['pass'];

    if($user != "" and $email != "" and $pass != ""){
      $sql = "INSERT INTO user (user, email, pass) VALUES ('$user', '$email', '$pass');";
      $res = mysqli_query($con, $sql);
      if($res){
        $result = "Registration Success";
    }
    else{
      $result = "";
    }
  } else{
    $result = "";
  }

  $con->close();
  $response[] = array("result" => $result);
  echo json_encode($response);
}
?>