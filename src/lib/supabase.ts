import { createBrowserClient } from '@supabase/ssr' // 👈 استخدمنا SSR لضمان التوافق

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// الـ Client ده للاستخدام في الـ Components اللي فيها 'use client'
export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )

// النسخة الجاهزة للاستخدام السريع
export const supabase = createClient()