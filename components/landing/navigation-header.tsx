'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NavigationHeader: React.FC = () => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ];

    const handleNavClick = (href: string) => {
      setIsOpen(false);
      if (href.startsWith('#')) {
        setTimeout(() => {
          const element = document.querySelector(href);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        router.push(href);
      }
    };

    return (
      <>
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
        >
          <div className="max-w-6xl mx-auto">
            <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
                <Image
                  src="/learningly_logo.jpg"
                  alt="Learningly"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg"
                />
                <span className="text-lg font-semibold text-white">Learningly</span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {/* Desktop CTA */}
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/account')}
                  className="text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/account')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Get Started
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </motion.nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-4 right-4 z-50 md:hidden"
              >
                <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => handleNavClick(link.href)}
                      className="block w-full text-left text-white hover:text-blue-400 transition-colors py-2"
                    >
                      {link.label}
                    </button>
                  ))}
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/account');
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/account');
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  };

