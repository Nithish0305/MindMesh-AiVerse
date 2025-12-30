
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { ResumeUploader } from '@/components/onboarding/ResumeUploader'

interface FormData {
    education: string
    role_interest: string
    skills: string[]
    skillInput: string
    values: string
    resume: File | null
}

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const [formData, setFormData] = useState<FormData>({
        education: '',
        role_interest: '',
        skills: [],
        skillInput: '',
        values: '',
        resume: null
    })

    const totalSteps = 4
    const progress = (step / totalSteps) * 100

    const handleResumeDataExtracted = (resumeData: any) => {
        // Auto-fill form fields from extracted resume data
        if (resumeData.fullName) {
            // Store name if needed - can be added to form
        }
        if (resumeData.education) {
            setFormData(prev => ({ ...prev, education: resumeData.education }))
        }
        if (resumeData.skills && Array.isArray(resumeData.skills)) {
            setFormData(prev => ({ ...prev, skills: resumeData.skills }))
        }
        if (resumeData.experience) {
            // Can be added to another field
        }
    }

    const handleNext = async () => {
        if (step < totalSteps) {
            setStep(step + 1)
        } else {
            await handleSubmit()
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { error } = await supabase.from('career_profile').insert({
                user_id: user.id,
                education: { history: formData.education },
                skills: formData.skills,
                values_assessment: formData.values,
                bio: `Looking for ${formData.role_interest}`
            })

            if (error) {
                console.error('Error saving profile:', error)
            }

            router.push('/dashboard')
        }
        setLoading(false)
    }

    const addSkill = () => {
        if (formData.skillInput && !formData.skills.includes(formData.skillInput)) {
            setFormData({ ...formData, skills: [...formData.skills, formData.skillInput], skillInput: '' })
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-lg shadow-2xl border-primary/10">
                <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Career Profile
                        </CardTitle>
                        <span className="text-sm text-muted-foreground font-medium">Step {step} / {totalSteps}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6 min-h-[300px]">
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <Label className="text-base">Where did you study?</Label>
                                <Input
                                    className="h-12"
                                    placeholder="University, Bootcamp, or Self-taught"
                                    value={formData.education}
                                    onChange={e => setFormData({ ...formData, education: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base">What role are you targeting?</Label>
                                <Input
                                    className="h-12"
                                    placeholder="e.g. Senior Frontend Engineer"
                                    value={formData.role_interest}
                                    onChange={e => setFormData({ ...formData, role_interest: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <Label className="text-base">Add your top technical skills</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="h-12"
                                        placeholder="e.g. React, Python, AWS"
                                        value={formData.skillInput}
                                        onChange={e => setFormData({ ...formData, skillInput: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && addSkill()}
                                    />
                                    <Button className="h-12 px-6" onClick={addSkill}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {formData.skills.map(s => (
                                        <Badge key={s} variant="secondary" className="px-3 py-1.5 text-sm flex items-center gap-2">
                                            {s}
                                            <span className="cursor-pointer hover:text-destructive font-bold" onClick={() => setFormData({ ...formData, skills: formData.skills.filter(x => x !== s) })}>×</span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-2">
                                <Label className="text-base">What values matter most to you?</Label>
                                <Textarea
                                    className="min-h-[150px] resize-none p-4"
                                    placeholder="e.g. Remote work flexibility, strong mentorship, fast-paced environment..."
                                    value={formData.values}
                                    onChange={e => setFormData({ ...formData, values: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                            <ResumeUploader onDataExtracted={handleResumeDataExtracted} />
                            <p className="text-xs text-muted-foreground text-center">
                                Optional: Upload a resume to auto-fill your information
                            </p>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/20">
                    <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                        Back
                    </Button>
                    <Button onClick={handleNext} disabled={loading} className="w-32">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {step === totalSteps ? 'Complete' : 'Next'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
