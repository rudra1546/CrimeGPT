import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  FileSignature, 
  RefreshCw, 
  Clipboard, 
  FileDown, 
  Download, 
  Check,
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
  
  const [copied, setCopied] = useState(false);
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

  const handleCopy = () => {
    if (!generatedDoc) return;
    navigator.clipboard.writeText(generatedDoc.generated_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="p-8 space-y-8 w-full max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-police-border pb-6">
        <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">AI Legal Drafter</h1>
        <p className="text-sm text-slate-400 mt-1">Select an incident record and compile structured legal documentation powered by Gemini API.</p>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document generation options form panel */}
        <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl h-fit space-y-6">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <FileSignature className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Configuration</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Case file selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Case Directory File</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 py-2.5 px-3 rounded-xl text-sm outline-none"
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Document Template Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 py-2.5 px-3 rounded-xl text-sm outline-none"
              >
                <option value="seizure_memo">Seizure Memo (Sec 102/103 CrPC)</option>
                <option value="remand_application">Remand Application (Sec 167 CrPC)</option>
                <option value="charge_sheet">Charge Sheet (Sec 173 CrPC)</option>
              </select>
            </div>

            {/* Run button */}
            <button
              type="submit"
              disabled={generating || cases.length === 0}
              className="w-full bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-police-accent/15 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 mt-4"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Drafting Document...</span>
                </>
              ) : (
                <span>Compile AI Draft</span>
              )}
            </button>
          </form>
        </div>

        {/* Display Output panel */}
        <div className="lg:col-span-2 flex flex-col bg-police-card border border-police-border rounded-2xl shadow-xl overflow-hidden min-h-[450px]">
          {/* Output Header */}
          <div className="p-4 border-b border-police-border/40 bg-police-dark/30 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Output Draft</span>
            
            {generatedDoc && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="bg-police-dark hover:bg-police-border border border-police-border text-slate-350 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                  title="Copy text to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  className="bg-police-dark hover:bg-police-border border border-police-border text-slate-350 hover:text-police-accent px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                  title="Download PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleDownload('docx')}
                  className="bg-police-dark hover:bg-police-border border border-police-border text-slate-350 hover:text-police-glow px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                  title="Download Word"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word</span>
                </button>
              </div>
            )}
          </div>

          {/* Output body editor preview */}
          <div className="flex-1 p-6 bg-police-dark/40 overflow-y-auto flex flex-col">
            {generating ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-3 py-20 text-slate-500">
                <RefreshCw className="w-8 h-8 text-police-accent animate-spin" />
                <p className="text-sm font-semibold tracking-wide animate-pulse">Consulting Gemini legal repository model...</p>
              </div>
            ) : generatedDoc ? (
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text break-words">
                {generatedDoc.generated_content}
              </pre>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center gap-3 py-20 text-slate-600 text-center max-w-sm mx-auto">
                <FileText className="w-12 h-12" />
                <p className="text-sm">Configure case data and click **Compile AI Draft** to generate standard Indian police legal documents.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateDocument;
