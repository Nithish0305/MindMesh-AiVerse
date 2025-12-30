import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/supabaseServer";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    // 1️⃣ Get logged-in Supabase user
    const user = await getServerUser();

    if (!user) {
        return NextResponse.redirect(
            new URL("/signin", req.url)
        );
    }

    const userId = user.id;

    // 2️⃣ Read authorization code from Notion
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json(
            { error: "Missing authorization code" },
            { status: 400 }
        );
    }

    // 3️⃣ Exchange code for Notion access token
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
            "Authorization":
                "Basic " +
                Buffer.from(
                    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
                ).toString("base64"),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.NOTION_REDIRECT_URI,
        }),
    });

    const data = await tokenRes.json();

    if (!data.access_token) {
        return NextResponse.json(
            { error: "Failed to obtain Notion access token", details: data },
            { status: 500 }
        );
    }

    // 4️⃣ Store token mapped to THIS user
    const { error: upsertError } = await supabase.from("user_integrations").upsert({
        user_id: userId,
        provider: "notion",
        access_token: data.access_token,
        workspace_id: data.workspace_id,
    });

    if (upsertError) {
        console.error('Callback: Upsert failed:', upsertError);
    } else {
        console.log('Callback: Upsert successful for user:', userId);
    }

    // 5️⃣ Redirect cleanly back to dashboard
    return NextResponse.redirect(
        new URL("/dashboard?notion=connected", req.url)
    );
}
