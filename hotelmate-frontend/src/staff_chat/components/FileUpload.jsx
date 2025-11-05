import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ProgressBar, Badge } from 'react-bootstrap';

/**
 * FileUpload Component
 * File upload with drag & drop support
 */
const FileUpload = ({
  onFileSelect,
  uploading = false,
  progress = 0,
  error = null,
  maxFiles = 10,
  maxFileSize = 50, // MB
  accept = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  showPreview = true,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    
    if (onFileSelect) {
      onFileSelect(fileArray);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    if (onFileSelect) {
      onFileSelect(newFiles);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    
    if (imageExts.includes(ext)) return 'bi-file-image';
    if (ext === 'pdf') return 'bi-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'bi-file-word';
    if (['xls', 'xlsx'].includes(ext)) return 'bi-file-excel';
    if (ext === 'txt') return 'bi-file-text';
    return 'bi-file-earmark';
  };

  return (
    <div className="file-upload">
      {/* Drop Zone */}
      <div
        className={`file-upload__dropzone ${isDragging ? 'file-upload__dropzone--dragging' : ''} ${uploading ? 'file-upload__dropzone--uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="file-upload__input"
          disabled={uploading}
        />

        <div className="file-upload__dropzone-content">
          <i className={`bi ${uploading ? 'bi-cloud-upload' : 'bi-cloud-arrow-up'} file-upload__icon`}></i>
          <p className="file-upload__text">
            {uploading ? 'Uploading...' : 'Click or drag files here'}
          </p>
          <p className="file-upload__hint">
            Max {maxFiles} files, {maxFileSize}MB each
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && progress > 0 && (
        <div className="file-upload__progress mt-2">
          <ProgressBar 
            now={progress} 
            label={`${progress}%`}
            animated
            variant="primary"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="file-upload__error mt-2">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* File Preview */}
      {showPreview && selectedFiles.length > 0 && !uploading && (
        <div className="file-upload__preview mt-3">
          <div className="file-upload__preview-header">
            <span>Selected Files</span>
            <Badge bg="primary">{selectedFiles.length}</Badge>
          </div>
          <div className="file-upload__preview-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-upload__preview-item">
                <i className={`bi ${getFileIcon(file.name)} me-2`}></i>
                <div className="file-upload__preview-info">
                  <div className="file-upload__preview-name">{file.name}</div>
                  <div className="file-upload__preview-size">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  type="button"
                  className="file-upload__preview-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  aria-label="Remove file"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

FileUpload.propTypes = {
  onFileSelect: PropTypes.func,
  uploading: PropTypes.bool,
  progress: PropTypes.number,
  error: PropTypes.string,
  maxFiles: PropTypes.number,
  maxFileSize: PropTypes.number,
  accept: PropTypes.string,
  showPreview: PropTypes.bool,
};

export default FileUpload;
