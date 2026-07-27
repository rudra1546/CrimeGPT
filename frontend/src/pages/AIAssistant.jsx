import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { 
  Bot, 
  User, 
  Send, 
  Upload, 
  RefreshCw, 
  Check, 
  FileText, 
  Info,
  AlertCircle,
  BookOpen,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { 
      sender: 'assistant', 
      text: "Authorized Session Established. I am the CrimeGPT Legal Reference Assistant.\n\nUpload legal reference documents (PDF, CSV, DOCX, TXT, JSON, MD) to index them in the portal registry, or ask queries about custom reference files or Indian criminal codes (BNS, BNSS, BSA, IPC, CrPC).",
      confidence: 'high'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);

  // File Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingQuery]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setUploadSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/legal/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(`Success: "${response.data.filename}" (${response.data.chunks_added} chunks) indexed in registry.`);
      setFile(null);
    } catch (err) {
      console.error(err);
      setError(
        err._parsedMessage || 
        'Document processing failed. Ensure the file contains parseable text or valid legal dataset fields.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText;
    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setSendingQuery(true);

    try {
      const response = await api.post('/legal/query', {
        query: userQuery
      });
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'assistant', 
          text: response.data.answer || response.data.response,
          sources: response.data.sources || [],
          matched_sections: response.data.matched_sections || [],
          confidence: response.data.confidence || 'low',
          model: response.data.model
        }
      ]);
    } catch (err) {
      console.error(err);
      const errMsg = err._parsedMessage || (err.response && err.response.data && err.response.data.detail) || "Legal reference server is temporarily offline. Please verify system connection and try again.";
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: `Error: ${errMsg}`,
        confidence: 'low'
      }]);
    } finally {
      setSendingQuery(false);
    }
  };

  const fileExt = file ? file.name.split('.').pop().toUpperCase() : '';

  const renderConfidenceBadge = (confidence, isFallback) => {
    if (isFallback || confidence === 'low') {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>🔴 Low Confidence</span>
        </div>
      );
    } else if (confidence === 'medium') {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#b45309] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3 h-3 text-amber-600" />
          <span>🟡 Medium Confidence</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>🟢 High Confidence</span>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 w-full max-w-7xl mx-auto space-y-4 bg-[#f8fafc] overflow-hidden">
      {/* Title Header */}
      <div className="border-b border-[#e2e8f0] pb-3 flex-shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-[#1e293b] uppercase tracking-wide flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#1e3a8a]" />
            <span>Legal Reference Assistant</span>
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Multi-format document indexing (PDF, CSV, DOCX, TXT, JSON, MD) with source citations.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#eff6ff] border border-[#bfdbfe] px-3 py-1.5 rounded-lg text-[#1e3a8a] font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-[#1e3a8a]" />
          <span>Legal Reference System Online</span>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        
        {/* Upload Control Panel */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm space-y-4 flex flex-col justify-between overflow-y-auto min-h-0">
          <div>
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3 mb-4">
              <Upload className="w-4 h-4 text-[#1e3a8a]" />
              <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">
                Upload Reference Document
              </h3>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="ref-file" className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider block">
                  Supported Formats: PDF, CSV, DOCX, TXT, JSON, MD
                </label>
                
                <div className="border-2 border-dashed border-[#e2e8f0] hover:border-[#2563eb] p-5 rounded-lg flex flex-col items-center justify-center gap-2 bg-[#eff6ff]/50 hover:bg-[#eff6ff] cursor-pointer relative transition-all">
                  <input
                    id="ref-file"
                    type="file"
                    accept=".pdf,.csv,.docx,.doc,.txt,.json,.md,.markdown"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileText className="w-8 h-8 text-[#1e3a8a]" />
                  <span className="text-xs font-bold text-[#1e293b] text-center truncate max-w-[220px]">
                    {file ? file.name : 'Select File'}
                  </span>
                  <span className="text-[10px] text-[#64748b] font-semibold">
                    Click to browse or drag & drop file
                  </span>
                </div>
              </div>

              {/* Selected File Details */}
              {file && (
                <div className="bg-[#eff6ff] border border-[#bfdbfe] p-3 rounded-lg text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-[#1e293b]">
                    <span className="text-[#64748b] uppercase text-[10px]">Selected:</span>
                    <span className="truncate max-w-[170px] text-[#1e293b]">{file.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748b] font-medium">
                    <span className="text-[#64748b] uppercase text-[10px]">Type:</span>
                    <span className="uppercase font-bold text-[#1e293b]">{fileExt}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748b] font-medium">
                    <span className="text-[#64748b] uppercase text-[10px]">Size:</span>
                    <span className="font-bold text-[#1e293b]">{formatFileSize(file.size)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#b45309]" />
                    <span>Ingesting Document...</span>
                  </>
                ) : (
                  <span>Ingest Document</span>
                )}
              </button>
            </form>
          </div>

          <div className="bg-[#eff6ff] border border-[#bfdbfe] p-3.5 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#1e293b] font-bold">
              <Info className="w-4 h-4 text-[#1e3a8a]" />
              <span className="text-[10px] font-black uppercase tracking-wider">Legal Reference System Online</span>
            </div>
            <p className="text-[10px] text-[#64748b] leading-relaxed">
              Legal references are indexed and verified with source citations for accurate responses.
            </p>
          </div>
        </div>

        {/* Chat Box Container */}
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded-lg shadow-sm flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Chat Messages Area */}
          <div className="flex-1 p-4 md:p-5 space-y-4 overflow-y-auto bg-[#f8fafc] min-h-0">
            {messages.map((msg, i) => {
              const isAI = msg.sender === 'assistant';
              const isFallback = isAI && msg.text && msg.text.includes("do not contain sufficient information");
              
              return (
                <div key={i} className={`flex gap-3 max-w-[88%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    isAI ? 'bg-[#ffffff] border-[#e2e8f0] text-[#1e3a8a]' : 'bg-[#1e3a8a] border-[#1e3a8a] text-white'
                  }`}>
                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    
                    {/* Confidence Header for AI Messages */}
                    {isAI && (
                      <div className="flex items-center justify-between">
                        {renderConfidenceBadge(msg.confidence, isFallback)}
                        <span className="text-[9px] text-[#64748b] font-mono uppercase">
                          Verified Response
                        </span>
                      </div>
                    )}

                    {/* Warning Banner for No Match */}
                    {isFallback && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>⚠️ No matching legal reference found in uploaded documents.</span>
                      </div>
                    )}

                    {/* Main Message Text Card */}
                    <div className={`p-4 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                      isAI 
                        ? 'bg-[#ffffff] border border-[#e2e8f0] text-[#1e293b] shadow-sm' 
                        : 'bg-[#eff6ff] border border-[#bfdbfe] text-[#1e293b] font-medium shadow-sm'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Section Badges Component */}
                    {isAI && msg.matched_sections && msg.matched_sections.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Matched Sections:</span>
                        {msg.matched_sections.map((sec, secIdx) => (
                          <span key={secIdx} className="bg-[#1e3a8a] text-white text-[10px] font-black px-2 py-0.5 rounded">
                            Section {sec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sources Citation Component */}
                    {isAI && msg.sources && msg.sources.length > 0 && (
                      <div className="bg-[#ffffff] border border-[#e2e8f0] p-3 rounded-lg text-[10px] space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-[#1e293b] font-extrabold uppercase tracking-wider">
                          <BookOpen className="w-3 h-3 text-[#1e3a8a]" />
                          <span>Sources & Citations:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <div key={sIdx} className="bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-1 rounded text-[#1e293b] font-medium flex items-center gap-1">
                              <span className="font-bold text-[#1e293b]">{src.document || src.source}</span>
                              {src.section && <span className="text-[#64748b] font-semibold">(Section {src.section})</span>}
                              {src.page && <span className="text-[#64748b] font-semibold">(Page {src.page})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sendingQuery && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center text-[#64748b] text-xs">
                <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e2e8f0] text-[#1e3a8a] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 animate-spin text-[#1e3a8a]" />
                </div>
                <span className="font-bold tracking-wide animate-pulse">Searching indexed legal references and formatting response...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Fixed Bottom Input Area */}
          <form onSubmit={handleSendQuery} className="p-3.5 border-t border-[#e2e8f0] bg-[#ffffff] flex gap-2 flex-shrink-0">
            <input
              type="text"
              required
              disabled={sendingQuery}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a query about the indexed documents or Indian criminal codes..."
              className="flex-1 bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 px-3.5 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
              aria-label="Legal Assistant query"
            />
            <button
              type="submit"
              disabled={sendingQuery || !inputText.trim()}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4 text-[#b45309]" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
