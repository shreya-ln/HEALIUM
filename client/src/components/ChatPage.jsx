// src/components/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Box, AppBar, Toolbar, Typography, IconButton, Container, TextField, Button, List, ListItem, ListItemText, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const { user } = useAuth();
  const token = user?.user_id;
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput('');
    setSending(true);
  
    try {
      const res = await axios.post('/chat', { question }, {
        headers: { Authorization: token }
      });
      setMessages(msgs => [...msgs, { role: 'user', text: question }, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(msgs => [...msgs, { role: 'bot', text: '❌ Error sending message.' }]);
    } finally {
      setSending(false);
    }
  };
  

  function getSupportedAudioMime() {
    const audio = document.createElement('audio');
    const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/wav'];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime) && audio.canPlayType(mime)) {
        return mime;
      }
    }
    return '';
  }

  const startRecording = async () => {
    const mimeType = getSupportedAudioMime();
    if (!mimeType) {
      alert('No compatible audio format found.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = handleUploadAudio;
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert('Failed to start recording.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const handleUploadAudio = async () => {
    const mimeType = getSupportedAudioMime();
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const ext = mimeType.split('/')[1].split(';')[0];
    const file = new File([blob], `audio_question.${ext}`, { type: mimeType });
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      setUploadingAudio(true);
      const res = await axios.post('/upload-question-audio-for-chat', formData, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data'
        }
      });
  
      const { transcript } = res.data;
  
      const chatRes = await axios.post('/chat', { question: transcript }, {
        headers: { Authorization: token }
      });
  
      setMessages(msgs => [...msgs, { role: 'user', text: transcript }, { role: 'bot', text: chatRes.data.answer }]);
  
    } catch (err) {
      console.error(err);
      alert('Failed to process audio or send chat.');
    } finally {
      setUploadingAudio(false);
    }
  };
  

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Hey there! You can either Talk or Chat with our AI Assistant
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ flexGrow: 1, py: 2, overflowY: 'auto' }}>
        <List>
          {messages.map((m, i) => (
            <ListItem key={i} sx={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper elevation={1} sx={{ p: 1.5, maxWidth: '80%', bgcolor: m.role === 'user' ? 'primary.light' : 'grey.100' }}>
                <ListItemText primary={m.text} />
              </Paper>
            </ListItem>
          ))}
          <div ref={bottomRef} />
        </List>
      </Container>

      <Box component="form" onSubmit={e => { e.preventDefault(); send(); }} sx={{ p: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your question… or use mic"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending || uploadingAudio}
        />
        <Button variant="contained" onClick={send} disabled={sending || !input.trim() || uploadingAudio}>
          Send
        </Button>
        <IconButton color={isRecording ? 'error' : 'primary'} onClick={isRecording ? stopRecording : startRecording} disabled={uploadingAudio}>
          {isRecording ? <StopIcon /> : <MicIcon />}
        </IconButton>
        {uploadingAudio && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Box>
    </Box>
  );
}
