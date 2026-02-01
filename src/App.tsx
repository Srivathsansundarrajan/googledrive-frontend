import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/Register";
import Activate from "./pages/Activate";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SharedWithMe from "./pages/SharedWithMe";
import SharedDrives from "./pages/SharedDrives";
import SharedDriveView from "./pages/SharedDriveView";
import Recent from "./pages/Recent";
import Starred from "./pages/Starred";
import Profile from "./pages/Profile";
import Trash from "./pages/Trash";

export default function App() {
  return (
    <NotificationProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/activate/:token" element={<Activate />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shared-with-me"
              element={
                <ProtectedRoute>
                  <SharedWithMe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shared-drives"
              element={
                <ProtectedRoute>
                  <SharedDrives />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shared-drives/:id"
              element={
                <ProtectedRoute>
                  <SharedDriveView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recent"
              element={
                <ProtectedRoute>
                  <Recent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/starred"
              element={
                <ProtectedRoute>
                  <Starred />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <ProtectedRoute>
                  <Trash />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </NotificationProvider>
  );
}
