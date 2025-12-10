"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface UsageData {
  documents_uploaded: number;
  writing_words: number;
  search_queries: number;
  exam_sessions: number;
  storage_used_bytes: number;
}

export interface UsageLimits {
  documents_uploaded?: number;
  writing_words?: number;
  search_queries?: number;
  exam_sessions?: number;
  storage_used_bytes?: number;
  // Legacy fields (kept for backwards compatibility)
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

// Cache for usage data to prevent redundant API calls
const CACHE_TTL = 30000; // 30 seconds
let usageDataCache: {
  data: { usage: UsageData; limits: UsageLimits; planName: string } | null;
  timestamp: number;
  userId: string | null
} = { data: null, timestamp: 0, userId: null };

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
  const fetchInProgress = useRef(false);

  // Fetch usage data and limits using the combined endpoint
  const fetchUsageData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Use cache if valid and not forcing refresh
    const now = Date.now();
    if (!forceRefresh &&
        usageDataCache.userId === user.id &&
        usageDataCache.data &&
        now - usageDataCache.timestamp < CACHE_TTL) {
      setUsage(usageDataCache.data.usage);
      setLimits(usageDataCache.data.limits);
      setPlanName(usageDataCache.data.planName);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    try {
      setIsLoading(true);
      setError(null);

      // Use the new combined endpoint - single API call!
      const response = await fetch('/api/user/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }

      const data = await response.json();

      const usageData = data.usage || usage;
      const limitsData = data.plan?.limits || {};
      const planNameData = data.plan?.name || 'Free';

      // Update cache
      usageDataCache = {
        data: { usage: usageData, limits: limitsData, planName: planNameData },
        timestamp: Date.now(),
        userId: user.id
      };

      // Update state from combined response
      setUsage(usageData);
      setLimits(limitsData);
      setPlanName(planNameData);

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
      fetchInProgress.current = false;
    }
  }, [user]);

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
    const normalizedPlanName = planName.toLowerCase();

    // Check if Premium Elite / Yearly (unlimited)
    const isPremiumElite = normalizedPlanName.includes('elite') || normalizedPlanName.includes('yearly');
    // Check if Premium Monthly
    const isPremium = normalizedPlanName.includes('premium') && !isPremiumElite;

    switch (action) {
      case 'documents_uploaded':
        if (isPremiumElite) return -1; // Unlimited
        if (isPremium) return limits.documents_uploaded || 3000; // 100/day = ~3000/month
        return limits.documents_uploaded || 12; // Free: 3/week = ~12/month

      case 'writing_words':
        if (isPremiumElite) return -1; // Unlimited
        if (isPremium) return limits.writing_words || 750000; // 25,000/day = ~750,000/month
        return limits.writing_words || 5000; // Free: 5,000/month

      case 'search_queries':
        if (isPremiumElite) return -1; // Unlimited
        if (isPremium) return limits.search_queries || 15000; // 500/day = ~15,000/month
        return limits.search_queries || 40; // Free: 10/week = ~40/month

      case 'exam_sessions':
        if (isPremiumElite) return -1; // Unlimited
        if (isPremium) return limits.exam_sessions || 200; // 50/week = ~200/month
        return limits.exam_sessions || 1; // Free: 1/month

      case 'storage_used_bytes':
        if (isPremiumElite) return 100 * 1024 * 1024 * 1024; // 100GB
        if (isPremium) return 10 * 1024 * 1024 * 1024; // 10GB
        return 250 * 1024 * 1024; // Free: 250MB

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

  // Refresh usage data (with cache clear)
  const refreshUsage = useCallback(() => {
    usageDataCache = { data: null, timestamp: 0, userId: null };
    fetchUsageData(true);
  }, [fetchUsageData]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

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