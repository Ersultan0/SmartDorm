import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import PortalPage from "./pages/PortalPage.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="screen-loader">SmartDorm...</div>;
  }

  return token ? children : <Navigate to="/" replace />;
}

function StudentRoute({ children }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div className="screen-loader">SmartDorm...</div>;
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (user?.role !== "student") {
    return <Navigate to="/staff" replace />;
  }

  return children;
}

function StaffRoute({ children }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div className="screen-loader">SmartDorm...</div>;
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!["admin", "staff"].includes(user?.role)) {
    return <Navigate to="/portal" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/portal"
        element={
          <StudentRoute>
            <PortalPage />
          </StudentRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <StaffRoute>
            <StaffDashboard />
          </StaffRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}