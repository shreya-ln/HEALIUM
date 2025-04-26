// src/pages/VisitDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Box, Typography, CircularProgress, Button, Card, CardContent, Divider
} from '@mui/material';

export default function VisitDetail() {
  const { visitId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const token      = user?.user_id;

  const [visit, setVisit]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!token) return;

    axios.get(`/visit/${visitId}`, {
      headers: { Authorization: token }
    })
    .then(res => setVisit(res.data))
    .catch(() => setError('Could not load visit details'))
    .finally(() => setLoading(false));
  }, [visitId, token]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Button onClick={() => navigate(-1)}>← Back</Button>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Your visit is scheduled on {new Date(visit.visit_date).toLocaleDateString()}
          </Typography>

          <Typography><strong>Doctor ID:</strong> {visit.doctor_id}</Typography>
          <Typography><strong>Patient ID:</strong> {visit.patient_id}</Typography>
          <Typography sx={{ mt: 1 }}>{visit.summary}</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography><strong>Blood Pressure:</strong> {visit.blood_pressure}</Typography>
          <Typography><strong>Oxygen Level:</strong> {visit.oxygen_level}</Typography>
          <Typography><strong>Sugar Level:</strong> {visit.sugar_level}</Typography>
          <Typography><strong>Weight:</strong> {visit.weight} || 0 kg</Typography>
          <Typography><strong>Height:</strong> {visit.height} || 0 cm</Typography>

          {visit.audio_summary_url && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Audio Summary:</strong></Typography>
              <audio controls src={visit.audio_summary_url} style={{ width: '100%' }} />
            </Box>
          )}

          {visit.doctor_recommendation && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Doctor’s Recommendation
              </Typography>
              <Typography>{visit.doctor_recommendation}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
