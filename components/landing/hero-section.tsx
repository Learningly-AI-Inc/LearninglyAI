'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Rocket, Brain } from 'lucide-react';
import { NavigationHeader } from './navigation-header';
import { SlideIn, FadeContent } from '@/components/react-bits';

export const HeroSection: React.FC = () => {
  const router = useRouter();
  
  const handleStartStudying = () => {
    router.push('/account');
  };
  
  const handleSeeHowItWorks = () => {
    const featuresSection = document.querySelector('#features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <>
      <NavigationHeader />
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gray-900">
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <SlideIn direction="down" delay={0.1}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                One app. <span className="text-blue-500">All your study tools.</span>
              </h1>
            </SlideIn>
            
            <SlideIn direction="down" delay={0.3}>
              <div className="max-w-3xl mx-auto mb-10">
                <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 leading-relaxed">
                  Read, write, search, manage schedule, and ace exams—smarter, faster, cheaper.
                </p>
              </div>
            </SlideIn>

            <FadeContent delay={0.6}>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="px-8 py-4 text-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                    onClick={handleStartStudying}
                  >
                    <Rocket className="mr-3 h-6 w-6" />
                    Start Studying Smarter - Free!
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="px-8 py-4 text-xl font-semibold border-2 border-gray-400 text-gray-200 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-300"
                    onClick={handleSeeHowItWorks}
                  >
                    <Brain className="mr-3 h-6 w-6" />
                    See How It Works
                  </Button>
                </motion.div>
              </div>
            </FadeContent>
          </div>
        </div>
      </section>
    </>
  );
};
