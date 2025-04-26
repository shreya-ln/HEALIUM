// src/components/PatientDashboard.jsx
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
import IconButton from '@mui/material/IconButton';
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

const drawerWidth = 200;

export default function PatientDashboard() {
  const { user } = useAuth();
  const token = user?.user_id;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    axios.get('/dashboard-data', { headers: { Authorization: token } })
      .then(res => setData(res.data))
      .catch(err => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error || 'No data available'}</Typography>
      </Box>
    );
  }

  const {
    medications,
    visits: recentVisits = [],
    health_trends: { blood_pressure, oxygen_level, sugar_level }
  } = data;

  const menuItems = [
    { text: 'Profile', icon: <PersonIcon />, action: () => navigate('/profile') },
    { text: 'Settings', icon: <SettingsIcon />, action: () => navigate('/settings') }
  ];

  const trendConfigs = [
    { title: 'Blood Pressure', series: blood_pressure },
    { title: 'Oxygen Level', series: oxygen_level },
    { title: 'Sugar Level', series: sugar_level }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Patient Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/ask-ai')}>Ask AI</Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' }
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

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Grid container spacing={3}>
          {/* Medications Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>My Medications</Typography>
                {medications.length === 0
                  ? <Typography>No medications</Typography>
                  : medications.map(m => (
                      <Typography key={m.medicationid}>• {m.medicationname} — {m.dosage} ({m.frequency})</Typography>
                    ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Visits Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Visits</Typography>
                {recentVisits.length === 0
                  ? <Typography>No visits</Typography>
                  : recentVisits.map(v => (
                      <Typography key={v.id}>• {new Date(v.visitdate).toLocaleDateString()} — {v.content}</Typography>
                    ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Trend Charts */}
          {trendConfigs.map(({ title, series }) => (
            <Grid item xs={12} md={4} key={title}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{title} Trend</Typography>
                  {series.length === 0
                    ? <Typography>No data</Typography>
                    : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={series} margin={{ top: 5, right: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#1976d2" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
