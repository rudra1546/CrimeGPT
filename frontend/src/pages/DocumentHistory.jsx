import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Download, 
  FileDown, 
  RefreshCw, 
  Eye, 
  X, 
  Search, 
  Clock, 
  User,
  Info
} from 'lucide-react';

const DocumentHistory = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Document modal states
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Loading states per document ID during regeneration
  const [regeneratingIds, setRegeneratingIds] = useState({});

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents/');
      setDocuments(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve document database logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = async (docId, format, fileName) => {
    try {
      const response = await api.get(`/documents/${docId}/${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileExt = format === 'pdf' ? '.pdf' : '.docx';
      link.setAttribute('download', `${fileName.replace(/\s+/g, '_')}${fileExt}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Secure download clearance failed.');
    }
  };

  const handleRegenerate = async (docId) => {
    if (!window.confirm("CONFIRMATION REQUIRED:\nAre you sure you want to regenerate this document using current Case profile details? In-place content updates will overwrite the previous draft.")) {
      return;
    }

    setRegeneratingIds(prev => ({ ...prev, [docId]: true }));
    try {
      const response = await api.post(`/documents/${docId}/regenerate`);
      // Update local state list
      setDocuments(prev => prev.map(doc => doc.id === docId ? { 
        ...doc, 
        generated_content: response.data.generated_content,
        created_date: response.data.created_date
      } : doc));
      
      // If the modal was viewing this document, update its content too
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(prev => ({ ...prev, generated_content: response.data.generated_content }));
      }
      
      alert("Document re-drafted successfully.");
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "AI regeneration pipeline encountered a connection failure.");
    } finally {
      setRegeneratingIds(prev => ({ ...prev, [docId]: false }));
    }
  };

  const openViewModal = (doc) => {
    setSelectedDoc(doc);
    setShowViewModal(true);
  };

  // Filtered documents list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.fir_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.document_type.replace('_', ' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8 space-y-8 w-full max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-police-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-200 tracking-wide uppercase flex items-center gap-2.5">
            <FileText className="text-police-accent w-6.5 h-6.5" />
            <span>Document Registry</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Archived AI-generated drafts, seizure memos, remand requests, and final police charge sheets.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/35 p-4 rounded-xl flex items-center gap-3 text-rose-450 text-xs">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-police-card border border-police-border p-4.5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by case FIR number or document type..."
            className="w-full bg-police-dark border border-police-border text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-police-accent/60 transition-all"
          />
        </div>

        <div className="flex gap-2.5 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 bg-police-dark border border-police-border text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-police-accent/60 transition-all font-semibold"
          >
            <option value="all">All Document Types</option>
            <option value="seizure_memo">Seizure Memo</option>
            <option value="remand_application">Remand Application</option>
            <option value="charge_sheet">Charge Sheet</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400 text-xs font-semibold">
            <RefreshCw className="w-8 h-8 text-police-accent animate-spin" />
            <span className="animate-pulse">Loading Document Registry Archive...</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-police-card border border-police-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {filteredDocs.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs select-text">
                <thead>
                  <tr className="bg-police-dark/50 border-b border-police-border text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="p-4">Document Details</th>
                    <th className="p-4">Associated Case FIR</th>
                    <th className="p-4">Filing Date</th>
                    <th className="p-4">Created By</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-police-border/40">
                  {filteredDocs.map((doc) => {
                    const isRegenerating = regeneratingIds[doc.id];
                    return (
                      <tr key={doc.id} className="hover:bg-police-dark/20 transition-all">
                        <td className="p-4">
                          <span className="font-bold text-slate-200 block capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            ID: #{doc.id}
                          </span>
                        </td>
                        <td className="p-4">
                          <Link 
                            to={`/cases/${doc.case_id}`}
                            className="font-mono font-bold text-police-accent hover:text-police-glow transition-all"
                          >
                            {doc.fir_number}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-350">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(doc.created_date).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-350">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {doc.created_by_name || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openViewModal(doc)}
                              className="bg-police-dark hover:bg-police-border border border-police-border text-slate-300 hover:text-slate-100 p-2 rounded-xl transition-all"
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRegenerate(doc.id)}
                              disabled={isRegenerating}
                              className="bg-police-dark hover:bg-police-border border border-police-border text-slate-300 hover:text-police-accent p-2 rounded-xl transition-all disabled:opacity-50"
                              title="Regenerate Document Content"
                            >
                              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDownload(doc.id, 'pdf', `${doc.fir_number}_${doc.document_type}`)}
                              className="bg-police-dark hover:bg-police-border border border-police-border text-slate-300 hover:text-police-accent p-2 rounded-xl transition-all"
                              title="Download PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc.id, 'docx', `${doc.fir_number}_${doc.document_type}`)}
                              className="bg-police-dark hover:bg-police-border border border-police-border text-slate-300 hover:text-police-glow p-2 rounded-xl transition-all"
                              title="Download DOCX"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center text-slate-500 font-medium">
                No legal documents matching search configurations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {showViewModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-police-card border border-police-border rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="flex justify-between items-center border-b border-police-border/40 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest capitalize">
                  {selectedDoc.document_type.replace('_', ' ')}
                </h3>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Case: {selectedDoc.fir_number} | ID: #{selectedDoc.id}
                </span>
              </div>
              <button 
                onClick={() => { setShowViewModal(false); setSelectedDoc(null); }} 
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content text */}
            <div className="flex-1 overflow-y-auto bg-police-dark p-4 rounded-xl border border-police-border select-text">
              <pre className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                {selectedDoc.generated_content}
              </pre>
            </div>

            {/* Modal actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-police-border/40 flex-shrink-0">
              <button
                onClick={() => handleRegenerate(selectedDoc.id)}
                disabled={regeneratingIds[selectedDoc.id]}
                className="bg-police-dark hover:bg-police-border border border-police-border text-slate-300 hover:text-police-accent px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIds[selectedDoc.id] ? 'animate-spin' : ''}`} />
                <span>Regenerate Draft</span>
              </button>
              <button
                onClick={() => handleDownload(selectedDoc.id, 'pdf', `${selectedDoc.fir_number}_${selectedDoc.document_type}`)}
                className="bg-police-accent hover:bg-police-accent/90 text-police-dark px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-police-accent/10"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentHistory;
