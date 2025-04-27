import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem'; // unused
// import ListItemIcon from '@mui/material/ListItemIcon'; // unused
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
// import Grid from '@mui/material/Grid'; // unused
import ListItemButton from '@mui/material/ListItemButton';
import Chip from '@mui/material/Chip';
import Fab from '@mui/material/Fab';

// import PersonIcon from '@mui/icons-material/Person';
// import SettingsIcon from '@mui/icons-material/Settings';
import Avatar from '@mui/material/Avatar';
import ChatIcon from '@mui/icons-material/Chat';
import MedicationIcon from '@mui/icons-material/Medication';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const drawerWidth = 220;

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendRecs, setTrendRecs] = useState({
    blood_pressure: "",
    oxygen_level: "",
    sugar_level: ""
  });

  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiResult, setBmiResult] = useState('');
  const [healthJoke, setHealthJoke] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.user_id) return;
      try {
        const [dashRes, visitsRes, upcomingRes, jokeRes, profileRes] = await Promise.all([
          axios.get('/dashboard-data', { headers: { Authorization: user.user_id } }),
          axios.get('/get-past-visits', { headers: { Authorization: user.user_id } }),
          axios.get('/upcoming-visits', { headers: { Authorization: user.user_id }}),
          axios.get('/health-joke', { headers: { Authorization: user.user_id } }),
          axios.get(`/patient-profile/${user.user_id}`, { headers: { Authorization: user.user_id } })
        ]);
        setDashboardData(dashRes.data);
        setRecentVisits(visitsRes.data);
        setUpcomingVisits(upcomingRes.data);
        setHealthJoke(jokeRes.data.joke);
        setPatientProfile(profileRes.data.patient_info || {});
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.user_id]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );
  if (error || !dashboardData) return (
    <Box sx={{ p: 4 }}>
      <Typography color="error">{error || 'No data available'}</Typography>
    </Box>
  );

  const handleBmiCalculate = async () => {
    try {
      const res = await axios.post('/calculate-bmi', {
        weight: bmiWeight,
        height: bmiHeight
      }, {
        headers: { Authorization: user?.user_id }
      });
      setBmiResult(res.data.bmi_result);
    } catch (err) {
      console.error('Failed to calculate BMI', err);
      alert('Failed to calculate BMI');
    }
  };

  const {
    medications,
    health_trends: { blood_pressure, oxygen_level, sugar_level },
    recommendations: { blood_pressure_info, oxygen_level_info, sugar_level_info }
  } = dashboardData;

  const bloodPressureData = blood_pressure.map(bp => {
    const [systolic, diastolic] = bp.value.split('/').map(Number);
    return { date: bp.date, systolic, diastolic };
  });

  const cardStyles = (bgColor, textColor = 'white') => ({
    background: bgColor,
    color: textColor,
    borderRadius: 8,
    p: 3,
    height: 350,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.02)' }
  });

  return (
    <Box sx={{ display: 'flex', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1, bgcolor: 'linear-gradient(135deg, #009688 30%, #4DB6AC 100%)', color: '#fff' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Patient Dashboard</Typography>
          <Button variant="contained" onClick={() => navigate('/ask-ai')} sx={{ bgcolor: 'purple' }}>
            Ask Our Agent!
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#fafafa', pt: 2 }
        }}
      >
        <Toolbar />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          <Avatar sx={{ width: 80, height: 80, mb: 2 }} />
          <Typography variant="h6" sx={{fontWeight: 'bold'}}>{patientProfile?.name || 'Your Name'}</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {patientProfile?.dob || 'MM/DD/YYYY'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {patientProfile?.email || 'email@example.com'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {patientProfile?.phone || '234-567-8900'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {patientProfile?.address || '123 Muffin Lane, City, State, Zip'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {patientProfile?.preferredlanguage || 'Language'}
          </Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ p: 2, textAlign: 'center' }}>
    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
      Hi There!
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.primary' }}>
      You have {upcomingVisits.length} upcoming appointment{upcomingVisits.length !== 1 ? 's' : ''}.
    </Typography>
  </Box>

      </Drawer>

      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Typography variant="h5">Welcome, {patientProfile?.name || 'Patient'}!</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Here you can view your health trends, upcoming visits, and more.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 4 }}>
          {/* Row 1: Medications + Trends */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: '1 1 25%' }}>
              <Card sx={cardStyles('linear-gradient(135deg, #7E57C2 0%, #9575CD 100%)')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>My Medications</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {medications.map(m => (
                      <Chip
                        key={m.medicationid}
                        icon={<MedicationIcon />}
                        label={`${m.medicationname} (${m.dosage})`}
                        variant="filled"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 25%' }}>
              <Card sx={cardStyles('#fff', 'black')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Blood Pressure</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={bloodPressureData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="systolic" stroke="#42a5f5" dot={false} />
                      <Line type="monotone" dataKey="diastolic" stroke="#ef5350" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography
                      variant="body2"
                      sx={{
                      mt: 1,
                        fontStyle: 'italic',
                        color: 'blue',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                  >
                  <AutoAwesomeIcon sx={{ mr: 1, color: 'red' }} />
                  {blood_pressure_info}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 25%' }}>
              <Card sx={cardStyles('#fff', 'black')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Oxygen Level</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={oxygen_level}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#66bb6a" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography
                      variant="body2"
                      sx={{
                      mt: 1,
                        fontStyle: 'italic',
                        color: 'blue',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                  >
                  <AutoAwesomeIcon sx={{ mr: 1, color: 'red' }} />
                  {oxygen_level_info}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 25%' }}>
              <Card sx={cardStyles('#fff', 'black')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Sugar Level</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={sugar_level}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#ec407a" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography
                      variant="body2"
                      sx={{
                      mt: 1,
                        fontStyle: 'italic',
                        color: 'blue',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                  >
                  <AutoAwesomeIcon sx={{ mr: 1, color: 'red' }} />
                  {sugar_level_info}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Row 2: Visits */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: '1 1 50%' }}>
              <Card sx={cardStyles('linear-gradient(135deg, #FFC107 0%, #FFCA28 100%)', 'black')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Previous Visits</Typography>
                  {recentVisits.length === 0 ? (
                    <Typography>No visits</Typography>
                  ) : (
                    <List disablePadding>
                      {recentVisits.map(v => (
                        <ListItemButton
                          key={v.id}
                          onClick={() => navigate(`/visit/${v.id}`)}
                          sx={{ mb: 1, borderRadius: 1, bgcolor: 'grey.50', '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                        >
                          <ListItemText
                            primary={`${new Date(v.visitdate).toLocaleDateString()} — ${v.content}`}
                            primaryTypographyProps={{ noWrap: true, maxWidth: 350 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 50%' }}>
              <Card sx={cardStyles('linear-gradient(135deg, #AED581 0%, #66BB6A 100%)', 'black')}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Upcoming Visits</Typography>
                  {upcomingVisits.length === 0 ? (
                    <Typography>No upcoming visits</Typography>
                  ) : (
                    <List disablePadding>
                      {upcomingVisits.map(v => (
                        <ListItemButton
                          key={v.visit_id}
                          onClick={() => navigate(`/visit/${v.visit_id}`)}
                          sx={{ mb: 1, borderRadius: 1, bgcolor: 'grey.50', '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                        >
                          <ListItemText
                            primary={`${new Date(v.date).toLocaleDateString()} — ${v.summary}`}
                            primaryTypographyProps={{ noWrap: true, maxWidth: 350 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

        {/* Row 3: BMI Calculator + Health Dad Joke */}

<Box sx={{ display: 'flex', gap: 2 }}>

  {/* BMI Card */}
  <Box sx={{ flex: '1 1 50%' }}>
    <Card sx={cardStyles('linear-gradient(135deg, #4db6ac 0%, #80cbc4 100%)', 'black')}>
      <CardContent>
        <Typography variant="h6" gutterBottom>BMI Calculator</Typography>

        <input
          type="number"
          placeholder="Weight (kg)"
          value={bmiWeight}
          onChange={(e) => setBmiWeight(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="number"
          placeholder="Height (cm)"
          value={bmiHeight}
          onChange={(e) => setBmiHeight(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <Button
          variant="contained"
          onClick={handleBmiCalculate}
          sx={{ width: '100%', bgcolor: '#00796b' }}
        >
          Calculate BMI
        </Button>

                {bmiResult && (
                  <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
                    {bmiResult}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

  {/* Health Dad Joke Card */}
  <Box sx={{ flex: '1 1 50%' }}>
    <Card sx={{
      background: 'linear-gradient(135deg, #f48fb1 0%, #f06292 100%)',
      color: 'black',
      borderRadius: 8,
      p: 3,
      boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s',
      '&:hover': { transform: 'scale(1.02)' }
    }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Health Joke of the Day 🍎</Typography>
        <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
          {healthJoke || 'Loading joke...'}
        </Typography>
      </CardContent>
    </Card>
  </Box>

</Box>



        {/* Floating Chat Button */}
        <Fab
          color="secondary"
          variant="extended"
          onClick={() => navigate('/ask-ai')}
          sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: '0px 4px 12px rgba(0,0,0,0.2)', zIndex: theme => theme.zIndex.tooltip }}
        >
          <ChatIcon sx={{ mr: 1 }} /> Chat with Agent
        </Fab>
      </Box>
    </Box>
  );
}
