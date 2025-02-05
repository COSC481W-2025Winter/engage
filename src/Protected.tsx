import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Protected = (props: any) => {
  const navigate = useNavigate();
  const { Component } = props;

  useEffect(() => {
    let login = localStorage.getItem("login");
    if (!login || login !== "true") {
      localStorage.setItem("loginStatus", "Please login");
      navigate("/", { replace: true }); // Redirect to login page
    }
  }, [navigate]);

  return <Component />;
};

export default Protected;
