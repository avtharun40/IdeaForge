import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { uploadPaper } from '../../services/paperService';

interface UploadPapersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const UploadPapersModal: React.FC<UploadPapersModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Metadata form values
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [researchArea, setResearchArea] = useState('Machine Learning');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const validateFiles = (filesList: FileList | null): File[] => {
    if (!filesList) return [];
    const valid: File[] = [];
    let hasInvalid = false;
    
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        valid.push(file);
      } else {
        hasInvalid = true;
      }
    }
    
    if (hasInvalid) {
      setErrorMsg('Only PDF files are supported. Non-PDF files were ignored.');
    } else {
      setErrorMsg('');
    }
    
    return valid;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const dropped = validateFiles(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...dropped]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const selected = validateFiles(e.target.files);
    setSelectedFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
    setErrorMsg('');
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMsg('Please select at least one PDF file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setUploadProgress(25);

    try {
      const totalFiles = selectedFiles.length;
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const finalTitle = selectedFiles.length === 1 && title 
          ? title 
          : file.name.replace(/\.[^/.]+$/, "");
          
        const finalAuthors = selectedFiles.length === 1 && authors ? authors : 'Unknown Author';
        const finalYear = selectedFiles.length === 1 && year ? year : new Date().getFullYear().toString();
        const finalArea = selectedFiles.length === 1 ? researchArea : 'General';

        setUploadProgress(Math.round(((i + 0.5) / totalFiles) * 100));

        await uploadPaper(file, {
          title: finalTitle,
          authors: finalAuthors,
          year: finalYear,
          researchArea: finalArea
        });

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setIsUploading(false);
      setSuccessMsg('Your paper has been added to the research corpus and is being processed in the background.');
      
      // Immediately notify parent components so dashboard and paper list begin polling
      onUploadSuccess();

    } catch (err: any) {
      console.error('Upload failed:', err);
      setIsUploading(false);
      setErrorMsg(err.message || 'Failed to upload paper. Please check file format and backend connectivity.');
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setTitle('');
    setAuthors('');
    setYear(new Date().getFullYear().toString());
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleFinish = () => {
    resetForm();
    onClose();
  };

  const formattedSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="upload-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h3>Upload research papers</h3>
          <button 
            type="button"
            className="header-icon-btn" 
            onClick={handleFinish} 
            disabled={isUploading}
            aria-label="Close upload modal"
            style={{ padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {successMsg ? (
          <div className="upload-success-container" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#10b981' }}>✓</div>
            <h4 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Ingestion Triggered</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              {successMsg}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={resetForm}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Upload Another Paper
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleFinish}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Continue in Background
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="upload-modal-form">
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Upload one or more papers to add them to your research corpus. PDF files only.
            </p>

            {/* Drag & Drop Box */}
            {!isUploading && (
              <div 
                className="upload-dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerBrowse}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  multiple 
                  accept=".pdf"
                  style={{ display: 'none' }}
                  aria-label="Choose research paper PDFs to upload"
                />
                <UploadCloud size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
                <span>Drag and drop PDF files here, or <strong style={{ color: 'var(--accent-light)', cursor: 'pointer' }}>browse files</strong></span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>PDF files only</span>
              </div>
            )}

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="selected-files-list">
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Files Selected ({selectedFiles.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="selected-file-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <FileText size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                        <span className="file-name-text" title={file.name}>{file.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>({formattedSize(file.size)})</span>
                      </div>
                      {!isUploading && (
                        <button 
                          type="button" 
                          className="file-remove-btn" 
                          onClick={() => removeFile(idx)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Inputs */}
            {selectedFiles.length === 1 && !isUploading && (
              <div className="upload-metadata-section">
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Optional Metadata (Single File)
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="modal-title">Paper Title</label>
                    <input 
                      type="text" 
                      id="modal-title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="e.g. Federated Learning Privacy Mechanisms" 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label htmlFor="modal-authors">Authors (comma separated)</label>
                      <input 
                        type="text" 
                        id="modal-authors" 
                        value={authors} 
                        onChange={(e) => setAuthors(e.target.value)} 
                        placeholder="e.g. A. Smith, B. Johnson" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-area">Research Area</label>
                      <select 
                        id="modal-area" 
                        value={researchArea} 
                        onChange={(e) => setResearchArea(e.target.value)}
                      >
                        <option value="Machine Learning">Machine Learning</option>
                        <option value="Privacy">Privacy</option>
                        <option value="Edge Computing">Edge Computing</option>
                        <option value="Robotics">Robotics</option>
                        <option value="Computer Vision">Computer Vision</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error and Progress Bar */}
            {errorMsg && (
              <div className="upload-error-banner">
                <AlertTriangle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {isUploading && (
              <div className="upload-progress-container">
                <div className="upload-progress-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Uploading...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Form Footer */}
            <div className="upload-modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isUploading}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isUploading || selectedFiles.length === 0}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Upload
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadPapersModal;
