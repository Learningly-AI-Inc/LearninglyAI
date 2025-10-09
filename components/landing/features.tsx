"use client";

import * as React from "react";
import {
  BookOpen,
  ClipboardCheck,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import GradientText from "@/components/ui/gradient-text";

const features = [
  {
    icon: BookOpen,
    title: "Smart Summaries",
    description:
      "Generate concise summaries, key points, or simplified explanations from any document or video.",
  },
  {
    icon: ClipboardCheck,
    title: "Interactive Quizzes",
    description:
      "Create custom quizzes with various difficulty levels to test your knowledge and track your progress.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description:
      "Get instant, context-aware answers to your questions about your study materials.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="bg-background py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <GradientText
              colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
              animationSpeed={4}
              showBorder={false}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Everything You Need to Succeed
            </GradientText>
          </motion.div>
          <motion.p 
            className="mt-4 text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Learningly AI provides a comprehensive suite of tools to enhance
            your study sessions.
          </motion.p>
        </div>

        <div className="mt-20 grid gap-12 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 * index }}
              viewport={{ once: true }}
            >
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <feature.icon className="h-8 w-8 text-white" />
              </motion.div>
              <motion.h3 
                className="mt-6 text-xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + 0.2 * index }}
                viewport={{ once: true }}
              >
                {feature.title}
              </motion.h3>
              <p className="mt-2 text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
