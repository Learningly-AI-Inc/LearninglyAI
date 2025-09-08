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
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="text-center lg:text-left">
              <SlideIn direction="down" delay={0.1}>
                <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-3">
                  Stop cramming. <span className="text-blue-500">Start learning smarter.</span>
                </h1>
              </SlideIn>
              
              <SlideIn direction="down" delay={0.3}>
                <div className="max-w-xl mx-auto lg:mx-0 mb-8">
                  <p className="text-lg text-gray-300 leading-relaxed">
                    Learningly helps you ace exams. Summarize, write, solve, and study—all in one platform.
                  </p>
                </div>
              </SlideIn>

              <FadeContent delay={0.6}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="sm" 
                      className="px-6 py-2.5 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-300 shadow-lg hover:shadow-xl"
                      onClick={handleStartStudying}
                    >
                      <Rocket className="mr-2 h-5 w-5" />
                      Start Studying Smarter - Free!
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="px-6 py-2.5 text-base font-semibold border-2 border-gray-400 text-gray-200 hover:bg-gray-700 hover:text-white rounded-md transition-all duration-300"
                      onClick={handleSeeHowItWorks}
                    >
                      <Brain className="mr-2 h-5 w-5" />
                      See How It Works
                    </Button>
                  </motion.div>
                </div>
              </FadeContent>
            </div>

            <motion.div 
              className="hidden lg:block"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <video
                autoPlay
                muted
                loop
                className="rounded-2xl shadow-2xl w-full h-auto"
                style={{ maxWidth: '800px' }}
              >
                <source src="/videos/AI_Transforms_Learning_Chaos_to_Clarity.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};
