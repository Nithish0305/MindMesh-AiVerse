import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/supabaseServer";
import { callLLM } from '@/lib/ai/llm'


const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const body = await req.json()
    const userPrompt: string = body.userPrompt || ''

    // 1. Resolve the authenticated user from Supabase session
    const user = await getServerUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const userId = user.id;
    const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('raw_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (resumeError || !resume?.raw_text) {
        return NextResponse.json(
            { error: 'Latest resume not found for user' },
            { status: 400 }
        )
    }
    const resumeText = resume.raw_text
    // STEP 8 — Build LLM prompts (system intelligence)

    const systemPrompt = `
You are an expert career planning AI.

You will receive:
1. A user's resume (raw text)
2. A user's goal or instruction

Your task:
- Analyze the resume
- Understand the user's goal
- Generate a personalized career roadmap

STRICT RULES:
- Output ONLY valid JSON
- DO NOT add explanations
- DO NOT use markdown
- DO NOT include extra text

The JSON format MUST be exactly:

{
  "title": string,
  "phases": [
    {
      "name": string,
      "items": string[]
    }
  ]
}

If you violate the format, the system will fail.
`;

    const userMessage = `
USER GOAL:
${userPrompt || "Create a career roadmap based on my resume."}

RESUME CONTENT:
${resumeText}
`;
    // STEP 10 — Call LLM to generate roadmap JSON
    const llmResponse = await callLLM("planning", [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: userMessage,
        },
    ])

    if (llmResponse.error || !llmResponse.content) {
        return NextResponse.json(
            { error: "LLM failed to generate roadmap" },
            { status: 500 }
        )
    }
    let roadmapData: {
        title: string
        phases: { name: string; items: string[] }[]
    }

    try {
        roadmapData = JSON.parse(llmResponse.content)
    } catch (err) {
        console.error("Invalid LLM JSON:", llmResponse.content)
        return NextResponse.json(
            { error: "Invalid roadmap format from LLM" },
            { status: 500 }
        )
    }




    // 2. Fetch Notion token
    const { data, error } = await supabase
        .from("user_integrations")
        .select("access_token")
        .eq("user_id", userId)
        .eq("provider", "notion")
        .single();

    if (error || !data) {
        return NextResponse.json(
            { error: "Notion not connected" },
            { status: 401 }
        );
    }

    const notionToken = data.access_token;
    // STEP 11 — Convert roadmap JSON into Notion blocks
    const notionBlocks: any[] = []

    for (const phase of roadmapData.phases) {
        // Phase heading
        notionBlocks.push({
            object: "block",
            type: "heading_2",
            heading_2: {
                rich_text: [{ text: { content: phase.name } }],
            },
        })

        // Phase items
        for (const item of phase.items) {
            notionBlocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: [{ text: { content: item } }],
                },
            })
        }
    }

    // 3. Create roadmap page in Notion
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${notionToken}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
            parent: { type: "workspace", workspace: true },
            properties: {
                title: {
                    title: [
                        {
                            text: {
                                content: roadmapData.title
                            }
                        }
                    ]
                }
            },
            children: notionBlocks
        })
    });

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
        return NextResponse.json(
            { error: "Failed to create roadmap", details: notionData },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        notionPageId: notionData.id
    });
}
