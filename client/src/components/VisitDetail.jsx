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
  Card,
  Fab
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
  LocalDrink as LocalDrinkIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

export default function VisitDetail() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.user_id;

  const [visit, setVisit] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newlyPrescribed, setNewlyPrescribed] = useState([]);
  const [ongoingMedications, setOngoingMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordError, setRecordError] = useState('');

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const getSupportedAudioMime = () => {
    const audio = document.createElement('audio');
    const types = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/wav'];
    return types.find(m => MediaRecorder.isTypeSupported(m) && audio.canPlayType(m)) || '';
  };

  useEffect(() => {
    if (!token) return;
    axios.get(`/visit-detail/${visitId}`, { headers: { Authorization: token } })
      .then(res => {
        setVisit(res.data.visit);
        setQuestions(res.data.questions || []);
        setNewlyPrescribed(res.data.newly_prescribed || []);
        setOngoingMedications(res.data.ongoing_medications || []);
      })
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
    formData.append('visit_id', visitId);
    formData.append('doctor_id', visit.doctor_id);
    console.log("visit_id: ", visitId)
    console.log("doctor_id: ", visit.doctor_id);

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
          <Typography variant="h4">Visit Details</Typography>
        </Box>

        <Chip label={`Date: ${new Date(visit.visit_date).toLocaleDateString()}`} color="secondary" />

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visit Summary</Typography>
          <Typography>{visit.summary}</Typography>
        </Paper>

        <Grid container spacing={2}>
          {[
            { icon: <MonitorHeartIcon fontSize="large" />, label: 'Blood Pressure', value: visit.blood_pressure },
            { icon: <OpacityIcon fontSize="large" />, label: 'Oxygen Level', value: visit.oxygen_level },
            { icon: <LocalDrinkIcon fontSize="large" />, label: 'Sugar Level', value: visit.sugar_level },
            { icon: <FitnessCenterIcon fontSize="large" />, label: 'Weight', value: `${visit.weight} kg` },
            { icon: <HeightIcon fontSize="large" />, label: 'Height', value: `${visit.height} cm` }
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                {item.icon}
                <Box ml={2}>
                  <Typography variant="subtitle2">{item.label}</Typography>
                  <Typography>{item.value}</Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {visit.doctor_recommendation && (
          <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom>Doctor's Recommendation</Typography>
            <Typography>{visit.doctor_recommendation}</Typography>
          </Paper>
        )}
        <Accordion elevation={3} sx={{ bgcolor: 'background.paper' }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">Medications</Typography>
  </AccordionSummary>
  <AccordionDetails>

    {/* Newly Prescribed */}
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" color="primary">🆕 Newly Prescribed</Typography>
      {newlyPrescribed.length > 0 ? (
        newlyPrescribed.map((med, idx) => (
          <Box key={idx} sx={{ pl: 2, mt: 1 }}>
            <Typography><b>Name:</b> {med.medicationname}</Typography>
            <Typography><b>Dosage:</b> {med.dosage}</Typography>
            <Typography><b>Frequency:</b> {med.frequency}</Typography>
            <Typography><b>Start Date:</b> {new Date(med.startdate).toLocaleDateString()}</Typography>
          </Box>
        ))
      ) : (
        <Typography sx={{ pl: 2, mt: 1, fontStyle: 'italic' }}>
          No newly prescribed medications for this visit.
        </Typography>
      )}
    </Box>

    {/* Ongoing Medications */}
    <Box>
      <Typography variant="subtitle1" color="textSecondary">🕒 Ongoing</Typography>
      {ongoingMedications.length > 0 ? (
        ongoingMedications.map((med, idx) => (
          <Box key={idx} sx={{ pl: 2, mt: 1 }}>
            <Typography><b>Name:</b> {med.medicationname}</Typography>
            <Typography><b>Dosage:</b> {med.dosage}</Typography>
            <Typography><b>Frequency:</b> {med.frequency}</Typography>
            <Typography><b>Start Date:</b> {new Date(med.startdate).toLocaleDateString()}</Typography>
          </Box>
        ))
      ) : (
        <Typography sx={{ pl: 2, mt: 1, fontStyle: 'italic' }}>
          No ongoing medications.
        </Typography>
      )}
    </Box>

  </AccordionDetails>
</Accordion>
        {/* Audio Recording */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Ask a Question to the Doctor!</Typography>
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

        {/* Questions */}
        {questions.length > 0 && (
          <Typography variant="subtitle1" sx={{ mt: 2, fontStyle: 'italic' }}>
            Don't forget to follow-up on these questions!
          </Typography>
        )}
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

      <Fab
        color="secondary"
        variant="extended"
        onClick={() => navigate('/ask-ai')}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
          zIndex: theme => theme.zIndex.tooltip
        }}
      >
        <ChatIcon sx={{ mr: 1 }} /> Chat with Agent
      </Fab>
    </Container>
  );
}