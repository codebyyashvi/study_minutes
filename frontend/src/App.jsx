import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import AuthPage from "./pages/auth";
import NotesPage from "./pages/notes";
import SubjectPage from "./pages/subject";

const isAuthenticated = () => Boolean(localStorage.getItem("token"));

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function GuestRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subject"
          element={
            <ProtectedRoute>
              <SubjectPage />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/chat" replace />} />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;