// src/components/SearchPatient.jsx

import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function SearchPatient() {
  const [form, setForm] = useState({ name: '', dob: '' });
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSearch = async () => {
    try {
      const res = await axios.post('/search-patient', form);
      setResults(res.data);
    } catch (err) {
      console.error('Search failed', err.response?.data);
    }
  };

  const handleSelect = (patient) => {
    navigate(`/create-appointment/${patient.id}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🔍 Search Patient</h1>

      <br/>
      <h6>Enter Patient Name:</h6>
      <input
        type="text"
        name="name"
        placeholder="Patient Name"
        value={form.name}
        onChange={handleChange}
        style={{ marginBottom: '1rem', padding: '0.5rem' }}
      />
      <br/>
      <h6>Enter Patient DOB (Date of Birth):</h6>
      <input
        type="date"
        name="dob"
        value={form.dob}
        onChange={handleChange}
        style={{ marginBottom: '1rem', padding: '0.5rem' }}
      />
      <br/>
      <br/>
      <br/>
      <button onClick={handleSearch} style={{ padding: '0.5rem 1rem' }}>
        Search
      </button>

      {/* 결과 리스트 */}
      <div style={{ marginTop: '2rem' }}>
        {results.length > 0 ? (
          <ul>
            {results.map((patient) => (
              <li
                key={patient.id}
                style={{ marginBottom: '1rem', cursor: 'pointer', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}
                onClick={() => handleSelect(patient)}
              >
                <b>{patient.name}</b> - {patient.dob}
              </li>
            ))}
          </ul>
        ) : <p>No patients found.</p>}
      </div>
    </div>
  );
}

export default SearchPatient;
