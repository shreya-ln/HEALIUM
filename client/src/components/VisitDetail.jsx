// src/pages/VisitDetail.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Box, Typography, CircularProgress, Button, Card,
  CardContent, Divider, IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon    from '@mui/icons-material/Pause';
import MicIcon      from '@mui/icons-material/Mic';
import StopIcon     from '@mui/icons-material/Stop';

export default function VisitDetail() {
  const { visitId } = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const token       = user?.user_id;

  const [visit, setVisit]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [questions, setQuestions]     = useState([]);
  const [recordError, setRecordError] = useState('');

  const audioRef           = useRef(null);
  const mediaRecorderRef   = useRef(null);
  const audioChunksRef     = useRef([]);

  // Helper: pick a MIME that MediaRecorder and <audio> both support
  function getSupportedAudioMime() {
    const audio = document.createElement('audio');
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime) && audio.canPlayType(mime)) {
        return mime;
      }
    }
    return '';
  }

  // Fetch visit details
  useEffect(() => {
    if (!token) return;
    axios.get(`/visit/${visitId}`, { headers: { Authorization: token } })
      .then(res => setVisit(res.data))
      .catch(() => setError('Could not load visit details'))
      .finally(() => setLoading(false));
  }, [visitId, token]);

  // Reload summary audio when URL changes
  useEffect(() => {
    if (visit?.audio_summary_url && audioRef.current) {
      audioRef.current.load();
    }
  }, [visit?.audio_summary_url]);

  // Play / pause the visit’s summary
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Audio playback failed:', err));
    }
  };

  // Start recording
  const startRecording = async () => {
    setRecordError('');
    const mimeType = getSupportedAudioMime();
    if (!mimeType) {
      setRecordError('No compatible audio format in this browser.');
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
    } catch (err) {
      console.error(err);
      setRecordError('Could not start recording.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  // Once recording stops: upload to backend
  const onRecordingStop = async (mimeType) => {
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const ext  = mimeType.split('/')[1].split(';')[0]; // e.g. "webm"
    const file = new File([blob], `question_${Date.now()}.${ext}`, { type: mimeType });

    const formData = new FormData();
    formData.append('file', file);

    console.log("Form data: ", formData);

    setIsUploading(true);
    try {
      const res = await axios.post(
        '/upload-question-audio',
        formData,
        {
          headers: {
            Authorization: token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setQuestions(qs => [
        ...qs,
        { transcript: res.data.transcript, audioUrl: res.data.audioUrl }
      ]);
    } catch (err) {
      console.error(err);
      setRecordError('Upload or transcription failed.');
    } finally {
      setIsUploading(false);
    }
  };

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
          {/* Visit Summary */}
          <Typography variant="h5" gutterBottom>
            Your visit is scheduled on {new Date(visit.visit_date).toLocaleDateString()}
          </Typography>
          <Typography><strong>Doctor ID:</strong> {visit.doctor_id}</Typography>
          <Typography><strong>Patient ID:</strong> {visit.patient_id}</Typography>
          <Typography sx={{ mt: 1 }}>{visit.summary}</Typography>
          <Divider sx={{ my: 2 }} />

          {/* Vitals */}
          <Typography><strong>Blood Pressure:</strong> {visit.blood_pressure}</Typography>
          <Typography><strong>Oxygen Level:</strong> {visit.oxygen_level}</Typography>
          <Typography><strong>Sugar Level:</strong> {visit.sugar_level}</Typography>
          <Typography><strong>Weight:</strong> {visit.weight} kg</Typography>
          <Typography><strong>Height:</strong> {visit.height} cm</Typography>

          {/* Audio Summary */}
          {/* {visit.audio_summary_url && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography><strong>Audio Summary:</strong></Typography>
              <IconButton onClick={handlePlayPause} sx={{ ml: 1 }}>
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <audio
                ref={audioRef}
                crossOrigin="anonymous"
                src={visit.audio_summary_url}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
            </Box>
          )} */}

          {/* Doctor Recommendation */}
          {visit.doctor_recommendation && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Doctor's Recommendation
              </Typography>
              <Typography>{visit.doctor_recommendation}</Typography>
            </Box>
          )}

          {/* Ask a Question */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6">Ask a question</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <IconButton
              color={isRecording ? 'error' : 'primary'}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
            </IconButton>
            {isRecording && <Typography sx={{ ml: 1 }}>Recording…</Typography>}
            {isUploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </Box>
          {recordError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {recordError}
            </Typography>
          )}

          {/* Asked Questions List */}
          {questions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Your Questions</Typography>
              {questions.map((q, i) => (
                <Card key={i} sx={{ mt: 1, bgcolor: '#fafafa' }}>
                  <CardContent>
                    <Typography><strong>Transcript:</strong> {q.transcript}</Typography>
                    <audio controls src={q.audioUrl} style={{ width: '100%', marginTop: 8 }} />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
