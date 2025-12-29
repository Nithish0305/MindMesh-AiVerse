'use client'

import { useState } from 'react'
import AppLayout from '@/components/AppLayout'

async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = (textContent.items as any[]).map((item: any) => item.str).join(' ')
    text += pageText + '\n'
  }
  return text
}

export default function ResumePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [resumeText, setResumeText] = useState('')

  const handleFile = async (file: File) => {
    try {
      setLoading(true)
      setError(null)
      console.log('Starting PDF extraction for:', file.name)
      const text = await extractTextFromPDF(file)
      console.log('Extracted text length:', text.length)
      console.log('Extracted text preview:', text.substring(0, 200))
      
      if (!text || text.trim().length < 10) {
        throw new Error('No text extracted from PDF. The file might be scanned or image-based.')
      }
      
      await parse(text)
    } catch (e) {
      console.error('PDF processing error:', e)
      setError(e instanceof Error ? e.message : 'Failed to process PDF. Try pasting text instead.')
    } finally {
      setLoading(false)
    }
  }

  const parse = async (text: string) => {
    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: text })
    })
    if (!res.ok) {
      const msg = await res.text()
      setError(`Parse failed: ${msg}`)
      return
    }
    const data = await res.json()
    setResult(data)
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 800 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Resume Parser</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>Upload a PDF or paste resume text. We'll extract structured information.</p>
        
        {result && !result.stored && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', color: '#92400e', borderRadius: 6 }}>
            Sign in to save your parsed resume to your profile.
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Upload PDF</h2>
            <input type="file" accept=".pdf" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }} />
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Paste Text</h2>
            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={10} style={{ width: '100%', padding: 8 }} />
            <button onClick={() => parse(resumeText)} disabled={loading || !resumeText.trim()} style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {loading ? 'Parsing...' : 'Parse Resume'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fee', color: '#b91c1c', borderRadius: 6 }}>{error}</div>
        )}

        {result && (
          <div style={{ marginTop: 20, border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Parsed Data</h2>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
