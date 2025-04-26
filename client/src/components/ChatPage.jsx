// src/components/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Box, AppBar, Toolbar, Typography, IconButton, Container, TextField, Button, List, ListItem, ListItemText, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const { user } = useAuth();
  const token = user?.user_id;
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]); // { role: 'user'|'bot', text }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom whenever messages update
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setMessages(msgs => [...msgs, { role: 'user', text: question }]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post(
        '/chat',
        { question },
        { headers: { Authorization: token } }
      );
      setMessages(msgs => [...msgs, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        { role: 'bot', text: '❌ Error sending message.' }
      ]);
    } finally {
      setSending(false);
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
            Chat with AI Assistant
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ flexGrow: 1, py: 2, overflowY: 'auto' }}>
        <List>
          {messages.map((m, i) => (
            <ListItem key={i} sx={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  bgcolor: m.role === 'user' ? 'primary.light' : 'grey.100',
                  position: 'relative',
                }}
              >
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
          placeholder="Type your question…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
        />
        <Button variant="contained" onClick={send} disabled={sending || !input.trim()}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
