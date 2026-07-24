import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import DocumentPreview from '../components/DocumentPreview';
import { 
  FileSignature, 
  RefreshCw, 
  AlertCircle,
  FileText
} from 'lucide-react';

const GenerateDocument = () => {
  const location = useLocation();
  
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [documentType, setDocumentType] = useState('seizure_memo');
  
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await api.get('/cases/');
        setCases(response.data);
        
        // Handle pre-selected case state if redirected from details
        if (location.state?.preSelectedCaseId) {
          setSelectedCaseId(location.state.preSelectedCaseId.toString());
        } else if (response.data.length > 0) {
          setSelectedCaseId(response.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        setError('Failed fetching cases to populate select fields.');
      }
    };
    fetchCases();
  }, [location.state]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setError('Please select a valid case file to proceed.');
      return;
    }
    
    setError('');
    setGenerating(true);
    setGeneratedDoc(null);

    try {
      const response = await api.post('/documents/generate', {
        case_id: parseInt(selectedCaseId),
        document_type: documentType
      });
      setGeneratedDoc(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err._parsedMessage || 
        'AI generation process failed. Check server status logs.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (type) => {
    if (!generatedDoc) return;
    try {
      const response = await api.get(`/documents/${generatedDoc.id}/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${generatedDoc.id}_export.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download exported file format.');
    }
  };

  const inputClass = "w-full bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all";
  const labelClass = "text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1";

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-white min-h-screen">
      {/* Title Header */}
      <div className="border-b border-gray-200 pb-6 no-print">
        <h1 className="text-xl font-black tracking-wide text-gray-900 uppercase">Legal Draft Assistant</h1>
        <p className="text-xs text-gray-500 mt-1">Select an incident record and compile structured legal documentation.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-xs font-bold no-print" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Document generation options form panel */}
        <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm h-fit space-y-6 no-print">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <FileSignature className="w-4 h-4 text-gray-900" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Configuration</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Case file selection */}
            <div className="space-y-1">
              <label htmlFor="gen-case" className={labelClass}>Case Directory File</label>
              <select
                id="gen-case"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className={inputClass}
              >
                {cases.length === 0 ? (
                  <option value="">No cases registered in portal</option>
                ) : (
                  cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fir_number} - {c.crime_type}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Document Template Type */}
            <div className="space-y-1">
              <label htmlFor="gen-type" className={labelClass}>Document Template Type</label>
              <select
                id="gen-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className={inputClass}
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
            </div>

            {/* Run button */}
            <button
              type="submit"
              disabled={generating || cases.length === 0}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 text-xs uppercase tracking-wider mt-4"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Drafting Document...</span>
                </span>
              ) : (
                <span>Generate Document Draft</span>
              )}
            </button>
          </form>
        </div>

        {/* Display Output panel */}
        <div className="lg:col-span-2 flex flex-col min-h-[450px]">
          {generating ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-3 py-20 text-gray-500 border border-gray-200 bg-white rounded-lg no-print">
              <RefreshCw className="w-8 h-8 text-gray-900 animate-spin" />
              <p className="text-xs font-bold tracking-wide animate-pulse">Generating official document draft...</p>
            </div>
          ) : generatedDoc ? (
            <DocumentPreview doc={generatedDoc} onDownload={handleDownload} />
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center gap-3 py-20 text-gray-400 text-center max-w-sm mx-auto border border-gray-200 bg-white rounded-lg w-full no-print">
              <FileText className="w-12 h-12" />
              <p className="text-xs font-semibold">Configure case data and click Generate Document Draft to create standard legal documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateDocument;
