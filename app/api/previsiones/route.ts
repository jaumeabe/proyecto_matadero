import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')
    const anio = searchParams.get('anio')

    let rows
    if (semana && anio) {
      rows = await sql(
        'SELECT * FROM previsiones WHERE semana = $1 AND anio = $2 ORDER BY created_at DESC',
        [semana, anio]
      )
    } else {
      rows = await sql('SELECT * FROM previsiones ORDER BY anio DESC, semana DESC, created_at DESC')
    }

    return NextResponse.json({ success: true, data: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()
    const {
      semana, anio, visitador, granja, codigo_granja, no_registro,
      peso_135_140, peso_130_135, peso_125_130, peso_120_125, peso_115_120, peso_110_115,
      peso_105_110, peso_100_105, peso_95_100, peso_menos_95,
      saldos, cerdos_prevision, num_camiones, vaciado, observaciones, semana_prevision
    } = body

    const result = await sql(
      `INSERT INTO previsiones (
        semana, anio, visitador, granja, codigo_granja, no_registro,
        peso_135_140, peso_130_135, peso_125_130, peso_120_125, peso_115_120, peso_110_115,
        peso_105_110, peso_100_105, peso_95_100, peso_menos_95,
        saldos, cerdos_prevision, num_camiones, vaciado, observaciones, semana_prevision
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        semana, anio, visitador || '', granja, codigo_granja, no_registro,
        peso_135_140 || 0, peso_130_135 || 0, peso_125_130 || 0, peso_120_125 || 0,
        peso_115_120 || 0, peso_110_115 || 0,
        peso_105_110 || 0, peso_100_105 || 0, peso_95_100 || 0, peso_menos_95 || 0,
        saldos || 0, cerdos_prevision || 0, num_camiones || 0, vaciado || 'No', observaciones || '',
        semana_prevision || 0
      ]
    )

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
    }

    // If only semana_prevision is provided, do a simple update (backwards compatible)
    if (Object.keys(body).length === 2 && body.semana_prevision !== undefined) {
      const result = await sql(
        'UPDATE previsiones SET semana_prevision = $1 WHERE id = $2 RETURNING *',
        [body.semana_prevision, id]
      )
      return NextResponse.json({ success: true, data: result[0] })
    }

    // Full update
    const {
      visitador, granja, codigo_granja, no_registro,
      peso_135_140, peso_130_135, peso_125_130, peso_120_125, peso_115_120, peso_110_115,
      peso_105_110, peso_100_105, peso_95_100, peso_menos_95,
      saldos, cerdos_prevision, num_camiones, vaciado, observaciones, semana_prevision
    } = body

    const result = await sql(
      `UPDATE previsiones SET
        visitador = $1, granja = $2, codigo_granja = $3, no_registro = $4,
        peso_135_140 = $5, peso_130_135 = $6, peso_125_130 = $7, peso_120_125 = $8,
        peso_115_120 = $9, peso_110_115 = $10,
        peso_105_110 = $11, peso_100_105 = $12, peso_95_100 = $13, peso_menos_95 = $14,
        saldos = $15, cerdos_prevision = $16, num_camiones = $17, vaciado = $18,
        observaciones = $19, semana_prevision = $20
      WHERE id = $21 RETURNING *`,
      [
        visitador || '', granja, codigo_granja, no_registro,
        peso_135_140 || 0, peso_130_135 || 0, peso_125_130 || 0, peso_120_125 || 0,
        peso_115_120 || 0, peso_110_115 || 0,
        peso_105_110 || 0, peso_100_105 || 0, peso_95_100 || 0, peso_menos_95 || 0,
        saldos || 0, cerdos_prevision || 0, num_camiones || 0, vaciado || 'No',
        observaciones || '', semana_prevision || 0, id
      ]
    )

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
    }

    await sql('DELETE FROM previsiones WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
