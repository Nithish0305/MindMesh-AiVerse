
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Message {
    role: 'user' | 'agent'
    content: string
}

export function ChatDock() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { role: 'agent', content: 'Hello! I am your MindMesh Mentor. How can I help you today?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        if (!input.trim() || loading) return
        
        const userMessage = input.trim()
        setMessages([...messages, { role: 'user', content: userMessage }])
        setInput('')
        setLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        ...messages,
                        { role: 'user', content: userMessage }
                    ]
                })
            })

            if (response.ok) {
                const data = await response.json()
                setMessages(prev => [...prev, { role: 'agent', content: data.content }])
            } else {
                setMessages(prev => [...prev, { role: 'agent', content: 'Sorry, I encountered an error. Please try again.' }])
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'agent', content: 'Connection error. Please check your internet and try again.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <Card className="w-80 h-[28rem] flex flex-col shadow-2xl border-primary/20">
                    <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            MindMesh Mentor
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${m.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                        : 'bg-muted text-muted-foreground rounded-tl-none'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted text-muted-foreground rounded-lg rounded-tl-none px-3 py-2 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-muted/20">
                        <form
                            className="flex w-full items-center space-x-2"
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        >
                            <Input
                                placeholder="Ask me anything..."
                                className="h-9 text-sm focus-visible:ring-1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading}
                            />
                            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            ) : (
                <Button onClick={() => setIsOpen(true)} className="rounded-full h-14 w-14 shadow-xl animate-in zoom-in slide-in-from-bottom-5">
                    <MessageSquare className="h-6 w-6" />
                </Button>
            )}
        </div>
    )
}
