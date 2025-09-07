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
        question: "What is Learningly, and how is it different from other AI tools?",
        answer: "Learningly is an all-in-one learning assistant built specifically for students. Unlike other general-purpose AI tools, Learningly offers an integrated suite that covers reading, writing, exam prep, an individual search bar, and STEM support. Ask Anything, I am here to answer!—not just a chatbot."
      },
      {
        question: "Does Learningly support exam preparation?",
        answer: "Absolutely. Learningly includes a full-length exam-prep part customized for everyone. It creates custom practice tests, explains each answer with AI-generated walkthroughs, and tracks your progress over time—so you study smarter, not harder. It even has a quiz part, which allows you to set your own personalized quizzes while revising through summary, notes, flashcards, etc!"
      },
      {
        question: "I study STEM. Can Learningly actually help with math, physics, or chemistry?",
        answer: "Yes! Our STEM Visualizer breaks down complex problems into easy-to-follow steps with formulas, graphs, and visual aids. Whether you're solving calculus, balancing equations, or decoding vectors—Learningly's got your back."
      },
      {
        question: "Will you keep my data private and secure?",
        answer: "100%. Your privacy is our top priority. All your materials and activities are encrypted and stored securely. We do not sell or use your data to train third-party models. You can also delete your account or documents permanently at any time. We don't use your date for training purposes. Your data is yours, and you have full control over it."
      },
      {
        question: "Can I cancel my subscription? Will I be charged automatically?",
        answer: "No contracts, no hidden fees. You can cancel your subscription anytime from your dashboard. We believe in earning your trust—not locking you in."
      },
      {
        question: "Is Learningly free to use? What are my options?",
        answer: "Yes! We offer a FREEMIUM plan with limited usage—perfect if you want to test it. Need more power? Upgrade to Pro ($10/month) for unlimited access. Plus, we offer scholarships and free Pro+ plans to students in need."
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
