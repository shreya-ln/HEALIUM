// src/components/SigninForm.jsx
import { useState } from 'react';
import { signin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SigninForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await signin(form); // { message, user_id, role }


      // 1. Contex (AuthContext)
      login({ user_id: res.user_id, role: res.role });
      // ➡️ 2. LocalStorage
    localStorage.setItem('user_id', res.user_id);
    localStorage.setItem('role', res.role);


      // 2.
      setMessage(res.message || 'Login success!');

      // 3. role redirection
      if (res.role === "patient") {
        navigate('/patient/dashboard');
      } else if (res.role === "doctor") {
        navigate('/doctor/dashboard');
      } else {
        setError('Unknown role.');
      }

    } catch (err) {
      setError(err.message || 'Signin error.');
    }
  };

  const goToSignup = () => {
    navigate('/signup');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>log in</h1>
      <form onSubmit={handleSubmit}>
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

        <button type="submit">log in</button>
      </form>

      {message && (
        <div style={{ marginTop: '2rem', color: 'green' }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '2rem', color: 'red' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <p>Don't have an account yet?</p>
        <button onClick={goToSignup}>sign up</button>
      </div>
    </div>
  );
}

export default SigninForm;