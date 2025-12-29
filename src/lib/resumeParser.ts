import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker - use a reliable CDN URL
if (typeof window !== 'undefined') {
    // Try multiple CDN sources for the worker
    const pdfWorkerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
}

export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        let text = ''
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
            text += pageText + '\n'
        }
        
        return text
    } catch (error) {
        console.error('PDF extraction error:', error)
        throw new Error('Failed to extract text from PDF')
    }
}

export async function parseResumeWithAI(pdfText: string): Promise<{
    fullName?: string
    email?: string
    phone?: string
    education?: string
    skills?: string[]
    experience?: string
}> {
    try {
        const response = await fetch('/api/parse-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resumeText: pdfText
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Parse resume error:', errorText)
            throw new Error(`Failed to parse resume: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error parsing resume:', error)
        throw error
    }
}
