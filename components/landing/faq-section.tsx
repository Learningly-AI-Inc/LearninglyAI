'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
    {
        question: "What is Learningly AI?",
        answer: "Learningly AI is an all-in-one AI-powered learning platform designed specifically for students. We combine reading tools, writing assistance, exam prep, multi-LLM AI search, and automatic calendar scheduling from your syllabus/documents into one unified platform—eliminating the need to juggle multiple expensive apps."
      },
      {
        question: "How is Learningly different from using ChatGPT, Grammarly, Quizlet, or Notion separately?",
        answer: "Instead of paying for and switching between 5-10 different tools, Learningly integrates everything you need for academic success in one place. We're built specifically for students' academic workflows, with features like professor-style quiz generation, syllabus-based auto-calendars, and AI detection tools—all designed to work together seamlessly."
      },
      {
        question: "What features does Learningly include?",
        answer: "Learningly offers five core modules: Reading Tools (Smart summaries, notes, flashcards, quizzes, mindmaps, chats, and even memes from your readings), Writing Assistant (Grammar checking, AI detection, paraphrasing, and humanizing tools), Exam Prep (PDF and online quizzes that match your professor's teaching style), AI Search (Multi-LLM powered search for comprehensive research with your preferred AI model, including GPT, Grok, Claude, Gemini, DeepSeek, Llama, etc.), and Auto-Calendar (Automatically generates your study schedule from syllabi and assignments)."
      },
      {
        question: "Can I upload my course materials and syllabi?",
        answer: "Yes! Learningly works with your actual course content. Upload PDFs, syllabi, lecture notes, and documents; our AI will analyze them to create personalized study materials and automatically organize your academic calendar."
      },
      {
        question: "Is my data secure?",
        answer: "Yes. We take students' privacy seriously. Your course materials, notes, and personal information are encrypted and never shared with third parties. You own your data, always. We never use your data or share it with anyone. Your data is yours, and you have the right to delete it permanently anytime."
      },
      {
        question: "Is there a free trial?",
        answer: "Yes! We offer a free trial so you can experience how Learningly streamlines your academic life before committing to a subscription."
      },
      {
        question: "What if I need help or have questions?",
        answer: "Our support team is here to help! Reach out through in-app chat, email, or check our Help Center for tutorials and guides."
      },
      {
        question: "Do you offer student discounts or financial aid?",
        answer: "We're committed to making Learningly accessible to all students. We offer campus-specific discounts, referral benefits, and need-based assistance. If you need one, please contact our team at contact@learningly.ai. We will reply within 24-72 hours."
      },
      {
        question: "What devices does Learningly work on?",
        answer: "Learningly works on desktop, tablet, and mobile devices through any modern web browser. We're also developing dedicated mobile apps for iOS and Android."
      }
];

export const FAQSection: React.FC = () => {
  return (
    <section id="faq" className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-full mb-6">
              Got Questions?
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Everything you need to know about Learningly AI. Can't find what you're looking for? Just reach out to our support team!
            </p>
        </motion.div>
          
        <div className="max-w-3xl mx-auto w-full">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden group"
                >
                  <AccordionTrigger className="text-left text-lg font-semibold text-white hover:no-underline px-6 py-4 transition-colors data-[state=open]:bg-white/5 [&_svg.lucide-chevron-down]:hidden">
                    <span className="flex-1 pr-4">{faq.question}</span>
                    <Plus className="h-5 w-5 text-gray-400 group-data-[state=open]:hidden transition-transform duration-300" />
                    <Minus className="h-5 w-5 text-blue-400 hidden group-data-[state=open]:block transition-transform duration-300" />
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 leading-relaxed px-6 pb-4 pt-0">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
