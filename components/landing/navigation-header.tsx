'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CardNav from './CardNav';
import { Zap } from 'lucide-react';

export const NavigationHeader: React.FC = () => {
    const router = useRouter();
    
    const items = [
      {
        label: "Features",
        bgColor: "#1E293B",
        textColor: "#F8FAFC",
        links: [
          { label: "Reading & Summaries", ariaLabel: "Reading & Summaries", href: "#features" },
          { label: "Smarter Writing Tools", ariaLabel: "Smarter Writing Tools", href: "#features" },
          { label: "Exam-Prep Powerhouse", ariaLabel: "Exam-Prep Powerhouse", href: "#features" },
        ]
      },
      {
        label: "Resources", 
        bgColor: "#312E81",
        textColor: "#F8FAFC",
        links: [
          { label: "Pricing", ariaLabel: "Pricing", href: "#pricing" },
          { label: "FAQ", ariaLabel: "FAQ", href: "#faq" },
          { label: "Testimonials", ariaLabel: "Testimonials", href: "#testimonials" },
        ]
      },
      {
        label: "Account",
        bgColor: "#1E40AF", 
        textColor: "#F8FAFC",
        links: [
          { label: "Sign In", ariaLabel: "Sign In", href: "/account" },
          { label: "Sign Up", ariaLabel: "Sign Up", href: "/account" },
        ]
      }
    ];

    const logoComponent = (
      <div className="flex items-center space-x-3 cursor-pointer group">
        <div className="relative">
          <Image 
            src="/learningly_logo.jpg" 
            alt="Learningly Logo" 
            width={32} 
            height={32}
            className="h-8 w-8 object-contain transition-all duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 h-8 w-8 bg-blue-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <span className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
          Learningly AI
        </span>
      </div>
    );
    
    const handleGetStarted = () => {
      router.push('/account');
    };
  
    return (
      <CardNav
        logoComponent={logoComponent}
        items={items}
        baseColor="rgba(15, 23, 42, 0.85)"
        menuColor="#F8FAFC"
        buttonBgColor="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
        buttonTextColor="#FFFFFF"
        ease="power3.out"
        onGetStarted={handleGetStarted}
      />
    );
  };
  
