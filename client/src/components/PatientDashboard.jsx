//client/src/components/PatientDashboard.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ChatbotModal from './ChatbotModal';
function PatientDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  const { user } = useAuth();
  const user_id = user?.user_id;

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user_id) {
        console.error('No user_id found');
        return;
      }
      try {
        const res = await axios.get('/dashboard-data', {
            headers: { 'Authorization': user_id }
          });
        setDashboardData(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    if (user_id) {
      fetchDashboardData();
    }
  }, [user_id]);


  if (loading) return <p>Loading Patient Dashboard...</p>;
  if (!dashboardData) return <p>No data available</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🧑‍⚕️ dashboard</h1>

      <h2>✅ my health summary</h2>
      <pre>{JSON.stringify(dashboardData.health_summary, null, 2)}</pre>

      <h2>💊 </h2>
      <ul>
        {dashboardData.medications.map((med, idx) => (
          <li key={idx}>
            {med.medicationname} - {med.dosage} ({med.frequency})
          </li>
        ))}
      </ul>

      <h2>🤔 my questions</h2>
      <ul>
        {dashboardData.active_questions.map((q, idx) => (
          <li key={idx}>
            {q.questiontext} - {q.status}
          </li>
        ))}
      </ul>
      <button onClick={() => setShowChat(true)} className="chat-btn">
        Chat with AI Assistant
      </button>

      {showChat && <ChatbotModal onClose={() => setShowChat(false)} />}
    </div>
  );
}

export default PatientDashboard;
