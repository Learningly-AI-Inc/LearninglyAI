import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">404 - Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/">
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
