import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddMedication() {
  const { id } = useParams();   // visit id
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    medicationname: '',
    dosage: '',
    frequency: '',
    startdate: '',
    enddate: '',
    notes: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Get patient_id for this visit first
      const visitRes = await axios.get(`/visit/${id}`);
      const patientId = visitRes.data.patient_id;

      await axios.post('/add-medication', {
        patient_id: patientId,
        ...formData
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      alert('Medication added successfully!');
      navigate(-1);  // Go back to the previous page (Appointment Detail)

    } catch (err) {
      console.error('Failed to add medication', err);
      alert('Failed to add medication.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1976d2' }}>💊 Enter Medication Details</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="text" name="medicationname" placeholder="Medication Name" value={formData.medicationname} onChange={handleChange} required style={inputStyle} />
          <input type="text" name="dosage" placeholder="Dosage (e.g., 500mg)" value={formData.dosage} onChange={handleChange} required style={inputStyle} />
          <input type="text" name="frequency" placeholder="Frequency (e.g., twice a day)" value={formData.frequency} onChange={handleChange} required style={inputStyle} />
          <input type="date" name="startdate" placeholder="Start Date" value={formData.startdate} onChange={handleChange} required style={inputStyle} />
          <input type="date" name="enddate" placeholder="End Date" value={formData.enddate} onChange={handleChange} required style={inputStyle} />
          <textarea name="notes" placeholder="Notes" value={formData.notes} onChange={handleChange} rows="4" style={{ ...inputStyle, resize: 'vertical' }} />
          
          <button type="submit" style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

// Common input style
const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #ccc',
  fontSize: '1rem'
};

export default AddMedication;
