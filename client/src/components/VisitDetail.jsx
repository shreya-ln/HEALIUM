import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, CircularProgress, Button, Card, CardContent
} from '@mui/material';

export default function VisitDetail() {
  const { visitId } = useParams();
  const navigate   = useNavigate();
  const [visit, setVisit]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    axios.get(`/upcoming-visits`, {
      headers: { Authorization: visitId }
    })
    .then(res => setVisit(res.data))
    .catch(err => setError('Could not load visit details'))
    .finally(() => setLoading(false));
  }, [visitId]);

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
            Visit on {new Date(visit.date).toLocaleDateString()}
          </Typography>
          <Typography><strong>Doctor ID:</strong> {visit.doctor_id}</Typography>
          <Typography sx={{ mt: 1 }}>{visit.summary}</Typography>
          {/* any other fields, e.g. prescriptions, notes, etc */}
        </CardContent>
      </Card>
    </Box>
  );
}
