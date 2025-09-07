"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Sparkles, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface ComingSoonProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features?: string[]
  backUrl?: string
}

export function ComingSoon({
  title,
  description,
  icon: Icon,
  features = [],
  backUrl = '/dashboard'
}: ComingSoonProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center"
            >
              <Icon className="w-10 h-10 text-white" />
            </motion.div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Clock className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
            </div>
            
            <CardTitle className="text-3xl font-bold text-slate-900 mb-4">
              {title}
            </CardTitle>
            
            <CardDescription className="text-lg text-slate-600 max-w-md mx-auto">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {features.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 text-center">
                  What to Expect
                </h3>
                <div className="grid gap-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}


            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline" className="border-slate-300">
                <Link href={backUrl} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </Button>
              
              <Button asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Get Notified
                </Link>
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-slate-500">
                We're working hard to bring you an amazing experience. Stay tuned!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
