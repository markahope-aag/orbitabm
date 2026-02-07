import { NextResponse } from 'next/server'
import openApiSpec from '@/lib/swagger/openapi.json'

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  })
}