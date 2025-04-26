import { useState } from 'react';
import { signin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SigninForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await signin(form);
      console.log(res);

      login({ email: form.email }); // AuthContext
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message);
    }
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
        /><br/><br/>
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        /><br/><br/>
        <button type="submit">log in</button>
      </form>

      <p style={{ marginTop: '2rem', color: 'green' }}>{message}</p>

      <div style={{ marginTop: '2rem' }}>
        <p>do u not have an account?</p>
        <button onClick={() => navigate('/signup')}>
          signup
        </button>
      </div>
    </div>
  );
}

export default SigninForm;
