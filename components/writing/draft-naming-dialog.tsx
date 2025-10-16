"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Save } from "lucide-react"

interface DraftNamingDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  currentName?: string
  isEditing?: boolean
}

export function DraftNamingDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  currentName = "",
  isEditing = false 
}: DraftNamingDialogProps) {
  const [draftName, setDraftName] = React.useState(currentName)
  const [isLoading, setIsLoading] = React.useState(false)

  // Reset name when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setDraftName(currentName)
    }
  }, [isOpen, currentName])

  const handleSave = async () => {
    if (!draftName.trim()) {
      return
    }

    setIsLoading(true)
    try {
      await onSave(draftName.trim())
      onClose()
    } catch (error) {
      console.error('Error saving draft name:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEditing ? 'Rename Draft' : 'Name Your Draft'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Enter a new name for this draft.'
              : 'Give your draft a memorable name so you can easily find it later.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="draft-name">Draft Name</Label>
            <Input
              id="draft-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter draft name..."
              className="w-full"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!draftName.trim() || isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : (isEditing ? 'Rename' : 'Save Draft')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
