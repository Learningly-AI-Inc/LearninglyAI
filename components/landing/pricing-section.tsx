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
    id: "free", // handled client-side to redirect to signup
    name: "Free",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "3 document uploads/week for reading",
      "3 tries/week in the writing part",
      "10 search queries/week",
      "No exam sessions",
      "100MB storage",
      "Basic summaries & quizzes",
      "3 days auto calendar support",
    ],
    limitations: [],
    isPopular: false,
    icon: Star,
    checkoutPlanId: "free",
  },
  {
    id: "pro",
    name: "Freemium",
    description: "Best for active students who need more power",
    monthlyPrice: 15,
    yearlyPrice: 0,
    features: [
      "50 documents uploaded/day in reading",
      "10,000 words/day in writing",
      "200 search queries/day",
      "20 exam sessions/day",
      "1GB storage",
      "Advanced analytics & insights",
      "Unlimited auto calendar",
      "Priority support",
      "Access to custom AI models",
    ],
    limitations: [],
    isPopular: true,
    icon: Zap,
    // maps to server-side plan name
    checkoutPlanId: "freemium",
  },
  {
    id: "elite", 
    name: "Premium",
    description: "Best Value — Save 45%",
    monthlyPrice: 0,
    yearlyPrice: 100,
    features: [
      "Everything in Pro, plus:",
      "Unlimited AI requests",
      "Unlimited document uploads",
      "Unlimited search queries",
      "Unlimited exam sessions",
      "100GB storage",
      "Bulk processing",
      "API access",
      "VIP support",
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
      // Map UI plan ids to server plan ids
      const selectedPlan = planId === 'pro' || planId === 'freemium' ? 'freemium' : planId === 'elite' || planId === 'premium' ? 'premium_yearly' : planId;
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
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        {isTestMode && (
          <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
            Test Mode: Payments use Stripe test environment. Replace keys to go live.
          </div>
        )}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Perfect Learning Plan
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Unlock the full potential of AI-powered learning with our flexible subscription plans
            </p>
          </motion.div>
        </div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl p-8 border-2 transition-all duration-300 h-full",
                plan.isPopular
                  ? "bg-blue-600 border-blue-600 shadow-xl hover:shadow-2xl"
                  : (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium')
                    ? "bg-green-50 border-green-500 shadow-lg hover:shadow-xl"
                    : "bg-white border-gray-200 shadow-lg hover:shadow-xl"
              )}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {plan.name.toLowerCase() === currentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-8 text-center">
                <div className="flex justify-center mb-4">
                  <plan.icon className={cn(
                    "h-8 w-8",
                    plan.isPopular ? "text-white" : "text-blue-600"
                  )} />
                </div>
                <h3 className={cn(
                  "text-2xl font-bold mb-2",
                  plan.isPopular ? "text-white" : "text-gray-900"
                )}>
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className={cn(
                    "text-sm",
                    plan.isPopular ? "text-blue-100" : "text-gray-600"
                  )}>
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="mb-8 text-center">
                {plan.monthlyPrice === 0 && plan.yearlyPrice === 0 ? (
                  <div className={cn("text-4xl font-bold", plan.isPopular ? "text-white" : "text-gray-900")}>
                    Free
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center">
                    <span className={cn("text-4xl font-bold", plan.isPopular ? "text-white" : "text-gray-900")}>
                      ${plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className={cn("ml-2 text-sm", plan.isPopular ? "text-blue-100" : "text-gray-600")}>
                      / {plan.yearlyPrice ? 'year' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className={cn("h-4 w-4 mr-3 mt-0.5 flex-shrink-0", plan.isPopular ? "text-white" : "text-green-500")} />
                    <span className={cn("text-sm leading-relaxed", plan.isPopular ? "text-white" : "text-gray-700")}>
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
                  "w-full font-semibold py-3 transition-all duration-300",
                  plan.isPopular
                    ? "bg-white text-blue-600 hover:bg-gray-50"
                    : (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium')
                      ? "bg-green-500 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {loadingPlanId === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : subscriptionLoading ? (
                  "Loading..."
                ) : (plan.id === 'pro' && currentPlan === 'freemium') || (plan.id === 'elite' && currentPlan === 'premium') ? (
                  "Current Plan"
                ) : plan.id === "free" ? (
                  user ? "Get Started" : "Sign Up Free"
                ) : (
                  <>
                    {user ? "Upgrade Now" : "Get Started"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 mb-6">
                Join thousands of students and professionals who are already using Learningly AI to enhance their learning experience.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!user ? (
                  <>
                    <Link href="/account/signup">
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        Start Free Trial
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/account">
                      <Button size="lg" variant="outline">
                        Sign In
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
                
                <Link href="/pricing">
                  <Button size="lg" variant="ghost">
                    View Detailed Pricing
                  </Button>
                </Link>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Need a custom plan?
                </h4>
                <p className="text-gray-600 mb-4">
                  Contact us for enterprise solutions, volume discounts, or custom integrations.
                </p>
                <a 
                  href="mailto:contact@learningly.ai" 
                  className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors duration-300"
                >
                  contact@learningly.ai
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
