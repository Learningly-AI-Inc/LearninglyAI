"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedContent, FadeContent, ClickSpark } from "@/components/react-bits";
import { 
  ArrowLeft, 
  Download, 
  Play, 
  Eye, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  Clock,
  FileText,
  Zap,
  Trophy,
  BarChart3
} from "lucide-react";

interface ExamRecord {
  id: string;
  exam_title: string;
  exam_config: {
    numMCQ: number;
    examDuration: number;
    difficulty: 'easy' | 'medium' | 'hard';
    examTitle: string;
    numExams: number;
    examType: 'full-length' | 'rapid-fire' | 'both';
  };
  exam_data: {
    examTitle: string;
    examType: string;
    duration: number;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      difficulty: string;
      topic: string;
    }>;
  };
  source_files: string[];
  created_at: string;
}

interface ExamSession {
  id: string;
  exam_id: string;
  session_status: string;
  start_time: string;
  end_time?: string;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
}

export default function ExamManagementPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  useEffect(() => {
    loadExamData();
  }, []);

  const loadExamData = async () => {
    try {
      setIsLoading(true);
      
      // Load from localStorage for now (in production, this would be an API call)
      const storedExam = localStorage.getItem('generatedExam');
      if (storedExam) {
        const examData = JSON.parse(storedExam);
        if (examData.exams) {
          // Convert to the expected format
          const examRecords: ExamRecord[] = examData.exams.map((exam: any, index: number) => ({
            id: `exam-${index}`,
            exam_title: exam.examTitle || `Generated Exam ${index + 1}`,
            exam_config: examData.metadata || {
              numMCQ: exam.questions?.length || 20,
              examDuration: exam.duration || 60,
              difficulty: 'medium' as const,
              examTitle: exam.examTitle || '',
              numExams: 1,
              examType: exam.examType || 'full-length' as const
            },
            exam_data: exam,
            source_files: examData.metadata?.filesProcessed ? [`File ${examData.metadata.filesProcessed}`] : ['Sample Document'],
            created_at: new Date().toISOString()
          }));
          setExams(examRecords);
        }
      }
      
      // Mock session data (in production, this would come from the database)
      const mockSessions: ExamSession[] = [
        {
          id: 'session-1',
          exam_id: 'exam-0',
          session_status: 'completed',
          start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
          score_percentage: 85,
          correct_answers: 17,
          total_questions: 20
        }
      ];
      setSessions(mockSessions);
      
    } catch (error) {
      console.error('Error loading exam data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.exam_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.exam_data.examType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || exam.exam_data.examType === filterType;
    const matchesDifficulty = filterDifficulty === "all" || exam.exam_config.difficulty === filterDifficulty;
    
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const startExam = (exam: ExamRecord) => {
    // Store the selected exam in localStorage
    localStorage.setItem('generatedExam', JSON.stringify({
      exam: exam.exam_data,
      metadata: exam.exam_config
    }));
    
    if (exam.exam_data.examType === 'rapid-fire') {
      router.push('/exam-prep/rapid-fire');
    } else {
      router.push('/exam-prep/full-exam/session');
    }
  };

  const downloadExam = (exam: ExamRecord) => {
    // Create a downloadable PDF (simplified version)
    const examContent = `
EXAM: ${exam.exam_title}
Duration: ${exam.exam_data.duration} minutes
Type: ${exam.exam_data.examType}

INSTRUCTIONS:
${exam.exam_data.questions.length > 0 ? 'Answer all questions. Choose the best answer for each question.' : 'No questions available.'}

QUESTIONS:
${exam.exam_data.questions.map((q, index) => `
${index + 1}. ${q.question}
   A) ${q.options[0] || ''}
   B) ${q.options[1] || ''}
   C) ${q.options[2] || ''}
   D) ${q.options[3] || ''}
