'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Star, X, Coffee, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShinyText } from '@/components/react-bits';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Best for trying Learningly",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "3 document uploads/week for reading",
      "5,000 words/month in writing",
      "10 search queries/week",
      "1 exam session/month",
      "250MB storage",
      "Basic summaries, flashcards, and quizzes",
      "3-day auto calendar sync",
    ],
    limitations: [
      "No analytics or AI customization",
    ],
    isPopular: false,
    icon: Star,
    checkoutPlanId: "free",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Best for daily activities",
    monthlyPrice: 15,
    yearlyPrice: 0,
    features: [
      "100 document uploads/day for reading",
      "25,000 words/day in writing",
      "500 search queries/day",
      "50 exam sessions/week",
      "10 GB storage",
      "Advanced analytics & insights dashboard",
      "Unlimited calendar integration",
      "Priority email/chat support",
      "Access to custom AI models",
      "Early access to new tools",
    ],
    limitations: [],
    isPopular: true,
    icon: Zap,
    checkoutPlanId: "premium",
  },
  {
    id: "premium-elite",
    name: "Premium Elite",
    description: "Save 45% — Best Deal",
    monthlyPrice: 0,
    yearlyPrice: 100,
    features: [
      "Everything in Premium",
      "Unlimited document uploads",
      "Unlimited AI search",
      "Unlimited writing",
      "Unlimited Exam",
      "100 GB cloud storage",
      "Bulk processing (multiple documents at once)",
      "API access (for researchers & developers)",
      "VIP support (1:1 onboarding, priority queue)",
      "Invite-only access to Learningly's new features",
    ],
    limitations: [],
    isPopular: false,
    icon: Crown,
    checkoutPlanId: "premium_yearly",
  }
];

export const PricingSection: React.FC = () => {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const { user } = useAuth();
  const { subscription, createCheckoutSession, loading: subscriptionLoading } = useSubscription();
  const isTestMode = typeof window !== 'undefined' && !!(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').includes('test');

  const handleUpgrade = async (planId: string) => {
    console.log('Landing page button clicked!', { planId, user: !!user });

    if (planId === 'free') {
      console.log('Free plan selected, redirecting to signup');
      window.location.href = '/account/signup';
      return;
    }

    // Set loading state for this specific plan
    setLoadingPlanId(planId);
    console.log('Creating Stripe checkout session for:', planId);

    try {
      // Map UI plan ids to server plan ids (same logic as /pricing page)
      const selectedPlan = planId === 'premium' ? 'premium' : planId === 'premium-elite' ? 'premium_yearly' : planId;
      // For landing page, create checkout session directly without requiring auth
      const response = await fetch('/api/subscriptions/create-checkout-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
            body: JSON.stringify({
              plan: selectedPlan,
              successUrl: `${window.location.origin}/account/success?success=true&session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${window.location.origin}/pricing?canceled=true`,
            }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('Checkout URL received:', data.checkoutUrl);
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Unable to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`);
      // Reset loading state on error
      setLoadingPlanId(null);
    }
  };

  const getCurrentPlan = () => {
    if (!user) return null;
    return subscription?.plan.name.toLowerCase() || 'free';
  };

  const currentPlan = getCurrentPlan();

  return (
    <section id="pricing" className="relative py-24 bg-black overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {isTestMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 px-6 py-3 text-sm"
          >
            <span className="font-medium">Test Mode:</span> Payments use Stripe test environment
          </motion.div>
        )}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Choose your </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                plan
              </span>
            </h2>
            <p className="text-lg text-gray-400">
              Simple pricing for powerful learning tools
            </p>
          </motion.div>
        </div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className={cn(
                "relative flex flex-col rounded-2xl p-6 md:p-8 border transition-all duration-300 h-full",
                plan.isPopular
                  ? "bg-gradient-to-b from-blue-600 to-blue-700 border-blue-500 shadow-xl shadow-blue-900/50"
                  : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
              )}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                    Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {plan.name.toLowerCase() === currentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current
                  </span>
                </div>
              )}

              <div className="mb-6 text-center">
                <div className="flex justify-center mb-4">
                  <plan.icon className={cn(
                    "h-8 w-8",
                    plan.isPopular ? "text-white" : "text-blue-400"
                  )} />
                </div>
                <h3 className={cn(
                  "text-xl font-bold mb-1",
                  plan.isPopular ? "text-white" : "text-white"
                )}>
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className={cn(
                    "text-sm",
                    plan.isPopular ? "text-blue-100" : "text-gray-400"
                  )}>
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="mb-8 text-center">
                {plan.monthlyPrice === 0 && plan.yearlyPrice === 0 ? (
                  <div className={cn("text-4xl font-bold", plan.isPopular ? "text-white" : "text-white")}>
                    Free
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center">
                    <span className={cn("text-4xl font-bold", plan.isPopular ? "text-white" : "text-white")}>
                      ${plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className={cn("ml-2 text-sm", plan.isPopular ? "text-blue-100" : "text-gray-400")}>
                      / {plan.yearlyPrice ? 'year' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={cn("h-5 w-5 flex-shrink-0 mt-0.5", plan.isPopular ? "text-white" : "text-blue-400")} />
                    <span className={cn("text-sm", plan.isPopular ? "text-white/90" : "text-gray-300")}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button
                size="lg"
                onClick={() => handleUpgrade(plan.id)}
                disabled={subscriptionLoading || loadingPlanId === plan.id || (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium')}
                className={cn(
                  "w-full font-medium py-3 text-sm rounded-xl transition-all duration-200",
                  plan.isPopular
                    ? "bg-white text-blue-600 hover:bg-gray-100"
                    : (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium')
                      ? "bg-green-600 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 border border-blue-500"
                )}
              >
                {loadingPlanId === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                    Processing...
                  </>
                ) : subscriptionLoading ? (
                  "Loading..."
                ) : (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium') ? (
                  "Current Plan"
                ) : plan.id === "free" ? (
                  user ? "Get Started" : "Sign Up Free"
                ) : (
                  user ? "Upgrade Now" : "Get Started"
                )}
              </Button>
            </motion.div>
          ))}
        </div>
        
        <div className="text-center mt-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-sm text-gray-400 mb-6">
              Need a custom plan? <a href="mailto:contact@learningly.ai" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">Get in touch</a>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
