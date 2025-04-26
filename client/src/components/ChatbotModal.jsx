import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ChatbotModal({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const user_id = localStorage.getItem('user_id');

    const newMessage = { sender: 'user', message: input };
    setMessages((prev) => [...prev, newMessage]);
    console.log('Sending to chat:', { user_id, input });

    const res = await axios.post('http://localhost:4000/chat', { question: input }, {
      headers: {
        Authorization: user_id,
      }
    });

    setMessages((prev) => [...prev, { sender: 'bot', message: res.data.answer }]);
    setInput('');
  };

  return (
    <div className="chat-modal">
      <div className="chat-header">
        <h2>MyHealthBuddy AI</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="chat-body">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}>
            <b>{msg.sender === 'user' ? 'You' : 'AI'}:</b> {msg.message}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}