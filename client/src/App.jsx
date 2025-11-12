import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

// Page wrapper component to add fade-in animation
function PageWrapper({ children }) {
  return (
    <div className="page-fade-in">
      {children}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (!token || !userData) return null;
      const parsedUser = JSON.parse(userData);
      console.log("User loaded from localStorage:", parsedUser);
      return { ...parsedUser, token };
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      localStorage.clear();
      return null;
    }
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
    setLoading(false);
  }, []); // Proper dependency array

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/public/team`);
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Failed to load team members:", error);
      setTeamMembers([]);
    }
  };

  const logout = () => {
    console.log("Logging out user");
    localStorage.clear();
    setUser(null);
  };

  function ProtectedRoute({ user, allowedRoles, children }) {
    if (!user) {
      console.log("No user - redirecting to login");
      return <Navigate to="/login" replace />;
    }

    if (!user.role) {
      console.error("User has no role - redirecting to login");
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      console.error(`User role '${user.role}' not allowed. Allowed: ${allowedRoles.join(", ")}`);
      return <Navigate to="/login" replace />;
    }

    console.log(`Access granted to ${user.role} dashboard`);
    return children;
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}>Loading...</div>;
  }

  return (
    <Router>
      <AppContent user={user} setUser={setUser} logout={logout} teamMembers={teamMembers} loadTeamMembers={loadTeamMembers} ProtectedRoute={ProtectedRoute} />
    </Router>
  );
}

function AppContent({ user, setUser, logout, teamMembers, loadTeamMembers, ProtectedRoute }) {
  const location = useLocation();
  const isTeamPage = location.pathname === '/team';

  return (
    <>
      {user && <Navbar user={user} logout={logout} />}
      
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            !user ? (
              <PageWrapper><LandingPage /></PageWrapper>
            ) : (
              <Navigate to={`/${user.role}`} replace />
            )
          } 
        />

        <Route 
          path="/login" 
          element={
            !user ? (
              <PageWrapper><Login setUser={setUser} /></PageWrapper>
            ) : (
              <Navigate to={`/${user.role}`} replace />
            )
          } 
        />

        <Route 
          path="/register" 
          element={
            !user ? (
              <PageWrapper><Register /></PageWrapper>
            ) : (
              <Navigate to={`/${user.role}`} replace />
            )
          } 
        />

        <Route path="/verify-email" element={<PageWrapper><EmailVerification /></PageWrapper>} />
        <Route path="/team" element={<PageWrapper><MeetTheTeam members={teamMembers} /></PageWrapper>} />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <PageWrapper><AdminDashboard user={user} /></PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/team"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <PageWrapper><TeamManagement user={user} onUpdate={loadTeamMembers} /></PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/institution"
          element={
            <ProtectedRoute user={user} allowedRoles={["institution"]}>
              <PageWrapper><InstitutionDashboard user={user} /></PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute user={user} allowedRoles={["student"]}>
              <PageWrapper><StudentDashboard user={user} /></PageWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/company"
          element={
            <ProtectedRoute user={user} allowedRoles={["company"]}>
              <PageWrapper><CompanyDashboard user={user} /></PageWrapper>
            </ProtectedRoute>
          }
        />

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isTeamPage && (
        <footer className="app-footer">
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} Career Guidance and Employment Integration Platform. All rights reserved
          </div>
          <div className="footer-links">
            <a href="/team">Meet the Team</a>
          </div>
        </footer>
      )}
    </>
  );
}