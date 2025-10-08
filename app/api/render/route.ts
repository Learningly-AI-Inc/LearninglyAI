import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Security configuration
const MAX_CODE_SIZE = 5 * 1024 // 5KB
const RENDER_TIMEOUT = 20 * 1000 // 20 seconds
const TEMP_DIR = path.join(process.cwd(), 'temp', 'manim_renders')

// Allowed imports for security
const ALLOWED_IMPORTS = [
  'from manim import',
  'import manim',
  'from math import',
  'import math',
  'import numpy',
  'from numpy import'
]

interface RenderRequest {
  sceneName: string
  sceneCode: string
}

// Validate and sanitize the scene code
function validateSceneCode(code: string): { valid: boolean; error?: string } {
  // Check code size
  if (code.length > MAX_CODE_SIZE) {
    return { valid: false, error: `Code size exceeds ${MAX_CODE_SIZE / 1024}KB limit` }
  }

  // Check for forbidden patterns
  const forbiddenPatterns = [
    /import\s+os/,
    /import\s+sys/,
    /import\s+subprocess/,
    /import\s+shutil/,
    /import\s+glob/,
    /from\s+os/,
    /from\s+sys/,
    /from\s+subprocess/,
    /open\s*\(/,
    /__import__/,
    /exec\s*\(/,
    /eval\s*\(/,
    /compile\s*\(/,
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: 'Code contains forbidden operations' }
    }
  }

  // Check if it defines a proper Scene class
  const sceneClassRegex = /class\s+\w+\s*\(\s*Scene\s*\):/
  if (!sceneClassRegex.test(code)) {
    return { valid: false, error: 'Code must define a class that inherits from Scene' }
  }

  return { valid: true }
}

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create temp directory:', error)
  }
}

// Cleanup function to remove temporary files
async function cleanup(files: string[]) {
  for (const file of files) {
    try {
      await fs.unlink(file)
    } catch (error) {
      console.error(`Failed to cleanup file ${file}:`, error)
    }
  }
}

// Render Manim scene
async function renderScene(sceneName: string, sceneCode: string): Promise<{ success: boolean; videoPath?: string; error?: string }> {
  const sessionId = randomUUID()
  const tempFileName = `${sessionId}_${sceneName}.py`
  const tempFilePath = path.join(TEMP_DIR, tempFileName)
  
  const filesToCleanup: string[] = [tempFilePath]

  try {
    // Ensure temp directory exists
    await ensureTempDir()

    // Write the scene code to a temporary file
    await fs.writeFile(tempFilePath, sceneCode, 'utf8')

    // Prepare Manim command
    const manimArgs = [
      '-ql', // Quick low-quality preview
      tempFilePath,
      sceneName,
      '--format', 'mp4',
      '--save_last_frame', 'false',
      '--disable_caching'
    ]

    // Execute Manim
    return new Promise((resolve) => {
      const manim = spawn('manim', manimArgs, {
        timeout: RENDER_TIMEOUT,
        cwd: TEMP_DIR
      })

      let stdout = ''
      let stderr = ''

      manim.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      manim.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      manim.on('close', async (code) => {
        if (code === 0) {
          // Find the generated video file
          try {
            const mediaDir = path.join(TEMP_DIR, 'media', 'videos', path.basename(tempFilePath, '.py'), '480p30')
            const videoFileName = `${sceneName}.mp4`
            const videoPath = path.join(mediaDir, videoFileName)

            // Check if video exists
            await fs.access(videoPath)
            resolve({ success: true, videoPath })
          } catch (error) {
            resolve({ success: false, error: 'Generated video file not found' })
          }
        } else {
          // Parse stderr for user-friendly error
          let errorMessage = 'Rendering failed'
          if (stderr.includes('SyntaxError')) {
            errorMessage = 'Python syntax error in your code'
          } else if (stderr.includes('NameError')) {
            errorMessage = 'Undefined variable or function in your code'
          } else if (stderr.includes('ImportError')) {
            errorMessage = 'Invalid import statement'
          }
          
          resolve({ success: false, error: errorMessage })
        }

        // Cleanup temp Python file
        await cleanup(filesToCleanup)
      })

      manim.on('error', async (error) => {
        await cleanup(filesToCleanup)
        resolve({ success: false, error: `Failed to execute Manim: ${error.message}` })
      })
    })

  } catch (error) {
    await cleanup(filesToCleanup)
    return { success: false, error: `Setup error: ${error}` }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json()
    const { sceneName, sceneCode } = body

    // Validate input
    if (!sceneName || !sceneCode) {
      return NextResponse.json(
        { error: 'Missing sceneName or sceneCode' },
        { status: 400 }
      )
    }

    // Validate scene name (should be a valid Python class name)
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(sceneName)) {
      return NextResponse.json(
        { error: 'Invalid scene name. Must be a valid Python identifier.' },
        { status: 400 }
      )
    }

    // Validate and sanitize scene code
    const validation = validateSceneCode(sceneCode)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Render the scene
    const result = await renderScene(sceneName, sceneCode)

    if (result.success && result.videoPath) {
      // Stream the video file
      const videoBuffer = await fs.readFile(result.videoPath)
      
      // Cleanup the video file after reading
      try {
        await fs.unlink(result.videoPath)
        // Also try to cleanup the directory structure
        const mediaDir = path.dirname(result.videoPath)
        await fs.rmdir(mediaDir, { recursive: true }).catch(() => {})
      } catch (error) {
        console.error('Failed to cleanup video file:', error)
      }

      return new NextResponse(new Uint8Array(videoBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.length.toString(),
          'Cache-Control': 'no-cache',
        },
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Unknown rendering error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}