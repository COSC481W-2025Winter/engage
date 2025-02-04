import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./src/Login";
import Dashboard from "./src/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
