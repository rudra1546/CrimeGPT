import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Download,
  Trash2,
  Loader2,
  Maximize2,
  Music,
  Film,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle
} from 'lucide-react';

/**
 * EvidenceAttachmentCard
 * Renders an evidence supporting media item with authenticated preview streaming,
 * blob lifecycle cleanup, and authenticated download handling.
 */
const EvidenceAttachmentCard = ({
  caseId,
  evidenceId,
  att,
  onPreviewImage,
  onDeleteAttachment,
  isDeleting,
  formatFileSize
}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isPendingPurge = att.status === 'pending_deletion';
  const isPreviewable = ['image', 'audio', 'video'].includes(att.media_type);

  // Authenticated media fetch and Blob URL creation with lifecycle cleanup
  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    if (!isPreviewable || isPendingPurge) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/cases/${caseId}/evidence/${evidenceId}/attachments/${att.id}/stream`, {
      responseType: 'blob'
    })
      .then((response) => {
        if (!isMounted) return;

        // Guard against JSON error wrapped in a Blob response
        if (response.data && response.data.type === 'application/json') {
          response.data.text().then((txt) => {
            if (!isMounted) return;
            try {
              const parsed = JSON.parse(txt);
              setError(parsed.detail || 'Failed to load media.');
            } catch (_) {
              setError('Failed to load media.');
            }
            setLoading(false);
          });
          return;
        }

        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch(async (err) => {
        if (!isMounted) return;
        console.error(`Preview load failed for attachment #${att.id}:`, err);

        let errMsg = 'Failed to load preview';
        if (err.response && err.response.data instanceof Blob) {
          try {
            const txt = await err.response.data.text();
            const parsed = JSON.parse(txt);
            if (parsed.detail) errMsg = parsed.detail;
          } catch (_) {}
        } else if (err.response?.data?.detail) {
          errMsg = err.response.data.detail;
        } else if (err._parsedMessage) {
          errMsg = err._parsedMessage;
        }
        setError(errMsg);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [caseId, evidenceId, att.id, att.media_type, isPendingPurge, isPreviewable, retryCount]);

  // Authenticated file download handler
  const handleDownload = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (downloading) return;
    setDownloading(true);

    try {
      // If we already have the media blob loaded in memory, trigger instant download
      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = att.file_name || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(false);
        return;
      }

      // Otherwise, request download bytes via authenticated API client
      const response = await api.get(
        `/cases/${caseId}/evidence/${evidenceId}/attachments/${att.id}/download`,
        { responseType: 'blob' }
      );

      // Guard: handle 200 OK with JSON error body
      if (response.data && response.data.type === 'application/json') {
        const txt = await response.data.text();
        let msg = 'Failed to download attachment.';
        try {
          const json = JSON.parse(txt);
          msg = json.detail || msg;
        } catch (_) {}
        alert(`Download Error: ${msg}`);
        setDownloading(false);
        return;
      }

      const tempUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = tempUrl;
      link.download = att.file_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempUrl);
    } catch (err) {
      console.error('Download error:', err);
      let errMsg = 'Failed to download file.';
      if (err.response && err.response.data instanceof Blob) {
        try {
          const txt = await err.response.data.text();
          const json = JSON.parse(txt);
          if (json.detail) errMsg = json.detail;
        } catch (_) {}
      } else if (err.response?.data?.detail) {
        errMsg = err.response.data.detail;
      } else if (err._parsedMessage) {
        errMsg = err._parsedMessage;
      }
      alert(`Download Error: ${errMsg}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg p-3 flex flex-col justify-between space-y-2.5 shadow-sm hover:border-[#bfdbfe] transition-all">
      <div className="space-y-2">
        {/* Attachment Header */}
        <div className="flex justify-between items-start gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
              att.media_type === 'image'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : att.media_type === 'audio'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : att.media_type === 'video'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {att.media_type}
          </span>
          {isPendingPurge ? (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-bold">
              Pending Purge
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="p-1 text-[#64748b] hover:text-[#1e3a8a] rounded hover:bg-[#eff6ff] disabled:opacity-50"
                title="Download Attachment"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1e3a8a]" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onDeleteAttachment(evidenceId, att.id, att.file_name)}
                disabled={isDeleting}
                className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50 disabled:opacity-50"
                title="Delete Attachment"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Media Content Player/Thumbnail */}
        {isPreviewable && !isPendingPurge && (
          <div>
            {loading ? (
              <div className="h-36 w-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-400 gap-2 p-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#1e3a8a]" />
                <span className="text-[10px] font-medium text-slate-500">Loading secure preview...</span>
              </div>
            ) : error ? (
              <div className="h-36 w-full flex flex-col items-center justify-center bg-slate-50 border border-amber-200 rounded-md p-3 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-semibold text-slate-700">Preview Unavailable</span>
                <span className="text-[9px] text-slate-400 line-clamp-2">{error}</span>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="text-[9px] font-bold text-[#1e3a8a] hover:underline pt-0.5"
                >
                  Retry
                </button>
              </div>
            ) : blobUrl ? (
              <>
                {att.media_type === 'image' && (
                  <div
                    onClick={() =>
                      onPreviewImage({
                        url: blobUrl,
                        title: att.file_name,
                        description: att.description
                      })
                    }
                    className="relative group cursor-pointer overflow-hidden rounded-md border border-[#e2e8f0] bg-slate-100 max-h-44 flex items-center justify-center"
                  >
                    <img
                      src={blobUrl}
                      alt={att.file_name}
                      className="max-h-44 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Click to Enlarge</span>
                    </div>
                  </div>
                )}

                {att.media_type === 'audio' && (
                  <div className="p-2 bg-[#f8fafc] rounded-md border border-[#e2e8f0] space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1e293b]">
                      <Music className="w-3.5 h-3.5 text-purple-600" />
                      <span>Audio Stream</span>
                    </div>
                    <audio controls preload="metadata" className="w-full h-8 mt-1" src={blobUrl}>
                      Your browser does not support HTML5 audio.
                    </audio>
                  </div>
                )}

                {att.media_type === 'video' && (
                  <div className="p-1 bg-black rounded-md border border-[#e2e8f0] space-y-1">
                    <video controls preload="metadata" className="w-full max-h-48 rounded bg-black" src={blobUrl}>
                      Your browser does not support HTML5 video.
                    </video>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Attachment Name & Size */}
        <div>
          <p className="text-[11px] font-bold text-[#1e293b] truncate" title={att.file_name}>
            {att.file_name}
          </p>
          <p className="text-[9px] text-[#64748b]">
            {formatFileSize(att.file_size)} • {att.file_type || 'Media file'}
          </p>
        </div>

        {/* Description / Caption */}
        {att.description && (
          <p className="text-[10px] text-[#475569] italic bg-[#f8fafc] p-1.5 rounded border border-[#e2e8f0] leading-tight">
            "{att.description}"
          </p>
        )}
      </div>
    </div>
  );
};

export default EvidenceAttachmentCard;
