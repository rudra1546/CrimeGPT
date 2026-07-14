import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ChevronLeft, 
  Edit2, 
  Trash2, 
  FileText, 
  Download, 
  Lock, 
  Clock, 
  Save, 
  X,
  FileDown,
  AlertTriangle,
  Upload,
  Paperclip,
  Image as ImageIcon,
  RefreshCw,
  Plus,
  Calendar,
  User,
  Users,
  Briefcase,
  AlertCircle,
  Wand2,
  FileSearch2,
  MessageSquare,
  Bookmark
} from 'lucide-react';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Edit states (per section for clean inline experience)
  const [editSection, setEditSection] = useState(null); // 'overview', 'victim', 'accused', 'witnesses', 'evidence'

  // Overview edit fields
  const [policeStation, setPoliceStation] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [status, setStatus] = useState('active');
  const [incidentDate, setIncidentDate] = useState('');
  const [investigatingOfficer, setInvestigatingOfficer] = useState('');
  const [ipcSections, setIpcSections] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  // Victim edit fields
  const [victim, setVictim] = useState({
    name: '', age: '', gender: 'Male', father_mother_name: '', address: '', contact_number: '', occupation: ''
  });

  // Accused edit fields
  const [accused, setAccused] = useState({
    name: '', age: '', gender: 'Male', address: '', known_aliases: '', previous_record: ''
  });

  // Witnesses list (multiple)
  const [witnesses, setWitnesses] = useState([]);

  // Evidence Items list (multiple)
  const [evidenceItems, setEvidenceItems] = useState([]);

  // Upload Evidence File states
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Timeline lists & custom event
  const [timelineList, setTimelineList] = useState([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [newEventName, setNewEventName] = useState('Evidence Collected');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [savingTimelineEvent, setSavingTimelineEvent] = useState(false);

  // AI Case Analysis states
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Documents workbench states
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [generatingDoc, setGeneratingDoc] = useState(false);

  // Case Co-pilot states
  const [copilotMessages, setCopilotMessages] = useState([
    { role: 'model', content: 'Authorized Session. CrimeGPT Case co-pilot active. I have loaded Case FIR details, evidence indexes, generated drafts list, and timeline milestones. Ask me any questions, or request to prepare interview questions for victims/witnesses.' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [queryingCopilot, setQueryingCopilot] = useState(false);

  // Parse safety utilities
  const parseJsonField = (val, defaultValue, fallbackField) => {
    if (!val) return defaultValue;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      if (fallbackField) {
        return { ...defaultValue, [fallbackField]: val };
      }
      return defaultValue;
    }
  };

  const fetchCaseDetails = async () => {
    try {
      const response = await api.get(`/cases/${id}`);
      setCaseData(response.data);
      
      // Seed general metadata
      setPoliceStation(response.data.police_station);
      setCrimeType(response.data.crime_type);
      setStatus(response.data.status);
      setIncidentDate(response.data.incident_date ? response.data.incident_date.substring(0, 16) : '');
      setEvidenceList(response.data.evidence || []);
      setTimelineList(response.data.timeline || []);
      
      const details = response.data.details;
      if (details) {
        setInvestigatingOfficer(details.investigating_officer || '');
        setIpcSections(details.ipc_sections || '');
        setIncidentDescription(details.incident_description || '');

        // Safely parse Victim Details
        setVictim(parseJsonField(details.victim_details, {
          name: '', age: '', gender: 'Male', father_mother_name: '', address: '', contact_number: '', occupation: ''
        }, 'name'));

        // Safely parse Accused Details
        setAccused(parseJsonField(details.accused_details, {
          name: '', age: '', gender: 'Male', address: '', known_aliases: '', previous_record: ''
        }, 'name'));

        // Safely parse Witnesses list
        const parsedWitnesses = parseJsonField(details.witnesses, []);
        setWitnesses(Array.isArray(parsedWitnesses) ? parsedWitnesses : []);

        // Safely parse Evidence items list
        const parsedEvidenceItems = parseJsonField(details.evidence_details, []);
        setEvidenceItems(Array.isArray(parsedEvidenceItems) ? parsedEvidenceItems : []);
      }
    } catch (err) {
      console.error(err);
      setError('Investigation file could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    setLoadingAnalysis(true);
    setAnalysisError('');
    try {
      const response = await api.get(`/cases/${id}/analysis`);
      setAnalysisData(response.data);
    } catch (err) {
      console.error("Analysis failed:", err);
      setAnalysisError("AI Case Analysis failed to load. Ensure Gemini API key is configured.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setEditSection(null);
    if (tabName === 'analysis') {
      fetchAnalysis();
    }
  };

  // Structured saving method
  const handleSaveDetails = async (section) => {
    setLoading(true);
    try {
      const detailsPayload = {};
      
      if (section === 'overview') {
        detailsPayload.incident_description = incidentDescription;
        detailsPayload.ipc_sections = ipcSections;
        detailsPayload.investigating_officer = investigatingOfficer;
      } else if (section === 'victim') {
        detailsPayload.victim_details = victim;
      } else if (section === 'accused') {
        detailsPayload.accused_details = accused;
      } else if (section === 'witnesses') {
        detailsPayload.witnesses = witnesses;
      } else if (section === 'evidence') {
        detailsPayload.evidence_details = evidenceItems;
      }

      const payload = {
        police_station: policeStation,
        crime_type: crimeType,
        status: status,
        incident_date: incidentDate ? new Date(incidentDate).toISOString() : caseData.incident_date,
        details: detailsPayload
      };

      await api.put(`/cases/${id}`, payload);
      setEditSection(null);
      await fetchCaseDetails();
      if (activeTab === 'analysis') {
        fetchAnalysis();
      }
    } catch (err) {
      console.error(err);
      alert('Could not update case registry details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('WARNING: Permanent Case Purge!\nAre you sure you want to delete this case and all associated files?')) {
      return;
    }
    try {
      await api.delete(`/cases/${id}`);
      navigate('/cases');
    } catch (err) {
      console.error(err);
      alert('Delete action failed. Check permissions.');
    }
  };

  // Evidence Files
  const handleEvidenceUpload = async (e) => {
    e.preventDefault();
    if (!evidenceFile) return;

    setUploadingEvidence(true);
    const formData = new FormData();
    formData.append('file', evidenceFile);

    try {
      const response = await api.post(`/cases/${id}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setEvidenceList((prev) => [...prev, response.data]);
      setEvidenceFile(null);
      document.getElementById('evidence-input').value = '';
    } catch (err) {
      console.error("Evidence file upload failed:", err);
      alert(err._parsedMessage || "Evidence upload failed.");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDownloadEvidence = async (evidenceId, fileName) => {
    try {
      const response = await api.get(`/cases/${id}/evidence/${evidenceId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Evidence download failed:", err);
      alert("Failed downloading secure file bytes.");
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }
    try {
      await api.delete(`/cases/${id}/evidence/${evidenceId}`);
      setEvidenceList((prev) => prev.filter((ev) => ev.id !== evidenceId));
    } catch (err) {
      console.error("Evidence deletion failed:", err);
      alert("Failed deleting file.");
    }
  };

  // Timeline
  const handleTimelineSubmit = async (e) => {
    e.preventDefault();
    if (!newEventDesc.trim()) return;

    setSavingTimelineEvent(true);
    try {
      const response = await api.post(`/cases/${id}/timeline`, {
        event_name: newEventName,
        description: newEventDesc,
      });
      setTimelineList((prev) => [...prev, response.data]);
      setNewEventDesc('');
      setShowTimelineModal(false);
    } catch (err) {
      console.error("Timeline submission failed:", err);
      alert("Failed submitting timeline checkpoint event.");
    } finally {
      setSavingTimelineEvent(false);
    }
  };

  // Documents Generation
  const handleGenerateDoc = async (type) => {
    setGeneratingDoc(true);
    try {
      const response = await api.post('/documents/generate', {
        case_id: parseInt(id),
        document_type: type
      });
      await fetchCaseDetails();
      setSelectedDoc(response.data);
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || 'Document generation failed.');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleRegenerateDoc = async (docId) => {
    setGeneratingDoc(true);
    try {
      const response = await api.post(`/documents/${docId}/regenerate`);
      await fetchCaseDetails();
      setSelectedDoc(response.data);
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || 'Document regeneration failed.');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleDownloadDoc = async (docId, format) => {
    try {
      const response = await api.get(`/documents/${docId}/${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${docId}_${caseData.fir_number}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('File export failed.');
    }
  };

  // Co-Pilot Chat
  const handleCopilotSubmit = async (e) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userQuery = copilotInput;
    setCopilotInput('');
    
    const newMsgList = [...copilotMessages, { role: 'user', content: userQuery }];
    setCopilotMessages(newMsgList);
    setQueryingCopilot(true);

    try {
      const response = await api.post(`/legal/query/case`, {
        case_id: parseInt(id),
        query: userQuery,
        history: newMsgList.slice(1, -1)
      });
      setCopilotMessages(prev => [...prev, { role: 'model', content: response.data.response }]);
    } catch (err) {
      console.error("Copilot query failed:", err);
      setCopilotMessages(prev => [...prev, { 
        role: 'model', 
        content: "Error: Could not resolve query. Connection failed." 
      }]);
    } finally {
      setQueryingCopilot(false);
    }
  };

  if (loading && !caseData) {
    return <div className="p-8 text-center text-slate-500 text-sm">Opening secure case registry...</div>;
  }

  if (error && !caseData) {
    return (
      <div className="p-8 space-y-4 max-w-lg mx-auto text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
        <p className="text-sm text-slate-400">{error}</p>
        <Link to="/cases" className="text-xs text-police-accent underline block">Return to Directory</Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 w-full max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-police-border pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/cases" 
            className="p-2 hover:bg-police-card rounded-lg text-slate-400 hover:text-slate-200 border border-transparent hover:border-police-border transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">{caseData.fir_number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                caseData.status.toLowerCase() === 'active' 
                  ? 'bg-amber-950/40 border border-amber-900/50 text-amber-400' 
                  : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
              }`}>
                {caseData.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Police Station: {caseData.police_station} • Crime Type: {caseData.crime_type}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/35 hover:border-rose-700/50 text-rose-400 hover:text-rose-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Case File</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex flex-wrap border-b border-police-border/60 gap-1">
        {['overview', 'victim', 'accused', 'witnesses', 'evidence', 'timeline', 'analysis', 'documents', 'copilot'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={`px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab 
                ? 'border-police-accent text-police-glow bg-police-border/10' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            {tab === 'copilot' ? 'AI Co-Pilot' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      <div className="space-y-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-police-accent" />
                <span>General Case Information</span>
              </h3>
              {editSection !== 'overview' ? (
                <button
                  type="button"
                  onClick={() => setEditSection('overview')}
                  className="bg-police-border text-police-accent hover:text-police-glow border border-police-border hover:border-police-accent/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modify Details</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSection(null)}
                    className="px-3 py-1.5 border border-police-border text-slate-400 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDetails('overview')}
                    className="bg-police-accent text-police-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>

            {editSection !== 'overview' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Police Station</span>
                  <span className="text-slate-200 font-semibold mt-1 block">{policeStation}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Crime Category</span>
                  <span className="text-slate-200 font-semibold mt-1 block">{crimeType}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Date & Time of occurrence</span>
                  <span className="text-slate-200 font-semibold mt-1 block">
                    {new Date(incidentDate).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Investigating Officer</span>
                  <span className="text-slate-200 font-semibold mt-1 block">{investigatingOfficer || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Investigation Status</span>
                  <span className="text-slate-200 font-semibold mt-1 block capitalize">{status}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Applicable Sections (IPC/BNS)</span>
                  <span className="text-police-glow font-bold mt-1 block">{ipcSections || '[Information Required]'}</span>
                </div>
                <div className="md:col-span-2 border-t border-police-border/20 pt-4">
                  <span className="text-xs text-slate-500 font-medium block">Complete Incident Narrative</span>
                  <p className="text-slate-350 mt-2 block whitespace-pre-wrap leading-relaxed bg-police-dark/30 p-4 rounded-xl border border-police-border/30">
                    {incidentDescription || 'No narrative description filed.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Police Station</label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Crime Category</label>
                  <input
                    type="text"
                    value={crimeType}
                    onChange={(e) => setCrimeType(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Incident Date & Time</label>
                  <input
                    type="datetime-local"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Investigating Officer</label>
                  <input
                    type="text"
                    value={investigatingOfficer}
                    onChange={(e) => setInvestigatingOfficer(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Investigation Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  >
                    <option value="active">Active (Ongoing Investigation)</option>
                    <option value="closed">Closed (Resolved/Disposed)</option>
                    <option value="pending">Pending (Awaiting Action)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Applicable Sections (IPC/BNS)</label>
                  <input
                    type="text"
                    value={ipcSections}
                    onChange={(e) => setIpcSections(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Incident Narrative Description</label>
                  <textarea
                    rows={6}
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* VICTIM TAB */}
        {activeTab === 'victim' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-police-accent" />
                <span>Victim Information</span>
              </h3>
              {editSection !== 'victim' ? (
                <button
                  type="button"
                  onClick={() => setEditSection('victim')}
                  className="bg-police-border text-police-accent hover:text-police-glow border border-police-border hover:border-police-accent/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modify Info</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSection(null)}
                    className="px-3 py-1.5 border border-police-border text-slate-400 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDetails('victim')}
                    className="bg-police-accent text-police-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>

            {editSection !== 'victim' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Full Name</span>
                  <span className="text-slate-250 font-bold mt-1 block">{victim.name || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Age</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{victim.age || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Gender</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{victim.gender || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Father's/Mother's Name</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{victim.father_mother_name || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Contact Number</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{victim.contact_number || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Occupation</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{victim.occupation || '[Information Required]'}</span>
                </div>
                <div className="md:col-span-3 border-t border-police-border/20 pt-4">
                  <span className="text-xs text-slate-500 font-medium block">Residential Address</span>
                  <span className="text-slate-300 font-semibold mt-1.5 block bg-police-dark/20 p-3 rounded-lg border border-police-border/20">{victim.address || '[Information Required]'}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Name</label>
                  <input
                    type="text"
                    value={victim.name || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Age</label>
                  <input
                    type="text"
                    value={victim.age || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Gender</label>
                  <select
                    value={victim.gender || 'Male'}
                    onChange={(e) => setVictim(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Father's/Mother's Name</label>
                  <input
                    type="text"
                    value={victim.father_mother_name || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, father_mother_name: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Contact Number</label>
                  <input
                    type="text"
                    value={victim.contact_number || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, contact_number: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Occupation</label>
                  <input
                    type="text"
                    value={victim.occupation || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-400 block">Address</label>
                  <input
                    type="text"
                    value={victim.address || ''}
                    onChange={(e) => setVictim(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACCUSED TAB */}
        {activeTab === 'accused' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-police-accent" />
                <span>Accused Information</span>
              </h3>
              {editSection !== 'accused' ? (
                <button
                  type="button"
                  onClick={() => setEditSection('accused')}
                  className="bg-police-border text-police-accent hover:text-police-glow border border-police-border hover:border-police-accent/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modify Info</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSection(null)}
                    className="px-3 py-1.5 border border-police-border text-slate-400 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDetails('accused')}
                    className="bg-police-accent text-police-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>

            {editSection !== 'accused' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Full Name</span>
                  <span className="text-slate-250 font-bold mt-1 block">{accused.name || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Age</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{accused.age || '[Information Required]'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Gender</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{accused.gender || '[Information Required]'}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-slate-500 font-medium block">Known Aliases</span>
                  <span className="text-slate-250 font-semibold mt-1 block">{accused.known_aliases || '[Information Required]'}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-slate-500 font-medium block">Last Known Address</span>
                  <span className="text-slate-300 font-semibold mt-1.5 block bg-police-dark/20 p-3 rounded-lg border border-police-border/20">{accused.address || '[Information Required]'}</span>
                </div>
                <div className="md:col-span-3 border-t border-police-border/20 pt-4">
                  <span className="text-xs text-slate-500 font-medium block">Previous Criminal Record</span>
                  <p className="text-slate-350 mt-2 block whitespace-pre-wrap leading-relaxed bg-police-dark/30 p-4 rounded-xl border border-police-border/30">
                    {accused.previous_record || 'No previous criminal history logged.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Name</label>
                  <input
                    type="text"
                    value={accused.name || ''}
                    onChange={(e) => setAccused(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Age</label>
                  <input
                    type="text"
                    value={accused.age || ''}
                    onChange={(e) => setAccused(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Gender</label>
                  <select
                    value={accused.gender || 'Male'}
                    onChange={(e) => setAccused(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-400 block">Aliases</label>
                  <input
                    type="text"
                    value={accused.known_aliases || ''}
                    onChange={(e) => setAccused(prev => ({ ...prev, known_aliases: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-400 block">Address</label>
                  <input
                    type="text"
                    value={accused.address || ''}
                    onChange={(e) => setAccused(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-400 block">Previous Criminal Record</label>
                  <textarea
                    rows={4}
                    value={accused.previous_record || ''}
                    onChange={(e) => setAccused(prev => ({ ...prev, previous_record: e.target.value }))}
                    className="w-full bg-police-dark border border-police-border text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* WITNESSES TAB */}
        {activeTab === 'witnesses' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-police-accent" />
                <span>Witnesses Registry</span>
              </h3>
              {editSection !== 'witnesses' ? (
                <button
                  type="button"
                  onClick={() => setEditSection('witnesses')}
                  className="bg-police-border text-police-accent hover:text-police-glow border border-police-border hover:border-police-accent/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modify Registry</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSection(null);
                      fetchCaseDetails(); // discard additions
                    }}
                    className="px-3 py-1.5 border border-police-border text-slate-400 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDetails('witnesses')}
                    className="bg-police-accent text-police-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save List</span>
                  </button>
                </div>
              )}
            </div>

            {editSection === 'witnesses' && (
              <button
                type="button"
                onClick={() => setWitnesses([...witnesses, { name: '', contact: '', address: '', statement: '' }])}
                className="bg-police-dark hover:bg-police-border border border-police-border text-police-accent px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Witness Record</span>
              </button>
            )}

            {witnesses.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No witnesses registered under this case dossier.</p>
            ) : (
              <div className="space-y-6">
                {witnesses.map((w, idx) => (
                  <div key={idx} className="bg-police-dark/40 border border-police-border/40 p-4.5 rounded-xl relative space-y-4 shadow-md">
                    {editSection === 'witnesses' && (
                      <button
                        type="button"
                        onClick={() => setWitnesses(witnesses.filter((_, i) => i !== idx))}
                        className="absolute top-4.5 right-4.5 text-rose-500 hover:text-rose-450 p-1.5 bg-police-card border border-police-border rounded-lg"
                        title="Remove Witness"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <h4 className="text-xs font-extrabold text-police-glow uppercase tracking-wider">Witness #{idx + 1}</h4>
                    
                    {editSection !== 'witnesses' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">Full Name</span>
                          <span className="text-slate-200 font-bold mt-1 block">{w.name || '[Information Required]'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">Contact Number</span>
                          <span className="text-slate-200 font-semibold mt-1 block">{w.contact || '[Information Required]'}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-[10px] text-slate-500 font-medium block">Address</span>
                          <span className="text-slate-250 font-semibold mt-1 block">{w.address || '[Information Required]'}</span>
                        </div>
                        <div className="md:col-span-2 border-t border-police-border/10 pt-3">
                          <span className="text-[10px] text-slate-500 font-medium block">Recorded Statement</span>
                          <p className="text-slate-350 mt-1.5 leading-relaxed italic bg-police-dark/20 p-3 rounded-lg">
                            "{w.statement || '[Information Required]'}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Name</label>
                          <input
                            type="text"
                            required
                            value={w.name || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx].name = e.target.value;
                              setWitnesses(updated);
                            }}
                            className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Contact</label>
                          <input
                            type="text"
                            value={w.contact || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx].contact = e.target.value;
                              setWitnesses(updated);
                            }}
                            className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 block">Address</label>
                          <input
                            type="text"
                            value={w.address || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx].address = e.target.value;
                              setWitnesses(updated);
                            }}
                            className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 block">Statement</label>
                          <textarea
                            rows={3}
                            value={w.statement || ''}
                            onChange={(e) => {
                              const updated = [...witnesses];
                              updated[idx].statement = e.target.value;
                              setWitnesses(updated);
                            }}
                            className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EVIDENCE TAB */}
        {activeTab === 'evidence' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Structured Evidence Items */}
            <div className="lg:col-span-2 bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-police-accent" />
                  <span>Structured Evidence Checklist</span>
                </h3>
                {editSection !== 'evidence' ? (
                  <button
                    type="button"
                    onClick={() => setEditSection('evidence')}
                    className="bg-police-border text-police-accent hover:text-police-glow border border-police-border hover:border-police-accent/40 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Modify Items</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditSection(null);
                        fetchCaseDetails();
                      }}
                      className="px-3 py-1.5 border border-police-border text-slate-400 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDetails('evidence')}
                      className="bg-police-accent text-police-dark px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Items</span>
                    </button>
                  </div>
                )}
              </div>

              {editSection === 'evidence' && (
                <button
                  type="button"
                  onClick={() => setEvidenceItems([...evidenceItems, { evidence_type: '', description: '', recovered_from: '', recovery_date: '', uploaded_file: '', officer_remarks: '' }])}
                  className="bg-police-dark hover:bg-police-border border border-police-border text-police-accent px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Evidence Item</span>
                </button>
              )}

              {evidenceItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No structured evidence items registered.</p>
              ) : (
                <div className="space-y-6">
                  {evidenceItems.map((ev, idx) => (
                    <div key={idx} className="bg-police-dark/40 border border-police-border/40 p-4.5 rounded-xl relative space-y-4 shadow-md">
                      {editSection === 'evidence' && (
                        <button
                          type="button"
                          onClick={() => setEvidenceItems(evidenceItems.filter((_, i) => i !== idx))}
                          className="absolute top-4.5 right-4.5 text-rose-500 hover:text-rose-450 p-1.5 bg-police-card border border-police-border rounded-lg"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <h4 className="text-xs font-extrabold text-police-glow uppercase tracking-wider">Item #{idx + 1}</h4>

                      {editSection !== 'evidence' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Evidence Type</span>
                            <span className="text-slate-200 font-bold mt-1 block">{ev.evidence_type || '[Information Required]'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Recovered From</span>
                            <span className="text-slate-200 font-semibold mt-1 block">{ev.recovered_from || '[Information Required]'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Recovery Date</span>
                            <span className="text-slate-200 font-semibold mt-1 block">{ev.recovery_date || '[Information Required]'}</span>
                          </div>
                          <div className="md:col-span-3">
                            <span className="text-[10px] text-slate-500 font-medium block">Description</span>
                            <span className="text-slate-250 font-semibold mt-1 block">{ev.description || '[Information Required]'}</span>
                          </div>
                          <div className="md:col-span-3 border-t border-police-border/10 pt-3">
                            <span className="text-[10px] text-slate-500 font-medium block">Officer Remarks</span>
                            <span className="text-slate-350 mt-1 block italic">{ev.officer_remarks || '[Information Required]'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 block">Evidence Type</label>
                            <input
                              type="text"
                              required
                              value={ev.evidence_type || ''}
                              onChange={(e) => {
                                const updated = [...evidenceItems];
                                updated[idx].evidence_type = e.target.value;
                                setEvidenceItems(updated);
                              }}
                              className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 block">Recovered From</label>
                            <input
                              type="text"
                              value={ev.recovered_from || ''}
                              onChange={(e) => {
                                const updated = [...evidenceItems];
                                updated[idx].recovered_from = e.target.value;
                                setEvidenceItems(updated);
                              }}
                              className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 block">Recovery Date</label>
                            <input
                              type="date"
                              value={ev.recovery_date || ''}
                              onChange={(e) => {
                                const updated = [...evidenceItems];
                                updated[idx].recovery_date = e.target.value;
                                setEvidenceItems(updated);
                              }}
                              className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 block">Description</label>
                            <input
                              type="text"
                              value={ev.description || ''}
                              onChange={(e) => {
                                const updated = [...evidenceItems];
                                updated[idx].description = e.target.value;
                                setEvidenceItems(updated);
                              }}
                              className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 block">Officer Remarks</label>
                            <input
                              type="text"
                              value={ev.officer_remarks || ''}
                              onChange={(e) => {
                                const updated = [...evidenceItems];
                                updated[idx].officer_remarks = e.target.value;
                                setEvidenceItems(updated);
                              }}
                              className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Physical Files locker Sidebar */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-police-accent" />
                <span>Evidence Locker (Files)</span>
              </h3>

              <form onSubmit={handleEvidenceUpload} className="flex gap-2">
                <input
                  id="evidence-input"
                  type="file"
                  required
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="evidence-input"
                  className="flex-1 bg-police-dark border border-police-border hover:border-police-accent/50 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer truncate transition-all"
                >
                  <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{evidenceFile ? evidenceFile.name : 'Attach File'}</span>
                </label>
                <button
                  type="submit"
                  disabled={uploadingEvidence || !evidenceFile}
                  className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {uploadingEvidence ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Upload</span>
                </button>
              </form>

              {evidenceList.length > 0 ? (
                <div className="space-y-3">
                  {evidenceList.map((ev) => {
                    const isImage = ev.file_type.startsWith('image/');
                    const FileIcon = isImage ? ImageIcon : FileText;
                    return (
                      <div
                        key={ev.id}
                        className="bg-police-dark border border-police-border p-3.5 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-police-card border border-police-border flex items-center justify-center flex-shrink-0 text-police-accent">
                            <FileIcon className="w-4.5 h-4.5" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-255 truncate block" title={ev.file_name}>
                              {ev.file_name}
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              {new Date(ev.uploaded_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadEvidence(ev.id, ev.file_name)}
                            className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-accent p-1.5 rounded-lg transition-all"
                            title="Download file"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvidence(ev.id)}
                            className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-rose-450 p-1.5 rounded-lg transition-all"
                            title="Purge file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No files locked in evidence locker.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-police-accent" />
                <span>Investigation Timeline logs</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTimelineModal(true)}
                className="bg-police-border hover:bg-police-border/80 border border-police-border/80 text-police-accent hover:text-police-glow px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Custom Event</span>
              </button>
            </div>

            {timelineList.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-police-border/80">
                {timelineList.map((event) => (
                  <div key={event.id} className="relative animate-fadeIn">
                    <span className="absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-police-border bg-police-dark flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-police-accent"></span>
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-200 font-mono tracking-wide px-2 py-0.5 rounded bg-police-dark border border-police-border text-police-glow uppercase">
                          {event.event_name}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 pl-1 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 leading-relaxed">
                No checkpoints registered in investigation timeline.
              </div>
            )}
          </div>
        )}

        {/* AI CASE ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <FileSearch2 className="w-4 h-4 text-police-accent" />
                <span>CrimeGPT Case Analysis</span>
              </h3>
              <button
                type="button"
                onClick={fetchAnalysis}
                disabled={loadingAnalysis}
                className="bg-police-border hover:bg-police-border/80 border border-police-border/80 text-police-accent hover:text-police-glow px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                <span>Run Case Audit</span>
              </button>
            </div>

            {loadingAnalysis ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-4 border-police-border border-t-police-accent rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-wider animate-pulse">Running investigative AI diagnostics...</span>
              </div>
            ) : analysisError ? (
              <div className="bg-rose-950/20 border border-rose-900/40 text-rose-350 p-4 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
            ) : analysisData ? (
              <div className="space-y-6">
                
                {/* Warnings Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Case Dossier Gaps</h4>
                  {analysisData.recommendations && analysisData.recommendations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisData.recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-amber-950/15 border border-amber-900/45 text-amber-350 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                          <span className="font-semibold">{rec}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-350 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>No major gaps detected. Dossier is structurally complete.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Suggested Sections */}
                  <div className="bg-police-dark/30 border border-police-border/50 p-5 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-4 h-4 text-police-accent" />
                      <span>Suggested Legal Provisions (IPC / BNS)</span>
                    </h4>
                    <p className="text-xs text-slate-200 bg-police-dark/40 border border-police-border/30 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                      {analysisData.suggested_sections}
                    </p>
                  </div>

                  {/* Suggested Steps */}
                  <div className="bg-police-dark/30 border border-police-border/50 p-5 rounded-xl space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-police-accent" />
                      <span>Suggested Next Investigative Actions</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysisData.suggested_steps && analysisData.suggested_steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-police-accent mt-1.5 flex-shrink-0"></span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detailed Narrative Audit Report */}
                <div className="border-t border-police-border/30 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Detailed Investigative RAG Audit Report</h4>
                  <div className="bg-police-dark/50 border border-police-border p-4.5 rounded-xl text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                    {analysisData.detailed_analysis}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">Click "Run Case Audit" to perform AI auditing on this investigation record.</p>
            )}
          </div>
        )}

        {/* GENERATED DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Generate Workbench Actions */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4 h-fit">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-police-accent" />
                <span>AI Documents Engine</span>
              </h3>
              
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => handleGenerateDoc('seizure_memo')}
                  disabled={generatingDoc}
                  className="bg-police-dark hover:bg-police-border border border-police-border hover:border-police-accent/40 text-slate-200 font-bold py-3.5 px-4.5 rounded-xl text-xs flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Generate Seizure Memo</span>
                  <Wand2 className="w-4 h-4 text-police-accent animate-pulse" />
                </button>

                <button
                  onClick={() => handleGenerateDoc('remand_application')}
                  disabled={generatingDoc}
                  className="bg-police-dark hover:bg-police-border border border-police-border hover:border-police-accent/40 text-slate-200 font-bold py-3.5 px-4.5 rounded-xl text-xs flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Generate Remand Application</span>
                  <Wand2 className="w-4 h-4 text-police-accent animate-pulse" />
                </button>

                <button
                  onClick={() => handleGenerateDoc('charge_sheet')}
                  disabled={generatingDoc}
                  className="bg-police-dark hover:bg-police-border border border-police-border hover:border-police-accent/40 text-slate-200 font-bold py-3.5 px-4.5 rounded-xl text-xs flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Generate Charge Sheet</span>
                  <Wand2 className="w-4 h-4 text-police-accent animate-pulse" />
                </button>

                <button
                  onClick={() => handleGenerateDoc('case_summary')}
                  disabled={generatingDoc}
                  className="bg-police-dark hover:bg-police-border border border-police-border hover:border-police-accent/40 text-slate-200 font-bold py-3.5 px-4.5 rounded-xl text-xs flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Generate Case Summary</span>
                  <Wand2 className="w-4 h-4 text-police-accent animate-pulse" />
                </button>
              </div>

              {generatingDoc && (
                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Legal Text...</span>
                </div>
              )}
            </div>

            {/* Document Viewer & History workbench */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Split Viewer */}
              {selectedDoc ? (
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 capitalize tracking-wide flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-police-accent" />
                        <span>Selected draft: {selectedDoc.document_type.replace('_', ' ')}</span>
                      </h4>
                      <span className="text-[9px] text-slate-550 mt-0.5 block">Generated: {new Date(selectedDoc.created_date).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRegenerateDoc(selectedDoc.id)}
                        disabled={generatingDoc}
                        className="bg-police-border hover:bg-police-border/70 border border-police-border text-police-glow hover:text-police-accent px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                        title="Draft updated version"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(selectedDoc.id, 'pdf')}
                        className="bg-police-card hover:bg-police-border border border-police-border text-slate-300 hover:text-police-accent p-1.5 rounded-lg transition-all"
                        title="Export PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(selectedDoc.id, 'docx')}
                        className="bg-police-card hover:bg-police-border border border-police-border text-slate-300 hover:text-police-glow p-1.5 rounded-lg transition-all"
                        title="Export Word"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedDoc(null)}
                        className="text-slate-400 hover:text-slate-200 p-1 hover:bg-police-dark rounded-lg ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Document Contents */}
                  <div className="bg-police-dark border border-police-border/80 p-5 rounded-xl h-[450px] overflow-y-auto font-mono text-xs text-slate-250 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                    {selectedDoc.generated_content}
                  </div>
                </div>
              ) : (
                /* History list view */
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-police-accent" />
                    <span>Generated Document Records</span>
                  </h3>

                  {caseData.documents && caseData.documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {caseData.documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="bg-police-dark border border-police-border/60 hover:border-police-accent/40 p-4.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-police-dark/30 transition-all shadow-md"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-200 capitalize truncate block">
                              {doc.document_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                              ID #{doc.id} • {new Date(doc.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownloadDoc(doc.id, 'pdf')}
                              className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-accent p-1.5 rounded-lg transition-all"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadDoc(doc.id, 'docx')}
                              className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-glow p-1.5 rounded-lg transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 leading-relaxed bg-police-dark/10 border border-dashed border-police-border rounded-xl">
                      No documents generated for this case record. Use the panel on the left to synthesize seizure records, remand applications, or final summaries.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI CO-PILOT TAB */}
        {activeTab === 'copilot' && (
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl flex flex-col h-[580px] space-y-4">
            <div className="border-b border-police-border/40 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-police-accent" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Case Assistant Conversation Log</h4>
            </div>

            {/* Messages log */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-thin select-text">
              {copilotMessages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold ${
                      isUser 
                        ? 'bg-police-accent text-police-dark' 
                        : 'bg-police-dark border border-police-border text-police-accent'
                    }`}>
                      {isUser ? 'PS' : 'AI'}
                    </div>
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser 
                        ? 'bg-police-accent/15 border border-police-accent/30 text-slate-200' 
                        : 'bg-police-dark/50 border border-police-border/60 text-slate-300'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {queryingCopilot && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center text-slate-500 text-[10px]">
                  <div className="w-7 h-7 rounded-lg bg-police-dark border border-police-border text-police-accent flex items-center justify-center flex-shrink-0 animate-pulse">
                    AI
                  </div>
                  <span className="font-semibold tracking-wide animate-pulse">Consulting legal guidelines database...</span>
                </div>
              )}
            </div>

            {/* Chat input block */}
            <form onSubmit={handleCopilotSubmit} className="flex gap-2 pt-3 border-t border-police-border/40">
              <input
                type="text"
                required
                disabled={queryingCopilot}
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Prepare questions for witness, analyze evidence, BNS guidelines..."
                className="flex-1 bg-police-dark border border-police-border text-slate-200 px-4 py-2.5 rounded-xl text-xs outline-none focus:border-police-accent/60 transition-all placeholder:text-slate-550"
              />
              <button
                type="submit"
                disabled={queryingCopilot || !copilotInput.trim()}
                className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

      </div>

      {/* LOG TIMELINE EVENT MODAL */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-police-card border border-police-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center border-b border-police-border pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Log Case Timeline Event</h3>
              <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTimelineSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold block">Event Type</label>
                <select
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full bg-police-dark border border-police-border text-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-police-accent/60 transition-all font-bold"
                >
                  <option value="Evidence Collected">Evidence Collected</option>
                  <option value="Witness Statement Added">Witness Statement Added</option>
                  <option value="Accused Arrested">Accused Arrested</option>
                  <option value="Remand Requested">Remand Requested</option>
                  <option value="Charge Sheet Filed">Charge Sheet Filed</option>
                  <option value="Case Status Updated">Case Status Updated</option>
                  <option value="Other Investigation Activity">Other Investigation Activity</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold block">Details / Description</label>
                <textarea
                  required
                  rows="3"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Describe the investigation activity or finding..."
                  className="w-full bg-police-dark border border-police-border text-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-police-accent/60 transition-all leading-relaxed"
                ></textarea>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(false)}
                  className="px-4 py-2 border border-police-border hover:bg-police-border/40 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTimelineEvent}
                  className="px-4 py-2 bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {savingTimelineEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Submit Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetails;
