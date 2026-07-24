import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { addMutation } from '../services/IndexedDBStore';
import DocumentPreview from '../components/DocumentPreview';
import LegalSectionSelector from '../components/LegalSectionSelector';
import { EVIDENCE_CATEGORIES } from '../data/evidenceCategories';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  FileCheck,
  History,
  Briefcase,
  Users,
  User,
  Paperclip,
  Clock,
  BookOpen,
  CheckSquare,
  Download,
  Search,
  Lock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tabs & Grouped Navigation
  const [activeTab, setActiveTab] = useState('fir');
  const [activeGroup, setActiveGroup] = useState('fir'); // 'fir', 'investigation', 'documents', 'assistant', 'close'
  const [activeSubTab, setActiveSubTab] = useState('fir_details');

  // Investigation Record State
  const [investigationData, setInvestigationData] = useState({
    hospital_name: '',
    hospital_address: '',
    doctor_name: '',
    examination_date: '',
    medical_report_reference: '',
    injury_observations: '',
    treatment_details: '',
    subject_type: 'Accused Person',
    escort_officer_name: '',
    escort_officer_rank: '',

    court_name: '',
    court_address: '',
    judge_details: '',
    remand_type: 'Police Remand Custody',
    remand_duration_days: 7,
    remand_start_date: '',
    remand_end_date: '',
    custody_location: '',
    court_order_details: '',

    panchanama_date_time: '',
    panchanama_location: '',
    identification_marks: '',
    personal_belongings: '',
    panchanama_narrative: '',

    tip_date_time: '',
    tip_location: '',
    dummy_participants: '',
    procedure_description: '',
    identification_result: ''
  });
  const [savingInvestigation, setSavingInvestigation] = useState(false);

  // Close Case checklist NA toggles
  const [checklistNA, setChecklistNA] = useState({
    medical: false,
    court: false,
    panchanama: false,
    tip: false
  });
  const [closingCase, setClosingCase] = useState(false);

  // Base details editing
  const [isEditingFIR, setIsEditingFIR] = useState(false);
  const [firData, setFirData] = useState({
    police_station: '',
    crime_type: '',
    incident_date: '',
    status: '',
    investigating_officer: '',
    ipc_sections: '',
    incident_description: ''
  });

  const [editLegalSections, setEditLegalSections] = useState([]);

  // Stage 2 AI analysis modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingFIR, setAnalyzingFIR] = useState(false);

  // Witness management
  const [witnesses, setWitnesses] = useState([]);
  const [showWitnessForm, setShowWitnessForm] = useState(false);
  const [newWitness, setNewWitness] = useState({ name: '', phone: '', address: '', statement: '', status: 'Cooperative' });

  // Suspect management
  const [suspects, setSuspects] = useState([]);
  const [showSuspectForm, setShowSuspectForm] = useState(false);
  const [newSuspect, setNewSuspect] = useState({ name: '', alias: '', address: '', identification_marks: '', status: 'Suspect', notes: '' });

  // Evidence & Chain of custody
  const [evidenceCategories, setEvidenceCategories] = useState(EVIDENCE_CATEGORIES);
  const [evidenceList, setEvidenceList] = useState([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState({ file_name: '', file_type: EVIDENCE_CATEGORIES[0] || 'Physical Weapon/Object', description: '', collection_location: '', collecting_officer: '' });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [selectedEvidenceForTransfer, setSelectedEvidenceForTransfer] = useState(null);
  const [newTransfer, setNewTransfer] = useState({ from_officer: '', from_officer_badge: '', to_officer: '', to_officer_badge: '', transfer_reason: '', remarks: '' });

  // Investigation tasks
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'Pending', assigned_to: '', due_date: '' });

  // Timeline milestones
  const [timeline, setTimeline] = useState([]);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ event_name: 'FIR Registered', description: '' });

  // Predefined Document generation
  const [generatedDocuments, setGeneratedDocuments] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('purvani_chargesheet');
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // AI Assistant Chat
  const [chatMessages, setChatMessages] = useState([
    { sender: 'AI', text: 'Greeting Officer. I am the CrimeGPT Legal Co-Pilot. I have loaded this Case dossier profile, evidence indexes, and timeline milestones. Ask me any legal questions regarding IPC/BNS sections, landmark judgments, or request gaps analyses.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);

  const parseJsonField = (val, defaultValue) => {
    if (!val) return defaultValue;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return defaultValue;
    }
  };

  const handleSaveInvestigation = async (e) => {
    if (e) e.preventDefault();
    setSavingInvestigation(true);
    try {
      const res = await api.put(`/investigation/case/${id}`, investigationData);
      setInvestigationData(prev => ({ ...prev, ...res.data }));
      alert("Investigation record updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save investigation record.");
    } finally {
      setSavingInvestigation(false);
    }
  };

  const handleCloseCase = async () => {
    if (!window.confirm(`Confirm official closure of Case FIR No. ${caseData.fir_number}? Closed cases become read-only for investigating officers.`)) return;
    setClosingCase(true);
    try {
      const res = await api.post(`/cases/${id}/close`);
      setCaseData(res.data);
      alert("Case dossier officially closed.");
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "Failed to close case.");
    } finally {
      setClosingCase(false);
    }
  };

  const handleReopenCase = async () => {
    if (!window.confirm(`Confirm reopening Case FIR No. ${caseData.fir_number}?`)) return;
    try {
      const res = await api.post(`/cases/${id}/reopen`);
      setCaseData(res.data);
      alert("Case dossier reopened successfully.");
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "Failed to reopen case.");
    }
  };

  const fetchAllCaseData = async () => {
    try {
      const response = await api.get(`/cases/${id}`);
      const caseItem = response.data;
      console.log("CASE DATA RECEIVED:", caseItem);
      setCaseData(caseItem);

      const details = caseItem.case_details || caseItem.details || {};

      // Helper: safely parse a JSON field that may be a string or already an object/array
      const safeParseArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return [val];
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : [p]; }
        catch { return []; }
      };
      const safeParseObj = (val) => {
        if (!val) return null;
        if (typeof val === 'object' && !Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch { return null; }
      };

      // Load base edit data
      setFirData({
        police_station: caseItem.police_station,
        crime_type: caseItem.crime_type,
        incident_date: caseItem.incident_date ? caseItem.incident_date.substring(0, 16) : '',
        status: caseItem.status,
        investigating_officer: details.investigating_officer || '',
        ipc_sections: details.ipc_sections || '',
        incident_description: details.incident_description || details.description || caseItem.description || ''
      });

      const parsedLegalSections = details.legal_sections
        ? (typeof details.legal_sections === 'string'
          ? JSON.parse(details.legal_sections)
          : details.legal_sections)
        : [];
      setEditLegalSections(parsedLegalSections);

      // ─── NORMALIZATION LAYER ────────────────────────────────────────────────
      // Witnesses: prefer DB table records, fall back to case_details.witnesses
      const dbWitnesses = caseItem.witnesses || caseItem.witness_records || [];
      const detailWitnesses = safeParseArray(details.witnesses).map((w, i) => ({
        id: `detail-wit-${i}`,
        name: w.name || '',
        phone: w.contact || w.phone || '',
        address: w.address || '',
        statement: w.statement || '',
        status: w.status || 'Cooperative',
        _fromDetails: true
      }));
      const normalizedWitnesses = dbWitnesses.length > 0 ? dbWitnesses : detailWitnesses;

      // Suspects: prefer DB table records, fall back to case_details.accused_details
      const dbSuspects = caseItem.suspects || caseItem.suspect_records || [];
      let detailSuspects = [];
      if (dbSuspects.length === 0) {
        const accused = safeParseObj(details.accused_details);
        if (accused && accused.name) {
          detailSuspects = [{
            id: 'detail-accused',
            name: accused.name || '',
            alias: accused.known_aliases || accused.alias || '',
            address: accused.address || '',
            identification_marks: accused.identification_marks || '',
            status: accused.status || 'Suspect',
            notes: `Age: ${accused.age || 'N/A'} | Gender: ${accused.gender || 'N/A'} | Previous Record: ${accused.previous_record || 'None'}`,
            _fromDetails: true
          }];
        }
      }
      const normalizedSuspects = dbSuspects.length > 0 ? dbSuspects : detailSuspects;

      // Evidence: prefer DB table records (uploaded files), fall back to case_details.evidence_details
      const dbEvidence = caseItem.evidence || [];
      const detailEvidence = safeParseArray(details.evidence_details).map((ev, i) => ({
        id: `detail-ev-${i}`,
        file_name: ev.description || ev.evidence_type || `Evidence Item ${i + 1}`,
        file_type: ev.evidence_type || 'Physical',
        evidence_type: ev.evidence_type || 'Physical',
        description: ev.description || '',
        collection_location: ev.recovered_from || ev.collection_location || '',
        collecting_officer: ev.officer_remarks || ev.collecting_officer || '',
        uploaded_date: ev.recovery_date || new Date().toISOString(),
        movement_history: [],
        _fromDetails: true
      }));
      const normalizedEvidence = dbEvidence.length > 0 ? dbEvidence : detailEvidence;

      // Tasks, Documents, Timeline — use DB data only (no fallback in case_details)
      const seedTasks = caseItem.tasks || caseItem.task_records || [];
      const seedTimeline = caseItem.timeline || [];
      const seedDocuments = caseItem.documents || [];
      const seedAuditLogs = caseItem.audit_logs || [];

      // Set normalized state immediately so tabs show data without waiting for sub-fetches
      setWitnesses(normalizedWitnesses);
      setSuspects(normalizedSuspects);
      setEvidenceList(normalizedEvidence);
      setTasks(seedTasks);
      setTimeline(seedTimeline);
      setGeneratedDocuments(seedDocuments);
      setAuditLogs(seedAuditLogs);

      console.log("NORMALIZED WORKSPACE DATA", {
        witnesses: normalizedWitnesses,
        evidence: normalizedEvidence,
        suspects: normalizedSuspects,
        tasks: seedTasks,
        documents: seedDocuments,
        timeline: seedTimeline
      });

      // ─── Refresh each tab from individual endpoints ─────────────────────────
      // These will supersede normalized data only if the DB tables have real records.
      try {
        const witnessesRes = await api.get(`/witnesses/case/${id}`);
        if (witnessesRes.data && witnessesRes.data.length > 0) setWitnesses(witnessesRes.data);
      } catch (err) {
        console.warn('Witnesses sub-fetch failed, using normalized data:', err?.response?.status);
      }

      try {
        const suspectsRes = await api.get(`/suspects/case/${id}`);
        if (suspectsRes.data && suspectsRes.data.length > 0) setSuspects(suspectsRes.data);
      } catch (err) {
        console.warn('Suspects sub-fetch failed, using normalized data:', err?.response?.status);
      }

      try {
        const evidenceRes = await api.get(`/cases/${id}/evidence`);
        if (evidenceRes.data && evidenceRes.data.length > 0) setEvidenceList(evidenceRes.data);
      } catch (err) {
        console.warn('Evidence sub-fetch failed, using normalized data:', err?.response?.status);
      }

      try {
        const tasksRes = await api.get(`/tasks/case/${id}`);
        if (tasksRes.data && tasksRes.data.length > 0) setTasks(tasksRes.data);
      } catch (err) {
        console.warn('Tasks sub-fetch failed, using nested data:', err?.response?.status);
      }

      try {
        const timelineRes = await api.get(`/cases/${id}/timeline`);
        if (timelineRes.data && timelineRes.data.length > 0) setTimeline(timelineRes.data);
      } catch (err) {
        console.warn('Timeline sub-fetch failed, using nested data:', err?.response?.status);
      }

      try {
        const docsRes = await api.get(`/documents/case/${id}`);
        if (docsRes.data && docsRes.data.length > 0) setGeneratedDocuments(docsRes.data);
      } catch (err) {
        console.warn('Documents sub-fetch failed, using nested data:', err?.response?.status);
      }

      try {
        const invRes = await api.get(`/investigation/case/${id}`);
        if (invRes.data) {
          setInvestigationData(prev => ({ ...prev, ...invRes.data }));
        }
      } catch (err) {
        console.warn('Investigation record sub-fetch failed:', err?.response?.status);
      }

      fetchAuditLogs(caseItem.fir_number, seedAuditLogs);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve case profile from repository.');
    } finally {
      setLoading(false);
    }
  };


  const fetchAuditLogs = async (firNumber, fallbackLogs) => {
    try {
      const res = await api.get('/audit/');
      const currentFir = firNumber || caseData?.fir_number;
      const filtered = currentFir
        ? res.data.filter(log => log.details?.includes(currentFir))
        : res.data.slice(0, 30);
      if (filtered.length > 0) setAuditLogs(filtered);
      else if (fallbackLogs && fallbackLogs.length > 0) setAuditLogs(fallbackLogs);
    } catch (e) {
      console.warn('Audit log fetch failed (handled gracefully):', e?.response?.status);
      if (fallbackLogs && fallbackLogs.length > 0) setAuditLogs(fallbackLogs);
    }
  };

  useEffect(() => {
    fetchAllCaseData();
  }, [id]);

  useEffect(() => {
    if (caseData) {
      console.log(JSON.stringify(caseData, null, 2));
    }
  }, [caseData]);

  // Workspace arrays debug log — fires whenever any tab array updates
  useEffect(() => {
    if (!loading && caseData) {
      console.log("WORKSPACE ARRAYS", {
        witnesses,
        suspects,
        evidence: evidenceList,
        tasks,
        timeline,
        documents: generatedDocuments
      });
    }
  }, [witnesses, suspects, evidenceList, tasks, timeline, generatedDocuments]);

  // Handle Offline Mutation fallback
  const handleMutation = async (actionName, payload, onlineApiCall, localCallback) => {
    if (!navigator.onLine) {
      try {
        await addMutation(actionName, payload);
        localCallback();
        alert('Device offline. Transaction queued in IndexedDB for auto-sync on reconnect.');
      } catch (e) {
        console.error(e);
        alert('Failed queueing offline task.');
      }
    } else {
      try {
        await onlineApiCall();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || 'Transaction failed.');
      }
    }
  };

  // 1. FIR Tab Save
  const handleSaveFIR = async (e) => {
    e.preventDefault();
    const currentDetails = caseData.case_details || caseData.details || {};
    const payload = {
      fir_number: caseData.fir_number,
      police_station: firData.police_station,
      crime_type: firData.crime_type,
      incident_date: firData.incident_date,
      status: firData.status,
      details: {
        investigating_officer: firData.investigating_officer,
        ipc_sections: editLegalSections.map(s => `${s.law} ${s.section}`).join(', '),
        legal_sections: editLegalSections,
        incident_description: firData.incident_description,
        victim_details: currentDetails.victim_details || '{}',
        accused_details: currentDetails.accused_details || '{}',
        evidence_details: currentDetails.evidence_details || '[]',
        witnesses: currentDetails.witnesses || '[]'
      }
    };

    const onlineCall = async () => {
      const response = await api.put(`/cases/${id}`, payload);
      setCaseData(response.data);
      setIsEditingFIR(false);
      fetchAllCaseData();
    };

    const localCall = () => {
      setCaseData(prev => ({
        ...prev,
        police_station: firData.police_station,
        crime_type: firData.crime_type,
        incident_date: firData.incident_date,
        status: firData.status,
        details: {
          ...currentDetails,
          investigating_officer: firData.investigating_officer,
          ipc_sections: editLegalSections.map(s => `${s.law} ${s.section}`).join(', '),
          legal_sections: editLegalSections,
          incident_description: firData.incident_description
        }
      }));
      setIsEditingFIR(false);
    };

    await handleMutation('update_case', { id, data: payload }, onlineCall, localCall);
  };

  // Stage 2 AI analysis
  const runAIFirAnalysis = async () => {
    setAnalyzingFIR(true);
    try {
      const res = await api.post('/legal-advisor/analyze-fir', {
        crime_type: firData.crime_type,
        incident_description: firData.incident_description
      });
      setAiAnalysis(res.data);
      setShowAIModal(true);
    } catch (e) {
      console.error(e);
      alert('Legal Advisor analysis failed.');
    } finally {
      setAnalyzingFIR(false);
    }
  };

  // 2. Witnesses Tab CRUD
  const handleAddWitness = async (e) => {
    e.preventDefault();
    const payload = {
      case_id: parseInt(id),
      name: newWitness.name,
      phone: newWitness.phone,
      address: newWitness.address,
      statement: newWitness.statement,
      status: newWitness.status
    };

    const onlineCall = async () => {
      await api.post('/witnesses/', payload);
      setShowWitnessForm(false);
      setNewWitness({ name: '', phone: '', address: '', statement: '', status: 'Cooperative' });
      fetchAllCaseData();
    };

    const localCall = () => {
      const newLocal = { ...payload, id: Date.now() };
      setWitnesses(prev => [...prev, newLocal]);
      setShowWitnessForm(false);
      setNewWitness({ name: '', phone: '', address: '', statement: '', status: 'Cooperative' });
    };

    await handleMutation('create_witness', payload, onlineCall, localCall);
  };

  const handleDeleteWitness = async (witnessId) => {
    if (!window.confirm('Delete this witness record?')) return;

    const onlineCall = async () => {
      await api.delete(`/witnesses/${witnessId}`);
      fetchAllCaseData();
    };

    const localCall = () => {
      setWitnesses(prev => prev.filter(w => w.id !== witnessId));
    };

    await handleMutation('delete_witness', { id: witnessId }, onlineCall, localCall);
  };

  // 3. Suspects Tab CRUD
  const handleAddSuspect = async (e) => {
    e.preventDefault();
    const payload = {
      case_id: parseInt(id),
      name: newSuspect.name,
      alias: newSuspect.alias,
      address: newSuspect.address,
      identification_marks: newSuspect.identification_marks,
      status: newSuspect.status,
      notes: newSuspect.notes
    };

    const onlineCall = async () => {
      await api.post('/suspects/', payload);
      setShowSuspectForm(false);
      setNewSuspect({ name: '', alias: '', address: '', identification_marks: '', status: 'Suspect', notes: '' });
      fetchAllCaseData();
    };

    const localCall = () => {
      const newLocal = { ...payload, id: Date.now() };
      setSuspects(prev => [...prev, newLocal]);
      setShowSuspectForm(false);
      setNewSuspect({ name: '', alias: '', address: '', identification_marks: '', status: 'Suspect', notes: '' });
    };

    await handleMutation('create_suspect', payload, onlineCall, localCall);
  };

  const handleDeleteSuspect = async (suspectId) => {
    if (!window.confirm('Delete this suspect record?')) return;

    const onlineCall = async () => {
      await api.delete(`/suspects/${suspectId}`);
      fetchAllCaseData();
    };

    const localCall = () => {
      setSuspects(prev => prev.filter(s => s.id !== suspectId));
    };

    await handleMutation('delete_suspect', { id: suspectId }, onlineCall, localCall);
  };

  // 4. Evidence Upload & Chain of Custody CRUD
  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceFile) {
      alert('Please select a file to upload as evidence.');
      return;
    }
    setUploadingEvidence(true);

    const formData = new FormData();
    formData.append('file', evidenceFile);

    try {
      const uploadRes = await api.post(`/cases/${id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedRecord = uploadRes.data;

      const currentDetails = caseData.case_details || caseData.details || {};
      const currentEvidenceDetails = parseJsonField(currentDetails.evidence_details, []);
      const updatedDetails = [
        ...currentEvidenceDetails,
        {
          evidence_type: newEvidence.file_type,
          description: newEvidence.description,
          recovered_from: newEvidence.collection_location,
          recovery_date: new Date().toLocaleDateString(),
          uploaded_file: uploadedRecord.file_name,
          officer_remarks: newEvidence.collecting_officer
        }
      ];

      await api.put(`/cases/${id}`, {
        fir_number: caseData.fir_number,
        police_station: caseData.police_station,
        crime_type: caseData.crime_type,
        incident_date: caseData.incident_date,
        details: {
          evidence_details: updatedDetails
        }
      });

      setShowEvidenceForm(false);
      setNewEvidence({ file_name: '', file_type: 'Physical', description: '', collection_location: '', collecting_officer: '' });
      setEvidenceFile(null);
      fetchAllCaseData();
    } catch (err) {
      console.error(err);
      alert('Evidence upload failed.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleTransferEvidence = async (e) => {
    e.preventDefault();
    if (!selectedEvidenceForTransfer) return;

    const payload = {
      from_officer: newTransfer.from_officer,
      from_officer_badge: newTransfer.from_officer_badge,
      to_officer: newTransfer.to_officer,
      to_officer_badge: newTransfer.to_officer_badge,
      transfer_reason: newTransfer.transfer_reason,
      remarks: newTransfer.remarks
    };

    const onlineCall = async () => {
      await api.post(`/cases/evidence/${selectedEvidenceForTransfer.id}/movement`, payload);
      setSelectedEvidenceForTransfer(null);
      setNewTransfer({ from_officer: '', from_officer_badge: '', to_officer: '', to_officer_badge: '', transfer_reason: '', remarks: '' });
      fetchAllCaseData();
    };

    const localCall = () => {
      const newLocal = { ...payload, id: Date.now(), timestamp: new Date().toISOString() };
      setEvidenceList(prev => prev.map(ev => {
        if (ev.id === selectedEvidenceForTransfer.id) {
          return {
            ...ev,
            movement_history: [...(ev.movement_history || []), newLocal]
          };
        }
        return ev;
      }));
      setSelectedEvidenceForTransfer(null);
      setNewTransfer({ from_officer: '', from_officer_badge: '', to_officer: '', to_officer_badge: '', transfer_reason: '', remarks: '' });
    };

    await handleMutation('create_evidence_movement', { evidence_id: selectedEvidenceForTransfer.id, data: payload }, onlineCall, localCall);
  };

  // 5. Tasks Tab CRUD
  const handleAddTask = async (e) => {
    e.preventDefault();
    const payload = {
      case_id: parseInt(id),
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      assigned_to: newTask.assigned_to,
      due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null
    };

    const onlineCall = async () => {
      await api.post('/tasks/', payload);
      setShowTaskForm(false);
      setNewTask({ title: '', description: '', status: 'Pending', assigned_to: '', due_date: '' });
      fetchAllCaseData();
    };

    const localCall = () => {
      const newLocal = { ...payload, id: Date.now() };
      setTasks(prev => [...prev, newLocal]);
      setShowTaskForm(false);
      setNewTask({ title: '', description: '', status: 'Pending', assigned_to: '', due_date: '' });
    };

    await handleMutation('create_task', payload, onlineCall, localCall);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const payload = { status: newStatus };

    const onlineCall = async () => {
      await api.put(`/tasks/${taskId}`, payload);
      fetchAllCaseData();
    };

    const localCall = () => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    await handleMutation('update_task', { id: taskId, data: payload }, onlineCall, localCall);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Remove this task?')) return;

    const onlineCall = async () => {
      await api.delete(`/tasks/${taskId}`);
      fetchAllCaseData();
    };

    const localCall = () => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    await handleMutation('delete_task', { id: taskId }, onlineCall, localCall);
  };

  // 6. Timeline Milestone add
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    const payload = {
      event_name: newMilestone.event_name,
      description: newMilestone.description
    };

    const onlineCall = async () => {
      await api.post(`/cases/${id}/timeline`, payload);
      setShowTimelineForm(false);
      setNewMilestone({ event_name: 'Witness Statements', description: '' });
      fetchAllCaseData();
    };

    const localCall = () => {
      const newLocal = { ...payload, id: Date.now(), timestamp: new Date().toISOString() };
      setTimeline(prev => [...prev, newLocal]);
      setShowTimelineForm(false);
      setNewMilestone({ event_name: 'Witness Statements', description: '' });
    };

    await handleMutation('create_timeline', { case_id: id, data: payload }, onlineCall, localCall);
  };

  // 7. Documents Template Generation & Preview
  const handleGenerateDocument = async () => {
    setGeneratingDoc(true);
    try {
      const res = await api.post('/documents/generate', {
        case_id: parseInt(id),
        document_type: selectedDocType
      });
      const newDoc = res.data;
      setPreviewDoc(newDoc);

      // Instantly update archive list state so new document displays immediately
      setGeneratedDocuments(prev => {
        const filtered = prev.filter(d => d.id !== newDoc.id);
        return [newDoc, ...filtered];
      });

      fetchAllCaseData();
    } catch (e) {
      console.error("Document generation error:", e);
      alert(e?.response?.data?.detail || 'Document generation failed.');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleDownloadFile = async (format, targetDoc = null) => {
    const docToUse = targetDoc || previewDoc;
    if (!docToUse) return;
    try {
      const response = await api.get(`/documents/${docToUse.id}/${format}`, {
        responseType: 'blob'
      });
      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docToUse.document_type || 'document'}_${docToUse.id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Clearance verification for download failed.');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!docId) return;
    setDeletingDoc(true);
    try {
      await api.delete(`/documents/${docId}`);
      if (previewDoc?.id === docId) {
        setPreviewDoc(null);
      }
      setDocToDelete(null);
      fetchAllCaseData();
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert(err?.response?.data?.detail || "Failed to delete document.");
    } finally {
      setDeletingDoc(false);
    }
  };

  // 8. AI Assistant Chat Co-pilot
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { sender: 'Officer', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setSendingChat(true);

    try {
      const formattedHistory = chatMessages.map(msg => ({
        role: msg.sender === 'Officer' ? 'user' : 'model',
        content: msg.text
      }));

      const res = await api.post('/legal/query/case', {
        case_id: parseInt(id),
        query: currentInput,
        history: formattedHistory
      });

      setChatMessages(prev => [...prev, { sender: 'AI', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'AI', text: 'Connection fault. Legal reference database temporarily offline.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh] bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-500 font-bold text-xs">
          <Loader2 className="w-8 h-8 text-gray-950 animate-spin" />
          <span>Opening Case Dossier Record...</span>
        </div>
      </div>
    );
  }

  // Calculate task completion progress percentage
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const inputClass = "w-full bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all";
  const labelClass = "text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1";
  const primaryBtn = "bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all uppercase tracking-wider disabled:opacity-50";
  const secondaryBtn = "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs transition-all uppercase tracking-wider";

  const details = caseData ? (caseData.case_details || caseData.details || {}) : {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto bg-white min-h-screen flex-1 min-w-0">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5 no-print">
        <div className="flex items-center gap-3">
          <Link to="/cases" className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-800" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-wide uppercase">
              Investigation Workspace — FIR No. {caseData?.fir_number}
            </h1>
            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
              {caseData?.police_station} station • {caseData?.crime_type} • Status: {caseData?.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {caseData?.status?.toLowerCase() === 'closed' && (
            <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Read-Only</span>
            </span>
          )}
          <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${caseData?.status?.toLowerCase() === 'active'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
            {caseData?.status} Dossier
          </span>
        </div>
      </div>

      {/* Grouped Case Workspace Navigation */}
      <div className="space-y-3 no-print z-10 sticky top-0 bg-white pt-2 pb-1 border-b border-gray-200">
        {/* Top-Level Module Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'fir', name: 'FIR Module', icon: BookOpen, subCount: 6 },
            { id: 'investigation', name: 'Investigation Module', icon: Search, subCount: 6 },
            { id: 'documents', name: 'Documents Workspace', icon: FileCheck, subCount: 2 },
            { id: 'assistant', name: 'AI Co-Pilot', icon: Sparkles },
            { id: 'close', name: 'Close Case Workflow', icon: Lock }
          ].map(group => {
            const Icon = group.icon;
            const isCurrentGroup = activeGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroup(group.id);
                  if (group.id === 'fir') setActiveSubTab('fir_details');
                  else if (group.id === 'investigation') setActiveSubTab('tasks');
                  else if (group.id === 'documents') setActiveSubTab('documents_list');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isCurrentGroup
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-250'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{group.name}</span>
                {group.subCount ? (
                  <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded-full ${isCurrentGroup ? 'bg-white/20 text-white' : 'bg-gray-250 text-gray-800'
                    }`}>
                    {group.subCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Sub-Navigation Tabs */}
        {activeGroup === 'fir' && (
          <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {[
              { id: 'fir_details', name: 'FIR Metadata' },
              { id: 'complainant', name: 'Complainant Details' },
              { id: 'incident', name: 'Incident Details' },
              { id: 'witnesses', name: `Witnesses (${witnesses.length})` },
              { id: 'suspects', name: `Suspects / Accused (${suspects.length})` },
              { id: 'evidence', name: `Evidence (${evidenceList.length})` }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${activeSubTab === sub.id
                    ? 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {activeGroup === 'investigation' && (
          <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {[
              { id: 'tasks', name: `Tasks (${tasks.length})` },
              { id: 'timeline', name: `Timeline (${timeline.length})` },
              { id: 'medical', name: 'Medical Records' },
              { id: 'court', name: 'Court / Remand' },
              { id: 'panchanama', name: 'Panchanama' },
              { id: 'tip', name: 'Test Identification Parade (TIP)' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${activeSubTab === sub.id
                    ? 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {activeGroup === 'documents' && (
          <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            {[
              { id: 'documents_list', name: `Generated Documents (${generatedDocuments.length})` },
              { id: 'documents_history', name: 'Document Registry' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${activeSubTab === sub.id
                    ? 'bg-white border border-gray-300 text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workspace Content */}
      <div className="bg-white p-2 min-h-[50vh]">

        {/* SUBTAB: Complainant Details */}
        {(activeGroup === 'fir' && activeSubTab === 'complainant') && (
          <div className="space-y-6">
            <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest pb-3 border-b border-gray-200">
              FIR Complainant Record
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl space-y-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Complainant Full Name</span>
                <span className="text-sm font-bold text-gray-900 block">{details.complainant_name || 'State Police Department (Suo Motu FIR)'}</span>
              </div>
              <div className="space-y-1 border-t border-gray-150 pt-3">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Contact Information</span>
                <span className="text-xs font-semibold text-gray-700 block">{details.complainant_contact || 'Police Station Control Desk'}</span>
              </div>
              <div className="space-y-1 border-t border-gray-150 pt-3">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Residential Address</span>
                <span className="text-xs font-semibold text-gray-700 block">{details.complainant_address || 'Station Jurisdiction Premises'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Incident Details */}
        {(activeGroup === 'fir' && activeSubTab === 'incident') && (
          <div className="space-y-6">
            <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest pb-3 border-b border-gray-200">
              Incident Scene & Category Parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3 shadow-sm">
                <div>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Crime Category</span>
                  <span className="text-xs font-bold text-gray-900">{caseData.crime_type}</span>
                </div>
                <div className="border-t border-gray-150 pt-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Incident Occurrence Date</span>
                  <span className="text-xs font-bold text-gray-900">{new Date(caseData.incident_date).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-150 pt-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Spot / Scene Location</span>
                  <span className="text-xs font-bold text-gray-900">{details.incident_location || caseData.police_station}</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-2 shadow-sm">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Complete Incident Narrative</span>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{details.incident_description || details.description || caseData.description || 'No detailed narrative logged.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: FIR Details */}
        {(activeGroup === 'fir' && activeSubTab === 'fir_details') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">FIR Metadata Registry</h2>
              <div className="flex gap-2">
                <button
                  onClick={runAIFirAnalysis}
                  disabled={analyzingFIR}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase"
                >
                  {analyzingFIR ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Analyze FIR with AI</span>
                </button>
                <button
                  onClick={() => setIsEditingFIR(!isEditingFIR)}
                  className={secondaryBtn}
                >
                  {isEditingFIR ? 'Cancel' : 'Edit FIR'}
                </button>
              </div>
            </div>

            {isEditingFIR ? (
              <form onSubmit={handleSaveFIR} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label htmlFor="fir-ps" className={labelClass}>Police Station</label>
                  <input
                    id="fir-ps"
                    type="text"
                    value={firData.police_station}
                    onChange={(e) => setFirData({ ...firData, police_station: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fir-crime" className={labelClass}>Crime Category</label>
                  <input
                    id="fir-crime"
                    type="text"
                    value={firData.crime_type}
                    onChange={(e) => setFirData({ ...firData, crime_type: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fir-date" className={labelClass}>Date of Incident</label>
                  <input
                    id="fir-date"
                    type="datetime-local"
                    value={firData.incident_date}
                    onChange={(e) => setFirData({ ...firData, incident_date: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="fir-status" className={labelClass}>Investigation Status</label>
                  <select
                    id="fir-status"
                    value={firData.status}
                    onChange={(e) => setFirData({ ...firData, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed / Resolved</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="fir-io" className={labelClass}>Investigating Officer</label>
                  <input
                    id="fir-io"
                    type="text"
                    value={firData.investigating_officer}
                    onChange={(e) => setFirData({ ...firData, investigating_officer: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <LegalSectionSelector
                    crimeType={firData.crime_type}
                    selectedSections={editLegalSections}
                    onChange={setEditLegalSections}
                    role={user?.role}
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label htmlFor="fir-desc" className={labelClass}>Incident Narrative Summary</label>
                  <textarea
                    id="fir-desc"
                    value={firData.incident_description}
                    onChange={(e) => setFirData({ ...firData, incident_description: e.target.value })}
                    className={`${inputClass} h-28`}
                    required
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingFIR(false)}
                    className={secondaryBtn}
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                  >
                    Save FIR Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-5">
                  <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-2">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Incident Narrative Description</span>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{details.incident_description || details.description || caseData.description || 'No description recorded.'}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-2.5">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Applicable Sections</span>
                      {details.legal_sections ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(typeof details.legal_sections === 'string'
                            ? JSON.parse(details.legal_sections)
                            : details.legal_sections
                          ).map((sec, idx) => (
                            <span key={idx} className="bg-gray-105 text-gray-900 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {sec.law} {sec.section}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-black text-gray-900">{details.ipc_sections || 'Not assigned'}</span>
                      )}
                    </div>
                    <div className="bg-white p-4 border border-gray-200 rounded-lg">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Investigating Officer</span>
                      <span className="text-xs font-black text-gray-700">{details.investigating_officer || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-[10px] font-extrabold text-gray-600 uppercase border-b border-gray-200">
                      FIR File Parameters
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold uppercase text-[9px]">FIR Number</span>
                        <span className="font-bold text-gray-800">{caseData.fir_number}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-2.5">
                        <span className="text-gray-400 font-bold uppercase text-[9px]">Station Location</span>
                        <span className="font-bold text-gray-800">{caseData.police_station}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-2.5">
                        <span className="text-gray-400 font-bold uppercase text-[9px]">Incident Date</span>
                        <span className="font-bold text-gray-800">{new Date(caseData.incident_date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI analysis Modal */}
            {showAIModal && aiAnalysis && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-gray-250 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-white px-6 py-4.5 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-gray-950" />
                      <span>Legal Section Recommendations</span>
                    </h3>
                    <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                  </div>

                  <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* BNS Section Recommendations */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">Suggested BNS Sections</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {aiAnalysis.recommendations?.map((rec, i) => (
                          <div key={i} className="p-3.5 border border-gray-200 rounded-lg bg-white flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-black text-gray-900">Section {rec.section} {rec.law}</span>
                              <span className="text-xs font-bold text-gray-700 block">{rec.title}</span>
                              <p className="text-[11px] text-gray-500 leading-normal">{rec.description}</p>
                              <p className="text-[9px] text-gray-400 font-bold mt-1">Reason: {rec.reasoning}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-bold">
                                {rec.confidence}% Conf.
                              </span>
                              <button
                                onClick={() => {
                                  const alreadyAdded = editLegalSections.some(s => s.law === rec.law && s.section === rec.section);
                                  if (!alreadyAdded) {
                                    setEditLegalSections([...editLegalSections, { law: rec.law, section: rec.section, title: rec.title, description: rec.description }]);
                                  }
                                }}
                                className="bg-gray-900 hover:bg-gray-800 text-white px-2 py-1 rounded text-[9px] font-bold"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Landmark judgments */}
                    <div className="space-y-3 pt-3 border-t border-gray-150">
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">Landmark Judgments for Reference</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {aiAnalysis.landmark_cases?.map((c, i) => (
                          <div key={i} className="p-3 border border-gray-200 rounded-lg bg-white space-y-1">
                            <span className="text-xs font-black text-gray-900">{c.citation}</span>
                            <p className="text-[11px] text-gray-600"><b>Summary:</b> {c.summary}</p>
                            <p className="text-[9px] text-gray-400 font-bold"><b>Significance:</b> {c.significance}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => {
                        setShowAIModal(false);
                        setIsEditingFIR(true);
                      }}
                      className={primaryBtn}
                    >
                      Apply Selections & Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Witnesses */}
        {(activeGroup === 'fir' && activeSubTab === 'witnesses') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Witness Registry Files</h2>
              <button
                onClick={() => setShowWitnessForm(!showWitnessForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Witness Statement</span>
              </button>
            </div>

            {showWitnessForm && (
              <form onSubmit={handleAddWitness} className="p-5 border border-gray-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="wit-name" className={labelClass}>Name</label>
                  <input
                    id="wit-name"
                    type="text"
                    value={newWitness.name}
                    onChange={(e) => setNewWitness({ ...newWitness, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wit-phone" className={labelClass}>Phone Number</label>
                  <input
                    id="wit-phone"
                    type="text"
                    value={newWitness.phone}
                    onChange={(e) => setNewWitness({ ...newWitness, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="wit-addr" className={labelClass}>Address</label>
                  <input
                    id="wit-addr"
                    type="text"
                    value={newWitness.address}
                    onChange={(e) => setNewWitness({ ...newWitness, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="wit-status" className={labelClass}>Statement Status</label>
                  <select
                    id="wit-status"
                    value={newWitness.status}
                    onChange={(e) => setNewWitness({ ...newWitness, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Cooperative">Cooperative</option>
                    <option value="Hostile">Hostile</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="wit-stmt" className={labelClass}>Witness Statement</label>
                  <textarea
                    id="wit-stmt"
                    value={newWitness.statement}
                    onChange={(e) => setNewWitness({ ...newWitness, statement: e.target.value })}
                    className={`${inputClass} h-20`}
                    placeholder="Enter recorded witness statement transcript..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWitnessForm(false)}
                    className={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                  >
                    Add Record
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {witnesses.length > 0 ? (
                witnesses.map((w) => (
                  <div key={w.id} className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col justify-between shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-gray-800" />
                          <span>{w.name}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${w.status === 'Cooperative' ? 'bg-green-50 text-green-700 border border-green-200' :
                            w.status === 'Hostile' ? 'bg-red-50 text-red-750 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold space-y-0.5">
                        <p>Phone: {w.phone || 'N/A'}</p>
                        <p>Address: {w.address || 'N/A'}</p>
                      </div>
                      <p className="text-[11px] text-gray-650 bg-gray-50 p-2.5 rounded-lg border border-gray-200 leading-relaxed font-sans italic">
                        "{w.statement || 'No statement transcript recorded.'}"
                      </p>
                    </div>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => handleDeleteWitness(w.id)}
                        className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-1 rounded-lg text-xs"
                        title="Delete Witness"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 py-12 border border-dashed border-gray-200 bg-gray-50 rounded-lg text-center space-y-3 w-full">
                  <p className="text-xs text-gray-400 font-semibold">No witnesses added yet</p>
                  <button
                    type="button"
                    onClick={() => setShowWitnessForm(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase"
                  >
                    Add Witness
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Suspects */}
        {(activeGroup === 'fir' && activeSubTab === 'suspects') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Suspect Registry Files</h2>
              <button
                onClick={() => setShowSuspectForm(!showSuspectForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Accused / Suspect</span>
              </button>
            </div>

            {showSuspectForm && (
              <form onSubmit={handleAddSuspect} className="p-5 border border-gray-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="susp-name" className={labelClass}>Name</label>
                  <input
                    id="susp-name"
                    type="text"
                    value={newSuspect.name}
                    onChange={(e) => setNewSuspect({ ...newSuspect, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="susp-alias" className={labelClass}>Known Alias / Nickname</label>
                  <input
                    id="susp-alias"
                    type="text"
                    value={newSuspect.alias}
                    onChange={(e) => setNewSuspect({ ...newSuspect, alias: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="susp-addr" className={labelClass}>Address</label>
                  <input
                    id="susp-addr"
                    type="text"
                    value={newSuspect.address}
                    onChange={(e) => setNewSuspect({ ...newSuspect, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="susp-marks" className={labelClass}>Distinctive Identification Marks</label>
                  <input
                    id="susp-marks"
                    type="text"
                    value={newSuspect.identification_marks}
                    onChange={(e) => setNewSuspect({ ...newSuspect, identification_marks: e.target.value })}
                    className={inputClass}
                    placeholder="E.g. Scar on left arm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="susp-status" className={labelClass}>Suspect Status</label>
                  <select
                    id="susp-status"
                    value={newSuspect.status}
                    onChange={(e) => setNewSuspect({ ...newSuspect, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Suspect">Suspect</option>
                    <option value="Arrested">Arrested</option>
                    <option value="Absconding">Absconding</option>
                    <option value="Released">Released</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="susp-notes" className={labelClass}>Investigation Notes</label>
                  <textarea
                    id="susp-notes"
                    value={newSuspect.notes}
                    onChange={(e) => setNewSuspect({ ...newSuspect, notes: e.target.value })}
                    className={`${inputClass} h-20`}
                    placeholder="Enter notes on suspect connections..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSuspectForm(false)}
                    className={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                  >
                    Save Accused File
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suspects.length > 0 ? (
                suspects.map((s) => (
                  <div key={s.id} className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col justify-between shadow-sm">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>{s.name} {s.alias ? `(Alias: ${s.alias})` : ''}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${s.status === 'Arrested' ? 'bg-red-50 text-red-700 border border-red-200' :
                            s.status === 'Absconding' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                          {s.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold space-y-0.5 leading-relaxed">
                        <p>Address: {s.address || 'N/A'}</p>
                        <p>Identification Marks: {s.identification_marks || 'None recorded'}</p>
                      </div>
                      {s.notes && (
                        <div className="text-[11px] text-gray-655 bg-gray-50 p-2.5 rounded-lg border border-gray-200 leading-relaxed font-sans">
                          <b>Notes:</b> {s.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => handleDeleteSuspect(s.id)}
                        className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-1 rounded-lg text-xs"
                        title="Delete Suspect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 py-16 text-center text-gray-400 text-xs font-semibold">
                  No suspect/accused profiles registered.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Evidence Locker */}
        {(activeGroup === 'fir' && activeSubTab === 'evidence') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Evidence Locker Inventory</h2>
              <button
                onClick={() => setShowEvidenceForm(!showEvidenceForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Index Evidence File</span>
              </button>
            </div>

            {showEvidenceForm && (
              <form onSubmit={handleAddEvidence} className="p-5 border border-gray-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="ev-type" className={labelClass}>Evidence Type</label>
                  <select
                    id="ev-type"
                    value={newEvidence.file_type}
                    onChange={(e) => setNewEvidence({ ...newEvidence, file_type: e.target.value })}
                    className={inputClass}
                  >
                    {evidenceCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="ev-io" className={labelClass}>Collecting Officer</label>
                  <input
                    id="ev-io"
                    type="text"
                    value={newEvidence.collecting_officer}
                    onChange={(e) => setNewEvidence({ ...newEvidence, collecting_officer: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ev-spot" className={labelClass}>Collection Spot Location</label>
                  <input
                    id="ev-spot"
                    type="text"
                    value={newEvidence.collection_location}
                    onChange={(e) => setNewEvidence({ ...newEvidence, collection_location: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ev-file" className={labelClass}>Upload File Link</label>
                  <input
                    id="ev-file"
                    type="file"
                    onChange={(e) => {
                      setEvidenceFile(e.target.files[0]);
                      setNewEvidence({ ...newEvidence, file_name: e.target.files[0]?.name || '' });
                    }}
                    className="w-full text-xs text-gray-500 border border-gray-300 bg-white rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-gray-950"
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="ev-desc" className={labelClass}>Item Description</label>
                  <textarea
                    id="ev-desc"
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
                    className={`${inputClass} h-16`}
                    placeholder="Enter physical state, packaging, and marking labels..."
                    required
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEvidenceForm(false)}
                    className={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingEvidence}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase"
                  >
                    {uploadingEvidence && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Index Locker</span>
                  </button>
                </div>
              </form>
            )}

            {/* Transfer Modal */}
            {selectedEvidenceForTransfer && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form onSubmit={handleTransferEvidence} className="bg-white border border-gray-200 w-full max-w-md rounded-lg shadow-xl overflow-hidden space-y-4">
                  <div className="bg-white px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                      Chain of Custody Transfer — ID {selectedEvidenceForTransfer.id}
                    </h3>
                    <button type="button" onClick={() => setSelectedEvidenceForTransfer(null)} className="text-slate-400">✕</button>
                  </div>
                  <div className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>From Officer</label>
                        <input
                          type="text"
                          value={newTransfer.from_officer}
                          onChange={(e) => setNewTransfer({ ...newTransfer, from_officer: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Badge Number</label>
                        <input
                          type="text"
                          value={newTransfer.from_officer_badge}
                          onChange={(e) => setNewTransfer({ ...newTransfer, from_officer_badge: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelClass}>To Officer</label>
                        <input
                          type="text"
                          value={newTransfer.to_officer}
                          onChange={(e) => setNewTransfer({ ...newTransfer, to_officer: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Badge Number</label>
                        <input
                          type="text"
                          value={newTransfer.to_officer_badge}
                          onChange={(e) => setNewTransfer({ ...newTransfer, to_officer_badge: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Transfer Reason</label>
                      <input
                        type="text"
                        value={newTransfer.transfer_reason}
                        onChange={(e) => setNewTransfer({ ...newTransfer, transfer_reason: e.target.value })}
                        className={inputClass}
                        placeholder="E.g. FSL Analysis, Court Presentation"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Remarks / Notes</label>
                      <textarea
                        value={newTransfer.remarks}
                        onChange={(e) => setNewTransfer({ ...newTransfer, remarks: e.target.value })}
                        className={`${inputClass} h-16`}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEvidenceForTransfer(null)}
                      className={secondaryBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={primaryBtn}
                    >
                      Authenticate Transfer
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-6">
              {evidenceList.length > 0 ? (
                evidenceList.map((ev) => (
                  <div key={ev.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                    {/* Header bar */}
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[9px] bg-white text-gray-700 border border-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                          {ev.evidence_type || ev.file_type || 'Physical'}
                        </span>
                        <h4 className="text-xs font-black text-gray-900 tracking-wide mt-1.5 flex items-center gap-1">
                          <Paperclip className="w-4 h-4 text-gray-950" />
                          <span>{ev.file_name || ev.description || 'Evidence Item'}</span>
                        </h4>
                      </div>
                      {/* Only show action buttons for DB-uploaded evidence */}
                      {!ev._fromDetails && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedEvidenceForTransfer(ev)}
                            className="bg-gray-955 text-white hover:bg-gray-800 border border-transparent px-3 py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            Transfer Property
                          </button>
                          <a
                            href={`${api.defaults.baseURL}/cases/${id}/evidence/${ev.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download File</span>
                          </a>
                        </div>
                      )}
                      {ev._fromDetails && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                          From FIR Details
                        </span>
                      )}
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                      {/* Properties */}
                      <div className="md:col-span-1 space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-lg">
                        <h5 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Metadata Profile</h5>
                        <div className="space-y-2">
                          <p className="flex justify-between">
                            <span className="text-gray-400 font-bold">Col. Officer:</span>
                            <span className="font-bold text-gray-800">{ev.collecting_officer || ev.officer_remarks || 'N/A'}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-400 font-bold">Col. Spot:</span>
                            <span className="font-bold text-gray-800">{ev.collection_location || ev.recovered_from || 'N/A'}</span>
                          </p>
                          {!ev._fromDetails && (
                            <p className="flex justify-between">
                              <span className="text-gray-400 font-bold">Locker ID:</span>
                              <span className="font-bold text-gray-800">EV-{ev.id}</span>
                            </p>
                          )}
                          <p className="text-gray-500 italic mt-2">{ev.description || 'No description added.'}</p>
                        </div>
                      </div>

                      {/* Chain of custody timeline — only for DB records */}
                      <div className="md:col-span-2 space-y-3">
                        <h5 className="text-[10px] font-extrabold text-gray-550 uppercase tracking-widest flex items-center gap-1 font-bold">
                          <History className="w-4.5 h-4.5 text-gray-900" />
                          <span>Chain of Custody (Movement History)</span>
                        </h5>
                        <div className="space-y-3 border-l-2 border-gray-200 pl-4 py-1">
                          {/* Initial Seizure record */}
                          <div className="relative">
                            <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-green-600 border border-white"></span>
                            <div className="space-y-0.5">
                              <p className="font-bold text-gray-800">Evidence Seized &amp; Indexed</p>
                              <p className="text-[10px] text-gray-400 font-bold">
                                Officer: {ev.collecting_officer || ev.officer_remarks || 'N/A'} •{' '}
                                {ev.uploaded_date ? new Date(ev.uploaded_date).toLocaleString() : (ev.recovery_date || 'Date N/A')}
                              </p>
                            </div>
                          </div>

                          {/* Transfer timeline records */}
                          {ev.movement_history && ev.movement_history.length > 0 ? (
                            ev.movement_history.map((move) => (
                              <div key={move.id} className="relative pt-1.5 border-t border-gray-100">
                                <span className="absolute -left-[21px] top-3 w-2 h-2 rounded-full bg-gray-900 border border-white"></span>
                                <div className="space-y-1">
                                  <p className="font-bold text-gray-800 flex flex-wrap gap-1.5 items-center">
                                    <span>Transferred Property</span>
                                    <span className="bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      {move.transfer_reason}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold">
                                    From: {move.from_officer} ({move.from_officer_badge || 'No badge'})
                                    ➔ To: {move.to_officer} ({move.to_officer_badge || 'No badge'})
                                    • {new Date(move.timestamp).toLocaleString()}
                                  </p>
                                  {move.remarks && <p className="text-[10px] text-gray-505 leading-normal italic bg-gray-50 p-2 border border-gray-250 rounded">"{move.remarks}"</p>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-gray-400 font-bold italic pt-1">
                              {ev._fromDetails
                                ? 'Evidence recorded from initial FIR filing. Upload file to create full custody record.'
                                : 'Property remains secured in primary evidence locker.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 border border-dashed border-gray-200 bg-gray-50 rounded-lg text-center space-y-3 w-full">
                  <p className="text-xs text-gray-400 font-semibold">Evidence locker is empty</p>
                  <button
                    type="button"
                    onClick={() => setShowEvidenceForm(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase"
                  >
                    Upload Evidence
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: Medical Records */}
        {(activeGroup === 'investigation' && activeSubTab === 'medical') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Medical Examination & Treatment Records</h2>
              <button onClick={handleSaveInvestigation} disabled={savingInvestigation || caseData?.status?.toLowerCase() === 'closed'} className={primaryBtn}>
                {savingInvestigation ? 'Saving...' : 'Save Medical Record'}
              </button>
            </div>
            <form onSubmit={handleSaveInvestigation} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="space-y-1">
                <label className={labelClass}>Hospital Name</label>
                <input type="text" value={investigationData.hospital_name || ''} onChange={(e) => setInvestigationData({ ...investigationData, hospital_name: e.target.value })} className={inputClass} placeholder="e.g. Government Civil Hospital" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Hospital Address</label>
                <input type="text" value={investigationData.hospital_address || ''} onChange={(e) => setInvestigationData({ ...investigationData, hospital_address: e.target.value })} className={inputClass} placeholder="Hospital Campus Location" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Medical Officer / Doctor Name</label>
                <input type="text" value={investigationData.doctor_name || ''} onChange={(e) => setInvestigationData({ ...investigationData, doctor_name: e.target.value })} className={inputClass} placeholder="Dr. Name" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Medical Examination Date</label>
                <input type="date" value={investigationData.examination_date || ''} onChange={(e) => setInvestigationData({ ...investigationData, examination_date: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Medical Report Reference No.</label>
                <input type="text" value={investigationData.medical_report_reference || ''} onChange={(e) => setInvestigationData({ ...investigationData, medical_report_reference: e.target.value })} className={inputClass} placeholder="MED-REP-001" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Subject Role / Type</label>
                <select value={investigationData.subject_type || 'Accused Person'} onChange={(e) => setInvestigationData({ ...investigationData, subject_type: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'}>
                  <option value="Accused Person">Accused Person</option>
                  <option value="Victim">Victim</option>
                  <option value="Injured Witness">Injured Witness</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Escort Officer Name</label>
                <input type="text" value={investigationData.escort_officer_name || ''} onChange={(e) => setInvestigationData({ ...investigationData, escort_officer_name: e.target.value })} className={inputClass} placeholder="Escort Officer Name" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Escort Officer Rank</label>
                <input type="text" value={investigationData.escort_officer_rank || ''} onChange={(e) => setInvestigationData({ ...investigationData, escort_officer_rank: e.target.value })} className={inputClass} placeholder="Head Constable / Constable" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Injury Observations by Police / Doctor</label>
                <textarea value={investigationData.injury_observations || ''} onChange={(e) => setInvestigationData({ ...investigationData, injury_observations: e.target.value })} className={`${inputClass} h-20`} placeholder="Detailed physical injury description..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Treatment Details Provided</label>
                <textarea value={investigationData.treatment_details || ''} onChange={(e) => setInvestigationData({ ...investigationData, treatment_details: e.target.value })} className={`${inputClass} h-20`} placeholder="Medical treatment provided..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB: Court / Remand Details */}
        {(activeGroup === 'investigation' && activeSubTab === 'court') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Court Proceedings & Remand Custody Details</h2>
              <button onClick={handleSaveInvestigation} disabled={savingInvestigation || caseData?.status?.toLowerCase() === 'closed'} className={primaryBtn}>
                {savingInvestigation ? 'Saving...' : 'Save Court Record'}
              </button>
            </div>
            <form onSubmit={handleSaveInvestigation} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="space-y-1">
                <label className={labelClass}>Court Name</label>
                <input type="text" value={investigationData.court_name || ''} onChange={(e) => setInvestigationData({ ...investigationData, court_name: e.target.value })} className={inputClass} placeholder="Hon'ble Judicial Magistrate Court" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Court Address / District</label>
                <input type="text" value={investigationData.court_address || ''} onChange={(e) => setInvestigationData({ ...investigationData, court_address: e.target.value })} className={inputClass} placeholder="District Court Complex" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Judge / Magistrate Details</label>
                <input type="text" value={investigationData.judge_details || ''} onChange={(e) => setInvestigationData({ ...investigationData, judge_details: e.target.value })} className={inputClass} placeholder="Judicial Magistrate First Class" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Remand Type</label>
                <select value={investigationData.remand_type || 'Police Remand Custody'} onChange={(e) => setInvestigationData({ ...investigationData, remand_type: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'}>
                  <option value="Police Remand Custody">Police Remand Custody</option>
                  <option value="Judicial Custody">Judicial Custody</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Remand Duration (Days)</label>
                <input type="number" value={investigationData.remand_duration_days || 7} onChange={(e) => setInvestigationData({ ...investigationData, remand_duration_days: parseInt(e.target.value) || 0 })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Remand Start Date</label>
                <input type="date" value={investigationData.remand_start_date || ''} onChange={(e) => setInvestigationData({ ...investigationData, remand_start_date: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Remand End Date</label>
                <input type="date" value={investigationData.remand_end_date || ''} onChange={(e) => setInvestigationData({ ...investigationData, remand_end_date: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Jail / Custody Location</label>
                <input type="text" value={investigationData.custody_location || ''} onChange={(e) => setInvestigationData({ ...investigationData, custody_location: e.target.value })} className={inputClass} placeholder="District Central Jail Premises" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Court Order Remarks & Directions</label>
                <textarea value={investigationData.court_order_details || ''} onChange={(e) => setInvestigationData({ ...investigationData, court_order_details: e.target.value })} className={`${inputClass} h-20`} placeholder="Court order details..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB: Panchanama Details */}
        {(activeGroup === 'investigation' && activeSubTab === 'panchanama') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Accused Panchanama Records</h2>
              <button onClick={handleSaveInvestigation} disabled={savingInvestigation || caseData?.status?.toLowerCase() === 'closed'} className={primaryBtn}>
                {savingInvestigation ? 'Saving...' : 'Save Panchanama Record'}
              </button>
            </div>
            <form onSubmit={handleSaveInvestigation} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="space-y-1">
                <label className={labelClass}>Panchanama Date & Time</label>
                <input type="datetime-local" value={investigationData.panchanama_date_time || ''} onChange={(e) => setInvestigationData({ ...investigationData, panchanama_date_time: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Panchanama Location</label>
                <input type="text" value={investigationData.panchanama_location || ''} onChange={(e) => setInvestigationData({ ...investigationData, panchanama_location: e.target.value })} className={inputClass} placeholder="Spot Location of Panchanama" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Identification Marks Found</label>
                <input type="text" value={investigationData.identification_marks || ''} onChange={(e) => setInvestigationData({ ...investigationData, identification_marks: e.target.value })} className={inputClass} placeholder="Physical identification marks" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Personal Belongings Found</label>
                <input type="text" value={investigationData.personal_belongings || ''} onChange={(e) => setInvestigationData({ ...investigationData, personal_belongings: e.target.value })} className={inputClass} placeholder="Mobile Phone, Wallet, Cash" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Panchanama Detailed Narrative</label>
                <textarea value={investigationData.panchanama_narrative || ''} onChange={(e) => setInvestigationData({ ...investigationData, panchanama_narrative: e.target.value })} className={`${inputClass} h-24`} placeholder="Spot scene observation narrative..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB: Test Identification Parade (TIP) */}
        {(activeGroup === 'investigation' && activeSubTab === 'tip') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Test Identification Parade (TIP) Records</h2>
              <button onClick={handleSaveInvestigation} disabled={savingInvestigation || caseData?.status?.toLowerCase() === 'closed'} className={primaryBtn}>
                {savingInvestigation ? 'Saving...' : 'Save TIP Record'}
              </button>
            </div>
            <form onSubmit={handleSaveInvestigation} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="space-y-1">
                <label className={labelClass}>TIP Date & Time</label>
                <input type="datetime-local" value={investigationData.tip_date_time || ''} onChange={(e) => setInvestigationData({ ...investigationData, tip_date_time: e.target.value })} className={inputClass} disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>TIP Location / Venue</label>
                <input type="text" value={investigationData.tip_location || ''} onChange={(e) => setInvestigationData({ ...investigationData, tip_location: e.target.value })} className={inputClass} placeholder="Special Executive Magistrate Hall" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Dummy Participants Description</label>
                <input type="text" value={investigationData.dummy_participants || ''} onChange={(e) => setInvestigationData({ ...investigationData, dummy_participants: e.target.value })} className={inputClass} placeholder="8 dummy participants of similar height and stature" disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Identification Procedure Description</label>
                <textarea value={investigationData.procedure_description || ''} onChange={(e) => setInvestigationData({ ...investigationData, procedure_description: e.target.value })} className={`${inputClass} h-20`} placeholder="Identification procedure recorded as per BNSS guidelines..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Identification Parade Result</label>
                <textarea value={investigationData.identification_result || ''} onChange={(e) => setInvestigationData({ ...investigationData, identification_result: e.target.value })} className={`${inputClass} h-20`} placeholder="Witness positively identified suspect..." disabled={caseData?.status?.toLowerCase() === 'closed'} />
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB: Investigation Tasks */}
        {(activeGroup === 'investigation' && activeSubTab === 'tasks') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-gray-200 gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Investigation Task Board</h2>
                <div className="flex items-center gap-2">
                  <div className="w-36 bg-gray-250 rounded-full h-1.5 border border-gray-300">
                    <div className="bg-gray-900 h-1 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <span className="text-[9px] font-black text-gray-650">{progressPercent}% COMPLETED ({completedTasks}/{totalTasks})</span>
                </div>
              </div>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Investigation Task</span>
              </button>
            </div>

            {showTaskForm && (
              <form onSubmit={handleAddTask} className="p-5 border border-gray-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="task-title" className={labelClass}>Task Title</label>
                  <input
                    id="task-title"
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className={inputClass}
                    placeholder="E.g. Visit Crime Spot / Forensics"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="task-io" className={labelClass}>Assigned To (Officer Name/Unit)</label>
                  <input
                    id="task-io"
                    type="text"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="task-due" className={labelClass}>Due Date / Deadline</label>
                  <input
                    id="task-due"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="task-status" className={labelClass}>Initial Status</label>
                  <select
                    id="task-status"
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="task-desc" className={labelClass}>Task Details / Instructions</label>
                  <textarea
                    id="task-desc"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className={`${inputClass} h-16`}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* Task columns list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {['Pending', 'In Progress', 'Completed'].map((colStatus) => {
                const columnTasks = tasks.filter(t => t.status === colStatus);
                return (
                  <div key={colStatus} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col space-y-3 min-h-[40vh]">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 flex-shrink-0">
                      <span className="text-[10px] font-black text-gray-705 uppercase tracking-wider">{colStatus}</span>
                      <span className="text-[9px] bg-white border border-gray-205 text-gray-650 px-2 py-0.5 rounded-full font-black">
                        {columnTasks.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {columnTasks.length > 0 ? (
                        columnTasks.map(t => (
                          <div key={t.id} className="bg-white border border-gray-250 p-4.5 rounded-lg shadow-sm flex flex-col justify-between gap-3">
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-black text-gray-900 leading-normal">{t.title}</h4>
                              <p className="text-[10px] text-gray-500 leading-relaxed">{t.description}</p>
                              <div className="flex flex-wrap gap-2 text-[9px] font-bold text-gray-450 pt-1.5 border-t border-gray-100">
                                <span>IO: {t.assigned_to || 'N/A'}</span>
                                {t.due_date && (
                                  <>
                                    <span>•</span>
                                    <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
                              <select
                                value={t.status}
                                onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                                className="bg-white border border-gray-300 text-[9px] font-bold rounded px-1.5 py-0.5 outline-none text-gray-650"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-red-755 hover:text-red-800 p-0.5 hover:bg-red-550 rounded"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-400 italic text-[11px] font-bold">No tasks in {colStatus.toLowerCase()} status.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: Case Timeline */}
        {(activeGroup === 'investigation' && activeSubTab === 'timeline') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Case Timeline Milestones</h2>
              <button
                onClick={() => setShowTimelineForm(!showTimelineForm)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-3.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Custom Milestone</span>
              </button>
            </div>

            {showTimelineForm && (
              <form onSubmit={handleAddMilestone} className="p-4 border border-gray-200 rounded-lg bg-white flex flex-wrap gap-4 items-end">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label htmlFor="time-evt" className="text-[10px] font-bold text-gray-450 uppercase block">Milestone Event</label>
                  <select
                    id="time-evt"
                    value={newMilestone.event_name}
                    onChange={(e) => setNewMilestone({ ...newMilestone, event_name: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-gray-800 px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="Complaint Received">Complaint Received</option>
                    <option value="FIR Registered">FIR Registered</option>
                    <option value="Witness Statements">Witness Statements</option>
                    <option value="Evidence Collection">Evidence Collection</option>
                    <option value="Accused Arrested">Accused Arrested</option>
                    <option value="Medical Examination">Medical Examination</option>
                    <option value="Court Submission">Court Submission</option>
                    <option value="Charge Sheet Filed">Charge Sheet Filed</option>
                  </select>
                </div>
                <div className="space-y-1 flex-[2] min-w-[300px]">
                  <label htmlFor="time-desc" className="text-[10px] font-bold text-gray-455 uppercase block">Description Details</label>
                  <input
                    id="time-desc"
                    type="text"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className={inputClass}
                    placeholder="Enter short details..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTimelineForm(false)}
                    className={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                  >
                    Log Milestone
                  </button>
                </div>
              </form>
            )}

            <div className="relative border-l-2 border-gray-200 pl-6 space-y-6 py-2 ml-4">
              {timeline.length > 0 ? (
                timeline.map((mile) => (
                  <div key={mile.id} className="relative">
                    <span className="absolute -left-[31px] top-1 bg-gray-900 text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-[8px] font-bold">
                      ✓
                    </span>
                    <div className="space-y-1 bg-white p-4 border border-gray-200 rounded-lg max-w-2xl shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-900 uppercase">{mile.event_name}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{new Date(mile.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-650 leading-relaxed">{mile.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 py-6 text-xs italic font-semibold border-l border-transparent">No timeline milestones logged.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: Document generation workbench */}
        {(activeGroup === 'documents') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Legal Documentation Workbench</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none text-gray-750 font-bold focus:ring-1 focus:ring-gray-900"
                  aria-label="Select template document type"
                >
                  <option value="purvani_chargesheet">Purvani Chargesheet (Supplementary)</option>
                  <option value="medical_treatment_letter">Medical Treatment Letter</option>
                  <option value="remand_request_letter">Remand Request Letter</option>
                  <option value="seizure_receipt">Seizure Receipt (Memo)</option>
                  <option value="court_custody_letter">Court Custody Letter</option>
                  <option value="accused_panchanama">Accused Panchanama</option>
                  <option value="face_identification_form">Face Identification Form</option>
                  <option value="case_summary">General Case Summary Report</option>
                </select>
                <button
                  onClick={handleGenerateDocument}
                  disabled={generatingDoc}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
                >
                  {generatingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Draft</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Registry List */}
              <div className="bg-white border border-gray-200 rounded-lg p-4.5 space-y-4 lg:col-span-1 shadow-sm">
                <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Case Generated Archive</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {generatedDocuments.length > 0 ? (
                    generatedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`w-full text-left p-3.5 border rounded-lg bg-white shadow-sm flex flex-col gap-2 transition-all relative ${
                          previewDoc?.id === doc.id ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50/50' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider block">
                              {doc.document_type?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] font-black text-gray-900 block truncate">Draft #{doc.id}</span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-bold">{new Date(doc.created_date).toLocaleDateString()}</span>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="bg-gray-900 hover:bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-all"
                            title="View Formatted DOCX Document"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Document</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile('docx', doc);
                            }}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-all"
                            title="Download DOCX File"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                            <span>DOCX</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile('pdf', doc);
                            }}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-all"
                            title="Download PDF File"
                          >
                            <FileText className="w-3 h-3 text-red-600" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocToDelete(doc);
                            }}
                            className="bg-white border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-all ml-auto"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 border border-dashed border-gray-200 bg-gray-50 rounded-lg text-center space-y-3 w-full">
                      <p className="text-xs text-gray-400 font-semibold">No generated documents</p>
                      <button
                        type="button"
                        onClick={handleGenerateDocument}
                        className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase"
                      >
                        Generate Document
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Preview Panel */}
              <div className="lg:col-span-2">
                {previewDoc ? (
                  <DocumentPreview
                    doc={previewDoc}
                    onDownload={handleDownloadFile}
                    onDelete={() => setDocToDelete(previewDoc)}
                  />
                ) : (
                  <div className="flex items-center justify-center flex-1 text-gray-400 text-xs font-semibold py-24 border border-gray-200 bg-gray-50 rounded-lg">
                    Select a generated document from the archive list, or generate a new predefined draft to open preview.
                  </div>
                )}
              </div>
            </div>

            {/* Delete Document Confirmation Modal */}
            {docToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-200">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="text-sm font-black uppercase tracking-wide">Confirm Delete Document</h3>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    Are you sure you want to delete this document? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setDocToDelete(null)}
                      className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                      disabled={deletingDoc}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(docToDelete.id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                      disabled={deletingDoc}
                    >
                      {deletingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AI Case Assistant chat */}
        {(activeGroup === 'assistant') && (
          <div className="space-y-6">
            <h2 className="text-xs font-black text-gray-750 uppercase tracking-widest pb-3 border-b border-gray-200">
              CrimeGPT Case Co-Pilot Assistant
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Chat recommendations quick controls */}
              <div className="bg-white border border-gray-255 rounded-lg p-4.5 space-y-4 lg:col-span-1 flex flex-col shadow-sm">
                <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Co-Pilot Brief Actions</h3>
                <div className="space-y-2 text-xs flex-1">
                  <button
                    onClick={() => {
                      setChatInput('Summarize this case dossier profile.');
                    }}
                    className="w-full text-left bg-white border border-gray-300 hover:bg-gray-50 p-2.5 rounded-lg font-bold text-gray-755"
                  >
                    🔍 Summarize Case
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('Find missing investigation details or timeline gaps.');
                    }}
                    className="w-full text-left bg-white border border-gray-300 hover:bg-gray-50 p-2.5 rounded-lg font-bold text-gray-755"
                  >
                    ⚠️ Audit Case Gaps
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('Explain applicable BNS/BNSS/BSA provisions and list relevant judgments.');
                    }}
                    className="w-full text-left bg-white border border-gray-300 hover:bg-gray-50 p-2.5 rounded-lg font-bold text-gray-755"
                  >
                    ⚖️ Suggest Legal Actions
                  </button>
                </div>
              </div>

              {/* Chat container */}
              <div className="lg:col-span-3 border border-gray-250 rounded-lg flex flex-col justify-between h-[50vh] bg-gray-50 overflow-hidden shadow-sm">
                {/* Message logs */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[38vh]">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'Officer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-3.5 rounded-lg text-xs leading-relaxed ${msg.sender === 'Officer'
                          ? 'bg-gray-900 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none font-sans shadow-sm'
                        }`}>
                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-75 mb-1">{msg.sender}</span>
                        <p className="whitespace-pre-wrap leading-normal font-medium">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-850 border border-gray-200 p-3 rounded-lg rounded-bl-none flex items-center gap-2 text-xs shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-900" />
                        <span className="font-bold">CrimeGPT AI co-pilot is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter legal search queries, gaps requests..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                    disabled={sendingChat}
                    aria-label="Ask Legal AI Co-pilot"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">Audit Trail Modification History</h2>
              <button
                onClick={() => fetchAuditLogs()}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                Refresh Log
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Modification Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-bold text-gray-655">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-all">
                          <td className="py-3 px-4 font-black text-gray-855">{log.user_name}</td>
                          <td className="py-3 px-4 uppercase text-[9px] text-gray-955 font-bold">{log.action}</td>
                          <td className="py-3 px-4 text-gray-400 font-medium">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4 font-medium text-gray-500 leading-normal">{log.details || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-gray-400 italic">No audit log history entries matching this Case profile.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* GROUP 5: Close Case Workflow */}
{
  activeGroup === 'close' && (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-gray-200">
        <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-900" />
          <span>Case Closure Workflow & Validation Checklist</span>
        </h2>
        {caseData?.status?.toLowerCase() === 'closed' ? (
          <span className="bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider">
            Status: CASE OFFICIALLY CLOSED
          </span>
        ) : (
          <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider">
            Status: INVESTIGATION ACTIVE
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
        <p className="text-xs text-gray-600 font-medium leading-relaxed">
          Before closing a case file, all mandatory FIR and investigation checklist items must be completed or verified. Optional investigation items (Medical Records, Court/Remand, Panchanama, TIP) may be marked as <strong>N/A</strong> if genuinely not applicable to this incident.
        </p>

        {/* Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mandatory Checklist Items */}
          <div className="space-y-2.5 bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block border-b border-gray-200 pb-1">
              Mandatory Case Requirements
            </span>

            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1">
              <span>1. FIR Details & Metadata</span>
              <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>2. Complainant Record</span>
              <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>3. Witness Details ({witnesses.length})</span>
              {witnesses.length > 0 ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Recommended</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>4. Suspects / Accused Details ({suspects.length})</span>
              {suspects.length > 0 ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Recommended</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>5. Evidence Records ({evidenceList.length})</span>
              {evidenceList.length > 0 ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Recommended</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>6. Case Timeline Milestones ({timeline.length})</span>
              <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</span>
            </div>
          </div>

          {/* Optional Investigation Checklist Items */}
          <div className="space-y-2.5 bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block border-b border-gray-200 pb-1">
              Investigation Module Requirements
            </span>

            {/* Medical */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1">
              <span>Medical Details</span>
              {investigationData.hospital_name ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Filled</span>
              ) : (
                <button
                  onClick={() => setChecklistNA(prev => ({ ...prev, medical: !prev.medical }))}
                  className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${checklistNA.medical ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                >
                  {checklistNA.medical ? 'Marked N/A' : 'Mark as N/A'}
                </button>
              )}
            </div>

            {/* Court */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>Court / Remand Details</span>
              {investigationData.court_name ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Filled</span>
              ) : (
                <button
                  onClick={() => setChecklistNA(prev => ({ ...prev, court: !prev.court }))}
                  className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${checklistNA.court ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                >
                  {checklistNA.court ? 'Marked N/A' : 'Mark as N/A'}
                </button>
              )}
            </div>

            {/* Panchanama */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>Panchanama Details</span>
              {investigationData.panchanama_location ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Filled</span>
              ) : (
                <button
                  onClick={() => setChecklistNA(prev => ({ ...prev, panchanama: !prev.panchanama }))}
                  className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${checklistNA.panchanama ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                >
                  {checklistNA.panchanama ? 'Marked N/A' : 'Mark as N/A'}
                </button>
              )}
            </div>

            {/* TIP */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-800 py-1 border-t border-gray-200">
              <span>Test Identification Parade (TIP)</span>
              {investigationData.tip_location ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Filled</span>
              ) : (
                <button
                  onClick={() => setChecklistNA(prev => ({ ...prev, tip: !prev.tip }))}
                  className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${checklistNA.tip ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                >
                  {checklistNA.tip ? 'Marked N/A' : 'Mark as N/A'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
          {caseData?.status?.toLowerCase() === 'closed' ? (
            user?.role === 'ADMIN' ? (
              <button onClick={handleReopenCase} className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider">
                Reopen Case (Admin Clearance)
              </button>
            ) : (
              <span className="text-xs text-gray-500 font-bold italic">Only Administrative Officers (ADMIN) can reopen closed cases.</span>
            )
          ) : (
            <button onClick={handleCloseCase} disabled={closingCase} className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <Lock className="w-4 h-4" />
              <span>{closingCase ? 'Closing Case...' : 'Officially Close Case'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )}
      </div>
    </div>
  );
};

export default CaseDetails;