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
  Calculator,
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
    icon: Calculator,
    title: "STEM Solver & Search",
    description: "Solve math problems step-by-step, search through your notes instantly, and get visual explanations for complex concepts.",
    color: "text-red-400",
    bgColor: "bg-red-900/20",
    className: "lg:col-span-2"
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
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.5 }}
    className={cn("h-full", className)}
  >
    <Card className="relative overflow-hidden h-full w-full rounded-2xl p-6 transition-all duration-300 bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-white/10 hover:border-white/20">
      <div className="absolute top-0 right-0 -z-10 opacity-10">
        <Icon className="w-32 h-32" color={color} />
      </div>
      <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4", bgColor)}>
        <Icon className={cn("h-6 w-6", color)} />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400 mb-6 text-sm leading-relaxed">{description}</p>
      <Button variant="link" className="p-0 text-white/80 hover:text-white transition-all duration-300 mt-auto">
        Try This Feature <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  </motion.div>
);

export const PlatformFeaturesSection: React.FC = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-full mb-6">
              Your Study Game Changer
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-green-400">
                raise your grades
              </span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Our comprehensive platform covers every aspect of your academic journey with powerful, personalized tools.
            </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
