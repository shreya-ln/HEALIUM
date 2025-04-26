import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DoctorDashboard() {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [futureAppointments, setFutureAppointments] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.user_id) return;
      try {
        // dotays appointments
        const todayRes = await axios.get('/today-visits', {
          headers: { 'Authorization-Id': user.user_id }
        });
        setTodayAppointments(todayRes.data || []);

        // future appointments
        const futureRes = await axios.get('/future-visits', {
          headers: { 'Authorization-Id': user.user_id }
        });
        setFutureAppointments((futureRes.data || []).slice(0, 5)); // 미래 5개만!

      } catch (err) {
        console.error('Failed to fetch appointments', err);
      }
    };

    fetchAppointments();
  }, [user]);

  const handleSelect = (appointment) => {
    navigate(`/appointment/${appointment.id}`);
  };

  const handleCreateAppointment = () => {
    navigate('/search-patient');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={handleCreateAppointment}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4caf50', color: 'white', borderRadius: '8px', border: 'none' }}
        >
          ➕ Create Appointment
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* on the left side: todays appointments */}
        <div style={{ flex: 1 }}>
          <h2>📅 Today's Appointments</h2>
          {todayAppointments.length === 0 ? (
            <p>No appointments today.</p>
          ) : (
            <ul>
              {todayAppointments.map((appt) => (
                <li key={appt.id} style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => handleSelect(appt)}>
                  <b>Patient:</b> {appt.patient_name || 'Unknown'} <br />
                  <b>Visit Time:</b> {appt.visitdate ? new Date(appt.visitdate).toLocaleString() : 'TBD'}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* future appointments*/}
        <div style={{ flex: 1 }}>
          <h2>🔮 Upcoming Appointments (Top 5)</h2>
          {futureAppointments.length === 0 ? (
            <p>No future appointments.</p>
          ) : (
            <ul>
              {futureAppointments.map((appt) => (
                <li key={appt.id} style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => handleSelect(appt)}>
                  <b>Patient:</b> {appt.patient_name || 'Unknown'} <br />
                  <b>Visit Date:</b> {appt.visitdate ? new Date(appt.visitdate).toLocaleString() : 'TBD'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;