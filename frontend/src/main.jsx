import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";
import { PWAProvider } from "./context/PWAProvider.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <PWAProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PWAProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
