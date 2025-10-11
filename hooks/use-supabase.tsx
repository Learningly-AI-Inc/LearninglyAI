"use client"

import { createClient } from "@/lib/supabase"

let supabaseClient: ReturnType<typeof createClient> | null = null

export function useSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}



