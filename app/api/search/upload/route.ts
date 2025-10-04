import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    if (fileExtension === 'pdf' || fileType === 'application/pdf') {
      // Try Adobe export first
      try {
        let text = await exportPdfToDocxExtractText(buffer)
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
          const ocr = await runAdobeOcrIfAvailable(buffer)
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
    }

    // Upload to storage (same as reading)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${timestamp}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('reading-documents')
      .upload(storagePath, buffer, { contentType: fileType, upsert: false })
    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 })
    }
    const { data: urlData } = supabase.storage
      .from('reading-documents')
      .getPublicUrl(storagePath)

    // Insert into reading_documents for consistency with reading feature
    const { data: documentRecord } = await supabase
      .from('reading_documents')
      .insert({
        user_id: user.id,
        title: fileName.replace(/\.(pdf|txt|docx)$/i, ''),
        original_filename: fileName,
        file_path: storagePath,
        file_type: fileExtension,
        file_size: fileSize,
        mime_type: fileType,
        extracted_text: serverExtractedText || '',
        page_count: serverPageCount,
        text_length: serverExtractedText ? serverExtractedText.length : 0,
        processing_status: serverExtractedText && serverExtractedText.trim().length > 0 ? 'completed' : 'failed',
        processing_notes: processingNotes,
        public_url: urlData.publicUrl,
        metadata: { uploadedAt: new Date().toISOString(), processingNotes }
      })
      .select()
      .single()

    // Also register lightweight entry in user_content for search UI list
    const ext = (file.name.split('.').pop() || 'txt').toLowerCase()
    const { data: record } = await supabase
      .from('user_content')
      .insert({
        user_id: user.id,
        content_type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : (ext === 'png' || ext === 'jpg' || ext === 'jpeg') ? 'image' : 'txt',
        content_url: urlData.publicUrl || '',
        status: 'completed'
      })
      .select()
      .single()

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

    return NextResponse.json({ success: true, documentId: documentRecord?.id, text: serverExtractedText || '', metadata, fileUrl: urlData.publicUrl, title: metadata.title, content: record })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


