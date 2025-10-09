'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export const ContactForm: React.FC = () => {
  return (
    <form className="space-y-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Label htmlFor="name" className="text-sm font-medium text-white mb-2 block">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Label htmlFor="email" className="text-sm font-medium text-white mb-2 block">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john.doe@example.com"
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
          />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Label htmlFor="message" className="text-sm font-medium text-white mb-2 block">
          Message
        </Label>
        <Textarea
          id="message"
          placeholder="Tell us what's on your mind..."
          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[160px] transition-all rounded-xl resize-none"
          rows={6}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 group"
        >
          <span className="flex items-center justify-center gap-2">
            Send Message
            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </span>
        </Button>
      </motion.div>
    </form>
  );
};
