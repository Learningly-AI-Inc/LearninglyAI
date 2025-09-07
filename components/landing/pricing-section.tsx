'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Star, X, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShinyText } from '@/components/react-bits';

const plans = [
  {
    name: "Free",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 free uploads per week for every feature",
      "Exam prep",
      "Basic summaries and quizzes",
      "Access to our student community",
      "Customer Support via Email",
    ],
    limitations: [],
    isPopular: false,
    image: "/images/landing/pricing/pricing-free-plan.png"
  },
  {
    name: "Premium",
    description: "For solo designer",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      "Full Access to Learningly",
      "Full reading and writing tools",
      "Exam prep for SAT, IELTS, TOEFL",
      "Unlimited uploads",
      "Flashcard & quiz generator",
      "Priority Customer Support",
    ],
    limitations: [],
    isPopular: true,
    image: "/images/landing/pricing/pricing-premium-plan.png"
  }
];

export const PricingSection: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              We Created Plans That Suit Every Student
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Learningly AI - Ask Anything, I am here to answer!—built to help you read, write, and study like never before.
            </p>
          </motion.div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl p-10 border-2 transition-all duration-300 h-full",
                plan.name === "Free"
                  ? "bg-white border-gray-200 shadow-lg hover:shadow-xl"
                  : "bg-blue-600 border-blue-600 shadow-xl hover:shadow-2xl"
              )}
            >
              <div className="mb-8">
                <h3 className={cn("text-3xl font-bold mb-2", plan.name === "Free" ? "text-gray-900" : "text-white")}>
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className={cn("text-lg", plan.name === "Free" ? "text-gray-600" : "text-blue-100")}>
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="mb-10">
                {plan.monthlyPrice === 0 ? (
                  <div className="text-4xl font-bold text-gray-900">Free</div>
                ) : (
                  <div className="flex items-baseline">
                    <span className={cn("text-6xl font-bold", plan.name === "Free" ? "text-gray-900" : "text-white")}>
                      ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className={cn("ml-3 text-xl", plan.name === "Free" ? "text-gray-600" : "text-blue-100")}>
                      USD / {isYearly ? 'year' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-4 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className={cn("h-5 w-5 mr-3 mt-0.5 flex-shrink-0", plan.name === "Free" ? "text-blue-600" : "text-white")} />
                    <span className={cn("leading-relaxed", plan.name === "Free" ? "text-gray-700" : "text-white")}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button 
                size="lg" 
                className={cn(
                  "w-full text-lg font-bold py-6 transition-all duration-300",
                  plan.name === "Free"
                    ? "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                    : "bg-white text-blue-600 hover:bg-gray-50"
                )}
              >
                Sign Up for Free! →
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
            <div className="bg-gray-100 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Need a custom plan?
              </h3>
              <p className="text-gray-600 mb-6">
                Contact us for enterprise solutions, volume discounts, or custom integrations.
              </p>
              <a 
                href="mailto:contact@learningly.ai" 
                className="inline-flex items-center px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors duration-300"
              >
                contact@learningly.ai
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
