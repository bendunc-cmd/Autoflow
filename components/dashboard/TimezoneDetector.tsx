"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function TimezoneDetector() {
  const supabase = createClient();

  useEffect(() => {
    async function detectAndSave() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timezone) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .single();

        if (!profile?.timezone || profile.timezone !== timezone) {
          await supabase
            .from("profiles")
            .update({ timezone })
            .eq("id", user.id);
        }
      } catch {
        // Silent fail
      }
    }

    detectAndSave();
  }, [supabase]);

  return null;
}
