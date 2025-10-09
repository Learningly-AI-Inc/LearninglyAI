'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-gray-400 mb-12">Last updated: October 2025</p>

          <div className="prose prose-invert max-w-none">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
              <p className="text-gray-300 leading-relaxed">
                Welcome to Learningly AI Inc. ("Learningly," "we," "us," or "our"). By using our Services, you agree to these Terms of Service ("Terms"). Please read them carefully before using the site.
              </p>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Use of Services</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  You must:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li>Be at least 13 years old</li>
                  <li>Use the Services only for lawful purposes</li>
                  <li>Not misuse, copy, or resell Learningly's content or software</li>
                </ul>
                <p className="text-gray-300 leading-relaxed mt-4">
                  We reserve the right to modify or discontinue any part of the Services at any time without notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. User Accounts</h2>
                <p className="text-gray-300 leading-relaxed">
                  When you create an account, you agree to provide accurate information and keep your login credentials secure. You are responsible for all activity under your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Intellectual Property</h2>
                <p className="text-gray-300 leading-relaxed">
                  All content, branding, software, and materials on Learningly are owned by Learningly AI Inc. or its licensors. You may not reproduce, modify, or distribute them without written permission.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Payment & Subscription</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  If you purchase a subscription:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li>Fees are billed as stated on the pricing page</li>
                  <li>Subscriptions automatically renew unless canceled before the renewal date</li>
                  <li>Refunds are processed per our refund policy</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer of Warranties</h2>
                <p className="text-gray-300 leading-relaxed">
                  Our Services are provided "as is" and "as available" without warranties of any kind, express or implied. We make no guarantees about accuracy, reliability, or availability.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
                <p className="text-gray-300 leading-relaxed">
                  To the fullest extent permitted by law, Learningly AI shall not be liable for any indirect, incidental, or consequential damages arising from your use of our Services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">7. Termination</h2>
                <p className="text-gray-300 leading-relaxed">
                  We may suspend or terminate your access if you violate these Terms or misuse our Services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
                <p className="text-gray-300 leading-relaxed">
                  These Terms are governed by and construed in accordance with the laws of Delaware, United States, without regard to its conflict-of-law principles.
                </p>
              </section>

              <section className="border-t border-white/10 pt-8">
                <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
                <p className="text-gray-300 leading-relaxed">
                  For questions about these Terms, contact us at:{' '}
                  <a href="mailto:contact@learningly.ai" className="text-blue-400 hover:text-blue-300 underline">
                    contact@learningly.ai
                  </a>
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
