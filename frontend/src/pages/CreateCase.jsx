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
  AlertCircle
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

  // Case Details nested fields
  const [victimDetails, setVictimDetails] = useState('');
  const [accusedDetails, setAccusedDetails] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [ipcSections, setIpcSections] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');

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
        victim_details: victimDetails,
        accused_details: accusedDetails,
        incident_description: incidentDescription,
        ipc_sections: ipcSections,
        evidence_details: evidenceDetails
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
    <div className="p-8 space-y-8 w-full max-w-4xl mx-auto">
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
            <p className="text-sm text-slate-400 mt-1">Register new criminal incident record entry inside database.</p>
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
        {/* Section 1: Core Case Metadata */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Briefcase className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">General Incident Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FIR Number */}
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

            {/* Crime Category */}
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

            {/* Police Station */}
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

            {/* Date and Time of Incident */}
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

            {/* Case Status */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Investigation Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-police-dark border border-police-border hover:border-police-accent/30 px-4 py-2.5 rounded-xl text-sm transition-all">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="accent-police-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-300 font-medium">Active (Ongoing Investigation)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-police-dark border border-police-border hover:border-police-accent/30 px-4 py-2.5 rounded-xl text-sm transition-all">
                  <input
                    type="radio"
                    name="status"
                    value="closed"
                    checked={status === 'closed'}
                    onChange={() => setStatus('closed')}
                    className="accent-police-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-300 font-medium">Closed (Resolved/Disposed)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Case Details */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Users className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Parties & Evidence Metadata</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Victim details */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Victim details</label>
              <textarea
                rows={2}
                placeholder="Name, Age, Father's Name, Contact/Address..."
                value={victimDetails}
                onChange={(e) => setVictimDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none resize-none"
              />
            </div>

            {/* Accused details */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Accused details</label>
              <textarea
                rows={2}
                placeholder="Name, Age, Parentage, Known aliases/Address..."
                value={accusedDetails}
                onChange={(e) => setAccusedDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none resize-none"
              />
            </div>

            {/* IPC / BNS Sections */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Applicable Sections (IPC / BNS)</label>
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

        {/* Section 3: Narrative & Evidence */}
        <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <FileText className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Case Narrative & Seizures</h3>
          </div>

          <div className="space-y-6">
            {/* Incident Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Description of Incident</label>
              <textarea
                rows={5}
                required
                placeholder="Provide a comprehensive breakdown of the occurrence, chronological timeline of actions, and witness statements..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none resize-none"
              />
            </div>

            {/* Evidence details */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">Evidence and Seized details</label>
              <textarea
                rows={3}
                placeholder="List recovered weapons, forensics, fingerprints, CCTV footage, mobile records, etc..."
                value={evidenceDetails}
                onChange={(e) => setEvidenceDetails(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none resize-none"
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
