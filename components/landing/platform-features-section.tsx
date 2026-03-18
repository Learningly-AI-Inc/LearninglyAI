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
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: FileText,
    title: "Smart Reading Help!",
    description: "Upload your textbooks, readings, or lecture notes and get instant, professor-style smart summaries, notes, flashcards, quizzes, mind maps, and even funny memes—all from your own materials. It's your personal academic companion for every document you read.",
    color: "text-blue-400",
    bgColor: "bg-blue-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: PenTool,
    title: "Personalized Writing Suite",
    description: "Refine your writing with AI that matches your tone and academic goals. Access grammar checking, paraphrasing, AI detection, and humanizing tools—all in one place.",
    color: "text-purple-400",
    bgColor: "bg-purple-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: BookOpen,
    title: "Exam Prep Powerhouse",
    description: "Prepare smarter with adaptive quizzes and tests that mirror your professor's style. Automatically generate study plans from your syllabus and track your mastery level over time.",
    color: "text-green-400",
    bgColor: "bg-green-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: Search,
    title: "Multi-LLM AI Search",
    description: "Ask anything with Learningly's research-grade AI search with your preferred AI models. Choose between GPT, Claude, Gemini, DeepSeek, Llama, or Grok for fast, accurate, and multi-perspective insights across your queries!",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/20",
    className: "lg:col-span-2"
  },
  {
    icon: Calendar,
    title: "Auto-Calendar",
    description: "Upload your syllabus and documents—Learningly automatically builds your study calendar and deadlines for the entire semester/quarter. Track your progress and deadlines with Learningly!",
    color: "text-teal-400",
    bgColor: "bg-teal-900/20",
    className: "lg:col-span-2"
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
