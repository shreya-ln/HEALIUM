// src/components/AppointmentDetail.jsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { useNavigate } from 'react-router-dom';

function AppointmentDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [patientSummary, setPatientSummary] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSummary, setRecordingSummary] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [recordingAudioUrl, setRecordingAudioUrl] = useState('');
  const [recordingTranscript, setRecordingTranscript] = useState('');

  const [uploadedReportSummary, setUploadedReportSummary] = useState('');
  const [uploadedReportType, setUploadedReportType] = useState('');
  const [uploadedReportImageUrl, setUploadedReportImageUrl] = useState('');

  const navigate = useNavigate();


  const [uploadedReportId, setUploadedReportId] = useState(null);


  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    bloodpressure: '',
    oxygenlevel: '',
    sugarlevel: '',
    weight: '',
    height: '',
    doctorrecommendation: '',
  });
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Visit data
        const visitRes = await axios.get(`/visit/${id}`);
        setVisit(visitRes.data);

        if (visitRes.data?.patient_id) {
          // 2) DB summary (Authorization 추가)
          const dataRes = await axios.get(`/patient-summary/${visitRes.data.patient_id}`, {
            headers: { Authorization: user?.user_id }
          });
          setPatientSummary(dataRes.data);

          // 3) AI summary (기존처럼)
          const aiRes = await axios.get(`/appointment-summary/${visitRes.data.patient_id}`);
          setAiSummary(aiRes.data.summary);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStartConsultation = () => {
    setFormOpen(true);
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
      alert('No supported audio format found.');
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleUploadAudio = async () => {
    const mimeType = getSupportedAudioMime();
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    const ext = mimeType.split('/')[1].split(';')[0];
    const file = new File([blob], `visit_summary.${ext}`, { type: mimeType });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/summarize-audio', formData, {
        headers: {
          Authorization: user?.user_id,
          'Content-Type': 'multipart/form-data'
        }
      });

      setRecordingTranscript(res.data.summary);  // store summary text
      setRecordingAudioUrl(res.data.audioUrl);    // store uploaded audio URL
      setRecordingSummary(res.data.summary);

    } catch (err) {
      console.error('Failed to summarize audio', err);
      alert('Failed to process recording.');
    }
  };
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/summarize-image', formData, {
        headers: {
          Authorization: user?.user_id,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Summarize response:', res.data);

      setUploadedReportSummary(res.data.summary);
      setUploadedReportType(res.data.reporttype);
      setUploadedReportImageUrl(res.data.imageUrl);   // 이거 res.data.imageUrl 쓰기

    } catch (err) {
      console.error('Failed to upload and summarize image', err);
      alert('Failed to upload or summarize image.');
    }
  };

  const handleRecordingButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const filteredFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '')
      );

      await axios.patch(`/update-visit/${id}`, {
        ...filteredFormData,
        content: recordingTranscript || '',
        visitsummaryaudio: recordingAudioUrl || ''
      }, {
        headers: {
          Authorization: user?.user_id,
          'Content-Type': 'application/json'
        }
      });

      // 2) If a report was uploaded, add it to 'reports' table
      if (uploadedReportSummary && uploadedReportType) {
        await axios.post('/add-report', {
          patient_id: visit.patient_id,
          report_content: uploadedReportSummary,
          report_type: uploadedReportType,
          image_url: uploadedReportImageUrl,
        }, {
          headers: {
            Authorization: user?.user_id,
            'Content-Type': 'application/json'
          }
        });
      }

      // Reset everything
      setFormOpen(false);
      setFormData({ bloodpressure: '', oxygenlevel: '', sugarlevel: '', weight: '', height: '', doctorrecommendation: '' });
      setRecordingTranscript('');
      setRecordingAudioUrl('');
      setUploadedReportSummary('');
      setUploadedReportType('');
      setUploadedReportImageUrl('');

      // Refresh visit
      const updatedVisitRes = await axios.get(`/visit/${id}`);
      setVisit(updatedVisitRes.data);

      // navigate to the dashboard
      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 1000);

    } catch (err) {
      console.error('Failed to update visit', err);
      alert('Failed to update visit');
    }
  };

  if (!visit || !patientSummary) return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <CircularProgress size={80} />
      <p style={{ marginTop: '1rem', fontSize: '1.5rem', color: '#555', fontStyle: 'italic' }}>Loading...</p>
    </Box>
  );

  const { patient, medications, recent_visits, reports, pending_questions } = patientSummary;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🩺 Appointment Details</h1>


      {/* AI Summary */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1rem',
          border: '2px solid #4caf50',
          borderRadius: '12px',
          backgroundColor: '#f6fff6',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
      >
        <h2>🧠 AI Summary</h2>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
          {aiLoading
            ? 'Generating AI summary…'
            : aiSummary || 'No AI summary available.'}
        </p>
      </div>


      {/* Patient Info */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>👤 Patient Information</h2>
        <p><b>Name:</b> {patient.name}</p>
        <p><b>DOB:</b> {patient.dob}</p>
        <p><b>Phone:</b> {patient.phone}</p>
        <p><b>Address:</b> {patient.address}</p>
        <p><b>Preferred Language:</b> {patient.preferredlanguage}</p>
      </div>

      {/* Vital Signs */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>📈 Recent Vital Signs</h2>
        {(() => {
          const vitalData = recent_visits
            .filter(v => v.visitdate)
            .map(v => {
              const [systolic, diastolic] = v.bloodpressure ? v.bloodpressure.split('/').map(Number) : [null, null];
              return { date: new Date(v.visitdate), systolic, diastolic, oxygenlevel: v.oxygenlevel, sugarlevel: v.sugarlevel };
            })
            .filter(d => d.systolic !== null || d.diastolic !== null || d.oxygenlevel !== null || d.sugarlevel !== null)
            .sort((a, b) => a.date - b.date);

          if (vitalData.length === 0) return <p>No recorded vital signs to display.</p>;

          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vitalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={date => new Date(date).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={date => new Date(date).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="systolic" stroke="#8884d8" name="Systolic BP" connectNulls />
                <Line type="monotone" dataKey="diastolic" stroke="#82ca9d" name="Diastolic BP" connectNulls />
                <Line type="monotone" dataKey="oxygenlevel" stroke="#ff7300" name="Oxygen Level" connectNulls />
                <Line type="monotone" dataKey="sugarlevel" stroke="#ff0000" name="Sugar Level" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      {/* Medications */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>💊 Medications</h2>
        {medications.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {medications.map((m, idx) => {
              const start = m.startdate ? new Date(m.startdate) : null;
              const end = m.enddate ? new Date(m.enddate) : null;
              const today = new Date();
              let progress = null;
              if (start && end) {
                const total = end - start;
                const elapsed = today - start;
                progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
              }
              return (
                <div key={idx} style={{ flex: '1 1 300px', border: '1px solid #ccc', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', backgroundColor: '#fdfdfd' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>{m.medicationname || 'Unknown Medication'}</h3>
                  <p><b>Dosage:</b> {m.dosage || 'Unknown dosage'}</p>
                  <p><b>Frequency:</b> {m.frequency || 'Unknown frequency'}</p>
                  <p><b>Start Date:</b> {m.startdate ? new Date(m.startdate).toLocaleDateString() : 'Unknown start date'}</p>
                  <p><b>End Date:</b> {m.enddate ? new Date(m.enddate).toLocaleDateString() : 'Unknown end date'}</p>
                  {m.notes && <p><b>Notes:</b> {m.notes}</p>}
                  {progress !== null && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress < 50 ? '#00bfff' : progress < 90 ? '#4caf50' : '#ff5722', transition: 'width 0.5s' }} />
                      </div>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#666' }}>{progress.toFixed(1)}% Completed</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p>No medications listed.</p>}
      </div>

      {/* Reports */}
      <Accordion sx={{ mb: 4, borderRadius: 2, boxShadow: 1 }} defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <Box display="flex" alignItems="center" width="100%">
            <Typography variant="h6">🧾 Patient Reports</Typography>
            <Chip
              label={reports.length}
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          {reports.length > 0 ? (
            <List disablePadding>
              {reports.map((r, idx) => (
                <ListItem key={idx} divider>
                  <Box display="flex" justifyContent="space-between" width="100%">
                    <Box>
                      <Typography variant="subtitle1">{r.reporttype}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {r.reportcontent}
                      </Typography>
                      {r.image_url && (
                        <Box
                          component="img"
                          src={r.image_url}
                          alt={r.reporttype}
                          sx={{ mt: 1, width: '100%', borderRadius: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(r.reportdate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary">
              No OCR reports available.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Pending Questions */}
      <Accordion 
        defaultExpanded={true} 
        sx={{ mb: 4, borderRadius: 2, boxShadow: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f5f5f5' }}>
          <Box display="flex" alignItems="center" width="100%">
            <Typography variant="h6">Pending Questions</Typography>
            <Chip 
              label={pending_questions.length} 
              size="small" 
              color="secondary" 
              sx={{ ml: 2 }} 
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          {pending_questions.length > 0 ? (
            <List disablePadding>
              {pending_questions.map((q, idx) => (
                <ListItem key={idx} divider>
                  <Box display="flex" justifyContent="space-between" width="100%">
                    <Typography>{q.questiontext}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(q.daterecorded).toLocaleDateString()}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary">No pending questions.</Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Consultation Buttons */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button style={{ padding: '0.5rem 1rem' }} onClick={handleStartConsultation}>Fill Out Today's Data</button>
        <button style={{ padding: '0.5rem 1rem' }}onClick={handleRecordingButtonClick}>{isRecording ? 'Stop Recording' : 'Start Recording'}</button>
        <label style={{ padding: '0.5rem 1rem', backgroundColor: '#2196f3', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
        Upload Report Image
        <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: 'none' }} />
        </label>
        <button 
          style={{ padding: '0.5rem 1rem', backgroundColor: '#9c27b0', color: 'white', borderRadius: '8px' }}
          onClick={() => navigate(`/visit/${id}/add-medication`)}
          >
            Enter Medication Details
          </button>
      
      </div>

      {/* Display the summarized result */}
      {recordingSummary && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '2px dashed #4caf50', borderRadius: '12px', backgroundColor: '#f9fff9' }}>
          <h2>📄 Summarized Visit Notes</h2>
          <p>{recordingSummary}</p>
        </div>
      )}

    {uploadedReportSummary && (
      <div style={{ marginTop: '2rem', padding: '1rem', border: '2px dashed #1976d2', borderRadius: '12px', backgroundColor: '#f0f8ff' }}>
      <h2>🧾 Summarized Report</h2>
      <p><strong>Type:</strong> {uploadedReportType}</p>
      <p><strong>Summary:</strong> {uploadedReportSummary}</p>
      {uploadedReportImageUrl && <img src={uploadedReportImageUrl} alt="Uploaded report" style={{ marginTop: '1rem', maxWidth: '100%' }} />}
      </div>
    )}


      {/* Form (addon) */}
      {/* {formOpen && (
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <h2>📝 Fill Today's Visit Information</h2>
          <input type="text" name="bloodpressure" placeholder="Blood Pressure (ex: 120/80)" value={formData.bloodpressure} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="oxygenlevel" placeholder="Oxygen Level (%)" value={formData.oxygenlevel} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="sugarlevel" placeholder="Blood Sugar (mg/dL)" value={formData.sugarlevel} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="weight" placeholder="Weight (kg)" value={formData.weight} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <input type="number" name="height" placeholder="Height (cm)" value={formData.height} onChange={handleChange} style={{ width: '100%', marginBottom: '1rem' }} />
          <textarea name="doctorrecommendation" placeholder="Doctor's Notes" value={formData.doctorrecommendation} onChange={handleChange} rows="4" style={{ width: '100%', marginBottom: '1rem' }} />
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '8px' }}>
            Submit Visit Record
          </button>
        </form>
      )} */}
      {formOpen && (
        <Card
          component="form"
          onSubmit={handleSubmit}
          elevation={3}
          sx={{ mt: 4, p: 2 }}
        >
          <CardHeader
            avatar={<NoteAddIcon color="primary" />}
            title="Fill Today's Visit Information"
            titleTypographyProps={{ variant: 'h6' }}
          />
          <Divider sx={{ mb: 2 }} />
          <CardContent>
            <Grid container spacing={2}>
              {/* First row */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Blood Pressure (ex: 120/80)"
                  name="bloodpressure"
                  value={formData.bloodpressure}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Oxygen Level (%)"
                  name="oxygenlevel"
                  type="number"
                  value={formData.oxygenlevel}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Blood Sugar (mg/dL)"
                  name="sugarlevel"
                  type="number"
                  value={formData.sugarlevel}
                  onChange={handleChange}
                />
              </Grid>

              {/* Second row */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Height (cm)"
                  name="height"
                  type="number"
                  value={formData.height}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Doctor's Notes"
                  name="doctorrecommendation"
                  value={formData.doctorrecommendation}
                  onChange={handleChange}
                />
              </Grid>

              {/* Submit button */}
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'left', mt: 2 }}>
                  <Button type="submit" variant="contained" size="large">
                    Submit Visit Record
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default AppointmentDetail;
