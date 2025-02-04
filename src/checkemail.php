<?php
  header(("Access-Control-Allow-Origin: *"));
  header(("Access-Control-Allow-Methods: GET,POST"));
  header(("Access-Control-Allow-Headers: Content-Type"));

  $con = new mysqli("localhost", "react-user", "1234", "user");
  if(mysqli_connect_error()){
    echo "Failed to connect to MySQL: " . mysqli_connect_error();
    exit();
  }else{
    $eData = file_get_contents('php://input');
    $dData = json_decode($eData, true);

    $email = $dData['email'];

    if($email != ""){
      $sql = "SELECT * FROM user WHERE email = '$email';";
      $res = mysqli_query($con, $sql);
      if(mysqli_num_rows($res) != 0){
        $result = "Email already registered";
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