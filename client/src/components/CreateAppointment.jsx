import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function CreateAppointment() {
  const { patientId } = useParams();
  const [form, setForm] = useState({
    visitdate: '',
    memo: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const doctor_id = JSON.parse(localStorage.getItem('user'))?.user_id;

      // 💥 visitdate 포맷 변경
      const formattedVisitDate = new Date(form.visitdate).toISOString().replace('T', ' ').slice(0, 26);

      await axios.post('/create-appointment', {
        patient_id: patientId,
        doctor_id: doctor_id, // ✅ 의사 ID도 보내자
        visitdate: formattedVisitDate,
        memo: form.memo,
      });

      setSuccess('Appointment created successfully!');

      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('Failed to create appointment.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🗓️ Create Appointment</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Date and Time:</label><br />
          <input
            type="datetime-local"
            name="visitdate"
            value={form.visitdate}
            onChange={handleChange}
            required
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Memo (optional):</label><br />
          <textarea
            name="memo"
            value={form.memo}
            onChange={handleChange}
            rows="3"
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>

        <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4caf50', color: 'white', borderRadius: '8px', border: 'none' }}>
          Create Appointment
        </button>
      </form>

      {/* 성공/에러 메시지 */}
      {success && <p style={{ marginTop: '1rem', color: 'green' }}>{success}</p>}
      {error && <p style={{ marginTop: '1rem', color: 'red' }}>{error}</p>}
    </div>
  );
}

export default CreateAppointment;