'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

export default function FeedbackPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const body = {
        ...payload,
        to: 'contact@learningly.ai',
      }
      await fetch('/api/feedback/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      alert('Failed to send feedback. Please email contact@learningly.ai')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="border-2 border-blue-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">We value your feedback</CardTitle>
          <CardDescription className="dark:text-gray-400">Tell us how Learningly is working for you.</CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-3">
              Thanks! Your feedback has been sent.
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">1) How satisfied are you so far? (1–5)</label>
              <Input name="q1_satisfaction" type="number" min={1} max={5} placeholder="1–5" className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">2) Was today's study session easier because of Learningly?</label>
              <select name="q2_easier" className="w-full border rounded-md p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">3) Which feature do you use the most?</label>
              <select name="q3_most" className="w-full border rounded-md p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                <option value="">Select</option>
                <option>Reading</option>
                <option>Writing</option>
                <option>Search</option>
                <option>Exam Prep</option>
                <option>Calendar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">4) Which feature do you find least useful, and why?</label>
              <Textarea name="q4_least_why" placeholder="Your thoughts..." rows={3} className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">5) Did Reading/Exam Prep give you what you expected?</label>
              <select name="q5_expected" className="w-full border rounded-md p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 mb-2">
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </select>
              <Input name="q5_comment" placeholder="Optional comment" className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">6) What would you like Learningly to do better?</label>
              <Textarea name="q6_better" placeholder="Your suggestions..." rows={3} className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">7) Did something break or not work as expected?</label>
              <Textarea name="q7_broken" placeholder="Describe the issue..." rows={3} className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">Your email (optional)</label>
              <Input name="email" type="email" placeholder="you@example.com" className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400" />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Sending…' : 'Send Feedback'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 text-center">Sent to contact@learningly.ai</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