`).join('\n')}

ANSWER KEY:
${exam.exam_data.questions.map((q, index) => `${index + 1}. ${q.correctAnswer}`).join('\n')}
    `;
    
    const blob = new Blob([examContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.exam_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteExam = (examId: string) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      setExams(prev => prev.filter(exam => exam.id !== examId));
    }
  };

  const getExamStats = (examId: string) => {
    const examSessions = sessions.filter(session => session.exam_id === examId);
    if (examSessions.length === 0) return null;
    
    const avgScore = examSessions.reduce((sum, session) => sum + session.score_percentage, 0) / examSessions.length;
    const bestScore = Math.max(...examSessions.map(session => session.score_percentage));
    const totalAttempts = examSessions.length;
    
    return { avgScore, bestScore, totalAttempts };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg text-slate-600">Loading your exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
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
                <BarChart3 className="w-6 h-6 text-blue-500" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Exam Management</h1>
                  <p className="text-slate-600">View, manage, and retake your generated exams</p>
                </div>
              </div>
            </div>
          </FadeContent>

          {/* Stats Overview */}
          <FadeContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{exams.length}</div>
                  <div className="text-sm text-slate-600">Total Exams</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{sessions.length}</div>
                  <div className="text-sm text-slate-600">Attempts</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.score_percentage, 0) / sessions.length) : 0}%
                  </div>
                  <div className="text-sm text-slate-600">Avg Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {sessions.length > 0 ? Math.max(...sessions.map(s => s.score_percentage)) : 0}%
                  </div>
                  <div className="text-sm text-slate-600">Best Score</div>
                </CardContent>
              </Card>
            </div>
          </FadeContent>

          {/* Filters */}
          <FadeContent>
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search exams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full-length">Full-Length</SelectItem>
                      <SelectItem value="rapid-fire">Rapid-Fire</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </FadeContent>

          {/* Exams Grid */}
          <AnimatedContent>
            {filteredExams.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Exams Found</h3>
                  <p className="text-gray-600 mb-6">
                    {exams.length === 0 
                      ? "You haven't generated any exams yet. Create your first exam to get started!"
                      : "No exams match your current filters. Try adjusting your search criteria."
                    }
                  </p>
                  {exams.length === 0 && (
                    <Button onClick={() => router.push('/exam-prep/full-exam')}>
                      Create Your First Exam
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => {
                  const stats = getExamStats(exam.id);
                  
                  return (
                    <ClickSpark key={exam.id}>
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">{exam.exam_title}</CardTitle>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={exam.exam_data.examType === 'rapid-fire' ? 'secondary' : 'default'}>
                                  {exam.exam_data.examType === 'rapid-fire' ? (
                                    <>
                                      <Zap className="w-3 h-3 mr-1" />
                                      Rapid-Fire
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3 mr-1" />
                                      Full-Length
                                    </>
                                  )}
                                </Badge>
                                <Badge variant={
                                  exam.exam_config.difficulty === 'easy' ? 'secondary' :
                                  exam.exam_config.difficulty === 'medium' ? 'default' : 'destructive'
                                }>
                                  {exam.exam_config.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteExam(exam.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Questions</div>
                              <div className="font-medium">{exam.exam_data.questions.length}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Duration</div>
                              <div className="font-medium">{exam.exam_data.duration} min</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Created</div>
                              <div className="font-medium">{formatDate(exam.created_at)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Attempts</div>
                              <div className="font-medium">{stats?.totalAttempts || 0}</div>
                            </div>
                          </div>

                          {stats && (
                            <div className="bg-slate-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium">Performance</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-gray-500">Best Score</div>
                                  <div className="font-medium text-green-600">{stats.bestScore}%</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Avg Score</div>
                                  <div className="font-medium">{Math.round(stats.avgScore)}%</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={() => startExam(exam)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {exam.exam_data.examType === 'rapid-fire' ? 'Start Quiz' : 'Start Exam'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => downloadExam(exam)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </ClickSpark>
                  );
                })}
              </div>
            )}
          </AnimatedContent>
        </div>
      </div>
    </div>
  );
}


