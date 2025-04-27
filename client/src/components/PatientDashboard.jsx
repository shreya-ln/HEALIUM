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
import ChatIcon from '@mui/icons-material/Chat';
import MedicationIcon from '@mui/icons-material/Medication';

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
  const token = user?.user_id;
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendRecs, setTrendRecs] = useState({
      blood_pressure: "",
      oxygen_level: "",
      sugar_level: ""
  });

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [dashRes, visitsRes, upcomingRes] = await Promise.all([
          axios.get('/dashboard-data', { headers: { Authorization: token }}),
          axios.get('/get-past-visits', { headers: { Authorization: token }}),
          axios.get('/upcoming-visits', { headers: { Authorization: token }})
        ]);
        setDashboardData(dashRes.data);
        setRecentVisits(visitsRes.data);
        setUpcomingVisits(upcomingRes.data);

        // const { blood_pressure, oxygen_level, sugar_level } = dashRes.data.health_trends;
        // const recRes = await axios.post(
        //   '/trend-recommendations',
        //   { blood_pressure, oxygen_level, sugar_level },
        //   { headers: { Authorization: token }}
        // );
        // setTrendRecs(recRes.data);
        console.log("Response: ", trendRecs);
        console.log("Response 2: ", dashRes.data.recommendations);
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

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

  const {
    medications,
    health_trends: { blood_pressure, oxygen_level, sugar_level },
    recommendations: { blood_pressure_info, oxygen_level_info, sugar_level_info}
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

      <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1, bgcolor: '#fff', color: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Patient Dashboard</Typography>
          <Button variant="contained" onClick={() => navigate('/ask-ai')} sx={{ bgcolor: '#1976d2' }}>
            Ask Our Agent!
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#fafafa' }
        }}
      >
        <Toolbar />
        <Divider />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
        <Toolbar />

        {/* Row 1: Medications + Trends */}
        <Box sx={{ display: 'flex', gap: 2, mb: 6 }}>
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
            <Card sx={cardStyles('#fff','black')}>
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
                <Typography variant="h8" sx={{ mt: 1, fontStyle: 'italic', color: 'blue'}}>
                   {blood_pressure_info}
                 </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 25%' }}>
            <Card sx={cardStyles('#fff','black')}>
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
                <Typography variant="h8" sx={{ mt: 1, fontStyle: 'italic', color: 'blue'}}>
                   {oxygen_level_info}
                 </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 25%' }}>
            <Card sx={cardStyles('#fff','black')}>
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
                <Typography variant="h8" sx={{ mt: 1, fontStyle: 'italic', color: 'blue'}}>
                  {sugar_level_info}
                 </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Row 2: Visits */}
        <Box sx={{ display: 'flex', gap: 2, mb: 6 }}>
          <Box sx={{ flex: '1 1 50%' }}>
            <Card sx={cardStyles('linear-gradient(135deg, #FFC107 0%, #FFCA28 100%)','black')}>
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
            <Card sx={cardStyles('linear-gradient(135deg, #AED581 0%, #66BB6A 100%)','black')}>
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
