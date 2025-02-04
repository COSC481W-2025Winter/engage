import "./style.css";

function Login() {
  return (
    <div className="form">
      <label>Username</label>
      <input type="text" />
      <label>Password</label>
      <input type="password" />
      <input type="submit" value="Login" className="button" />
    </div>
  );
}

export default Login;
