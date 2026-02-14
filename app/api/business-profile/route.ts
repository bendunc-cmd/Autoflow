import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Generate API key if requested
    let apiKey = body.api_key;
    if (body.generate_api_key) {
      apiKey = `af_${randomBytes(24).toString("hex")}`;
    }

    const updateData: Record<string, unknown> = {
      business_name: body.business_name,
      business_description: body.business_description,
      business_services: body.business_services,
      business_phone: body.business_phone,
      business_address: body.business_address,
      business_website: body.business_website,
      response_tone: body.response_tone,
      industry: body.industry,
      auto_reply_enabled: body.auto_reply_enabled ?? true,
      updated_at: new Date().toISOString(),
    };

    if (apiKey) {
      updateData.api_key = apiKey;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...(apiKey ? { api_key: apiKey } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
