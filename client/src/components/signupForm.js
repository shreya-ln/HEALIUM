import { useState } from 'react';
import { signup } from '../api/auth';
import RoleSelector from './RoleSelector';
import { useNavigate } from 'react-router-dom';

function SignupForm() {
  const [role, setRole] = useState('doctor');
  const [form, setForm] = useState({ email: '', password: '', extra_info: {} });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const extraFields = [
      'name', 'hospital', 'specialization', 'dob', 'phone', 'address', 'preferredlanguage'
    ];
    if (extraFields.includes(name)) {
      setForm((prev) => ({
        ...prev,
        extra_info: { ...prev.extra_info, [name]: value }
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await signup(form, role);
      setMessage(res.message);
    } catch (err) {
      setError(err.message || 'error.');
    }
  };

  const goToSignin = () => {
    navigate('/signin');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>sign up</h1>
      <RoleSelector role={role} setRole={setRole} />

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
        /><br /><br />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        /><br /><br />

        {role === 'doctor' && (
          <>
            <input
              type="text"
              name="name"
              placeholder="Name"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="text"
              name="hospital"
              placeholder="Hospital"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="text"
              name="specialization"
              placeholder="Specialization"
              onChange={handleChange}
              required
            /><br /><br />
          </>
        )}

        {role === 'patient' && (
          <>
            <input
              type="text"
              name="name"
              placeholder="Name"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="date"
              name="dob"
              placeholder="Date of Birth"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="text"
              name="address"
              placeholder="Address"
              onChange={handleChange}
              required
            /><br /><br />
            <input
              type="text"
              name="preferredlanguage"
              placeholder="Preferred Language"
              onChange={handleChange}
              required
            /><br /><br />
          </>
        )}

        <button type="submit">sign up</button>
      </form>

      {message && (
        <div style={{ marginTop: '2rem', color: 'green' }}>
          {message}
          <br />
          <button onClick={goToSignin} style={{ marginTop: '1rem' }}>
            log in
          </button>
        </div>
      )}
      {error && (
        <div style={{ marginTop: '2rem', color: 'red' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: '2rem' }}>
        <p>u got an account already?</p>
        <button onClick={() => navigate('/signin')}>
          log in
        </button>
      </div>
    </div>

  );
}

export default SignupForm;
