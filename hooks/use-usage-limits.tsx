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

  // Fetch usage data and limits
  const fetchUsageData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch current usage
      const usageResponse = await fetch('/api/usage/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!usageResponse.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const usageData = await usageResponse.json();
      setUsage(usageData.usage || usage);

      // Fetch subscription and limits
      const subscriptionResponse = await fetch('/api/subscriptions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription data');
      }

      const subscriptionData = await subscriptionResponse.json();
      setLimits(subscriptionData.plan?.limits || {});
      setPlanName(subscriptionData.plan?.name || 'Free');

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

  // Get current limit for a specific action
  const getCurrentLimit = (action: keyof UsageData): number => {
    switch (action) {
      case 'documents_uploaded':
        return limits.document_uploads_per_day || limits.document_uploads_per_week || 0;
      case 'writing_words':
        return limits.writing_words_per_day || limits.writing_words_per_month || 0;
      case 'search_queries':
        return limits.search_queries_per_day || limits.search_queries_per_week || 0;
      case 'exam_sessions':
        return limits.exam_sessions_per_week || limits.exam_sessions_per_month || 0;
      case 'storage_used_bytes':
        return (limits.storage_mb || 0) * 1024 * 1024; // Convert MB to bytes
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