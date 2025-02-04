function Registration() {
  return (
    <div>
      <label>Username</label>
      <input type="text" name="user" />
      <label>Email</label>
      <input type="email" name="email" />
      <label>Password</label>
      <input type="password" name="pass1" />
      <label>Confirm Password</label>
      <input type="password" name="pass2" />
      <label></label>
      <input type="submit" defaultValue="Submit" />
    </div>
  );
}

export default Registration;
