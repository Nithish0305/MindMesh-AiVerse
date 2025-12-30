import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/supabaseServer";

export async function GET() {
    try {
        const user = await getServerUser();

        if (!user) {
            return NextResponse.json({ connected: false }, { status: 401 });
        }

        // Initialize Supabase inside the function
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { connected: false, error: "Supabase not configured" },
                { status: 503 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data } = await supabase
            .from("user_integrations")
            .select("user_id")
            .eq("user_id", user.id)
            .eq("provider", "notion")
            .single();

        return NextResponse.json({
            connected: Boolean(data),
        });
    } catch (error) {
        console.error("Notion status check error:", error);
        return NextResponse.json(
            { connected: false, error: "Failed to check Notion status" },
            { status: 500 }
        );
    }
}
