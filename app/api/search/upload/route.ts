import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { trackApiUsage } from '@/middleware/api-usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb'
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('📤 [SEARCH UPLOAD] Starting upload process')
  
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [SEARCH UPLOAD] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [SEARCH UPLOAD] User authenticated:', user.id)

    const incoming = await request.formData()
    const file = incoming.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = file.name
    const fileType = file.type
    const fileSize = buffer.length
    const fileExtension = (fileName.split('.').pop() || '').toLowerCase()
    console.log('📁 [SEARCH UPLOAD] File details:', { fileName, fileType, fileSize, fileExtension })

    let serverExtractedText = ''
    let serverPageCount = 1
    let processingNotes: string[] = []

    // Helpers copied from reading upload (simplified)
    async function exportPdfToDocxExtractText(pdfBuffer: Buffer): Promise<string> {
      try {
        const sdk: any = await import('@adobe/pdfservices-node-sdk')
        const mammoth = await import('mammoth')
        const { Readable } = await import('stream')
        const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
        const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
        if (!clientId || !clientSecret) return ''
        const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret })
        const pdfServices = new sdk.PDFServices({ credentials })
        const readStream = Readable.from(pdfBuffer)
        const inputAsset = await pdfServices.upload({ readStream, mimeType: sdk.MimeType.PDF })
        const params = new sdk.ExportPDFParams({ targetFormat: sdk.ExportPDFTargetFormat.DOCX, ocrLocale: sdk.ExportOCRLocale.EN_US })
        const job = new sdk.ExportPDFJob({ inputAsset, params })
        const poll = await pdfServices.submit({ job })
        const resp = await pdfServices.getJobResult({ pollingURL: poll, resultType: sdk.ExportPDFResult })
        const docxAsset = resp.result.asset
        const streamAsset = await pdfServices.getContent({ asset: docxAsset })
        const chunks: Buffer[] = []
        const rs: any = streamAsset.readStream
        await new Promise<void>((resolve, reject) => {
          rs.on('data', (c: Buffer) => chunks.push(c))
          rs.on('end', () => resolve())
          rs.on('error', (e: any) => reject(e))
        })
        const docxBuffer = Buffer.concat(chunks)
        const { value } = await mammoth.extractRawText({ buffer: docxBuffer })
        return String(value || '').trim()
      } catch {
        return ''
      }
    }

    async function runAdobeOcrIfAvailable(pdfBuffer: Buffer): Promise<{ searchablePdf?: Buffer } | null> {
      try {
        const sdk: any = await import('@adobe/pdfservices-node-sdk')
        const { Readable } = await import('stream')
        const clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID
        const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET
        if (!clientId || !clientSecret) return { }
        const credentials = new sdk.ServicePrincipalCredentials({ clientId, clientSecret })
        const pdfServices = new sdk.PDFServices({ credentials })
        const readStream = Readable.from(pdfBuffer)
        const inputAsset = await pdfServices.upload({ readStream, mimeType: sdk.MimeType.PDF })
        const job = new sdk.OCRJob({ inputAsset })
        const pollingURL = await pdfServices.submit({ job })
        const resp = await pdfServices.getJobResult({ pollingURL, resultType: sdk.OCRResult })
        const resultAsset = resp.result.asset
        const streamAsset = await pdfServices.getContent({ asset: resultAsset })
        const chunks: Buffer[] = []
        const rs: any = streamAsset.readStream
        await new Promise<void>((resolve, reject) => {
          rs.on('data', (c: Buffer) => chunks.push(c))
          rs.on('end', () => resolve())
          rs.on('error', (e: any) => reject(e))
        })
        return { searchablePdf: Buffer.concat(chunks) }
      } catch {
        return { }
      }
    }

    async function extractWithPdfJs(pdfBuffer: Buffer): Promise<{ text: string; pages: number }> {
      try {
        const pdfjsLib: any = await import('pdfjs-dist')
        if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = null
        const uint8 = new Uint8Array(pdfBuffer)
        const doc = await pdfjsLib.getDocument({ data: uint8 }).promise
        let out = ''
        const numPages = doc.numPages || 1
        for (let i = 1; i <= Math.min(numPages, 200); i++) {
          const page = await doc.getPage(i)
          const content = await page.getTextContent()
          const strings = (content.items || []).map((it: any) => it.str || '')
          out += strings.join(' ') + '\n\n'
        }
        return { text: String(out || '').replace(/\s+/g, ' ').trim(), pages: numPages }
      } catch {
        return { text: '', pages: 1 }
      }
    }

    // Extraction flow (without calling reading route)
    console.log('🔄 [SEARCH UPLOAD] Starting text extraction for PDF')
    if (fileExtension === 'pdf' || fileType === 'application/pdf') {
      // Try Adobe export first with timeout
      try {
        const adobePromise = exportPdfToDocxExtractText(buffer)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Adobe export timeout')), 30000) // 30 second timeout
        )
        
        let text = await Promise.race([adobePromise, timeoutPromise]) as string
        if (text) {
          serverExtractedText = text
          serverPageCount = Math.max(1, Math.ceil(text.length / 2000))
          processingNotes.push('Adobe export to DOCX used')
        }
      } catch (e: any) {
        processingNotes.push(`Adobe export failed: ${e?.message || String(e)}`)
      }

      if (!serverExtractedText) {
        try {
          const viaPdfJs = await extractWithPdfJs(buffer)
          if (viaPdfJs.text) {
            serverExtractedText = viaPdfJs.text
            serverPageCount = viaPdfJs.pages
            processingNotes.push('pdfjs-dist extraction used')
          }
        } catch (e: any) {
          processingNotes.push(`pdfjs-dist extraction failed: ${e?.message || String(e)}`)
        }
      }

      if (!serverExtractedText) {
        try {
          const ocrPromise = runAdobeOcrIfAvailable(buffer)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Adobe OCR timeout')), 45000) // 45 second timeout
          )
          
          const ocr = await Promise.race([ocrPromise, timeoutPromise]) as any
          if (ocr?.searchablePdf) {
            let ocrText = await exportPdfToDocxExtractText(ocr.searchablePdf)
            if (!ocrText) {
              try {
                const { default: PDFParse } = await import('pdf-parse')
                const parsed = await PDFParse(ocr.searchablePdf, { max: 0 }) as any
                ocrText = String(parsed.text || '').trim()
                serverPageCount = parsed.numpages || serverPageCount
              } catch (e: any) {
                processingNotes.push(`pdf-parse after OCR failed: ${e?.message || String(e)}`)
              }
            }
            if (ocrText) {
              serverExtractedText = ocrText
              processingNotes.push('Adobe OCR used before extraction')
            }
          }
        } catch (e: any) {
          processingNotes.push(`Adobe OCR failed: ${e?.message || String(e)}`)
        }
      }

      if (!serverExtractedText) {
        try {
          const { default: PDFParse } = await import('pdf-parse')
          const parsed = await PDFParse(buffer, { max: 0 }) as any
          serverExtractedText = String(parsed.text || '').trim()
          serverPageCount = parsed.numpages || serverPageCount
          processingNotes.push('pdf-parse fallback used')
        } catch (e: any) {
          processingNotes.push(`pdf-parse fallback failed: ${e?.message || String(e)}`)
        }
      }
    } else if (fileExtension === 'docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      serverExtractedText = String(result.value || '').trim()
      serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000))
      processingNotes.push('DOCX mammoth extraction used')
    } else if (fileExtension === 'txt' || fileType === 'text/plain') {
      serverExtractedText = buffer.toString('utf-8')
      serverPageCount = Math.max(1, Math.ceil(serverExtractedText.length / 2000))
      processingNotes.push('Plain text used')
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension) ||
               fileType.startsWith('image/')) {
      // For images, we'll use OCR or just store metadata
      // Images don't have extractable text unless we use OCR
      serverExtractedText = '' // Can add OCR later if needed
      serverPageCount = 1
      processingNotes.push('Image file uploaded - no text extraction')
    }

    // Upload to storage (same as reading)
    console.log('💾 [SEARCH UPLOAD] Uploading to storage')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${timestamp}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('reading-documents')
      .upload(storagePath, buffer, {
        contentType: fileType,
        upsert: false,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('❌ [SEARCH UPLOAD] Storage upload error:', uploadError)

      // If it's a MIME type issue with images, provide helpful error
      if (uploadError.message.includes('mime type') && fileType.startsWith('image/')) {
        return NextResponse.json({
          error: 'Image uploads are not supported in this storage bucket',
          details: 'The storage bucket is configured for document files only. Please contact an administrator to enable image uploads, or convert your image to a PDF first.',
          suggestion: 'Try converting your image to a PDF before uploading'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 })
    }
    const { data: urlData } = supabase.storage
      .from('reading-documents')
      .getPublicUrl(storagePath)

    // Determine if file is an image
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension) || fileType.startsWith('image/')
    // Use 'reading' for document_type since the constraint only allows: 'reading', 'exam-prep', 'study-material'
    const documentType = 'reading'

    // Insert into documents for consistency with reading feature
    const { data: documentRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: fileName.replace(/\.(pdf|txt|docx|png|jpg|jpeg|gif|webp)$/i, ''),
        original_filename: fileName,
        file_path: storagePath,
        file_type: fileExtension,
        file_size: fileSize,
        mime_type: fileType,
        document_type: documentType, // Always 'reading' (constraint allows: reading, exam-prep, study-material)
        extracted_text: serverExtractedText || '',
        page_count: serverPageCount,
        text_length: serverExtractedText ? serverExtractedText.length : 0,
        processing_status: isImage ? 'completed' : (serverExtractedText && serverExtractedText.trim().length > 0 ? 'completed' : 'failed'),
        processing_notes: processingNotes,
        public_url: urlData.publicUrl,
        metadata: {
          uploadedAt: new Date().toISOString(),
          isImage: isImage
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ [SEARCH UPLOAD] Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save document record', details: dbError.message }, { status: 500 })
    }

    console.log('✅ [SEARCH UPLOAD] Document record created:', documentRecord?.id)

    // Note: user_content table is no longer used in consolidated schema
    // Documents are now stored in the unified documents table

    // Track usage after successful upload
    await trackApiUsage(request, user.id)

    const responseTime = Date.now() - startTime
    console.log('✅ [SEARCH UPLOAD] Upload completed successfully:', {
      responseTime: `${responseTime}ms`,
      textLength: serverExtractedText?.length || 0,
      pages: serverPageCount,
      processingNotes
    })

    const metadata = {
      title: fileName.replace(/\.(pdf|txt|docx)$/i, ''),
      originalFileName: fileName,
      fileSize: fileSize,
      fileType: fileExtension,
      mimeType: fileType,
      pages: serverPageCount,
      textLength: serverExtractedText ? serverExtractedText.length : 0,
      uploadedAt: new Date().toISOString(),
      processingNotes,
      fileUrl: urlData.publicUrl,
      documentId: documentRecord?.id
    }

    const response = { 
      success: true, 
      documentId: documentRecord?.id, 
      text: serverExtractedText || '', 
      metadata, 
      fileUrl: urlData.publicUrl, 
      title: metadata.title 
    }
    
    console.log('📤 [SEARCH UPLOAD] Sending response:', response)
    return NextResponse.json(response)
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error('❌ [SEARCH UPLOAD] Upload failed:', {
      error: error.message,
      stack: error.stack,
      responseTime: `${responseTime}ms`
    })
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


