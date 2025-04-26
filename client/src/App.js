// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SignupForm from './components/signupForm';
import SigninForm from './components/signinForm';
import Dashboard from './components/Dashboard';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import { useEffect } from 'react';
import ChatPage from './components/ChatPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/signin" />;
}
function App() {

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/signin" element={<SigninForm />} />
          <Route path="/patient/dashboard" element={
            <ProtectedRoute>
              <PatientDashboard />
            </ProtectedRoute>
          } />

          <Route path="/doctor/dashboard" element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/ask-ai" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/signup" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
