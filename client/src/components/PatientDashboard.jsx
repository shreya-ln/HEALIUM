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
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';

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
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !dashboardData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error || 'No data available'}</Typography>
      </Box>
    );
  }

  const {
    medications,
    health_trends: { blood_pressure, oxygen_level, sugar_level }
  } = dashboardData;

  const bloodPressureData = blood_pressure.map(bp => {
    const [systolic, diastolic] = bp.value.split('/').map(Number);
    return { date: bp.date, systolic, diastolic };
  });

  const menuItems = [
    { text: 'Profile', icon: <PersonIcon />, action: () => navigate('/profile') },
    { text: 'Settings', icon: <SettingsIcon />, action: () => navigate('/settings') }
  ];

  const trendConfigs = [
    { title: 'Oxygen Level', series: oxygen_level, color: '#66bb6a' },
    { title: 'Sugar Level', series: sugar_level, color: '#ec407a' }
  ];

  const cardStyles = (color) => ({ 
    backgroundColor: color, 
    color: 'white', 
    height: 280, 
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    p: 3,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.02)' }
  });

  return (
    <Box sx={{ display: 'flex', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1, background: '#ffffff', color: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Patient Dashboard
          </Typography>
          <Button variant="contained" onClick={() => navigate('/ask-ai')} sx={{ background: '#1976d2' }}>Ask AI</Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#fafafa' }
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {menuItems.map((item, idx) => (
            <ListItem button key={idx} onClick={item.action}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
        <Toolbar />
        <Grid container spacing={5} sx={{ mb: 6 }}>
          {/** Row 1 - AI, Medications, Recent, Upcoming */}
          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('#1976d2')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Chat with AI</Typography>
                <Button variant="contained" color="secondary" onClick={() => navigate('/ask-ai')}>Open Chat</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('#7e57c2')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>My Medications</Typography>
                {medications.length === 0 ? <Typography>No medications</Typography> : medications.map(m => (
                  <Typography key={m.medicationid}>• {m.medicationname} — {m.dosage} ({m.frequency})</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('#ffca28')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Visits</Typography>
                {recentVisits.length === 0 ? <Typography>No visits</Typography> : recentVisits.map(v => (
                  <Typography key={v.id}>• {new Date(v.visitdate).toLocaleDateString()} — {v.content}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('#ffa726')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upcoming Visits</Typography>
                {upcomingVisits.length === 0 ? <Typography>No upcoming visits</Typography> : upcomingVisits.map(v => (
                  <Typography key={v.visit_id}>• {v.date} — {v.summary}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid container spacing={5} sx={{ mb: 6 }}>
  {/* Blood Pressure Trend */}
  <Grid item xs={12} md={6}>
    <Card sx={{ p: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Blood Pressure Trend</Typography>
        <ResponsiveContainer width={250} height={250}>
          <LineChart data={bloodPressureData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="systolic" stroke="#42a5f5" strokeWidth={2} dot={false} name="Systolic" />
            <Line type="monotone" dataKey="diastolic" stroke="#ef5350" strokeWidth={2} dot={false} name="Diastolic" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </Grid>

  {/* Oxygen and Sugar Trends */}
  {trendConfigs.map(({ title, series, color }) => (
    <Grid item xs={12} md={6} key={title}>
      <Card sx={{ p: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{title} Trend</Typography>
          <ResponsiveContainer width={250} height={250}>
            <LineChart data={series} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Grid>
  ))}
</Grid>


          

        </Grid>
      </Box>
    </Box>
  );
}
