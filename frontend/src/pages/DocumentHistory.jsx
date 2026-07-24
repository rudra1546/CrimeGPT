import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DocumentPreview from '../components/DocumentPreview';
import { 
  FileText, 
  RefreshCw, 
  Search, 
  Info,
  ChevronLeft,
  X
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

  const inputClass = "bg-white border border-gray-305 text-gray-900 px-3 py-2 rounded-lg text-xs outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all";
  const selectClass = "bg-white border border-gray-305 text-gray-900 py-2 px-3 rounded-lg text-xs outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all";

  return (
    <div className="p-8 space-y-8 w-full max-w-6xl mx-auto min-h-screen bg-white">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5 no-print">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-wide uppercase flex items-center gap-2.5">
            <FileText className="text-gray-950 w-6 h-6" />
            <span>Document Registry</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Archived legal documents, seizure memos, remand requests, and final police charge sheets.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-xs font-bold no-print">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 p-4.5 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm no-print">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by case FIR number or document type..."
            className={`${inputClass} w-full pl-9`}
            aria-label="Search documents list"
          />
        </div>

        <div className="flex gap-2.5 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter documents by type"
          >
            <option value="all">All Document Types</option>
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
      </div>

      {/* Documents inventory table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden no-print">
        {loading ? (
          <div className="py-24 text-center text-gray-400 text-xs font-bold">Connecting to archive database...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-24 text-center text-gray-400 text-xs font-bold">No generated documents indexed in registry.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Doc ID</th>
                  <th className="py-3 px-4">Associated FIR</th>
                  <th className="py-3 px-4">Template Category</th>
                  <th className="py-3 px-4">Generated On</th>
                  <th className="py-3 px-4 text-center">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-bold text-gray-700">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-all">
                    <td className="py-4 px-4 font-black"># {doc.id}</td>
                    <td className="py-4 px-4 font-black text-gray-900">{doc.fir_number}</td>
                    <td className="py-4 px-4 uppercase text-[10px] text-gray-600">{doc.document_type?.replace('_', ' ')}</td>
                    <td className="py-4 px-4 text-gray-450 font-medium">{new Date(doc.created_date).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => openViewModal(doc)}
                          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1.5 rounded text-[10px] font-bold"
                        >
                          View Document
                        </button>
                        <button
                          onClick={() => handleRegenerate(doc.id)}
                          disabled={regeneratingIds[doc.id]}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-850 border border-gray-300 px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1.5"
                        >
                          {regeneratingIds[doc.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                          <span>Regenerate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Document Modal */}
      {showViewModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-250 w-full max-w-4xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-white px-5 py-4 border-b border-gray-200 flex justify-between items-center no-print">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-800" />
                <span>View Document Draft</span>
              </h3>
              <button 
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDoc(null);
                }} 
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex justify-center">
              <div className="w-full max-w-[794px]">
                <DocumentPreview doc={selectedDoc} onDownload={(format) => handleDownload(selectedDoc.id, format, `document_${selectedDoc.id}`)} />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end no-print">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDoc(null);
                }}
                className={secondaryBtn}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const secondaryBtn = "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs transition-all uppercase tracking-wider";

export default DocumentHistory;
