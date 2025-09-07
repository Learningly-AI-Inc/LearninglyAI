"use client"

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedContent, FadeContent } from "@/components/react-bits";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Brain,
  Clock,
  Target
} from "lucide-react";

interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

interface ExamConfig {
  numMCQ: number;
  examDuration: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  examTitle: string;
  additionalInstructions: string;
}

export default function FullExamPrepPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'config' | 'generating' | 'ready'>('upload');
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    numMCQ: 20,
    examDuration: 60,
    difficulty: 'medium',
    examTitle: '',
    additionalInstructions: ''
  });
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      alert('Please select only PDF files');
      return;
    }

    const newFiles: UploadedFile[] = pdfFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(2, 15),
      name: file.name,
      size: file.size,
      uploadProgress: 0,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  };

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true);
    
    for (const fileData of filesToUpload) {
      try {
        // Update status to uploading
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
        );

        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('type', 'exam-prep');

        const response = await fetch('/api/exam-prep/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Update file with success
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? {
            ...f,
            status: 'completed',
            uploadProgress: 100,
            url: result.url
          } : f)
        );

      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'error' } : f)
        );
        
        // Show detailed error message
        if (error instanceof Error) {
          console.error('Upload error details:', error.message);
          alert(`Upload failed: ${error.message}\n\nPlease check the console for more details or try the test endpoint: /api/exam-prep/test`);
        }
      }
    }
    
    setIsUploading(false);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleNextStep = () => {
    if (currentStep === 'upload' && uploadedFiles.some(f => f.status === 'completed')) {
      setCurrentStep('config');
    } else if (currentStep === 'config') {
      generateExam();
    }
  };

  const generateExam = async () => {
    setCurrentStep('generating');
    setGenerationProgress(0);

    try {
      const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await fetch('/api/exam-prep/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: completedFiles.map(f => ({ url: f.url, name: f.name })),
          config: examConfig
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setTimeout(() => {
        setCurrentStep('ready');
        // Store exam data in localStorage or state management
        localStorage.setItem('generatedExam', JSON.stringify(result));
      }, 1000);

    } catch (error) {
      console.error('Exam generation error:', error);
      alert('Failed to generate exam. Please try again.');
      setCurrentStep('config');
    }
  };

  const startExam = () => {
    router.push('/exam-prep/full-exam/session');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepIcon = (step: typeof currentStep) => {
    switch (step) {
      case 'upload': return <Upload className="w-5 h-5" />;
      case 'config': return <Target className="w-5 h-5" />;
      case 'generating': return <Brain className="w-5 h-5" />;
      case 'ready': return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getStepTitle = (step: typeof currentStep) => {
    switch (step) {
      case 'upload': return 'Upload Study Materials';
      case 'config': return 'Configure Your Exam';
      case 'generating': return 'Generating Your Exam';
      case 'ready': return 'Your Exam is Ready!';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <FadeContent>
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => router.push('/exam-prep')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                {getStepIcon(currentStep)}
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{getStepTitle(currentStep)}</h1>
                  <p className="text-slate-600">Full-Length Exam Preparation</p>
                </div>
              </div>
            </div>
          </FadeContent>

          {/* Progress Steps */}
          <FadeContent>
            <div className="flex items-center justify-between mb-8 bg-white rounded-lg p-4 shadow-sm">
              {(['upload', 'config', 'generating', 'ready'] as const).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep === step 
                      ? 'bg-orange-500 text-white' 
                      : index < (['upload', 'config', 'generating', 'ready'] as const).indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {index < (['upload', 'config', 'generating', 'ready'] as const).indexOf(currentStep) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep === step ? 'text-orange-600 font-medium' : 'text-gray-500'
                  }`}>
                    {getStepTitle(step)}
                  </span>
                  {index < 3 && (
                    <div className="w-12 h-px bg-gray-300 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </FadeContent>

          {/* Step Content */}
          <AnimatedContent>
            {currentStep === 'upload' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Your Study Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload Area */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF Files</h3>
                    <p className="text-gray-600 mb-4">
                      Click to select or drag and drop your study materials (PDF format only)
                    </p>
                    <Button variant="outline">
                      Select Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Uploaded Files</h4>
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            {file.status === 'uploading' && (
                              <Progress value={file.uploadProgress} className="mt-1" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {file.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                            {file.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleNextStep}
                      disabled={!uploadedFiles.some(f => f.status === 'completed') || isUploading}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Continue to Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'config' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Configure Your Exam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Number of Questions */}
                    <div className="space-y-2">
                      <Label htmlFor="numMCQ">Number of Multiple Choice Questions</Label>
                      <Select
                        value={examConfig.numMCQ.toString()}
                        onValueChange={(value) => setExamConfig(prev => ({...prev, numMCQ: parseInt(value)}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 Questions</SelectItem>
                          <SelectItem value="15">15 Questions</SelectItem>
                          <SelectItem value="20">20 Questions</SelectItem>
                          <SelectItem value="25">25 Questions</SelectItem>
                          <SelectItem value="30">30 Questions</SelectItem>
                          <SelectItem value="40">40 Questions</SelectItem>
                          <SelectItem value="50">50 Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exam Duration */}
                    <div className="space-y-2">
                      <Label htmlFor="duration">Exam Duration (minutes)</Label>
                      <Select
                        value={examConfig.examDuration.toString()}
                        onValueChange={(value) => setExamConfig(prev => ({...prev, examDuration: parseInt(value)}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="180">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select
                        value={examConfig.difficulty}
                        onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                          setExamConfig(prev => ({...prev, difficulty: value}))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exam Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Exam Title</Label>
                      <Input
                        id="title"
                        value={examConfig.examTitle}
                        onChange={(e) => setExamConfig(prev => ({...prev, examTitle: e.target.value}))}
                        placeholder="e.g., Midterm Exam - Computer Science"
                      />
                    </div>
                  </div>

                  {/* Additional Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      value={examConfig.additionalInstructions}
                      onChange={(e) => setExamConfig(prev => ({...prev, additionalInstructions: e.target.value}))}
                      placeholder="Any specific instructions or focus areas for the exam..."
                      rows={3}
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">Exam Summary</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• {examConfig.numMCQ} Multiple Choice Questions</li>
                      <li>• {examConfig.examDuration} minutes duration</li>
                      <li>• {examConfig.difficulty.charAt(0).toUpperCase() + examConfig.difficulty.slice(1)} difficulty level</li>
                      <li>• Based on {uploadedFiles.filter(f => f.status === 'completed').length} uploaded document(s)</li>
                    </ul>
                  </div>

                  {/* Generate Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleNextStep}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Generate Exam
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'generating' && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Exam</h3>
                  <p className="text-gray-600 mb-6">
                    Our AI is analyzing your study materials and creating personalized questions...
                  </p>
                  <Progress value={generationProgress} className="max-w-md mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">{Math.round(generationProgress)}% complete</p>
                </CardContent>
              </Card>
            )}

            {currentStep === 'ready' && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">Your Exam is Ready!</h3>
                  <p className="text-gray-600 mb-6">
                    We've generated a comprehensive {examConfig.numMCQ}-question exam based on your study materials.
                  </p>
                  
                  <div className="bg-green-50 p-4 rounded-lg mb-6 max-w-md mx-auto">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-800">Questions:</span>
                      <span className="font-medium text-green-900">{examConfig.numMCQ}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-800">Duration:</span>
                      <span className="font-medium text-green-900">{examConfig.examDuration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-800">Difficulty:</span>
                      <span className="font-medium text-green-900 capitalize">{examConfig.difficulty}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={startExam}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Start Exam Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </AnimatedContent>
        </div>
      </div>
    </div>
  );
}
