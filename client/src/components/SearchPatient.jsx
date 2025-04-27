import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

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

  const cardStyles = (bgColor = '#fff', textColor = 'black') => ({
    background: bgColor,
    color: textColor,
    borderRadius: 8,
    p: 3,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.02)' }
  });

  return (
    <Box sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ bgcolor: '#fff', color: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Search Patient</Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 5, pt: 10 }}>
        {/* Search Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6, maxWidth: 400 }}>
          <Typography variant="h6">Enter Patient Name:</Typography>
          <TextField
            name="name"
            placeholder="Patient Name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            size="small"
            variant="outlined"
          />

          <Typography variant="h6">Enter Patient DOB (Date of Birth):</Typography>
          <TextField
            name="dob"
            type="date"
            value={form.dob}
            onChange={handleChange}
            fullWidth
            size="small"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ mt: 2, bgcolor: '#1976d2', borderRadius: 2 }}
          >
            🔍 Search
          </Button>
        </Box>

        {/* Search Results */}
        <Box>
          {results.length > 0 ? (
            <Card sx={cardStyles('linear-gradient(135deg, #42A5F5 0%, #64B5F6 100%)')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Search Results</Typography>
                <List disablePadding>
                  {results.map((patient) => (
                    <ListItemButton
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      sx={{
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        color: 'black',
                        '&:hover': { bgcolor: 'primary.light', color: 'black' }
                      }}
                    >
                      <ListItemText
                        primary={`${patient.name} — ${patient.dob}`}
                        primaryTypographyProps={{ noWrap: true, maxWidth: 250 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          ) : (
            <Typography>No patients found.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default SearchPatient;