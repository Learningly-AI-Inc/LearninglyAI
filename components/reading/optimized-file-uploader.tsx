/**
 * Optimized File Upload Component with Enhanced Progress Tracking
 * Provides better user experience and faster uploads
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { extractPDFText, validatePDFFile, estimateProcessingTime } from '@/lib/pdf-extractor';
import { useDocument } from './document-context';

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  estimatedTime?: number;
  extractedText?: string;
  pageCount?: number;
}

interface OptimizedFileUploaderProps {
  onUploaded?: (result: any) => void;
  onClose?: () => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
  enableClientSideExtraction?: boolean;
}

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_TYPES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export function OptimizedFileUploader({
  onUploaded,
  onClose,
  maxFileSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_TYPES,
  enableClientSideExtraction = true,
}: OptimizedFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use document context for proper upload handling
  const { uploadDocument } = useDocument();

  // Cleanup on unmount and handle modal behavior
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle click outside to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isUploading) {
      onClose?.();
    }
  }, [onClose, isUploading]);

  const validateFile = useCallback((selectedFile: File): { valid: boolean; error?: string } => {
    if (selectedFile.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    if (selectedFile.size > maxFileSize) {
      return { 
        valid: false, 
        error: `File size (${Math.round(selectedFile.size / 1024 / 1024)}MB) exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit` 
      };
    }
    
    if (!acceptedTypes.includes(selectedFile.type) && !acceptedTypes.some(type => selectedFile.name.toLowerCase().endsWith(type.split('/')[1]))) {
      return { 
        valid: false, 
        error: `Unsupported file type. Please use: ${acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}` 
      };
    }
    
    return { valid: true };
  }, [maxFileSize, acceptedTypes]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    console.log('📁 File selected:', {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
    });
    
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }
    
    setFile(selectedFile);
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: 'File selected. Ready to upload.',
    });
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }, [dragActive]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const performClientSideExtraction = useCallback(async (file: File): Promise<{ text: string; pages: number }> => {
    if (!enableClientSideExtraction || file.type !== 'application/pdf') {
      return { text: '', pages: 0 };
    }

    try {
      setUploadProgress(prev => ({
        ...prev,
        stage: 'processing',
        progress: 60,
        message: 'Extracting text from PDF...',
      }));

      const result = await extractPDFText(file, {
        preferClientSide: true,
        timeout: 30000,
      });

      if (result.success && result.text) {
        setExtractedText(result.text);
        setPageCount(result.pages);
        return { text: result.text, pages: result.pages };
      }
    } catch (error) {
      console.warn('Client-side extraction failed:', error);
    }

    return { text: '', pages: 0 };
  }, [enableClientSideExtraction]);

  const uploadFile = useCallback(async (file: File) => {
    if (isUploading) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();
    
    try {
      const estimatedTime = estimateProcessingTime(file.size);
      
      // Step 1: Client-side extraction (if enabled and PDF)
      let clientExtractedText = '';
      let clientPageCount = 0;
      
      if (enableClientSideExtraction && file.type === 'application/pdf') {
        setUploadProgress({
          stage: 'processing',
          progress: 20,
          message: 'Extracting text from PDF...',
        });
        
        const extractionResult = await performClientSideExtraction(file);
        clientExtractedText = extractionResult.text;
        clientPageCount = extractionResult.pages;
        
        setUploadProgress({
          stage: 'uploading',
          progress: 50,
          message: `Text extracted (${clientPageCount} pages). Uploading...`,
        });
      } else {
        setUploadProgress({
          stage: 'uploading',
          progress: 30,
          message: `Uploading ${file.name}...`,
        });
      }

      // Step 2: Use document context for proper upload handling
      const result = await uploadDocument(file);
      
      setUploadProgress({
        stage: 'completed',
        progress: 100,
        message: 'Upload completed successfully!',
      });

      toast.success(`${file.name} uploaded and processed successfully`);
      
      if (onUploaded) {
        onUploaded(result);
      }
      
      if (onClose) {
        setTimeout(() => onClose(), 1000);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: 'Upload cancelled',
        });
        toast.info('Upload cancelled');
      } else {
        console.error('Upload failed:', error);
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: error.message || 'Upload failed',
        });
        toast.error(error.message || 'Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [isUploading, enableClientSideExtraction, performClientSideExtraction, uploadDocument, onUploaded, onClose]);

  const handleUpload = useCallback(() => {
    if (!file || isUploading) return;
    uploadFile(file);
  }, [file, isUploading, uploadFile]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  }, []);

  const handleRetry = useCallback(() => {
    if (!file) return;
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: '',
    });
    uploadFile(file);
  }, [file, uploadFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStageIcon = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStageColor = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'uploading':
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-8 w-8 p-0"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-8">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {file ? 'File Selected' : 'Upload Document'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {file 
                    ? `${file.name} (${formatFileSize(file.size)})`
                    : 'Drag and drop your file here, or click to browse'
                  }
                </p>
              </div>

              {enableClientSideExtraction && (
                <Badge variant="secondary" className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Fast Processing Enabled
                </Badge>
              )}
            </div>
          </div>

          {/* File Info */}
          {file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setUploadProgress({ stage: 'idle', progress: 0, message: '' });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress Section */}
          {uploadProgress.stage !== 'idle' && (
            <div className={`mt-6 p-4 rounded-lg border ${getStageColor(uploadProgress.stage)}`}>
              <div className="flex items-center gap-3 mb-3">
                {getStageIcon(uploadProgress.stage)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{uploadProgress.message}</p>
                  {uploadProgress.estimatedTime && uploadProgress.stage === 'uploading' && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Estimated time: {Math.round(uploadProgress.estimatedTime)}s
                    </p>
                  )}
                </div>
              </div>
              
              {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' ? (
                <Progress value={uploadProgress.progress} className="w-full" />
              ) : null}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            {onClose && (
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
            )}
            
            {uploadProgress.stage === 'error' ? (
              <Button onClick={handleRetry} disabled={!file}>
                Retry Upload
              </Button>
            ) : uploadProgress.stage === 'completed' ? (
              <Button onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button 
                onClick={isUploading ? handleCancel : handleUpload}
                disabled={!file}
                className={isUploading ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
