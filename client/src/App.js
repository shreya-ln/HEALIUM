// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SignupForm from './components/signupForm';
import SigninForm from './components/signinForm';
import Dashboard from './components/Dashboard';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
// import { useEffect } from 'react';
import AppointmentDetail from './components/AppointmentDetail';
import SearchPatient from './components/SearchPatient';
import CreateAppointment from './components/CreateAppointment';
import VisitDetail from './components/VisitDetail';
import ChatPage from './components/ChatPage';
import AddMedication from './components/AddMedication';

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
  <Route path="/visit/:id/add-medication" element={<AddMedication />} />
  <Route path="/signin" element={<SigninForm />} />
  <Route path="/signup" element={<SignupForm />} />
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
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  <Route path="/appointment/:id" element={
    <ProtectedRoute>
      <AppointmentDetail />
    </ProtectedRoute>
  } />
  <Route path="/search-patient" element={
            <ProtectedRoute>
              <SearchPatient />
            </ProtectedRoute>
          } />
    <Route path="/create-appointment/:patientId" element={
      <ProtectedRoute>
        <CreateAppointment />
      </ProtectedRoute>
    } />
  <Route path="*" element={<Navigate to="/signin" />} />
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
          <Route
           path="/visit/:visitId"
           element={
             <ProtectedRoute>
               <VisitDetail />
             </ProtectedRoute>
           }
          />
          <Route path="/ask-ai" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/signin" />} />
       </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;