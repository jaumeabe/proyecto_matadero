import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    const rows = await sql('SELECT nombre FROM visitadores ORDER BY nombre ASC')
    return NextResponse.json({ success: true, data: (rows as { nombre: string }[]).map(r => r.nombre) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function checkAuth(request: NextRequest): boolean {
  const pwd = request.headers.get('x-admin-password')
  return pwd === (process.env.ADMIN_PASSWORD ?? 'premier')
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  try {
    const sql = getDb()
    const { nombre } = await request.json()
    if (!nombre?.trim()) return NextResponse.json({ success: false, error: 'Nombre requerido' }, { status: 400 })
    await sql('INSERT INTO visitadores (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [nombre.trim().toUpperCase()])
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre')
    if (!nombre) return NextResponse.json({ success: false, error: 'Nombre requerido' }, { status: 400 })
    await sql('DELETE FROM visitadores WHERE nombre = $1', [nombre])
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
