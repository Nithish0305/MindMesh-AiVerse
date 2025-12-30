import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/supabaseServer";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const user = await getServerUser();

    if (!user) {
        return NextResponse.json({ connected: false }, { status: 401 });
    }

    const { data } = await supabase
        .from("user_integrations")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("provider", "notion")
        .single();

    return NextResponse.json({
        connected: Boolean(data),
    });
}
