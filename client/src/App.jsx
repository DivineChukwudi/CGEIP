// client/src/App.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmailVerification from "./pages/EmailVerification";
import AdminDashboard from "./pages/AdminDashboard";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import TeamManagement from "./pages/TeamManagement";
import MeetTheTeam from "./pages/MeetTheTeam";
import "./styles/global.css";

export default function App() {
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

  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public/team');
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

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
        <Route path="/verify-email" element={<EmailVerification />} /> {/* ADD THIS */}
        <Route path="/team" element={<MeetTheTeam members={teamMembers} />} />

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
          path="/admin/team"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <TeamManagement user={user} onUpdate={loadTeamMembers} />
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

      <footer className="app-footer">
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} Limkokwing Career Portal. All rights reserved
        </div>
        <div className="footer-links">
          <a href="/team">Meet the Team</a>
        </div>
      </footer>
    </Router>
  );
}