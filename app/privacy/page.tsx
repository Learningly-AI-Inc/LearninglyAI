'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-12">Last updated: October 2025</p>

          <div className="prose prose-invert max-w-none">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
              <p className="text-gray-300 leading-relaxed">
                Learningly AI Inc. ("Learningly," "we," "us," or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, app, or other online platforms (collectively, the "Services").
              </p>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We may collect the following types of information:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li><strong className="text-white">Personal Information:</strong> Name, email address, institution, and any details you voluntarily provide through sign-ups, forms, or surveys.</li>
                  <li><strong className="text-white">Usage Data:</strong> Information automatically collected when you access our Services, such as browser type, device information, IP address, and interaction data.</li>
                  <li><strong className="text-white">Cookies & Analytics:</strong> We use cookies and third-party analytics (e.g., Google Analytics) to understand user behavior and improve functionality.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li>Provide, maintain, and improve our Services</li>
                  <li>Personalize user experience and deliver relevant features</li>
                  <li>Communicate updates, offers, or new features</li>
                  <li>Analyze site traffic and user engagement</li>
                  <li>Ensure compliance with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We do not sell or rent personal data. We may share information with:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li>Trusted service providers (e.g., hosting, analytics, email) under strict confidentiality agreements</li>
                  <li>Legal authorities, if required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Data Retention</h2>
                <p className="text-gray-300 leading-relaxed">
                  We retain personal data only for as long as necessary to provide our Services and comply with legal obligations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">5. Your Rights</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Depending on your jurisdiction, you may have the right to:
                </p>
                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                  <li>Access, update, or delete your personal information</li>
                  <li>Withdraw consent for communications or data processing</li>
                  <li>Contact us for privacy-related inquiries at <a href="mailto:contact@learningly.ai" className="text-blue-400 hover:text-blue-300 underline">contact@learningly.ai</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">6. Security</h2>
                <p className="text-gray-300 leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your data. However, no system is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Links</h2>
                <p className="text-gray-300 leading-relaxed">
                  Our Services may link to third-party websites. We are not responsible for their privacy practices or content.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">8. Children's Privacy</h2>
                <p className="text-gray-300 leading-relaxed">
                  Learningly is not directed to children under 13. We do not knowingly collect data from minors.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-300 leading-relaxed">
                  We may update this Privacy Policy from time to time. Continued use of the Services after updates means you accept the revised terms.
                </p>
              </section>

              <section className="border-t border-white/10 pt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
                <p className="text-gray-300 leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at:{' '}
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
