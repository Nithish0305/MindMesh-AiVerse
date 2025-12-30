'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { extractTextFromPDF, parseResumeWithAI } from '@/lib/resumeParser'

interface ResumeData {
    fullName?: string
    email?: string
    phone?: string
    education?: string
    skills?: string[]
    experience?: string
}

interface ResumeUploaderProps {
    onDataExtracted: (data: ResumeData) => void
}

export function ResumeUploader({ onDataExtracted }: ResumeUploaderProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        
        if (!selectedFile) return

        if (selectedFile.type !== 'application/pdf') {
            setError('Please select a PDF file')
            return
        }

        if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
            setError('File size must be less than 10MB')
            return
        }

        setFile(selectedFile)
        setError(null)
        await processResume(selectedFile)
    }

    const processResume = async (pdfFile: File) => {
        setLoading(true)
        setError(null)

        try {
            // Extract text from PDF
            const resumeText = await extractTextFromPDF(pdfFile)

            if (!resumeText.trim()) {
                setError('Could not extract text from PDF. Please try another file.')
                setLoading(false)
                return
            }

            // Parse with AI
            const parsedData = await parseResumeWithAI(resumeText)

            if (parsedData && Object.keys(parsedData).length > 0) {
                onDataExtracted(parsedData)
                // Log event (best-effort, ignore failures)
                try {
                    await fetch('/api/events/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            category: 'resume',
                            action: 'parsed',
                            context: {
                                fileName: pdfFile.name,
                                fields: Object.keys(parsedData)
                            }
                        })
                    })
                } catch {}
                setSuccess(true)
                setTimeout(() => setSuccess(false), 2000)
            } else {
                setError('Could not parse resume. Please try another file.')
            }
        } catch (err) {
            console.error('Resume processing error:', err)
            setError('Error processing resume. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="p-6 space-y-4">
            <div>
                <Label className="text-base font-semibold mb-2 block">Upload Resume (PDF)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                    We'll automatically extract your information to speed up onboarding
                </p>
            </div>

            <div className="relative">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={loading}
                    className="hidden"
                    id="resume-upload"
                />
                <label
                    htmlFor="resume-upload"
                    className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/30'
                    } ${error ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30'}`}
                >
                    {success ? (
                        <div className="space-y-2">
                            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
                            <p className="font-medium text-green-700 dark:text-green-400">Resume processed successfully!</p>
                            <p className="text-sm text-muted-foreground">{file?.name}</p>
                        </div>
                    ) : loading ? (
                        <div className="space-y-2">
                            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                            <p className="font-medium">Processing your resume...</p>
                            <p className="text-sm text-muted-foreground">Extracting information with AI</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-center gap-3">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-medium">Drop your resume here or click to browse</p>
                            <p className="text-sm text-muted-foreground">PDF only, max 10MB</p>
                            {file && <p className="text-sm text-primary font-medium">{file.name}</p>}
                        </div>
                    )}
                </label>
            </div>

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                    {error}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                Your resume is processed locally and securely. No data is stored unnecessarily.
            </p>
        </Card>
    )
}
