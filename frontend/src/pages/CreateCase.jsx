import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FolderPlus, 
  ChevronLeft, 
  Save, 
  Briefcase, 
  Users, 
  FileText, 
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle
} from 'lucide-react';

const CreateCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Primary Metadata fields
  const [firNumber, setFirNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [status, setStatus] = useState('active');
  const [investigatingOfficer, setInvestigatingOfficer] = useState('');

  // Structured Victim Info
  const [victim, setVictim] = useState({
    name: '', age: '', gender: 'Male', father_mother_name: '', address: '', contact_number: '', occupation: ''
  });

  // Structured Accused Info
  const [accused, setAccused] = useState({
    name: '', age: '', gender: 'Male', address: '', known_aliases: '', previous_record: ''
  });

  // Witnesses list (multiple)
  const [witnesses, setWitnesses] = useState([]);

  // Evidence Items list (multiple)
  const [evidenceItems, setEvidenceItems] = useState([]);

  // Incident narrative and sections
  const [incidentDescription, setIncidentDescription] = useState('');
  const [ipcSections, setIpcSections] = useState('');

  const handleVictimChange = (field, value) => {
    setVictim(prev => ({ ...prev, [field]: value }));
  };

  const handleAccusedChange = (field, value) => {
    setAccused(prev => ({ ...prev, [field]: value }));
  };

  const handleAddWitness = () => {
    setWitnesses(prev => [...prev, { name: '', contact: '', address: '', statement: '' }]);
  };

  const handleWitnessChange = (index, field, value) => {
    const updated = [...witnesses];
    updated[index][field] = value;
    setWitnesses(updated);
  };

  const handleRemoveWitness = (index) => {
    setWitnesses(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEvidenceItem = () => {
    setEvidenceItems(prev => [...prev, { evidence_type: '', description: '', recovered_from: '', recovery_date: '', uploaded_file: '', officer_remarks: '' }]);
  };

  const handleEvidenceItemChange = (index, field, value) => {
    const updated = [...evidenceItems];
    updated[index][field] = value;
    setEvidenceItems(updated);
  };

  const handleRemoveEvidenceItem = (index) => {
    setEvidenceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      fir_number: firNumber,
      police_station: policeStation,
      crime_type: crimeType,
      incident_date: new Date(incidentDate).toISOString(),
      status: status,
      details: {
        victim_details: victim,
        accused_details: accused,
        incident_description: incidentDescription,
        ipc_sections: ipcSections,
        evidence_details: evidenceItems,
        witnesses: witnesses,
        investigating_officer: investigatingOfficer
      }
    };

    try {
      const response = await api.post('/cases/', payload);
      navigate(`/cases/${response.data.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err._parsedMessage || 
        'Case registration failed. Make sure the FIR Number is unique.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 w-full max-w-5xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-police-border pb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/cases" 
            className="p-2 hover:bg-police-card rounded-lg text-slate-400 hover:text-slate-200 border border-transparent hover:border-police-border transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">FIR Case Filing</h1>
            <p className="text-sm text-slate-400 mt-1">Register structured investigation data inside database.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: GENERAL INFORMATION */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Briefcase className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">General Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">FIR Number</label>
              <input
                type="text"
                required
                placeholder="e.g. FIR-102/2026"
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Crime Category</label>
              <input
                type="text"
                required
                placeholder="e.g. Theft, Assault, Homicide"
                value={crimeType}
                onChange={(e) => setCrimeType(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Assigned Police Station</label>
              <input
                type="text"
                required
                placeholder="e.g. Baker Street Police Station"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Date and Time of Incident</label>
              <input
                type="datetime-local"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Investigating Officer</label>
              <input
                type="text"
                required
                placeholder="e.g. Inspector R. Singh"
                value={investigatingOfficer}
                onChange={(e) => setInvestigatingOfficer(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Investigation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none cursor-pointer"
              >
                <option value="active">Active (Ongoing Investigation)</option>
                <option value="closed">Closed (Resolved/Disposed)</option>
                <option value="pending">Pending (Awaiting Action)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: VICTIM INFORMATION */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Users className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Victim Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={victim.name}
                onChange={(e) => handleVictimChange('name', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Age</label>
              <input
                type="text"
                placeholder="Age"
                value={victim.age}
                onChange={(e) => handleVictimChange('age', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Gender</label>
              <select
                value={victim.gender}
                onChange={(e) => handleVictimChange('gender', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Father's/Mother's Name</label>
              <input
                type="text"
                placeholder="Parent's Name"
                value={victim.father_mother_name}
                onChange={(e) => handleVictimChange('father_mother_name', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Contact Number</label>
              <input
                type="text"
                placeholder="Contact Number"
                value={victim.contact_number}
                onChange={(e) => handleVictimChange('contact_number', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Occupation</label>
              <input
                type="text"
                placeholder="Occupation"
                value={victim.occupation}
                onChange={(e) => handleVictimChange('occupation', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Address</label>
              <input
                type="text"
                placeholder="Residential Address"
                value={victim.address}
                onChange={(e) => handleVictimChange('address', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: ACCUSED INFORMATION */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Users className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Accused Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Name</label>
              <input
                type="text"
                placeholder="Name"
                value={accused.name}
                onChange={(e) => handleAccusedChange('name', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Age</label>
              <input
                type="text"
                placeholder="Age"
                value={accused.age}
                onChange={(e) => handleAccusedChange('age', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Gender</label>
              <select
                value={accused.gender}
                onChange={(e) => handleAccusedChange('gender', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Address</label>
              <input
                type="text"
                placeholder="Last Known Address"
                value={accused.address}
                onChange={(e) => handleAccusedChange('address', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Known Aliases</label>
              <input
                type="text"
                placeholder="Aliases (e.g. 'Bunty', 'Titu')"
                value={accused.known_aliases}
                onChange={(e) => handleAccusedChange('known_aliases', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Previous Criminal Record</label>
              <textarea
                rows={2}
                placeholder="Previous convictions or pending trials (optional)"
                value={accused.previous_record}
                onChange={(e) => handleAccusedChange('previous_record', e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 px-3 py-2 rounded-xl text-sm outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: WITNESSES */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-police-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-police-accent" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Witnesses</h3>
            </div>
            <button
              type="button"
              onClick={handleAddWitness}
              className="bg-police-border hover:bg-police-border/80 border border-police-border text-police-accent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Witness</span>
            </button>
          </div>

          {witnesses.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No witnesses added to case files yet. Use the button to register witnesses.</p>
          ) : (
            <div className="space-y-6">
              {witnesses.map((w, idx) => (
                <div key={idx} className="bg-police-dark/50 border border-police-border/40 p-4 rounded-xl relative space-y-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveWitness(idx)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-400 p-1 bg-police-card border border-police-border rounded-lg"
                    title="Remove Witness"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <h4 className="text-xs font-extrabold text-police-glow uppercase tracking-wider">Witness #{idx + 1}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Witness Name"
                        value={w.name}
                        onChange={(e) => handleWitnessChange(idx, 'name', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Number</label>
                      <input
                        type="text"
                        placeholder="Contact Number"
                        value={w.contact}
                        onChange={(e) => handleWitnessChange(idx, 'contact', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                      <input
                        type="text"
                        placeholder="Residential Address"
                        value={w.address}
                        onChange={(e) => handleWitnessChange(idx, 'address', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statement Record</label>
                      <textarea
                        rows={3}
                        placeholder="Statement recorded under Section 161 CrPC / Section 180 BNSS..."
                        value={w.statement}
                        onChange={(e) => handleWitnessChange(idx, 'statement', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: EVIDENCE ITEMS */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-police-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-police-accent" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Evidence Registry</h3>
            </div>
            <button
              type="button"
              onClick={handleAddEvidenceItem}
              className="bg-police-border hover:bg-police-border/80 border border-police-border text-police-accent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Evidence Item</span>
            </button>
          </div>

          {evidenceItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No structured evidence items logged yet. (Note: You can also upload files in the Investigation Workspace later.)</p>
          ) : (
            <div className="space-y-6">
              {evidenceItems.map((ev, idx) => (
                <div key={idx} className="bg-police-dark/50 border border-police-border/40 p-4 rounded-xl relative space-y-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveEvidenceItem(idx)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-400 p-1 bg-police-card border border-police-border rounded-lg"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <h4 className="text-xs font-extrabold text-police-glow uppercase tracking-wider">Evidence Item #{idx + 1}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Type</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Weapon, CCTV, Mobil records"
                        value={ev.evidence_type}
                        onChange={(e) => handleEvidenceItemChange(idx, 'evidence_type', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recovered From (Suspect/Place)</label>
                      <input
                        type="text"
                        placeholder="e.g. Accused home kitchen"
                        value={ev.recovered_from}
                        onChange={(e) => handleEvidenceItemChange(idx, 'recovered_from', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recovery Date</label>
                      <input
                        type="date"
                        value={ev.recovery_date}
                        onChange={(e) => handleEvidenceItemChange(idx, 'recovery_date', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. One blood stained iron rod, length 1.2 feet"
                        value={ev.description}
                        onChange={(e) => handleEvidenceItemChange(idx, 'description', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Officer Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Dispatched to forensics laboratory on 12/07/2026"
                        value={ev.officer_remarks}
                        onChange={(e) => handleEvidenceItemChange(idx, 'officer_remarks', e.target.value)}
                        className="w-full bg-police-dark border border-police-border text-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6: NARRATIVE DETAILS */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <FileText className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Incident Details</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Complete Incident Narrative</label>
              <textarea
                rows={5}
                required
                placeholder="Provide a comprehensive breakdown of the occurrence, chronological timeline of actions, and case details..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Applicable IPC / BNS Sections</label>
              <input
                type="text"
                placeholder="e.g. Section 302, Section 379 IPC / Section 101, Section 303 BNS"
                value={ipcSections}
                onChange={(e) => setIpcSections(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Form Submission Button */}
        <div className="flex justify-end gap-4 border-t border-police-border/40 pt-6">
          <Link
            to="/cases"
            className="bg-police-card border border-police-border hover:border-slate-500 text-slate-350 font-bold px-6 py-3 rounded-xl text-sm transition-all"
          >
            Cancel Draft
          </Link>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-police-accent/15 flex items-center gap-2 hover:-translate-y-0.5"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Case to Registry</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;
