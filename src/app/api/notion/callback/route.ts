import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "@/lib/auth";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json(
            { error: "Missing authorization code" },
            { status: 400 }
        );
    }

    // Exchange authorization code for access token
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
            "Authorization":
                "Basic " +
                Buffer.from(
                    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
                ).toString("base64"),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.NOTION_REDIRECT_URI
        })
    });

    const data = await tokenRes.json();

    if (!data.access_token) {
        return NextResponse.json(
            { error: "Failed to obtain Notion access token", details: data },
            { status: 500 }
        );
    }

    // Get current (temporary) user
    const userId = await getCurrentUserId();

    // Store token in Supabase
    await supabase.from("user_integrations").upsert({
        user_id: userId,
        provider: "notion",
        access_token: data.access_token,
        workspace_id: data.workspace_id
    });

    // Redirect back to frontend
    return NextResponse.redirect(
        "http://localhost:3000/dashboard?notion=connected"
    );
}
