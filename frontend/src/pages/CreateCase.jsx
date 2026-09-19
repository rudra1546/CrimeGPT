import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LegalSectionSelector from '../components/LegalSectionSelector';
import { EVIDENCE_CATEGORIES } from '../data/evidenceCategories';
import { 
  Briefcase, 
  ChevronLeft, 
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  Paperclip,
  Users,
  FileText,
  Image,
  Film,
  Music
} from 'lucide-react';

const CreateCase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only Police Officers (POLICE_OFFICER) are authorized to create new cases
  if (user?.role !== 'POLICE_OFFICER') {
    return <Navigate to="/dashboard" replace />;
  }
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evidenceCategories, setEvidenceCategories] = useState(EVIDENCE_CATEGORIES);

  // Primary Metadata fields
  const [firNumber, setFirNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [status, setStatus] = useState('active');
  const [investigatingOfficer, setInvestigatingOfficer] = useState('');

  // Structured lists
  const [legalSections, setLegalSections] = useState([]);

  // Category Dropdown search states
  const [categories, setCategories] = useState([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Structured Victim Info
  const [victim, setVictim] = useState({
    name: '', age: '', gender: 'Male', father_mother_name: '', address: '', contact_number: '', occupation: ''
  });

  // Structured Accused Info
  const [accused, setAccused] = useState({
    name: '', age: '', gender: 'Male', address: '', known_aliases: '', previous_record: '', accused_mobile_number: '', mobile_number: ''
  });

  // Witnesses list (multiple)
  const [witnesses, setWitnesses] = useState([]);

  // Evidence Items list (multiple)
  const [evidenceItems, setEvidenceItems] = useState([]);

  // Incident narrative and sections
  const [incidentDescription, setIncidentDescription] = useState('');

  // Bundled fallback category dataset
  const fallbackCategories = [
    "Murder", "Attempt to Murder", "Theft", "Robbery", "Dacoity",
    "Burglary", "Kidnapping", "Assault", "Domestic Violence", "Dowry",
    "Rape", "Sexual Harassment", "Cyber Fraud", "Cheating", "Forgery",
    "Extortion", "Criminal Breach of Trust", "Drug Offences", "Arms Act Offences",
    "Traffic Offences", "Missing Person", "Accident", "Fraud", "Financial Crime",
    "Juvenile Crime", "Trespassing", "Rioting", "Public Nuisance", "Other"
  ];

  // Fetch and cache crime category list
  useEffect(() => {
    const fetchCategories = async () => {
      const cacheKey = "crimegpt_categories";
      
      // Offline fallback first
      if (!navigator.onLine) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setCategories(JSON.parse(cached));
            return;
          } catch (e) {}
        }
        setCategories(fallbackCategories);
        return;
      }

      try {
        const response = await api.get('/crimes/categories');
        setCategories(response.data || fallbackCategories);
        localStorage.setItem(cacheKey, JSON.stringify(response.data || fallbackCategories));
      } catch (err) {
        console.error("Failed to load crime categories online:", err);
        const cached = localStorage.getItem(cacheKey);
        setCategories(cached ? JSON.parse(cached) : fallbackCategories);
      }

      try {
        const evRes = await api.get('/crimes/evidence-categories');
        if (evRes.data && Array.isArray(evRes.data) && evRes.data.length > 0) {
          setEvidenceCategories(evRes.data);
        }
      } catch (err) {
        console.warn("Using bundled evidence categories list:", err);
      }
    };
    fetchCategories();
  }, []);

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
    setEvidenceItems(prev => [
      ...prev,
      {
        evidence_type: evidenceCategories[0] || 'Physical Weapon/Object',
        description: '',
        recovered_from: '',
        recovery_date: '',
        officer_remarks: '',
        attachments: []
      }
    ]);
  };

  const handleEvidenceItemChange = (index, field, value) => {
    const updated = [...evidenceItems];
    updated[index][field] = value;
    setEvidenceItems(updated);
  };

  const handleRemoveEvidenceItem = (index) => {
    setEvidenceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAttachment = (evidenceIndex) => {
    const updated = [...evidenceItems];
    const currentAttachments = updated[evidenceIndex].attachments || [];
    updated[evidenceIndex].attachments = [
      ...currentAttachments,
      {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        media_type: 'image',
        file: null,
        description: ''
      }
    ];
    setEvidenceItems(updated);
  };

  const handleAttachmentChange = (evidenceIndex, attachmentIndex, field, value) => {
    const updated = [...evidenceItems];
    updated[evidenceIndex].attachments[attachmentIndex][field] = value;
    setEvidenceItems(updated);
  };

  const handleRemoveAttachment = (evidenceIndex, attachmentIndex) => {
    const updated = [...evidenceItems];
    updated[evidenceIndex].attachments = updated[evidenceIndex].attachments.filter((_, idx) => idx !== attachmentIndex);
    setEvidenceItems(updated);
  };

  const handleAttachmentFileChange = (evidenceIndex, attachmentIndex, file) => {
    if (!file) return;
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed upload limit of 50 MB. Please select a smaller file.`);
      return;
    }
    const updated = [...evidenceItems];
    updated[evidenceIndex].attachments[attachmentIndex].file = file;
    setEvidenceItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!crimeType) {
      setError('Please select a valid Crime Category from the dropdown.');
      return;
    }
    setError('');
    setLoading(true);

    const payload = {
      fir_number: firNumber,
      police_station: policeStation,
      crime_type: crimeType,
      crime_category: crimeType,
      incident_date: new Date(incidentDate).toISOString(),
      status: status,
      details: {
        victim_details: victim,
        accused_details: accused,
        witnesses: witnesses,
        evidence_details: evidenceItems,
        incident_description: incidentDescription,
        ipc_sections: legalSections.map(s => `${s.law} ${s.section}`).join(', '),
        legal_sections: legalSections,
        investigating_officer: investigatingOfficer
      }
    };
    console.log("CASE CREATION PAYLOAD:", payload);

    try {
      const caseRes = await api.post('/cases/', payload);
      const createdCase = caseRes.data;
      const caseId = createdCase.id;

      // Process supporting media attachments for evidence items
      for (let i = 0; i < evidenceItems.length; i++) {
        const ev = evidenceItems[i];
        const validAttachments = (ev.attachments || []).filter(a => a.file);
        if (validAttachments.length > 0) {
          const formData = new FormData();
          validAttachments.forEach(att => {
            formData.append('files', att.file);
          });
          formData.append('evidence_type', ev.evidence_type || 'Physical Weapon/Object');
          formData.append('description', ev.description || '');
          formData.append('collection_location', ev.recovered_from || '');
          formData.append('collection_date', ev.recovery_date || new Date().toISOString());
          formData.append('collecting_officer', ev.officer_remarks || '');
          const metadata = validAttachments.map(att => ({
            media_type: att.media_type,
            description: att.description || ''
          }));
          formData.append('attachments_metadata', JSON.stringify(metadata));

          const matchingEv = (createdCase.evidence || []).find(e => 
            (e.description === ev.description || !ev.description) && 
            (e.collection_location === ev.recovered_from || !ev.recovered_from)
          );
          if (matchingEv) {
            formData.append('evidence_id', matchingEv.id);
          }

          await api.post(`/cases/${caseId}/evidence`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      navigate('/cases');
    } catch (err) {
      console.error(err);
      setError(err._parsedMessage || 'Failed registering case file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter categories by search queries
  const filteredCategories = categories.filter(cat => 
    cat.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const inputClass = "w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all";
  const labelClass = "text-xs font-bold text-[#1e293b] uppercase tracking-wider block mb-1";
  const sectionClass = "bg-[#ffffff] border border-[#e2e8f0] rounded-lg p-6 space-y-5 shadow-sm";

  return (
    <div className="p-8 space-y-8 w-full max-w-5xl mx-auto bg-[#f8fafc] min-h-screen">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/cases" 
            className="p-2 hover:bg-[#eff6ff] rounded-lg text-[#64748b] hover:text-[#1e293b] border border-[#e2e8f0] transition-all bg-[#ffffff]"
            aria-label="Return to Cases Directory"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-wide text-[#1e293b] uppercase">FIR Case Filing</h1>
            <p className="text-xs text-[#64748b] mt-1">Register structured investigation data inside the central database.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-lg flex items-center gap-3 text-xs font-bold" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: GENERAL INFORMATION */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
            <Briefcase className="w-4 h-4 text-[#1e3a8a]" />
            <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">General Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="firNumber" className={labelClass}>FIR Number</label>
              <input
                id="firNumber"
                type="text"
                required
                placeholder="e.g. FIR-102/2026"
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Searchable dropdown for Crime Category */}
            <div className="space-y-1 relative">
              <label className={labelClass}>Crime Category</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search and select Category..."
                  value={crimeType ? crimeType : searchCategory}
                  onChange={(e) => {
                    setCrimeType(''); // Reset choice while typing
                    setSearchCategory(e.target.value);
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  className={inputClass}
                  aria-label="Filter crime category selection"
                />
                {(crimeType || searchCategory) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCrimeType('');
                      setSearchCategory('');
                    }}
                    className="absolute right-3 top-2.5 text-[#64748b] hover:text-[#1e293b] text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {showCategoryDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-[#e2e8f0]">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCrimeType(cat);
                          setSearchCategory('');
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-[#eff6ff] text-[#1e293b] font-bold"
                      >
                        {cat}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-[#64748b] italic">No matching categories found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="policeStation" className={labelClass}>Assigned Police Station</label>
              <input
                id="policeStation"
                type="text"
                required
                placeholder="e.g. District Headquarters Police Station"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="incidentDate" className={labelClass}>Date and Time of Incident</label>
              <input
                id="incidentDate"
                type="datetime-local"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="investigatingOfficer" className={labelClass}>Investigating Officer</label>
              <input
                id="investigatingOfficer"
                type="text"
                required
                placeholder="e.g. Inspector R. Singh"
                value={investigatingOfficer}
                onChange={(e) => setInvestigatingOfficer(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="status" className={labelClass}>Investigation Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="closed">Closed / Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: LEGAL SECTION RECOMMENDATION WORKSPACE */}
        {crimeType && (
          <LegalSectionSelector
            crimeType={crimeType}
            selectedSections={legalSections}
            onChange={setLegalSections}
            role={user?.role}
          />
        )}

        {/* SECTION 3: VICTIM INFORMATION */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
            <Users className="w-4 h-4 text-[#1e3a8a]" />
            <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Victim Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label htmlFor="victimName" className={labelClass}>Victim Name</label>
              <input
                id="victimName"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={victim.name}
                onChange={(e) => handleVictimChange('name', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="victimAge" className={labelClass}>Age</label>
              <input
                id="victimAge"
                type="number"
                required
                placeholder="e.g. 34"
                value={victim.age}
                onChange={(e) => handleVictimChange('age', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="victimGender" className={labelClass}>Gender</label>
              <select
                id="victimGender"
                value={victim.gender}
                onChange={(e) => handleVictimChange('gender', e.target.value)}
                className={inputClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="victimRelation" className={labelClass}>Father/Mother Name</label>
              <input
                id="victimRelation"
                type="text"
                placeholder="e.g. Robert Doe"
                value={victim.father_mother_name}
                onChange={(e) => handleVictimChange('father_mother_name', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="victimContact" className={labelClass}>Contact Number</label>
              <input
                id="victimContact"
                type="text"
                placeholder="e.g. +91 9876543210"
                value={victim.contact_number}
                onChange={(e) => handleVictimChange('contact_number', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="victimOccupation" className={labelClass}>Occupation</label>
              <input
                id="victimOccupation"
                type="text"
                placeholder="e.g. Analyst"
                value={victim.occupation}
                onChange={(e) => handleVictimChange('occupation', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label htmlFor="victimAddress" className={labelClass}>Full Residential Address</label>
              <input
                id="victimAddress"
                type="text"
                required
                placeholder="e.g. Administrative Block, State Police Headquarters"
                value={victim.address}
                onChange={(e) => handleVictimChange('address', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: ACCUSED / SUSPECT DETAILS */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
            <Users className="w-4 h-4 text-[#1e3a8a]" />
            <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Accused / Suspect Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label htmlFor="accusedName" className={labelClass}>Accused Name</label>
              <input
                id="accusedName"
                type="text"
                required
                placeholder="e.g. Moriarty"
                value={accused.name}
                onChange={(e) => handleAccusedChange('name', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="accusedAge" className={labelClass}>Age</label>
              <input
                id="accusedAge"
                type="number"
                placeholder="e.g. 45"
                value={accused.age}
                onChange={(e) => handleAccusedChange('age', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="accusedGender" className={labelClass}>Gender</label>
              <select
                id="accusedGender"
                value={accused.gender}
                onChange={(e) => handleAccusedChange('gender', e.target.value)}
                className={inputClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="accusedAlias" className={labelClass}>Known Aliases</label>
              <input
                id="accusedAlias"
                type="text"
                placeholder="e.g. The Professor"
                value={accused.known_aliases}
                onChange={(e) => handleAccusedChange('known_aliases', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="accusedMobile" className={labelClass}>Suspect/Accused Mobile Number</label>
              <input
                id="accusedMobile"
                type="tel"
                placeholder="e.g. 9876543210 (10 digits)"
                value={accused.accused_mobile_number || accused.mobile_number || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleAccusedChange('accused_mobile_number', val);
                  handleAccusedChange('mobile_number', val);
                }}
                className={inputClass}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="accusedRecord" className={labelClass}>Previous Convictions / Records</label>
              <input
                id="accusedRecord"
                type="text"
                placeholder="e.g. Charged under theft in 2021"
                value={accused.previous_record}
                onChange={(e) => handleAccusedChange('previous_record', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label htmlFor="accusedAddress" className={labelClass}>Last Known Address</label>
              <input
                id="accusedAddress"
                type="text"
                placeholder="e.g. Suite 4A, Westminster, London"
                value={accused.address}
                onChange={(e) => handleAccusedChange('address', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: WITNESSES (DYNAMIC LIST) */}
        <div className={sectionClass}>
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1e3a8a]" />
              <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Witness Accounts</h3>
            </div>
            <button
              type="button"
              onClick={handleAddWitness}
              className="bg-[#ffffff] border border-[#e2e8f0] hover:bg-[#eff6ff] text-[#1e293b] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>Add Witness</span>
            </button>
          </div>

          {witnesses.length === 0 ? (
            <div className="py-12 border border-dashed border-[#e2e8f0] bg-[#f8fafc] rounded-lg text-center space-y-3">
              <p className="text-xs text-[#64748b] font-semibold">No witnesses added yet</p>
              <button
                type="button"
                onClick={handleAddWitness}
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase shadow-sm"
              >
                Add Witness
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {witnesses.map((w, idx) => (
                <div key={idx} className="p-4 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#1e293b] uppercase">Witness Profile #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWitness(idx)}
                      className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-1 rounded-lg text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>Witness Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jane Watson"
                        value={w.name}
                        onChange={(e) => handleWitnessChange(idx, 'name', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Contact Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 9090909090"
                        value={w.contact}
                        onChange={(e) => handleWitnessChange(idx, 'contact', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className={labelClass}>Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 3, Regent Square"
                        value={w.address}
                        onChange={(e) => handleWitnessChange(idx, 'address', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className={labelClass}>Witness Statement Transcript</label>
                      <textarea
                        required
                        placeholder="Enter statement description as dictated by witness..."
                        value={w.statement}
                        onChange={(e) => handleWitnessChange(idx, 'statement', e.target.value)}
                        className={`${inputClass} h-16`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6: EVIDENCE FILES (DYNAMIC LIST) */}
        <div className={sectionClass}>
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#1e3a8a]" />
              <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Evidence Registry</h3>
            </div>
            <button
              type="button"
              onClick={handleAddEvidenceItem}
              className="bg-[#ffffff] border border-[#e2e8f0] hover:bg-[#eff6ff] text-[#1e293b] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#1e3a8a]" />
              <span>Record Evidence</span>
            </button>
          </div>

          {evidenceItems.length === 0 ? (
            <div className="py-12 border border-dashed border-[#e2e8f0] bg-[#f8fafc] rounded-lg text-center space-y-3">
              <p className="text-xs text-[#64748b] font-semibold">Evidence locker is empty</p>
              <button
                type="button"
                onClick={handleAddEvidenceItem}
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase shadow-sm"
              >
                Upload Evidence
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {evidenceItems.map((ev, idx) => (
                <div key={idx} className="p-4 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#1e293b] uppercase">Evidence Item #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidenceItem(idx)}
                      className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-1 rounded-lg text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>Evidence Category</label>
                      <select
                        value={ev.evidence_type}
                        onChange={(e) => handleEvidenceItemChange(idx, 'evidence_type', e.target.value)}
                        className={inputClass}
                      >
                        {evidenceCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Recovery Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Crime Scene"
                        value={ev.recovered_from}
                        onChange={(e) => handleEvidenceItemChange(idx, 'recovered_from', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Date of Recovery</label>
                      <input
                        type="date"
                        required
                        value={ev.recovery_date}
                        onChange={(e) => handleEvidenceItemChange(idx, 'recovery_date', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Collecting Officer</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Inspector Roy"
                        value={ev.officer_remarks}
                        onChange={(e) => handleEvidenceItemChange(idx, 'officer_remarks', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className={labelClass}>Item Description</label>
                      <textarea
                        required
                        placeholder="Detail physical markings, serial numbers, weights, packaging..."
                        value={ev.description}
                        onChange={(e) => handleEvidenceItemChange(idx, 'description', e.target.value)}
                        className={`${inputClass} h-16`}
                      />
                    </div>

                    {/* Supporting Media (Optional) */}
                    <div className="md:col-span-2 pt-3 border-t border-[#e2e8f0] space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          <span className="text-[10px] font-black text-[#1e293b] uppercase tracking-wider">
                            Supporting Media (Optional)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddAttachment(idx)}
                          className="bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e3a8a] border border-[#bfdbfe] text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all uppercase shadow-xs"
                        >
                          <Plus className="w-3 h-3 text-[#1e3a8a]" />
                          <span>+ Add Supporting Media</span>
                        </button>
                      </div>

                      {/* Repeatable Attachment Rows */}
                      {(ev.attachments || []).length > 0 && (
                        <div className="space-y-2.5">
                          {ev.attachments.map((att, attIdx) => (
                            <div key={att.id || attIdx} className="p-3 bg-white border border-[#e2e8f0] rounded-lg space-y-2 shadow-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider">
                                  Attachment #{attIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(idx, attIdx)}
                                  className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                  title="Remove attachment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <div>
                                  <label className="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Media Type</label>
                                  <select
                                    value={att.media_type}
                                    onChange={(e) => handleAttachmentChange(idx, attIdx, 'media_type', e.target.value)}
                                    className={inputClass}
                                  >
                                    <option value="image">Image</option>
                                    <option value="audio">Audio</option>
                                    <option value="video">Video</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">File Upload</label>
                                  <input
                                    type="file"
                                    accept={
                                      att.media_type === 'image'
                                        ? "image/*"
                                        : att.media_type === 'audio'
                                        ? "audio/*"
                                        : "video/*"
                                    }
                                    onChange={(e) => handleAttachmentFileChange(idx, attIdx, e.target.files[0])}
                                    className="w-full text-[10px] text-[#64748b] border border-[#e2e8f0] bg-[#ffffff] rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#2563eb] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-[#eff6ff] file:text-[#1e3a8a]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-[#64748b] uppercase mb-0.5">Description (Optional)</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Front view of weapon, 911 audio..."
                                    value={att.description}
                                    onChange={(e) => handleAttachmentChange(idx, attIdx, 'description', e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: INCIDENT NARRATIVE SUMMARY */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
            <FileText className="w-4 h-4 text-[#1e3a8a]" />
            <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">Incident Details & Narrative</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1">
              <label htmlFor="incidentDescription" className={labelClass}>Complete Incident Narrative Description</label>
              <textarea
                id="incidentDescription"
                required
                placeholder="Detail full chronological series of events as recorded in the FIR complaint..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className={`${inputClass} h-32`}
              />
            </div>
          </div>
        </div>

        {/* Action button row */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            to="/cases"
            className="bg-[#ffffff] border border-[#e2e8f0] hover:bg-[#eff6ff] text-[#1e293b] font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 uppercase"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-wider shadow-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin text-[#b45309]" /> : null}
            <span>Save Case File</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;
