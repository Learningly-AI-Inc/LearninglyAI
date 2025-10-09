"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { X, Upload } from "lucide-react";

interface StudyMaterialsUploaderProps {
  onClose: () => void;
  onUploaded: (results: Array<{ documentId: string; title: string }>) => void;
  maxFiles?: number;
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  documentId?: string;
  title?: string;
  error?: string;
  progress?: number;
}

const SUPPORTED_TYPES = {
  'pdf': { mime: 'application/pdf', label: 'PDF' },
  'txt': { mime: 'text/plain', label: 'TXT' },
  'docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' }
};

// IMPORTANT: This must match your Supabase Storage bucket limit
// To increase: Go to Supabase Dashboard → Storage → exam-files bucket → Settings
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - matches Supabase bucket limit
const MAX_FILES = 10; // Allow up to 10 files as per requirements

export function StudyMaterialsUploader({ onClose, onUploaded, maxFiles = MAX_FILES }: StudyMaterialsUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (matches Supabase bucket limit)
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`;
    }
    
    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!Object.keys(SUPPORTED_TYPES).includes(fileExtension)) {
      return `File "${file.name}" has unsupported type ".${fileExtension}". Please use PDF, TXT, or DOCX files.`;
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    // Validate files first
    Array.from(selectedFiles).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        newFiles.push({
          id: Math.random().toString(36).substring(2, 11),
          file,
          status: 'pending'
        });
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive"
        });
      });
    }

    if (newFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (files.length + newFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of ${maxFiles} files. You currently have ${files.length} files selected.`,
        variant: "destructive"
      });
      return;
    }

    // Add files to state and start upload immediately
    setFiles(prev => [...prev, ...newFiles]);
    
    // Start upload process
    await handleUpload(newFiles);
  }, [files.length, maxFiles, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const uploadFile = async (uploadedFile: UploadedFile): Promise<{ documentId: string; title: string }> => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    formData.append('type', 'exam-prep');
    formData.append('category', 'study_materials');

    const response = await fetch('/api/exam-prep/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      documentId: result.documentId,
      title: result.title || uploadedFile.file.name
    };
  };

  const handleUpload = async (filesToUpload?: UploadedFile[]) => {
    const filesToProcess = filesToUpload || files;
    if (filesToProcess.length === 0) return;

    // Remove frontend limit checking - let the backend handle it
    // This prevents race conditions and "please log in" errors
    // Backend will return proper error messages if limits are exceeded

    const results: Array<{ documentId: string; title: string }> = [];
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        const result = await uploadFile(file);
        
        // Update status to completed
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'completed', 
            documentId: result.documentId,
            title: result.title,
            progress: 100
          } : f
        ));

        results.push(result);
      } catch (error: any) {
        console.error('Upload failed for file:', file.file.name, error);

        // Show user-friendly error message
        const errorMessage = error.message || 'Upload failed';
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive"
        });

        // Update status to error
        setFiles(prev => prev.map(f =>
          f.id === file.id ? {
            ...f,
            status: 'error',
            error: errorMessage
          } : f
        ));
      }
    }

    if (results.length > 0) {
      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${results.length} file${results.length > 1 ? 's' : ''}.`,
      });
      
      onUploaded(results);
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Document</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Drag & drop your document here or click to browse
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Supports PDF, TXT, DOCX • Max 50MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={handleChange}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
        </div>
      </div>
    </div>
  );
}
