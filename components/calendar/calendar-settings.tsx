"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CalendarSettings() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>Calendar Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-2xl font-semibold text-muted-foreground">Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-2">
              Calendar settings will be available in a future update
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
