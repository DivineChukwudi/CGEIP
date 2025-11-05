// client/src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import { FaLinkedin, FaGithub, FaEnvelope } from "react-icons/fa";
import "./styles/global.css";


export default function App() {
  const linkedinUrl = "https://www.linkedin.com/in/divinechukwudi";
  const githubUrl = "https://github.com/DivineChukwudi";
  const gmailUrl = "mailto:chukwudidivine20@gmail.com";

  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (!token || !userData) return null;
      return { ...JSON.parse(userData), token };
    } catch (error) {
      localStorage.clear();
      return null;
    }
  });

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  function ProtectedRoute({ user, allowedRoles, children }) {
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
    return children;
  }

  return (
    <Router>
      {user && <Navbar user={user} logout={logout} />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to={`/${user.role}`} />} />
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to={`/${user.role}`} />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={`/${user.role}`} />} />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <AdminDashboard user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institution"
          element={
            <ProtectedRoute user={user} allowedRoles={["institution"]}>
              <InstitutionDashboard user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute user={user} allowedRoles={["student"]}>
              <StudentDashboard user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/company"
          element={
            <ProtectedRoute user={user} allowedRoles={["company"]}>
              <CompanyDashboard user={user} />
            </ProtectedRoute>
          }
        />

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {user && (
        <footer className="app-footer">
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} Limkokwing Career Portal. All rights reserved | Designed by etern.pptx
          </div>
          <div className="footer-links">
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
              <FaLinkedin /> LinkedIn
            </a>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <FaGithub /> GitHub
            </a>
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
              <FaEnvelope /> Gmail
            </a>
          </div>
        </footer>
      )}
    </Router>
  );
}