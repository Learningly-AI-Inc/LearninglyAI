"use client";

import { Button } from "@/components/ui/button";
import { X, Zap, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  limitType?: 'documents_uploaded' | 'exam_sessions' | 'writing_words' | 'search_queries';
}

const getLimitDetails = (limitType: string) => {
  switch (limitType) {
    case 'documents_uploaded':
      return {
        feature: 'Document Uploads',
        freeLimit: '12 per month',
        premiumLimit: '3,000 per month',
        benefits: [
          'Upload up to 3,000 documents per month',
          '10GB storage space',
          'Priority processing',
          'Advanced document features'
        ]
      };
    case 'exam_sessions':
      return {
        feature: 'Exam Sessions',
        freeLimit: '1 per month',
        premiumLimit: '200 per month',
        benefits: [
          'Generate up to 200 exams per month',
          'Advanced quiz customization',
          'Detailed performance analytics',
          'Export to PDF'
        ]
      };
    case 'writing_words':
      return {
        feature: 'AI Writing',
        freeLimit: '5,000 words/month',
        premiumLimit: '750,000 words/month',
        benefits: [
          'Generate up to 750,000 words per month',
          'Advanced AI models',
          'Priority generation',
          'Longer outputs'
        ]
      };
    case 'search_queries':
      return {
        feature: 'Search Queries',
        freeLimit: '40 per month',
        premiumLimit: '15,000 per month',
        benefits: [
          'Perform up to 15,000 searches per month',
          'Advanced search filters',
          'Search history',
          'Faster results'
        ]
      };
    default:
      return {
        feature: 'Premium Features',
        freeLimit: 'Limited',
        premiumLimit: 'Unlimited',
        benefits: [
          'Unlimited access to all features',
          'Priority support',
          'Advanced customization',
          'Early access to new features'
        ]
      };
  }
};

export function UpgradeModal({
  isOpen,
  onClose,
  title,
  message,
  limitType = 'documents_uploaded'
}: UpgradeModalProps) {
  const router = useRouter();
  const details = getLimitDetails(limitType);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {title || 'Upgrade to Premium'}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Unlock unlimited access
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Message */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            {message || `You've reached your free plan limit for ${details.feature}.`}
          </p>
        </div>

        {/* Comparison */}
        <div className="mb-6 space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Free Plan</span>
            <span className="text-sm text-slate-600">{details.freeLimit}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
            <span className="text-sm font-semibold text-slate-900">Premium Plan</span>
            <span className="text-sm font-semibold text-blue-600">{details.premiumLimit}</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Premium Benefits:</h3>
          <div className="space-y-2">
            {details.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </div>

        {/* Pricing hint */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Starting at $9.99/month • Cancel anytime
        </p>
      </div>
    </div>
  );
}
