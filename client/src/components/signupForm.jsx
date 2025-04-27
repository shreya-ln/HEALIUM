// src/components/SignupForm.jsx
import React, { useState } from 'react';
import { signup } from '../api/auth';
import RoleSelector from './RoleSelector';
import { /*useNavigate,*/ Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';

export default function SignupForm() {
  const [role, setRole] = useState('doctor');
  const [form, setForm] = useState({ email: '', password: '', extra_info: {} });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const extraFields = ['name','hospital','specialization','dob','phone','address','preferredlanguage'];
    
    if (name === 'email') {
      // Store email in both `form` and `extra_info`
      setForm(prev => ({
        ...prev,
        [name]: value,
        extra_info: { ...prev.extra_info, [name]: value }
      }));
    } else if (extraFields.includes(name)) {
      // Store other fields in `extra_info`
      setForm(prev => ({
        ...prev,
        extra_info: { ...prev.extra_info, [name]: value }
      }));
    } else {
      // Store other fields in `form`
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await signup({ ...form }, role);
      setMessage(res.message || 'Signup successful!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Signup failed.');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 500,
        mx: 'auto',
        mt: 8,
        p: 4,
        bgcolor: 'background.paper',
        boxShadow: 3,
        borderRadius: 2,
        display: 'grid',
        gap: 2
      }}
    >
      <Typography variant="h5" align="center">
        Sign Up
      </Typography>

      <Typography variant="body2" align="center">
        Already have an account?
        <Link component={RouterLink} to="/signin" sx={{ ml: 0.5 }}>
          Log In
        </Link>
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}

      <TextField
        fullWidth
        label="Email address"
        name="email"
        type="email"
        required
        onChange={handleChange}
      />
      <TextField
        fullWidth
        label="Password"
        name="password"
        type="password"
        required
        onChange={handleChange}
      />

      <RoleSelector role={role} setRole={setRole} />

      {role === 'doctor' && (
        <>
          <TextField fullWidth label="Name" name="name" required onChange={handleChange} />
          <TextField fullWidth label="Hospital" name="hospital" required onChange={handleChange} />
          <TextField fullWidth label="Specialization" name="specialization" required onChange={handleChange} />
        </>
      )}

      {role === 'patient' && (
        <>
          <TextField fullWidth label="Name" name="name" required onChange={handleChange} />
          <TextField
            fullWidth
            label="Date of Birth"
            name="dob"
            type="date"
            required
            InputLabelProps={{ shrink: true }}
            onChange={handleChange}
          />
          <TextField fullWidth label="Phone Number" name="phone" required onChange={handleChange} />
          <TextField fullWidth label="Address" name="address" required onChange={handleChange} />
          <TextField fullWidth label="Preferred Language" name="preferredlanguage" required onChange={handleChange} />
        </>
      )}

      <Button type="submit" variant="contained" size="large">
        Create Account
      </Button>

      <Divider sx={{ my: 2 }} />

      <Button
        fullWidth
        component={RouterLink}
        to="/signin"
        variant="outlined"
      >
        Back to Sign In
      </Button>
    </Box>
  );
}
