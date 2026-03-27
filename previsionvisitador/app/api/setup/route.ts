import { NextResponse } from 'next/server'
import { getDb, SCHEMA_SQL } from '@/lib/db'

export async function POST() {
  try {
    const sql = getDb()
    await sql(SCHEMA_SQL)
    return NextResponse.json({ success: true, message: 'Tabla creada correctamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
