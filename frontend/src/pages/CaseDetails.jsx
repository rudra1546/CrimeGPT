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
  Calendar
} from 'lucide-react';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [policeStation, setPoliceStation] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [status, setStatus] = useState('active');
  const [victimDetails, setVictimDetails] = useState('');
  const [accusedDetails, setAccusedDetails] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [ipcSections, setIpcSections] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');

  // Evidence module states
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Timeline module states
  const [timelineList, setTimelineList] = useState([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [newEventName, setNewEventName] = useState('Evidence Collected');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [savingTimelineEvent, setSavingTimelineEvent] = useState(false);

  // Case Co-pilot states
  const [activeTab, setActiveTab] = useState('dossier');
  const [copilotMessages, setCopilotMessages] = useState([
    { role: 'model', content: 'Authorized Session. CrimeGPT Case co-pilot active. I have loaded Case FIR details, evidence indexes, generated drafts list, and timeline milestones. Ask me any questions, or request to prepare interview questions for victims/witnesses.' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [queryingCopilot, setQueryingCopilot] = useState(false);

  const fetchCaseDetails = async () => {
    try {
      const response = await api.get(`/cases/${id}`);
      setCaseData(response.data);
      
      // Seed form values
      setPoliceStation(response.data.police_station);
      setCrimeType(response.data.crime_type);
      setStatus(response.data.status);
      setEvidenceList(response.data.evidence || []);
      setTimelineList(response.data.timeline || []);
      
      if (response.data.details) {
        setVictimDetails(response.data.details.victim_details || '');
        setAccusedDetails(response.data.details.accused_details || '');
        setIncidentDescription(response.data.details.incident_description || '');
        setIpcSections(response.data.details.ipc_sections || '');
        setEvidenceDetails(response.data.details.evidence_details || '');
      }
    } catch (err) {
      console.error(err);
      setError('Investigation file could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

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
      alert(err._parsedMessage || "Evidence upload clearance verification failed.");
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
    if (!window.confirm("CONFIRMATION REQUIRED:\nAre you sure you want to permanently delete this evidence file?")) {
      return;
    }
    try {
      await api.delete(`/cases/${id}/evidence/${evidenceId}`);
      setEvidenceList((prev) => prev.filter((ev) => ev.id !== evidenceId));
    } catch (err) {
      console.error("Evidence deletion failed:", err);
      alert("Failed purging evidence file.");
    }
  };

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
        content: "Error: Could not resolve query with CrimeGPT co-pilot. Connection failed." 
      }]);
    } finally {
      setQueryingCopilot(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        police_station: policeStation,
        crime_type: crimeType,
        status: status,
        details: {
          victim_details: victimDetails,
          accused_details: accusedDetails,
          incident_description: incidentDescription,
          ipc_sections: ipcSections,
          evidence_details: evidenceDetails
        }
      };
      await api.put(`/cases/${id}`, payload);
      setIsEditing(false);
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      setError('Could not update case registry details.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('WARNING: Permanent Case Purge!\nAre you sure you want to delete this case and all associated generated files?')) {
      return;
    }
    try {
      await api.delete(`/cases/${id}`);
      navigate('/cases');
    } catch (err) {
      console.error(err);
      alert('Delete action failed. Check admin clearance permissions.');
    }
  };

  const handleDownload = async (docId, type) => {
    try {
      const response = await api.get(`/documents/${docId}/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${docId}_${caseData.fir_number}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('File export failed. The document template may be corrupted.');
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
    <div className="p-8 space-y-8 w-full max-w-6xl mx-auto">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-police-border pb-6 gap-4">
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
            <p className="text-sm text-slate-400 mt-1">FIR Registry Dossier - Incident Category: {caseData.crime_type}</p>
          </div>
        </div>

        {/* Header Action Items */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-police-card border border-police-border hover:border-police-accent/50 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                <span>Cancel Edits</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Modify Details</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDelete}
            className="bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/35 hover:border-rose-700/50 text-rose-400 hover:text-rose-300 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge File</span>
          </button>
        </div>
      </div>

      {isEditing ? (
        /* Edit Form mode */
        <form onSubmit={handleUpdate} className="space-y-6 bg-police-card border border-police-border p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold text-slate-100 tracking-wide border-b border-police-border/40 pb-3">Update File Records</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assigned Station</label>
              <input
                type="text"
                required
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Crime Category</label>
              <input
                type="text"
                required
                value={crimeType}
                onChange={(e) => setCrimeType(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none"
              >
                <option value="active">Active Investigation</option>
                <option value="closed">Closed / Resolved</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Victim Details</label>
              <textarea
                rows={3}
                value={victimDetails}
                onChange={(e) => setVictimDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Accused Details</label>
              <textarea
                rows={3}
                value={accusedDetails}
                onChange={(e) => setAccusedDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">IPC / BNS Sections</label>
              <input
                type="text"
                value={ipcSections}
                onChange={(e) => setIpcSections(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Incident Narrative Description</label>
              <textarea
                rows={5}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Evidence detail log</label>
              <textarea
                rows={3}
                value={evidenceDetails}
                onChange={(e) => setEvidenceDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2 rounded-xl text-sm outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-police-border/40 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-police-dark border border-police-border text-slate-350 px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="bg-police-accent text-police-dark px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-police-accent/10"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      ) : (
        /* Details View mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Case file details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs Selector Navigation */}
            <div className="flex border-b border-police-border">
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={`px-6 py-3 text-xs font-extrabold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'dossier' 
                    ? 'border-police-accent text-police-glow bg-police-border/10' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Case Dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('copilot')}
                className={`px-6 py-3 text-xs font-extrabold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'copilot' 
                    ? 'border-police-accent text-police-glow bg-police-border/10' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>CrimeGPT Co-Pilot</span>
                <span className="bg-police-accent/10 border border-police-accent/30 text-police-glow px-1.5 py-0.5 rounded text-[9px] uppercase">
                  AI
                </span>
              </button>
            </div>

            {activeTab === 'dossier' ? (
              <div className="space-y-8">
                {/* Metadata Summary */}
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3">FIR Filing Details</h3>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Station Location</span>
                      <span className="text-slate-200 font-semibold mt-1 block">{caseData.police_station}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Date & Time of occurrence</span>
                      <span className="text-slate-200 font-semibold mt-1 block">
                        {new Date(caseData.incident_date).toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-police-border/20 pt-4">
                      <span className="text-xs text-slate-500 font-medium block">Applicable penal codes</span>
                      <span className="text-police-glow font-bold mt-1 block">
                        {caseData.details?.ipc_sections || '[MISSING: Legal sections]'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Narrative description */}
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3">Detailed Incident Narrative</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {caseData.details?.incident_description || 'No description filed.'}
                  </p>
                </div>

                {/* Evidence items details */}
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3">Evidence logs</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {caseData.details?.evidence_details || 'No evidence logged.'}
                  </p>
                </div>

                {/* Investigation Timeline */}
                <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Investigation Timeline</h3>
                    <button
                      type="button"
                      onClick={() => setShowTimelineModal(true)}
                      className="bg-police-border hover:bg-police-border/80 border border-police-border/80 text-police-accent hover:text-police-glow px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Event</span>
                    </button>
                  </div>

                  {timelineList.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-police-border">
                      {timelineList.map((event) => (
                        <div key={event.id} className="relative animate-fadeIn">
                          <span className="absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-police-border bg-police-dark flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-police-accent"></span>
                          </span>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide px-2 py-0.5 rounded bg-police-dark border border-police-border text-police-glow">
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
              </div>
            ) : (
              /* CrimeGPT Case-Contextual Assistant Chat */
              <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl flex flex-col h-[580px] space-y-4">
                <div className="border-b border-police-border/40 pb-3">
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

          {/* Sidebar file metadata details */}
          <div className="space-y-8">
            {/* Involved Parties info */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3">Parties Details</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Victim Details</span>
                  <p className="text-slate-200 font-semibold bg-police-dark/50 border border-police-border/30 p-3 rounded-xl mt-1.5 leading-relaxed">
                    {caseData.details?.victim_details || '[MISSING: Victim information]'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Accused / Suspect details</span>
                  <p className="text-slate-200 font-semibold bg-police-dark/50 border border-police-border/30 p-3 rounded-xl mt-1.5 leading-relaxed">
                    {caseData.details?.accused_details || '[MISSING: Accused information]'}
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Documents panel */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Case Documents</h3>
                <Link 
                  to="/documents/generate"
                  state={{ preSelectedCaseId: caseData.id }}
                  className="text-xs bg-police-border hover:bg-police-border/80 border border-police-border/80 text-police-accent hover:text-police-glow px-2.5 py-1 rounded-lg font-semibold"
                >
                  Draft Document
                </Link>
              </div>

              {caseData.documents && caseData.documents.length > 0 ? (
                <div className="space-y-3">
                  {caseData.documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="bg-police-dark border border-police-border p-3.5 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-200 capitalize truncate block">
                          {doc.document_type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          {new Date(doc.created_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Document downloads */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleDownload(doc.id, 'pdf')}
                          className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-accent p-1.5 rounded-lg transition-all"
                          title="Download PDF format"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.id, 'docx')}
                          className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-glow p-1.5 rounded-lg transition-all"
                          title="Download Word format"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 leading-relaxed">
                  No draft documents generated for this case record.
                </div>
              )}
            </div>

            {/* Evidence Files Locker panel */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-police-border/40 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Evidence Locker</h3>
              </div>

              {/* Upload evidence form */}
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
                  className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all disabled:opacity-50"
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
                          <div className="w-9 h-9 rounded bg-police-card border border-police-border flex items-center justify-center flex-shrink-0 text-police-accent">
                            <FileIcon className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-200 truncate block" title={ev.file_name}>
                              {ev.file_name}
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              {new Date(ev.uploaded_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* File actions */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadEvidence(ev.id, ev.file_name)}
                            className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-police-accent p-1.5 rounded-lg transition-all"
                            title="Download secure evidence file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvidence(ev.id)}
                            className="bg-police-card hover:bg-police-border border border-police-border text-slate-350 hover:text-rose-450 p-1.5 rounded-lg transition-all"
                            title="Purge evidence file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 leading-relaxed">
                  No files locked in evidence registry.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
