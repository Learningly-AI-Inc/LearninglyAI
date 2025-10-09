"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import GradientText from "@/components/ui/gradient-text";

export function LandingHero() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-primary/20 to-primary/10">
      {/* Aurora effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20 opacity-50"></div>
      
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          >
            <GradientText
              colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
              animationSpeed={3}
              showBorder={false}
              className="text-5xl font-bold md:text-7xl"
            >
              Learn Smarter, Not Harder with AI
            </GradientText>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Automatically generate quizzes, summaries, and flashcards from any
            document or video. Your personalized learning assistant is here.
          </p>
        </motion.div>

        <motion.div 
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white font-semibold text-black hover:bg-gray-200"
            >
              <Link href="/dashboard">Start Learning Now</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
