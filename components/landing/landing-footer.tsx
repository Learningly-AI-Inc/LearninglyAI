'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Twitter, Github, Linkedin } from 'lucide-react';
import Link from 'next/link';

const footerLinks = {
  company: [
    { name: 'About', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Contact', href: '#contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'FAQ', href: '#faq' },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'GitHub', icon: Github, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
];

export const LandingFooter: React.FC = () => {
  return (
    <footer className="w-full bg-black border-t border-white/10">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">Learningly</span>
            </div>
            <p className="mt-4 text-gray-400 max-w-md">
              The fastest, smartest, and most organized way to learn. Our tool makes your study materials interactive and easy to use.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:col-span-5 gap-8">
            <div>
              <h3 className="font-semibold text-white tracking-wider">Company</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.company.map(item => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-gray-400 hover:text-blue-500 transition-colors duration-300">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-wider">Legal</h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.legal.map(item => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-gray-400 hover:text-blue-500 transition-colors duration-300">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="font-semibold text-white tracking-wider mb-2">Stay organized with our latest updates</h3>
            <p className="text-gray-400 text-sm mb-4">Get tips, updates, and study strategies delivered to your inbox.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 bg-gray-800/60 border-2 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-md" 
              />
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-md whitespace-nowrap transition-colors">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <div className="text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Learningly Inc. All rights reserved.</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {socialLinks.map(link => (
              <Link key={link.name} href={link.href} className="text-gray-500 hover:text-blue-500 transition-colors duration-300">
                <link.icon className="h-5 w-5" />
                <span className="sr-only">{link.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
