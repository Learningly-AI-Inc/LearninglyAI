'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Marquee from '@/components/ui/marquee';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { ShinyText } from '@/components/react-bits';

const testimonials = [
  {
    name: "Rowan Archer",
    degree: "Computer Science and Political Science Major",
    university: "Stanford University",
    avatar: "/avatars/rowan.jpg",
    text: "I use Learningly every day to generate flashcards from my readings and quizzes for my exams. It's like having an AI study buddy built just for me.",
  },
  {
    name: "Emily Zhang",
    degree: "Economics and Psychology",
    university: "Harvard University",
    avatar: "/avatars/emily.jpg", 
    text: "Learningly AI turned my overwhelming coursework into manageable daily tasks. It's the best academic assistant I've ever used.",
  },
  {
    name: "Ryan Brooks",
    degree: "Mechanical Engineering",
    university: "MIT",
    avatar: "/avatars/ryan.jpg",
    text: "For engineering students like me, Learningly is essential. It helps me solve problems, revise quickly, and even visualize concepts.",
  },
  {
    name: "Hannah Rivera",
    degree: "Ethics, Politics, and Economics",
    university: "Yale University",
    avatar: "/avatars/hannah.jpg",
    text: "Whether I'm writing essays or prepping for exams, Learningly makes the process smarter and faster. Total game-changer!",
  },
  {
    name: "Noah Johnson",
    degree: "Neuroscience Major",
    university: "Princeton University",
    avatar: "/avatars/noah.jpg",
    text: "Learningly AI helps me go from information overload to clarity. The flashcards and full-length tests are pure gold.",
  },
  {
    name: "Sarah Malik",
    degree: "Student",
    university: "The Johns Hopkins University School of Medicine",
    avatar: "/avatars/sarah.jpg",
    text: "Medical school is intense, but Learningly AI's quiz generator and concept maps make review sessions actually effective.",
  },
  {
    name: "Emma Johnson",
    degree: "Law Student",
    university: "University of Oxford",
    avatar: "/avatars/emma.jpg",
    text: "Learningly AI's critical thinking quizzes helped me revise for my law exams. It's intelligent, fast, and actually understands complex material.",
  },
  {
    name: "Jessica Thompson",
    degree: "Biology Student",
    university: "King's College London",
    avatar: "/avatars/jessica.jpg",
    text: "My dissertation research got easier with Learningly AI's summarization and citation tools. I can't imagine studying without it now.",
  },
  {
    name: "Rohan Sharma",
    degree: "Electrical Engineering",
    university: "IIT Delhi",
    avatar: "/avatars/rohan.jpg",
    text: "No other tool breaks down STEM concepts like Learningly AI. The real-time explanations and step-by-step solutions are game-changing.",
  },
  {
    name: "Omar Siddique",
    degree: "Rhodes Scholar",
    university: "University of Oxford",
    avatar: "/avatars/omar.jpg",
    text: "As a Rhodes Scholar, efficiency is key. Learningly AI saves me hours every week while improving my performance.",
  }
];

const TestimonialCard = ({ name, degree, university, text, avatar }: typeof testimonials[0]) => (
  <div className="relative h-full w-96 flex-shrink-0 rounded-2xl p-6 bg-gradient-to-br from-gray-800/60 via-gray-900/70 to-black/80 border border-white/10 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-blue-400/40 transition-all duration-300">
    <div className="flex items-center gap-4 mb-4">
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
          {name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-lg font-bold text-white">{name}</p>
        <p className="text-sm text-gray-400">{degree}, {university}</p>
      </div>
    </div>
    <p className="text-gray-200 text-base leading-relaxed">{text}</p>
    <div className="mt-4 flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  </div>
);

export const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-white text-sm font-bold rounded-full mb-6">
              Real Student Stories
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Students{' '}
              <ShinyText 
                text="achieving their goals" 
                disabled={false} 
                speed={3} 
                className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 font-extrabold"
              />
              {' '}with Learningly
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Don't just take our word for it—hear how students are transforming their study habits and boosting their grades with Learningly
            </p>
          </motion.div>
        </div>

        <div className="relative">
          <Marquee pauseOnHover className="[--duration:80s]">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black via-black/70 to-transparent"></div>
        </div>
      </div>
    </section>
  );
};
