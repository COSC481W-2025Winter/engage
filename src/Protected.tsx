import { userEffect } from "react";
import { useNavigate } from "react-router-dom";

const Protected = (props) => {
  const navigate = useNavigate();
  const { Component } = props;
  userEffect(() => {
    let login = localStorage.getItem("login");
    if (!login) {
      localStorage.setItem("loginStatus", "Please login");
      navigate("/", { replace: true });
    }
  }, []);
  return <Component />;
};

export default Protected;
