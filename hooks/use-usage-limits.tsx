"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface UsageData {
  documents_uploaded: number;
  writing_words: number;
  search_queries: number;
  exam_sessions: number;
  storage_used_bytes: number;
}

export interface UsageLimits {
  document_uploads_per_week?: number;
  document_uploads_per_day?: number;
  writing_words_per_month?: number;
  writing_words_per_day?: number;
  search_queries_per_week?: number;
  search_queries_per_day?: number;
  exam_sessions_per_month?: number;
  exam_sessions_per_week?: number;
  storage_mb?: number;
}

export interface UsageCheckResult {
  canProceed: boolean;
  needsUpgrade: boolean;
  currentUsage: number;
  limit: number;
  percentage: number;
  message?: string;
}

export function useUsageLimits() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData>({
    documents_uploaded: 0,
    writing_words: 0,
    search_queries: 0,
    exam_sessions: 0,
    storage_used_bytes: 0,
  });
  const [limits, setLimits] = useState<UsageLimits>({});
  const [planName, setPlanName] = useState<string>('Free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage data and limits using the combined endpoint
  const fetchUsageData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the new combined endpoint - single API call!
      const response = await fetch('/api/user/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }

      const data = await response.json();

      // Update state from combined response
      setUsage(data.usage || usage);
      setLimits(data.plan?.limits || {});
      setPlanName(data.plan?.name || 'Free');

      // Log detailed user limits for all sections
      console.group('🔒 USER LIMITS BREAKDOWN');
      console.log('Plan:', data.plan?.name || 'Free');
      console.log('');
      console.log('📝 WRITING LIMITS:');
      console.log('  - Current Usage:', data.usage?.writing_words || 0, 'words');
      console.log('  - Limit:', data.plan?.limits?.writing_words || 0, 'words');
      console.log('  - Percentage:', ((data.usage?.writing_words || 0) / (data.plan?.limits?.writing_words || 1) * 100).toFixed(1) + '%');
      console.log('');
      console.log('📄 DOCUMENT UPLOAD LIMITS:');
      console.log('  - Current Usage:', data.usage?.documents_uploaded || 0, 'docs');
      console.log('  - Limit:', data.plan?.limits?.documents_uploaded || 0, 'docs');
      console.log('  - Percentage:', ((data.usage?.documents_uploaded || 0) / (data.plan?.limits?.documents_uploaded || 1) * 100).toFixed(1) + '%');
      console.log('');
      console.log('🔍 SEARCH LIMITS:');
      console.log('  - Current Usage:', data.usage?.search_queries || 0, 'searches');
      console.log('  - Limit:', data.plan?.limits?.search_queries || 0, 'searches');
      console.log('  - Percentage:', ((data.usage?.search_queries || 0) / (data.plan?.limits?.search_queries || 1) * 100).toFixed(1) + '%');
      console.log('');
      console.log('📚 EXAM SESSION LIMITS:');
      console.log('  - Current Usage:', data.usage?.exam_sessions || 0, 'sessions');
      console.log('  - Limit:', data.plan?.limits?.exam_sessions || 0, 'sessions');
      console.log('  - Percentage:', ((data.usage?.exam_sessions || 0) / (data.plan?.limits?.exam_sessions || 1) * 100).toFixed(1) + '%');
      console.log('');
      console.log('💾 STORAGE LIMITS:');
      console.log('  - Current Usage:', ((data.usage?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(2), 'MB');
      console.log('  - Limit:', ((data.plan?.limits?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(2), 'MB');
      console.log('  - Percentage:', ((data.usage?.storage_used_bytes || 0) / (data.plan?.limits?.storage_used_bytes || 1) * 100).toFixed(1) + '%');
      console.groupEnd();

    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can perform a specific action
  const checkUsageLimit = async (
    action: keyof UsageData, 
    amount: number = 1
  ): Promise<UsageCheckResult> => {
    if (!user) {
      return {
        canProceed: false,
        needsUpgrade: false,
        currentUsage: 0,
        limit: 0,
        percentage: 0,
        message: 'Please log in to continue'
      };
    }

    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          action,
          amount 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check usage limit');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error checking usage limit:', err);
      return {
        canProceed: false,
        needsUpgrade: false,
        currentUsage: 0,
        limit: 0,
        percentage: 0,
        message: 'Error checking usage limits'
      };
    }
  };

  // Increment usage after successful operation
  const incrementUsage = async (
    action: keyof UsageData, 
    amount: number = 1
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/usage/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          action,
          amount 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to increment usage');
      }

      // Refresh usage data
      await fetchUsageData();
      return true;
    } catch (err) {
      console.error('Error incrementing usage:', err);
      return false;
    }
  };

  // Get current limit for a specific action based on plan
  const getCurrentLimit = (action: keyof UsageData): number => {
    // Premium plans have higher daily/weekly limits
    const isPremium = planName.toLowerCase().includes('premium');

    switch (action) {
      case 'documents_uploaded':
        // Premium: 100/day, Free: 3/week
        if (isPremium) {
          return limits.document_uploads_per_day || 100;
        }
        return limits.document_uploads_per_week || limits.document_uploads_per_day || 3;

      case 'writing_words':
        // Premium: 25,000/day, Free: 5,000/month
        if (isPremium) {
          return limits.writing_words_per_day || 25000;
        }
        return limits.writing_words_per_month || limits.writing_words_per_day || 5000;

      case 'search_queries':
        // Premium: 500/day, Free: 10/week
        if (isPremium) {
          return limits.search_queries_per_day || 500;
        }
        return limits.search_queries_per_week || limits.search_queries_per_day || 10;

      case 'exam_sessions':
        // Premium: 50/week, Free: 1/month
        if (isPremium) {
          return limits.exam_sessions_per_week || 50;
        }
        return limits.exam_sessions_per_month || limits.exam_sessions_per_week || 1;

      case 'storage_used_bytes':
        // Premium: 10GB, Free: 250MB
        const storageMB = isPremium
          ? (limits.storage_mb || 10240) // 10GB = 10240MB
          : (limits.storage_mb || 250);
        return storageMB * 1024 * 1024; // Convert MB to bytes

      default:
        return 0;
    }
  };

  // Get current usage for a specific action
  const getCurrentUsage = (action: keyof UsageData): number => {
    return usage[action] || 0;
  };

  // Check if user is on free plan
  const isFreePlan = planName.toLowerCase().includes('free') || 
                    Object.values(limits).every(limit => 
                      typeof limit === 'number' && limit < 100
                    );

  // Check if user is near or at limit
  const isNearLimit = (action: keyof UsageData): boolean => {
    const currentUsage = getCurrentUsage(action);
    const limit = getCurrentLimit(action);
    if (limit === 0) return false;
    return (currentUsage / limit) >= 0.75;
  };

  const isAtLimit = (action: keyof UsageData): boolean => {
    const currentUsage = getCurrentUsage(action);
    const limit = getCurrentLimit(action);
    if (limit === 0) return false;
    return currentUsage >= limit;
  };

  // Refresh usage data
  const refreshUsage = () => {
    fetchUsageData();
  };

  useEffect(() => {
    fetchUsageData();
  }, [user]);

  return {
    usage,
    limits,
    planName,
    isLoading,
    error,
    isFreePlan,
    checkUsageLimit,
    incrementUsage,
    getCurrentLimit,
    getCurrentUsage,
    isNearLimit,
    isAtLimit,
    refreshUsage,
  };
}