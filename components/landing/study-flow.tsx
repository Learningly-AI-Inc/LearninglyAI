"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import GradientText from "@/components/ui/gradient-text";

export function LandingStudyFlow() {
  const [isFlipped, setIsFlipped] = React.useState(false);

  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <GradientText
              colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
              animationSpeed={4}
              showBorder={false}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Experience Interactive Learning
            </GradientText>
          </motion.div>
          <motion.p 
            className="mt-4 text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Engage with your study materials in a whole new way.
          </motion.p>
        </div>

        <div className="mt-20 grid items-center gap-12 md:grid-cols-2">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="mb-6 text-2xl font-bold text-white">
              Test Your Knowledge
            </h3>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="rounded-full">
                Try a Quick Quiz
              </Button>
            </motion.div>
            <p className="mt-4 text-center text-gray-400">
              Generate quizzes instantly and get immediate feedback on your
              performance.
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="mb-6 text-2xl font-bold text-white">
              Master Key Concepts
            </h3>
            <div className="w-full max-w-xs">
              <motion.div
                className="relative h-48 w-full cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="absolute inset-0 flex h-full w-full items-center justify-center rounded-lg p-6"
                  style={{
                    background: isFlipped ? "#7c3aed" : "#4f46e5",
                  }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <p className="text-xl font-semibold text-white">
                    {isFlipped ? "Mitochondria" : "What is the powerhouse of the cell?"}
                  </p>
                </motion.div>
              </motion.div>
            </div>
            <p className="mt-4 text-center text-gray-400">
              Use smart flashcards with spaced repetition to improve your memory
              retention.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
