//client/src/components/PatientDashboard.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function DoctorDashboard() {
  const { user } = useAuth();
  //const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitForm, setVisitForm] = useState({
    content: '',
    blood_pressure: '',
    oxygen_level: '',
    sugar_level: '',
    weight: '',
    height: '',
    doctor_recommendations: '',
    visit_date: ''
  });

  useEffect(() => {
    if (!user) return;

    const headers = { Authorization: user.user_id };

    const fetchData = async () => {
      try {
        const [profileRes, patientsRes, questionsRes] = await Promise.all([
          axios.get('/doctor-profile', { headers }),
          axios.get('/list-patients', { headers }),
          axios.get('/pending-questions-for-doctor', { headers }),
        ]);

        setProfile(profileRes.data);
        setPatients(patientsRes.data);
        setPendingQuestions(questionsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      }
    };

    fetchData();
  }, [user]);

  const handlePatientClick = async (patientId) => {
    try {
      const headers = { Authorization: user.user_id };
      const res = await axios.get(`/patient-profile/${patientId}`, { headers });
      setSelectedPatient({ id: patientId, ...res.data });
    } catch (err) {
      console.error('Failed to fetch patient profile', err);
    }
  };

  const handleVisitSubmit = async () => {
    try {
      const headers = { Authorization: user.user_id };
      await axios.post('/api/visits', {
        patient_id: selectedPatient.id,
        doctor_id: user.user_id,
        ...visitForm
      }, { headers });

      alert('Visit created successfully!');
      setVisitForm({
        content: '',
        blood_pressure: '',
        oxygen_level: '',
        sugar_level: '',
        weight: '',
        height: '',
        doctor_recommendations: '',
        visit_date: ''
      });
    } catch (err) {
      console.error('Failed to create visit', err);
    }
  };

  if (!profile) return <p>Loading Doctor Dashboard...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🩺 Doctor Dashboard</h1>

      {/* Doctor Info */}
      <section>
        <h2>👩‍⚕️ My Profile</h2>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Hospital:</strong> {profile.hospital}</p>
        <p><strong>Specialization:</strong> {profile.specialization}</p>
      </section>

      {/* Pending Questions */}
      <section>
        <h2>❓ Pending Questions</h2>
        {pendingQuestions.length === 0 ? (
          <p>No pending questions.</p>
        ) : (
          <ul>
            {pendingQuestions.map((q) => (
              <li key={q.id}>
                Patient {q.patientid}: {q.questiontext} ({new Date(q.daterecorded).toLocaleDateString()})
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Patients List */}
      <section>
        <h2>🧑‍⚕️ My Patients</h2>
        {patients.length === 0 ? (
          <p>No patients yet.</p>
        ) : (
          <ul>
            {patients.map((p) => (
              <li key={p.patient_id}>
                <button onClick={() => handlePatientClick(p.patient_id)}>
                  {p.name} (Last Visit: {p.last_visit || 'N/A'})
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Patient Profile */}
      {selectedPatient && (
        <section>
          <h2>📄 Patient Profile: {selectedPatient.patient_info.name}</h2>
          <p><strong>DOB:</strong> {selectedPatient.patient_info.dob}</p>
          <p><strong>Email:</strong> {selectedPatient.patient_info.email}</p>
          <p><strong>Phone:</strong> {selectedPatient.patient_info.phone}</p>
          <p><strong>Address:</strong> {selectedPatient.patient_info.address}</p>
          <p><strong>Preferred Language:</strong> {selectedPatient.patient_info.preferredlanguage}</p>

          <h3>Health Trends</h3>
          <pre>{JSON.stringify(selectedPatient.health_trends, null, 2)}</pre>

          <h3>Visit History</h3>
          <pre>{JSON.stringify(selectedPatient.visit_history, null, 2)}</pre>

          <h3>Pending Questions</h3>
          <pre>{JSON.stringify(selectedPatient.pending_questions, null, 2)}</pre>

          {/* New Visit Form */}
          <h3>➕ Add New Visit</h3>
          <textarea
            placeholder="Content"
            value={visitForm.content}
            onChange={(e) => setVisitForm({ ...visitForm, content: e.target.value })}
          />
          <input
            placeholder="Blood Pressure"
            value={visitForm.blood_pressure}
            onChange={(e) => setVisitForm({ ...visitForm, blood_pressure: e.target.value })}
          />
          <input
            placeholder="Oxygen Level"
            value={visitForm.oxygen_level}
            onChange={(e) => setVisitForm({ ...visitForm, oxygen_level: e.target.value })}
          />
          <input
            placeholder="Sugar Level"
            value={visitForm.sugar_level}
            onChange={(e) => setVisitForm({ ...visitForm, sugar_level: e.target.value })}
          />
          <input
            placeholder="Weight"
            value={visitForm.weight}
            onChange={(e) => setVisitForm({ ...visitForm, weight: e.target.value })}
          />
          <input
            placeholder="Height"
            value={visitForm.height}
            onChange={(e) => setVisitForm({ ...visitForm, height: e.target.value })}
          />
          <input
            placeholder="Doctor Recommendations"
            value={visitForm.doctor_recommendations}
            onChange={(e) => setVisitForm({ ...visitForm, doctor_recommendations: e.target.value })}
          />
          <input
            type="date"
            value={visitForm.visit_date}
            onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })}
          />
          <button onClick={handleVisitSubmit}>Submit Visit</button>
        </section>
      )}
    </div>
  );
}

export default DoctorDashboard;