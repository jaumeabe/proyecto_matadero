import { NextResponse } from 'next/server'
import { getDb, SCHEMA_SQL } from '@/lib/db'

export async function POST() {
  try {
    const sql = getDb()
    await sql(SCHEMA_SQL)
    // Add columns that may be missing from older schema
    const migrations = [
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS visitador VARCHAR(255) DEFAULT ''`,
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS semana_prevision INT DEFAULT 0`,
    ]
    for (const m of migrations) {
      try { await sql(m) } catch { /* column may already exist */ }
    }
    return NextResponse.json({ success: true, message: 'Tabla creada correctamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
