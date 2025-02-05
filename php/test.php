// Test password hash manually
$password = "the_password_you_entered";  // The password you expect to match
$hash = '$2y$10$OdTcRqnZ5SvhWgU6Yu3dpeKkeRAmuxLIgCSkLmruNep';  // The hash stored in the database

if (password_verify($password, $hash)) {
    echo "Password matches!";
} else {
    echo "Password does not match.";
}