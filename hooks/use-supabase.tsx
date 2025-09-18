"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"

export function useSupabase() {
  const [supabase, setSupabase] = useState(createClient())

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  return supabase
}
