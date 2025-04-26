// src/components/SigninForm.jsx
import React, { useState } from 'react';
import { signin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function SigninForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      login({ user_id: res.user_id, role: res.role });
      localStorage.setItem('user_id', res.user_id);
      localStorage.setItem('role', res.role);
      setMessage(res.message || 'Login successful!');
      if (res.role === 'patient') navigate('/patient/dashboard');
      else if (res.role === 'doctor') navigate('/doctor/dashboard');
      else setError('Unknown role.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Signin error.');
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 8,
        p: 4,
        borderRadius: 2,
        boxShadow: 3,
        bgcolor: 'background.paper'
      }}
      component="form"
      onSubmit={handleSubmit}
    >
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Sign In
      </Typography>

      <Typography variant="body2" align="center" sx={{ mb: 3 }}>
        Don’t have an account?{' '}
        <Link component={RouterLink} to="/signup">
          Get started
        </Link>
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <TextField
        fullWidth
        name="email"
        label="Email address"
        type="email"
        value={form.email}
        onChange={handleChange}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        name="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        onChange={handleChange}
        required
        sx={{ mb: 1 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword((show) => !show)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Link component={RouterLink} to="/forgot-password" variant="body2">
          Forgot password?
        </Link>
      </Box>

      <Button fullWidth variant="contained" type="submit" size="large">
        Sign In
      </Button>

      <Divider sx={{ my: 3 }} />

      <Button
        fullWidth
        variant="outlined"
        component={RouterLink}
        to="/signup"
      >
        Create Account
      </Button>
    </Box>
  );
}
