import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  FileText
} from 'lucide-react';

const CreateCase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
    name: '', age: '', gender: 'Male', address: '', known_aliases: '', previous_record: ''
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
    setEvidenceItems(prev => [...prev, { evidence_type: 'Physical', description: '', recovered_from: '', recovery_date: '', uploaded_file: '', officer_remarks: '' }]);
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
      await api.post('/cases/', payload);
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

  const inputClass = "w-full bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all";
  const labelClass = "text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1";
  const sectionClass = "bg-white border border-gray-200 rounded-lg p-6 space-y-5";

  return (
    <div className="p-8 space-y-8 w-full max-w-5xl mx-auto bg-white min-h-screen">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/cases" 
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-450 hover:text-gray-900 border border-gray-200 transition-all"
            aria-label="Return to Cases Directory"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-wide text-gray-900 uppercase">FIR Case Filing</h1>
            <p className="text-xs text-gray-500 mt-1">Register structured investigation data inside the central database.</p>
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
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <Briefcase className="w-4 h-4 text-gray-900" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">General Information</h3>
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
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {showCategoryDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
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
                        className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-800 font-bold"
                      >
                        {cat}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-400 italic">No matching categories found.</div>
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
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <Users className="w-4 h-4 text-gray-900" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Victim Details</h3>
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
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <Users className="w-4 h-4 text-gray-900" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Accused / Suspect Details</h3>
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
          <div className="flex justify-between items-center border-b border-gray-150 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-900" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Witness Accounts</h3>
            </div>
            <button
              type="button"
              onClick={handleAddWitness}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Witness</span>
            </button>
          </div>

          {witnesses.length === 0 ? (
            <div className="py-12 border border-dashed border-gray-200 bg-gray-50 rounded-lg text-center space-y-3">
              <p className="text-xs text-gray-400 font-semibold">No witnesses added yet</p>
              <button
                type="button"
                onClick={handleAddWitness}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase"
              >
                Add Witness
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {witnesses.map((w, idx) => (
                <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-800 uppercase">Witness Profile #{idx + 1}</span>
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
          <div className="flex justify-between items-center border-b border-gray-150 pb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-900" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Evidence Registry</h3>
            </div>
            <button
              type="button"
              onClick={handleAddEvidenceItem}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Evidence</span>
            </button>
          </div>

          {evidenceItems.length === 0 ? (
            <div className="py-12 border border-dashed border-gray-200 bg-gray-50 rounded-lg text-center space-y-3">
              <p className="text-xs text-gray-400 font-semibold">Evidence locker is empty</p>
              <button
                type="button"
                onClick={handleAddEvidenceItem}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase"
              >
                Upload Evidence
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {evidenceItems.map((ev, idx) => (
                <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-800 uppercase">Evidence Item #{idx + 1}</span>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: INCIDENT NARRATIVE SUMMARY */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <FileText className="w-4 h-4 text-gray-900" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Incident Details & Narrative</h3>
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
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 uppercase"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-wider"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            <span>Save Case File</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;
