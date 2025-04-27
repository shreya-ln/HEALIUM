import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import ChatIcon from '@mui/icons-material/Chat';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';

const drawerWidth = 250;

function DoctorDashboard() {
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [futureAppointments, setFutureAppointments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.user_id) return;
      try {
        const [todayRes, futureRes, pendingRes, profileRes] = await Promise.all([
          axios.get('/today-visits', { headers: { 'Authorization-Id': user.user_id } }),
          axios.get('/future-visits', { headers: { 'Authorization-Id': user.user_id } }),
          axios.get('/pending-questions-for-doctor', { headers: { Authorization: user.user_id } }),
          axios.get('/doctor-profile', { headers: { Authorization: user.user_id } })
        ]);

        setTodayAppointments(todayRes.data || []);
        setFutureAppointments((futureRes.data || []).slice(0, 5));
        setPendingCount((pendingRes.data || []).length);
        setDoctorProfile(profileRes.data || {});
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSelect = (appointment) => {
    navigate(`/appointment/${appointment.id}`);
  };

  const handleCreateAppointment = () => {
    navigate('/search-patient');
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );

  const cardStyles = (bgColor, textColor = 'white') => ({
    background: bgColor,
    color: textColor,
    borderRadius: 8,
    p: 3,
    height: 280,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.02)' }
  });

  return (
    <Box sx={{ display: 'flex', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#fff', color: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Doctor Dashboard</Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            ❓ Pending Questions: {pendingCount}
          </Typography>
          <Button variant="contained" onClick={handleCreateAppointment} sx={{ bgcolor: '#4caf50' }}>
            ➕ Create Appointment
          </Button>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
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
          <Typography variant="h6">Dr. {doctorProfile?.name || 'Dr. Name'}</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {doctorProfile?.specialization || 'Specialization'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {doctorProfile?.hospital || 'Hospital'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {doctorProfile?.email || 'email@example.com'}
          </Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 5 }}>
        <Toolbar />

        <Box sx={{ display: 'flex', gap: 2, mb: 6 }}>
          <Box sx={{ flex: '1 1 50%' }}>
            <Card sx={cardStyles('linear-gradient(135deg, #42A5F5 0%, #64B5F6 100%)')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>📅 Today's Appointments</Typography>
                {todayAppointments.length === 0 ? (
                  <Typography>No appointments today.</Typography>
                ) : (
                  <List disablePadding>
                    {todayAppointments.map((appt) => (
                      <ListItemButton
                        key={appt.id}
                        onClick={() => handleSelect(appt)}
                        sx={{ mb: 1, borderRadius: 1, bgcolor: 'grey.50', color: 'black', '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                      >
                        <ListItemText
                          primary={`${appt.patient_name || 'Unknown'} — ${appt.visitdate ? new Date(appt.visitdate).toLocaleString() : 'TBD'}`}
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
            <Card sx={cardStyles('linear-gradient(135deg, #81C784 0%, #66BB6A 100%)')}>
              <CardContent>
                <Typography variant="h6" gutterBottom>🔮 Upcoming Appointments</Typography>
                {futureAppointments.length === 0 ? (
                  <Typography>No future appointments.</Typography>
                ) : (
                  <List disablePadding>
                    {futureAppointments.map((appt) => (
                      <ListItemButton
                        key={appt.id}
                        onClick={() => handleSelect(appt)}
                        sx={{ mb: 1, borderRadius: 1, bgcolor: 'grey.50', color: 'black', '&:hover': { bgcolor: 'primary.light', color: 'black' } }}
                      >
                        <ListItemText
                          primary={`${appt.patient_name || 'Unknown'} — ${appt.visitdate ? new Date(appt.visitdate).toLocaleDateString() : 'TBD'}`}
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
        {/* <Fab
          color="secondary"
          variant="extended"
          onClick={() => navigate('/ask-ai')}
          sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: '0px 4px 12px rgba(0,0,0,0.2)', zIndex: theme => theme.zIndex.tooltip }}
        >
          <ChatIcon sx={{ mr: 1 }} /> Chat with Agent
        </Fab> */}

      </Box>
    </Box>
  );
}

export default DoctorDashboard;
