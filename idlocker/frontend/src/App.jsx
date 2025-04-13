import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Voters from './pages/Voters';
import VoterForm from './pages/VoterForm';
import VoterDetails from './pages/VoterDetails';
import EditVoter from './pages/EditVoter';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voters"
          element={
            <ProtectedRoute>
              <Voters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voters/add"
          element={
            <ProtectedRoute>
              <VoterForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voters/edit/:id"
          element={
            <ProtectedRoute>
              <VoterForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voters/:id"
          element={
            <ProtectedRoute>
              <VoterDetails />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App; 