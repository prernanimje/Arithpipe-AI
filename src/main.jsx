import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "../frontend/src/styles/Landing.css";
import { BrowserRouter } from "react-router-dom";
import "../frontend/src/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

