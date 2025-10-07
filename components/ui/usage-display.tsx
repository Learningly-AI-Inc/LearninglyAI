"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  PenTool, 
  Search, 
  BookOpen, 
  AlertTriangle, 
  Crown,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UsageDisplayProps {
  usage: {
    documents_uploaded: number;
    writing_words: number;
    search_queries: number;
    exam_sessions: number;
    storage_used_bytes: number;
  };
  limits: {
    document_uploads_per_week?: number;
    document_uploads_per_day?: number;
    writing_words_per_month?: number;
    writing_words_per_day?: number;
    search_queries_per_week?: number;
    search_queries_per_day?: number;
    exam_sessions_per_month?: number;
    exam_sessions_per_week?: number;
    storage_mb?: number;
  };
  planName: string;
  isFreePlan: boolean;
  className?: string;
}

export function UsageDisplay({ 
  usage, 
  limits, 
  planName, 
  isFreePlan, 
  className = "" 
}: UsageDisplayProps) {
  const router = useRouter();

  // Helper function to get current limit based on time period
  const getCurrentLimit = (type: string) => {
    const now = new Date();
    const isStartOfWeek = now.getDay() === 1; // Monday
    const isStartOfMonth = now.getDate() === 1;
    
    switch (type) {
      case 'documents':
        // Use daily limit if available, otherwise weekly
        return limits.document_uploads_per_day || limits.document_uploads_per_week || 0;
      case 'writing':
        // Use daily limit if available, otherwise monthly
        return limits.writing_words_per_day || limits.writing_words_per_month || 0;
      case 'search':
        // Use daily limit if available, otherwise weekly
        return limits.search_queries_per_day || limits.search_queries_per_week || 0;
      case 'exam':
        // Use weekly limit if available, otherwise monthly
        return limits.exam_sessions_per_week || limits.exam_sessions_per_month || 0;
      case 'storage':
        return limits.storage_mb || 0;
      default:
        return 0;
    }
  };

  // Helper function to get current usage
  const getCurrentUsage = (type: string) => {
    switch (type) {
      case 'documents':
        return usage.documents_uploaded;
      case 'writing':
        return usage.writing_words;
      case 'search':
        return usage.search_queries;
      case 'exam':
        return usage.exam_sessions;
      case 'storage':
        return Math.round(usage.storage_used_bytes / (1024 * 1024)); // Convert to MB
      default:
        return 0;
    }
  };

  // Helper function to get time period label
  const getTimePeriodLabel = (type: string) => {
    switch (type) {
      case 'documents':
        return limits.document_uploads_per_day ? 'per day' : 'per week';
      case 'writing':
        return limits.writing_words_per_day ? 'per day' : 'per month';
      case 'search':
        return limits.search_queries_per_day ? 'per day' : 'per week';
      case 'exam':
        return limits.exam_sessions_per_week ? 'per week' : 'per month';
      case 'storage':
        return 'total';
      default:
        return '';
    }
  };

  const usageItems = [
    {
      type: 'documents',
      label: 'Document Uploads',
      icon: FileText,
      color: 'bg-blue-500',
      usage: getCurrentUsage('documents'),
      limit: getCurrentLimit('documents'),
      period: getTimePeriodLabel('documents')
    },
    {
      type: 'writing',
      label: 'Writing Words',
      icon: PenTool,
      color: 'bg-green-500',
      usage: getCurrentUsage('writing'),
      limit: getCurrentLimit('writing'),
      period: getTimePeriodLabel('writing')
    },
    {
      type: 'search',
      label: 'Search Queries',
      icon: Search,
      color: 'bg-purple-500',
      usage: getCurrentUsage('search'),
      limit: getCurrentLimit('search'),
      period: getTimePeriodLabel('search')
    },
    {
      type: 'exam',
      label: 'Exam Sessions',
      icon: BookOpen,
      color: 'bg-orange-500',
      usage: getCurrentUsage('exam'),
      limit: getCurrentLimit('exam'),
      period: getTimePeriodLabel('exam')
    }
  ];

  const storageUsage = getCurrentUsage('storage');
  const storageLimit = getCurrentLimit('storage');

  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const hasNearLimit = usageItems.some(item => 
    getUsagePercentage(item.usage, item.limit) >= 75
  );

  const hasExceededLimit = usageItems.some(item => 
    getUsagePercentage(item.usage, item.limit) >= 100
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Overview
          </CardTitle>
          <Badge variant={isFreePlan ? "secondary" : "default"} className="flex items-center gap-1">
            {isFreePlan ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                {planName}
              </>
            ) : (
              <>
                <Crown className="h-3 w-3" />
                {planName}
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Usage Items */}
        {usageItems.map((item) => {
          const percentage = getUsagePercentage(item.usage, item.limit);
          const Icon = item.icon;
          
          return (
            <div key={item.type} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${item.color}`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-500 text-xs">({item.period})</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">
                    {item.usage.toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-xs">
                    / {item.limit === -1 ? '∞' : item.limit.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <Progress 
                value={percentage} 
                className="h-2"
                // @ts-ignore - Custom color prop
                color={getUsageColor(percentage)}
              />
              
              {percentage >= 90 && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Near limit</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-gray-500">
                <FileText className="h-3 w-3 text-white" />
              </div>
              <span className="font-medium">Storage Used</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">
                {storageUsage} MB
              </span>
              <span className="text-gray-500 text-xs">
                / {storageLimit === -1 ? '∞' : `${storageLimit} MB`}
              </span>
            </div>
          </div>
          
          <Progress 
            value={getUsagePercentage(storageUsage, storageLimit)} 
            className="h-2"
            // @ts-ignore - Custom color prop
            color={getUsageColor(getUsagePercentage(storageUsage, storageLimit))}
          />
        </div>

        {/* Upgrade Prompt */}
        {isFreePlan && (hasNearLimit || hasExceededLimit) && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">
                  {hasExceededLimit ? 'Limit Exceeded' : 'Approaching Limits'}
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  {hasExceededLimit 
                    ? 'You\'ve reached your free plan limits. Upgrade to continue using Learningly.'
                    : 'You\'re approaching your free plan limits. Upgrade for unlimited access.'
                  }
                </p>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
