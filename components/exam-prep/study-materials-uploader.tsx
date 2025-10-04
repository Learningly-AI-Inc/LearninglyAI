"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useUsageLimits } from "@/hooks/use-usage-limits";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB as per requirements
const MAX_FILES = 10; // Allow up to 10 files as per requirements

export function StudyMaterialsUploader({ onClose, onUploaded, maxFiles = MAX_FILES }: StudyMaterialsUploaderProps) {
  const { withUsageCheck } = useUsageLimits();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size (100MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 100MB.`;
    }
    
    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!Object.keys(SUPPORTED_TYPES).includes(fileExtension)) {
      return `File "${file.name}" has unsupported type ".${fileExtension}". Please use PDF, TXT, or DOCX files.`;
    }
    
    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    // Check if adding these files would exceed the limit
    setFiles(currentFiles => {
      if (currentFiles.length + selectedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `You can upload a maximum of ${maxFiles} files. You currently have ${currentFiles.length} files selected.`,
          variant: "destructive"
        });
        return currentFiles; // Return current state without changes
      }

      Array.from(selectedFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
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

      if (newFiles.length > 0) {
        return [...currentFiles, ...newFiles];
      }
      
      return currentFiles; // Return current state if no valid files
    });
  }, [maxFiles, toast]);

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

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
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

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Check usage limits before starting upload
    const usageResult = await withUsageCheck(
      { action: 'documents_uploaded', amount: files.length },
      async () => {
        setIsUploading(true);
        const results: Array<{ documentId: string; title: string }> = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Update status to uploading
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
          ));

          try {
            // Simulate progress
            for (let progress = 0; progress <= 100; progress += 20) {
              setFiles(prev => prev.map(f => 
                f.id === file.id ? { ...f, progress } : f
              ));
              await new Promise(resolve => setTimeout(resolve, 100));
            }

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
            
            // Update status to error
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { 
                ...f, 
                status: 'error', 
                error: error.message || 'Upload failed'
              } : f
            ));
          }
        }

        return results;
      }
    );

    if (usageResult.success && usageResult.result) {
      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${usageResult.result.length} of ${files.length} files.`,
      });
      
      onUploaded(usageResult.result);
      onClose();
    } else if (usageResult.needsUpgrade) {
      toast({
        title: "Upgrade required",
        description: "You've reached your upload limit. Please upgrade to continue uploading more files.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Upload failed",
        description: usageResult.error || "Please try again or contact support if the issue persists.",
        variant: "destructive"
      });
    }

    setIsUploading(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const canUpload = files.length > 0 && !isUploading && files.every(f => f.status === 'pending' || f.status === 'error');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Upload Study Materials</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload up to {maxFiles} files (PDF, TXT, DOCX) with a maximum size of 100MB each.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto max-h-[60vh]">
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
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">
              Select multiple files at once (up to {maxFiles} files, 100MB each)
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.docx"
              onChange={handleChange}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Selected Files ({files.length}/{maxFiles})</h3>
                <div className="flex gap-2">
                  {completedCount > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {completedCount} completed
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {errorCount} failed
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.file.size)}
                        </p>
                        {file.status === 'uploading' && file.progress !== undefined && (
                          <Progress value={file.progress} className="mt-1 h-1" />
                        )}
                        {file.status === 'error' && file.error && (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(file.status)}>
                        {file.status}
                      </Badge>
                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {files.length > 0 && (
              <>
                {completedCount} of {files.length} files ready to upload
                {errorCount > 0 && ` • ${errorCount} failed`}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!canUpload}
              className="min-w-24"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${files.length} Files`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
