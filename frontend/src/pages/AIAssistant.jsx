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
  AlertCircle
} from 'lucide-react';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { 
      sender: 'assistant', 
      text: "Authorized Session Established. I am CrimeGPT Legal Co-Pilot.\n\nUpload legal PDFs to index them in ChromaDB, or ask queries about custom case files or general Indian criminal law (CrPC/IPC/BNS)." 
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
  }, [messages]);

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
      setUploadSuccess(`Success: "${response.data.filename}" has been successfully indexed in ChromaDB.`);
      setFile(null);
      // Reset input element
      e.target.reset();
    } catch (err) {
      console.error(err);
      setError(
        err._parsedMessage || 
        'PDF extraction failed. Ensure the PDF contains parseable text.'
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
      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: "Error resolving search query: The RAG engine encountered a connection fault." 
      }]);
    } finally {
      setSendingQuery(false);
    }
  };

  return (
    <div className="p-8 space-y-8 w-full max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Title Header */}
      <div className="border-b border-police-border pb-4 flex-shrink-0">
        <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">AI Legal Co-Pilot</h1>
        <p className="text-sm text-slate-400 mt-1">Chat assistant using vector database document indexing (RAG) and Gemini API answering.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden min-h-0">
        {/* Upload documents control panel */}
        <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl h-fit space-y-6 flex-shrink-0">
          <div className="flex items-center gap-2 border-b border-police-border/40 pb-3">
            <Upload className="w-5 h-5 text-police-accent" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Document Indexing</h3>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-450 uppercase tracking-wider block">Index legal reference PDF</label>
              
              <div className="border-2 border-dashed border-police-border hover:border-police-accent/50 p-6 rounded-xl flex flex-col items-center justify-center gap-3 bg-police-dark/30 hover:bg-police-dark/50 cursor-pointer relative transition-all">
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileText className="w-8 h-8 text-slate-500" />
                <span className="text-xs text-slate-400 font-medium text-center truncate max-w-[200px]">
                  {file ? file.name : 'Select PDF file'}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/20 border border-rose-900/50 text-rose-350 p-3 rounded-lg text-[11px] flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-emerald-950/25 border border-emerald-900/50 text-emerald-350 p-3 rounded-lg text-[11px] flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-police-accent hover:bg-police-accent/90 text-police-dark font-extrabold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-police-accent/15 flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Indexing PDF File...</span>
                </>
              ) : (
                <span>Ingest Document</span>
              )}
            </button>
          </form>

          <div className="bg-police-dark/40 border border-police-border/40 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-police-accent">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Vector Search Guide</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Uploaded files are split, embedded into 768-dimensional coordinates, and saved in ChromaDB. Chats dynamically match query criteria against these coordinates.
            </p>
          </div>
        </div>

        {/* Chat display box */}
        <div className="lg:col-span-2 bg-police-card border border-police-border rounded-2xl shadow-xl flex flex-col overflow-hidden min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-police-dark/20 min-h-0">
            {messages.map((msg, i) => {
              const isAI = msg.sender === 'assistant';
              return (
                <div key={i} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  {/* Avatar icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                    isAI 
                      ? 'bg-police-dark border-police-border text-police-accent' 
                      : 'bg-police-accent/10 border-police-accent/30 text-police-accent'
                  }`}>
                    {isAI ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                  </div>

                  {/* Message bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isAI 
                      ? 'bg-police-dark/65 border border-police-border/60 text-slate-200' 
                      : 'bg-police-accent text-police-dark font-medium shadow-md shadow-police-accent/10'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {sendingQuery && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center text-slate-500 text-xs">
                <div className="w-8 h-8 rounded-lg bg-police-dark border border-police-border text-police-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4.5 h-4.5 animate-spin" />
                </div>
                <span className="font-semibold tracking-wide animate-pulse">Running semantic search database query...</span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input form */}
          <form onSubmit={handleSendQuery} className="p-4 border-t border-police-border bg-police-dark/40 flex gap-3 flex-shrink-0">
            <input
              type="text"
              required
              disabled={sendingQuery}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a query about the indexed documents or Indian criminal code..."
              className="flex-1 bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
            />
            <button
              type="submit"
              disabled={sendingQuery || !inputText.trim()}
              className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-bold p-3 rounded-xl transition-all shadow-md shadow-police-accent/10 flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
