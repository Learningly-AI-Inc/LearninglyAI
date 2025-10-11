'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Search, 
  PenTool, 
  Brain, 
  ArrowRight,
  FileText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: FileText,
    title: "Reading & Summaries",
    description: "Upload documents and get instant, comprehensive summaries. From textbooks to notes—Our tool makes your study materials interactive and easy to use.",
    color: "text-blue-400",
    bgColor: "bg-blue-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: PenTool,
    title: "Smarter Writing Tools",
    description: "Personalized AI writing with your tone and structure. Upload writing samples and study materials to generate customized content.",
    color: "text-purple-400",
    bgColor: "bg-purple-900/20",
    className: "lg:col-span-1"
  },
  {
    icon: BookOpen,
    title: "Exam-Prep Powerhouse",
    description: "Generate custom practice tests, flashcards, and quizzes. Adaptive learning that adjusts to your progress and knowledge gaps.",
    color: "text-green-400",
    bgColor: "bg-green-900/20",
    className: "lg:col-span-1"
  },
  {
    icon: Search,
    title: "AI Search Bar",
    description: "Ask anything to your AI-based search bar. Get instant, accurate answers with real-time web results and intelligent analysis.",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: Brain,
    title: "AI Reading Assistant",
    description: "Upload any materials and get instantly summarized texts, notes, and mind maps. It will generate flashcards, quizzes, and even memes.",
    color: "text-teal-400",
    bgColor: "bg-teal-900/20",
    className: "lg:col-span-1"
  },
  {
    icon: BarChart3,
    title: "Study Analytics",
    description: "Track your learning progress with detailed analytics and insights. Monitor your performance, identify knowledge gaps, and get personalized recommendations.",
    color: "text-pink-400",
    bgColor: "bg-pink-900/20",
    className: "lg:col-span-3"
  }
];

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, className }: (typeof features)[0]) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className={cn("h-full", className)}
  >
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden h-full w-full rounded-2xl p-8 transition-all duration-300 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07]">
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-6">
            <div className={cn("inline-flex p-3 rounded-xl", bgColor)}>
              <Icon className={cn("h-6 w-6", color)} />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white mb-3">
            {title}
          </h3>

          <p className="text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Subtle hover indicator */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  </motion.div>
);

export const PlatformFeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative py-24 bg-black overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 px-4">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                raise your grades
              </span>
            </h2>
            <p className="text-base md:text-lg text-gray-400 px-4">
              Powerful tools designed for modern learners
            </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
