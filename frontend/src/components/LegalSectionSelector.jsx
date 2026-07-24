import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Plus, Trash2, ShieldCheck, HelpCircle, WifiOff } from 'lucide-react';

const LegalSectionSelector = ({ crimeType, selectedSections = [], onChange, role = 'POLICE_OFFICER' }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Bundled fallback mappings to ensure 100% offline robustness
  const fallbackRecommendations = {
    "murder": [
      { "law": "BNS", "section": "103", "title": "Punishment for Murder", "description": "Prescribes death or life imprisonment for murder." }
    ],
    "theft": [
      { "law": "BNS", "section": "303", "title": "Theft", "description": "Defines theft and prescribes punishment up to 3 years." }
    ],
    "robbery": [
      { "law": "BNS", "section": "309", "title": "Robbery", "description": "Prescribes punishment for committing robbery." }
    ],
    "assault": [
      { "law": "BNS", "section": "131", "title": "Assault or Criminal Force", "description": "Punishment for assault or use of criminal force." }
    ]
  };

  useEffect(() => {
    const handleConnectivityChange = () => {
      setIsOffline(!navigator.onLine);
    };
    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    return () => {
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
    };
  }, []);

  // Fetch recommended BNS sections based on crime category selected
  useEffect(() => {
    if (!crimeType) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      const cacheKey = `crimegpt_recs_${crimeType.toLowerCase()}`;
      
      // 1. Check offline connectivity
      if (!navigator.onLine) {
        // Use IndexedDB/localStorage cache if available
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setRecommendations(JSON.parse(cached));
            setLoadingRecs(false);
            return;
          } catch (e) {
            console.error("Failed parsing cached sections:", e);
          }
        }
        // Fallback to bundled fallback JSON
        const key = crimeType.toLowerCase();
        setRecommendations(fallbackRecommendations[key] || fallbackRecommendations[key.replace(/\s+/g, '_')] || []);
        setLoadingRecs(false);
        return;
      }

      // 2. Refresh cache from backend when online
      try {
        const response = await api.get(`/legal/recommendations?crime_type=${encodeURIComponent(crimeType)}`);
        setRecommendations(response.data || []);
        localStorage.setItem(cacheKey, JSON.stringify(response.data || []));
      } catch (err) {
        console.error("Failed to load online recommendations:", err);
        // Fallback to cache on error
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setRecommendations(JSON.parse(cached));
        } else {
          const key = crimeType.toLowerCase();
          setRecommendations(fallbackRecommendations[key] || fallbackRecommendations[key.replace(/\s+/g, '_')] || []);
        }
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecommendations();
  }, [crimeType]);

  // Handle live search for custom legal sections addition
  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val || val.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const queryStr = val.trim();
    console.log("Legal section search query:", queryStr);

    if (!navigator.onLine) {
      // Offline mock search through recommendations cache
      const cachedAll = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('crimegpt_recs_')) {
            const items = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(items)) cachedAll.push(...items);
          }
        }
      } catch (e) {}

      // Deduplicate and filter locally
      const filtered = cachedAll.filter((item, idx, self) => 
        self.findIndex(t => t.section === item.section && t.law === item.law) === idx &&
        (item.section.toLowerCase().includes(queryStr.toLowerCase()) || 
         item.title.toLowerCase().includes(queryStr.toLowerCase()))
      );
      setSearchResults(filtered);
      console.log("Legal section offline search state updated:", filtered);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/legal-advisor/sections/search?query=${encodeURIComponent(queryStr)}`);
      console.log("Legal section search response:", response.data);

      let resultsArr = [];
      if (Array.isArray(response.data)) {
        resultsArr = response.data;
      } else if (response.data && Array.isArray(response.data.sections)) {
        resultsArr = response.data.sections;
      } else if (response.data && Array.isArray(response.data.results)) {
        resultsArr = response.data.results;
      } else if (response.data && Array.isArray(response.data.data)) {
        resultsArr = response.data.data;
      }

      setSearchResults(resultsArr);
      console.log("Legal section search state updated:", resultsArr);
    } catch (err) {
      console.error("Legal section search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const isSelected = (rec) => {
    return selectedSections.some(s => s.law === rec.law && s.section === rec.section);
  };

  const handleToggleSection = (rec) => {
    const isSecSelected = isSelected(rec);
    let updated;
    if (isSecSelected) {
      updated = selectedSections.filter(s => !(s.law === rec.law && s.section === rec.section));
    } else {
      updated = [...selectedSections, { law: rec.law, section: rec.section, title: rec.title, description: rec.description }];
    }
    onChange(updated);
  };

  const handleAddManualSection = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const form = e.target.tagName === 'FORM' ? e.target : e.target.closest('form');
    if (!form) return;

    const law = form.law.value;
    const section = form.section.value;
    const title = form.title.value;
    
    if (!section || !title) return;

    const newSec = { law, section, title, description: 'Manually logged section' };
    if (!isSelected(newSec)) {
      onChange([...selectedSections, newSec]);
    }
    form.reset();
  };

  const handleRemoveSection = (idxToRemove) => {
    onChange(selectedSections.filter((_, idx) => idx !== idxToRemove));
  };

  // Allow search and selection across all user clearance levels
  const isSenior = ['ADMIN', 'SHO', 'LEGAL_ADVISOR', 'POLICE_OFFICER'].includes(role) || !role;

  return (
    <div className="space-y-5 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-gray-150 pb-3">
        <div>
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gray-900" />
            <span>Legal Section Selection Workspace</span>
          </h4>
          <p className="text-[10px] text-gray-500 mt-0.5">Select and approve BNS/IPC sections applied to this Case folder.</p>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase">
              <WifiOff className="w-3 h-3" />
              <span>Offline Mapping</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded text-[9px] font-extrabold uppercase tracking-wide border bg-green-50 text-green-700 border-green-200">
            Section Database Connected
          </span>
        </div>
      </div>

      {/* Suggested Sections List */}
      <div className="space-y-2">
        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Recommended Sections</span>
        {loadingRecs ? (
          <p className="text-xs text-gray-400 font-semibold italic">Recalculating penal recommendations...</p>
        ) : recommendations.length === 0 ? (
          <p className="text-xs text-gray-400 font-semibold italic">No recommendations mapped for category "{crimeType || 'N/A'}". Use search to add custom sections.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {recommendations.map((rec, i) => {
              const checked = isSelected(rec);
              return (
                <label 
                  key={i} 
                  className={`p-3.5 border rounded-lg cursor-pointer flex items-start gap-3 transition-all select-none ${
                    checked ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleSection(rec)}
                    className="mt-0.5 h-3.5 w-3.5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 accent-gray-900"
                    aria-label={`Select section ${rec.law} ${rec.section}`}
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-gray-900">{rec.law} {rec.section}</span>
                    <span className="text-xs font-bold text-gray-700 block leading-normal">{rec.title}</span>
                    <p className="text-[10px] text-gray-500 leading-normal">{rec.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Search and Add Custom */}
      {isSenior && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-gray-150">
          {/* Live Search */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Search Legal Sections Database</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by section number or keyword (e.g. 103)..."
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-full bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                aria-label="Search legal sections"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto shadow-md mt-1">
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex justify-between items-center text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-black text-gray-900">{res.law} Section {res.section}</span>
                      <span className="font-bold text-gray-700 block leading-normal">{res.title}</span>
                      {res.description && (
                        <p className="text-[10px] text-gray-500 leading-normal">{res.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSection(res)}
                      className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all flex-shrink-0 ${
                        isSelected(res) 
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isSelected(res) ? 'Remove' : 'Add Section'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searching && <p className="text-[10px] text-gray-400 italic">Searching database records...</p>}
            {searchQuery.length >= 1 && !searching && searchResults.length === 0 && (
              <p className="text-[10px] text-gray-400 italic">No matching legal sections found for "{searchQuery}".</p>
            )}
          </div>

          {/* Manual Form input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddManualSection(e);
            }} 
            className="space-y-2"
          >
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Manually Log Section</span>
            <div className="flex gap-2">
              <select 
                name="law" 
                className="bg-white border border-gray-300 text-gray-800 py-1.5 px-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900"
                aria-label="Select manual law body"
              >
                <option value="BNS">BNS</option>
                <option value="BNSS">BNSS</option>
                <option value="BSA">BSA</option>
                <option value="IPC">IPC</option>
              </select>
              <input
                type="text"
                name="section"
                placeholder="Sec"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddManualSection(e);
                  }
                }}
                className="w-20 bg-white border border-gray-300 text-gray-900 py-1.5 px-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900"
                required
                aria-label="Manual Section Number"
              />
              <input
                type="text"
                name="title"
                placeholder="Title (e.g. Theft punishment)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddManualSection(e);
                  }
                }}
                className="flex-1 bg-white border border-gray-300 text-gray-900 py-1.5 px-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900"
                required
                aria-label="Manual Section Title"
              />
              <button
                type="button"
                onClick={(e) => handleAddManualSection(e)}
                className="bg-gray-900 hover:bg-gray-800 text-white p-2 rounded-lg text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Sections list */}
      <div className="space-y-2 pt-3 border-t border-gray-150">
        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Selected Sections List ({selectedSections.length})</span>
        {selectedSections.length === 0 ? (
          <p className="text-xs text-gray-400 font-semibold italic">No legal sections selected. Select recommended checkboxes above to link penal codes.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {selectedSections.map((sec, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 bg-gray-900 text-white pl-2.5 pr-1.5 py-1 rounded text-xs font-bold"
              >
                <span>{sec.law} {sec.section} - {sec.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSection(idx)}
                  className="hover:bg-red-750 p-0.5 rounded text-white"
                  title="Remove Section"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalSectionSelector;
