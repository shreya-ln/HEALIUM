import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Stack,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ExpandMore as ExpandMoreIcon,
  MonitorHeart as MonitorHeartIcon,
  Opacity as OpacityIcon,
  Height as HeightIcon,
  FitnessCenter as FitnessCenterIcon,
  LocalDrink as LocalDrinkIcon
} from '@mui/icons-material';

export default function VisitDetail() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.user_id;

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [recordError, setRecordError] = useState('');

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Choose supported audio MIME
  const getSupportedAudioMime = () => {
    const audio = document.createElement('audio');
    const types = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/wav'];
    return types.find(m => MediaRecorder.isTypeSupported(m) && audio.canPlayType(m)) || '';
  };

  useEffect(() => {
    if (!token) return;
    axios.get(`/visit/${visitId}`, { headers: { Authorization: token } })
      .then(res => setVisit(res.data))
      .catch(() => setError('Could not load visit details'))
      .finally(() => setLoading(false));
  }, [visitId, token]);

  useEffect(() => {
    if (visit?.audio_summary_url && audioRef.current) audioRef.current.load();
  }, [visit?.audio_summary_url]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true));
    }
  };

  const startRecording = async () => {
    setRecordError('');
    const mimeType = getSupportedAudioMime();
    if (!mimeType) {
      setRecordError('No compatible audio format.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = () => onRecordingStop(mimeType);
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setRecordError('Could not start recording.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const onRecordingStop = async (mimeType) => {
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const ext = mimeType.split('/')[1].split(';')[0];
    const file = new File([blob], `question_${Date.now()}.${ext}`, { type: mimeType });
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await axios.post(
        '/upload-question-audio',
        formData,
        { headers: { Authorization: token, 'Content-Type': 'multipart/form-data' } }
      );
      setQuestions(prev => [...prev, { transcript: res.data.transcript, audioUrl: res.data.audioUrl }]);
    } catch {
      setRecordError('Upload or transcription failed.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>
  );
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate(-1)}><ArrowBackIosIcon /></IconButton>
          <Typography variant="h4">Upcoming Visit Details</Typography>
        </Box>

        <Chip label={`Date: ${new Date(visit.visit_date).toLocaleDateString()}`} color="secondary" />

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Summary</Typography>
          <Typography>{visit.summary}</Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <MonitorHeartIcon fontSize="large" />
              <Box ml={2}>
                <Typography variant="subtitle2">Blood Pressure</Typography>
                <Typography>{visit.blood_pressure}</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <OpacityIcon fontSize="large" />
              <Box ml={2}>
                <Typography variant="subtitle2">Oxygen Level</Typography>
                <Typography>{visit.oxygen_level}</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <LocalDrinkIcon fontSize="large" />
              <Box ml={2}>
                <Typography variant="subtitle2">Sugar Level</Typography>
                <Typography>{visit.sugar_level}</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <FitnessCenterIcon fontSize="large" />
              <Box ml={2}>
                <Typography variant="subtitle2">Weight</Typography>
                <Typography>{visit.weight} kg</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <HeightIcon fontSize="large" />
              <Box ml={2}>
                <Typography variant="subtitle2">Height</Typography>
                <Typography>{visit.height} cm</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {visit.doctor_recommendation && (
          <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom>Doctor's Recommendation</Typography>
            <Typography>{visit.doctor_recommendation}</Typography>
          </Paper>
        )}

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Ask a Question</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              color={isRecording ? 'error' : 'primary'}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
            </IconButton>
            {isRecording && <Typography>Recording...</Typography>}
            {isUploading && <CircularProgress size={24} />}
          </Stack>
          {recordError && <Alert severity="error" sx={{ mt: 2 }}>{recordError}</Alert>}
        </Paper>

        {questions.map((q, i) => (
          <Accordion key={i} elevation={1}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{q.transcript}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <audio controls src={q.audioUrl} style={{ width: '100%' }} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Container>
  );
}