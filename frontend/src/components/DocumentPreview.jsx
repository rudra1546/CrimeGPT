import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { renderAsync } from 'docx-preview';
import { Download, FileText, FileSpreadsheet, Printer, RefreshCw, Eye, AlertCircle, Trash2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const DocumentPreview = ({ doc, onDownload, onGenerate, onRegenerate, onDelete }) => {
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [docxError, setDocxError] = useState('');
  const [scale, setScale] = useState(1);
  const [autoScale, setAutoScale] = useState(1);
  const [isManualZoom, setIsManualZoom] = useState(false);

  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  const docId = doc?.id;

  // Calculate fit-to-width scale factor
  const recalculateScale = () => {
    if (!wrapperRef.current || !containerRef.current) return;

    const docxSection = containerRef.current.querySelector('section.docx') || containerRef.current.querySelector('.docx-wrapper');
    if (!docxSection) return;

    const availableWidth = wrapperRef.current.clientWidth - 24;
    const pageWidth = docxSection.scrollWidth || docxSection.offsetWidth || 816;

    if (availableWidth > 0 && pageWidth > 0) {
      const calculatedScale = Math.min(1, Math.max(0.35, availableWidth / pageWidth));
      setAutoScale(calculatedScale);
      if (!isManualZoom) {
        setScale(calculatedScale);
      }
    }
  };

  // Window & Container resize listeners
  useEffect(() => {
    const handleResize = () => recalculateScale();
    window.addEventListener('resize', handleResize);

    let observer = null;
    if (wrapperRef.current && typeof window !== 'undefined' && window.ResizeObserver) {
      observer = new ResizeObserver(() => recalculateScale());
      observer.observe(wrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [isManualZoom]);

  // Fetch DOCX binary blob with JWT Authorization header and render using docx-preview
  useEffect(() => {
    if (!docId) return;

    let isMounted = true;
    setIsManualZoom(false);

    const fetchAndRenderDocx = async () => {
      setLoadingDocx(true);
      setDocxError('');

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        const response = await api.get(`/documents/${docId}/docx`, {
          responseType: 'blob'
        });

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });

          await renderAsync(blob, containerRef.current, null, {
            className: 'docx-rendered',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: false,
            useImgVector: true
          });

          if (isMounted) {
            setTimeout(() => recalculateScale(), 80);
          }
        }
      } catch (err) {
        console.error("Failed fetching or rendering formatted DOCX document preview:", err);
        if (isMounted) {
          setDocxError('Failed to load formatted DOCX document preview.');
        }
      } finally {
        if (isMounted) {
          setLoadingDocx(false);
        }
      }
    };

    fetchAndRenderDocx();

    return () => {
      isMounted = false;
    };
  }, [docId]);

  const handleZoomIn = () => {
    setIsManualZoom(true);
    setScale(prev => Math.min(1.5, prev + 0.1));
  };

  const handleZoomOut = () => {
    setIsManualZoom(true);
    setScale(prev => Math.max(0.4, prev - 0.1));
  };

  const handleResetZoom = () => {
    setIsManualZoom(false);
    setScale(autoScale);
  };

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 bg-white rounded-lg text-center space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500 font-bold">No document generated yet</p>
          <p className="text-xs text-gray-400">Select a template and click generate draft to start.</p>
        </div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all uppercase tracking-wider flex items-center gap-1.5"
          >
            <span>Generate Document</span>
          </button>
        )}
      </div>
    );
  }

  // Parse JSON payload metadata if present
  let meta = {};
  if (doc.generated_content && typeof doc.generated_content === 'string' && doc.generated_content.trim().startsWith('{')) {
    try {
      meta = JSON.parse(doc.generated_content);
    } catch (e) {
      console.warn("Could not parse doc.generated_content JSON:", e);
    }
  } else if (doc.generated_content && typeof doc.generated_content === 'object') {
    meta = doc.generated_content;
  }

  const docTypeTitle = (doc.document_type || meta.document_type || "DOCUMENT").replace(/_/g, ' ').toUpperCase();
  const templateName = meta.template_name || doc.template_name || `${doc.document_type || 'document'}.docx`;
  const templateVersion = meta.template_version || doc.template_version || 'v1.0';

  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header bar with controls */}
      <div className="flex flex-wrap justify-between items-center border-b border-gray-200 pb-4 gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{docTypeTitle}</h3>
            <span className="bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
              {templateName} ({templateVersion})
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
            Draft ID: {docId || 'New'} | FIR: {doc.fir_number || 'Registered Case'}
          </p>
        </div>

        {/* Action Buttons & Responsive Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls Badge */}
          <div className="bg-gray-100 p-0.5 rounded-lg flex items-center border border-gray-300 gap-1 px-1">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-extrabold text-gray-700 px-1 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all ${
                !isManualZoom ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
              title="Fit to Viewport Width"
            >
              Fit Width
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={() => onDownload && onDownload('docx')}
            className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Download DOCX"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Download DOCX</span>
          </button>

          <button
            onClick={() => onDownload && onDownload('pdf')}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Download PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span>Download PDF</span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-white border border-red-200 hover:bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Formatted DOCX Viewer Container (Vertical Scroll Only) */}
      <div
        ref={wrapperRef}
        className="w-full min-h-[720px] max-h-[850px] overflow-y-auto overflow-x-hidden bg-gray-100 rounded-lg border border-gray-250 relative shadow-inner p-3 flex flex-col items-center"
      >
        {loadingDocx && (
          <div className="flex items-center gap-2 text-xs text-gray-500 font-bold my-auto py-12">
            <RefreshCw className="w-4 h-4 animate-spin text-gray-900" />
            <span>Loading formatted DOCX document preview...</span>
          </div>
        )}

        {docxError && (
          <div className="text-center p-6 space-y-3 my-auto">
            <div className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{docxError}</span>
            </div>
            <button
              onClick={() => onDownload && onDownload('docx')}
              className="bg-gray-900 hover:bg-gray-800 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold"
            >
              Download DOCX File
            </button>
          </div>
        )}

        {/* docx-preview scaled container element */}
        <div
          ref={containerRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: scale < 1 ? `${(100 / scale)}%` : '100%',
            marginBottom: scale < 1 ? `-${(1 - scale) * 35}%` : '0px'
          }}
          className={`flex flex-col items-center docx-preview-container transition-transform duration-100 ${
            loadingDocx ? 'hidden' : 'block'
          }`}
        />
      </div>
    </div>
  );
};

export default DocumentPreview;
