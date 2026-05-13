import { NextResponse } from 'next/server'
import { getDb, SCHEMA_SQL } from '@/lib/db'
import { granjas as granjasSeed } from '@/lib/granjas'

export async function POST() {
  try {
    const sql = getDb()
    await sql(SCHEMA_SQL)
    // Migrations for schema changes
    const migrations = [
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS visitador VARCHAR(255) DEFAULT ''`,
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS semana_prevision INT DEFAULT 0`,
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS saldos INT DEFAULT 0`,
      `ALTER TABLE previsiones RENAME COLUMN baldos TO saldos`,
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS peso_135_140 INT DEFAULT 0`,
      `ALTER TABLE previsiones ADD COLUMN IF NOT EXISTS peso_130_135 INT DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS visitadores (id SERIAL PRIMARY KEY, nombre VARCHAR(255) UNIQUE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS granjas (codigo VARCHAR(20) PRIMARY KEY, nombre VARCHAR(255) NOT NULL, registro VARCHAR(50) DEFAULT '', tipo VARCHAR(30) DEFAULT '')`,
    ]
    for (const m of migrations) {
      try { await sql(m) } catch { /* column may already exist or rename already done */ }
    }
    // Sembrar visitadores iniciales si la tabla está vacía
    const existing = await sql('SELECT COUNT(*) as count FROM visitadores')
    if (parseInt(existing[0].count) === 0) {
      const nombres = ['SERGIO','LIVIU','BOGDAN','VALENTIN','JULIA','JORGE SCARLAT','JORDI','VANESSA','PAU','MARIA','EDUARD','ALICIA']
      for (const nombre of nombres) {
        try { await sql('INSERT INTO visitadores (nombre) VALUES ($1) ON CONFLICT DO NOTHING', [nombre]) } catch { /* ignore */ }
      }
    }
    // Sembrar granjas iniciales si la tabla está vacía
    const existingGranjas = await sql('SELECT COUNT(*) as count FROM granjas')
    if (parseInt(existingGranjas[0].count) === 0) {
      for (const g of granjasSeed) {
        try {
          await sql(
            'INSERT INTO granjas (codigo, nombre, registro, tipo) VALUES ($1, $2, $3, $4) ON CONFLICT (codigo) DO NOTHING',
            [g.codigo, g.nombre, g.registro || '', g.tipo || '']
          )
        } catch { /* ignore */ }
      }
    }
    return NextResponse.json({ success: true, message: 'Tabla creada correctamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
