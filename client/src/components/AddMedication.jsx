import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddMedication() {
  const { id } = useParams();
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
      navigate(-1);
    } catch (err) {
      console.error('Failed to add medication', err);
      alert('Failed to add medication.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      padding: '2rem' // Equal padding all around
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '2.5rem',
        paddingRight: '4rem',
        borderRadius: '16px',
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
        maxWidth: '500px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#1976d2',
          fontWeight: '600',
          fontSize: '2rem'
        }}>
          💊 Add Medication
        </h1>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="text" name="medicationname" placeholder="Medication Name" value={formData.medicationname} onChange={handleChange} required style={inputStyle} />
          <input type="text" name="dosage" placeholder="Dosage (e.g., 500mg)" value={formData.dosage} onChange={handleChange} required style={inputStyle} />
          <input type="text" name="frequency" placeholder="Frequency (e.g., twice a day)" value={formData.frequency} onChange={handleChange} required style={inputStyle} />
          <input type="date" name="startdate" value={formData.startdate} onChange={handleChange} required style={inputStyle} />
          <input type="date" name="enddate" value={formData.enddate} onChange={handleChange} required style={inputStyle} />
          <textarea name="notes" placeholder="Notes (optional)" value={formData.notes} onChange={handleChange} rows="4" style={{ ...inputStyle, resize: 'vertical' }} />

          <button type="submit" style={buttonStyle}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.8rem',
  borderRadius: '8px',
  border: '1px solid #ccc',
  fontSize: '1rem',
  outline: 'none',
  backgroundColor: '#f9f9f9',
  transition: 'border-color 0.3s'
};

const buttonStyle = {
  padding: '1rem',
  backgroundColor: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'background-color 0.3s',
  marginTop: '1rem'
};

export default AddMedication;
