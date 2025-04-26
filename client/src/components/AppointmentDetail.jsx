// src/components/AppointmentDetail.jsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function AppointmentDetail() {
  const { id } = useParams();
  const [visit, setVisit] = useState(null);
  const [patientSummary, setPatientSummary] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    bloodpressure: '',
    oxygenlevel: '',
    sugarlevel: '',
    weight: '',
    height: '',
    doctorrecommendation: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Visit data
        const visitRes = await axios.get(`/visit/${id}`);
        setVisit(visitRes.data);

        if (visitRes.data?.patient_id) {
          // 2) DB summary
          const dataRes = await axios.get(`/patient-summary/${visitRes.data.patient_id}`);
          setPatientSummary(dataRes.data);

          // 3) AI summary
          const aiRes = await axios.get(`/appointment-summary/${visitRes.data.patient_id}`);
          setAiSummary(aiRes.data.summary);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStartConsultation = () => {
    setFormOpen(true);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`/update-visit/${id}`, formData);
      // close form and reset
      setFormOpen(false);
      setFormData({ bloodpressure: '', oxygenlevel: '', sugarlevel: '', weight: '', height: '', doctorrecommendation: '' });
      // refresh visit data
      const updatedVisitRes = await axios.get(`/visit/${id}`);
      setVisit(updatedVisitRes.data);
    } catch (err) {
      console.error('Failed to update visit', err);
      alert('Failed to update visit');
    }
  };

  if (!visit || !patientSummary) return <p>Loading...</p>;

  const { patient, medications, recent_visits, reports, pending_questions } = patientSummary;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🩺 Appointment Details</h1>


      {/* AI Summary */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1rem',
          border: '2px solid #4caf50',
          borderRadius: '12px',
          backgroundColor: '#f6fff6',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
      >
        <h2>🧠 AI Summary</h2>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
          {aiLoading
            ? 'Generating AI summary…'
            : aiSummary || 'No AI summary available.'}
        </p>
      </div>


      {/* Patient Info */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>👤 Patient Information</h2>
        <p><b>Name:</b> {patient.name}</p>
        <p><b>DOB:</b> {patient.dob}</p>
        <p><b>Phone:</b> {patient.phone}</p>
        <p><b>Address:</b> {patient.address}</p>
        <p><b>Preferred Language:</b> {patient.preferredlanguage}</p>
      </div>

      {/* Vital Signs */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>📈 Recent Vital Signs</h2>
        {(() => {
          const vitalData = recent_visits
            .filter(v => v.visitdate)
            .map(v => {
              const [systolic, diastolic] = v.bloodpressure ? v.bloodpressure.split('/').map(Number) : [null, null];
              return { date: new Date(v.visitdate), systolic, diastolic, oxygenlevel: v.oxygenlevel, sugarlevel: v.sugarlevel };
            })
            .filter(d => d.systolic !== null || d.diastolic !== null || d.oxygenlevel !== null || d.sugarlevel !== null)
            .sort((a, b) => a.date - b.date);

          if (vitalData.length === 0) return <p>No recorded vital signs to display.</p>;

          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vitalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={date => new Date(date).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={date => new Date(date).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="systolic" stroke="#8884d8" name="Systolic BP" connectNulls />
                <Line type="monotone" dataKey="diastolic" stroke="#82ca9d" name="Diastolic BP" connectNulls />
                <Line type="monotone" dataKey="oxygenlevel" stroke="#ff7300" name="Oxygen Level" connectNulls />
                <Line type="monotone" dataKey="sugarlevel" stroke="#ff0000" name="Sugar Level" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      {/* Medications */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>💊 Medications</h2>
        {medications.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {medications.map((m, idx) => {
              const start = m.startdate ? new Date(m.startdate) : null;
              const end = m.enddate ? new Date(m.enddate) : null;
              const today = new Date();
              let progress = null;
              if (start && end) {
                const total = end - start;
                const elapsed = today - start;
                progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
              }
              return (
                <div key={idx} style={{ flex: '1 1 300px', border: '1px solid #ccc', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', backgroundColor: '#fdfdfd' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>{m.medicationname || 'Unknown Medication'}</h3>
                  <p><b>Dosage:</b> {m.dosage || 'Unknown dosage'}</p>
                  <p><b>Frequency:</b> {m.frequency || 'Unknown frequency'}</p>
                  <p><b>Start Date:</b> {m.startdate ? new Date(m.startdate).toLocaleDateString() : 'Unknown start date'}</p>
                  <p><b>End Date:</b> {m.enddate ? new Date(m.enddate).toLocaleDateString() : 'Unknown end date'}</p>
                  {m.notes && <p><b>Notes:</b> {m.notes}</p>}
                  {progress !== null && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress < 50 ? '#00bfff' : progress < 90 ? '#4caf50' : '#ff5722', transition: 'width 0.5s' }} />
                      </div>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#666' }}>{progress.toFixed(1)}% Completed</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p>No medications listed.</p>}
      </div>

      {/* Reports */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>🧾 Recent OCR Reports</h2>
        {reports.length > 0 ? (
          <ul>
            {reports.map((r, idx) => <li key={idx}>{r.reporttype}: {r.reportcontent}</li>)}
          </ul>
        ) : <p>No OCR reports available.</p>}
      </div>

      {/* Pending Questions */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>❓ Pending Questions</h2>
        {pending_questions.length > 0 ? (
          <ul>
            {pending_questions.map((q, idx) => <li key={idx}>{q.daterecorded}: {q.questiontext}</li>)}
          </ul>
        ) : <p>No pending questions.</p>}
      </div>

      {/* Consultation Buttons */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button style={{ padding: '0.5rem 1rem' }} onClick={handleStartConsultation}>Fill Out Today's Data</button>
        <button style={{ padding: '0.5rem 1rem' }}>Recording Start</button>
      </div>

      {/* Form (addon) */}
      {formOpen && (
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <h2>📝 Fill Today's Visit Information</h2>
          <input type="text" name="bloodpressure" placeholder="Blood Pressure (ex: 120/80)" value={formData.bloodpressure} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="oxygenlevel" placeholder="Oxygen Level (%)" value={formData.oxygenlevel} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="sugarlevel" placeholder="Blood Sugar (mg/dL)" value={formData.sugarlevel} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="weight" placeholder="Weight (kg)" value={formData.weight} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="height" placeholder="Height (cm)" value={formData.height} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <textarea name="doctorrecommendation" placeholder="Doctor's Notes" value={formData.doctorrecommendation} onChange={handleChange} rows="4" style={{ width: '100%', marginBottom: '1rem' }} />
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px' }}>
            Submit Visit Record
          </button>
        </form>
      )}
    </div>
  );
}

export default AppointmentDetail;
