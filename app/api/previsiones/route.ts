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
      peso_125_130, peso_120_125, peso_115_120, peso_110_115,
      peso_105_110, peso_100_105, peso_95_100, peso_menos_95,
      saldos, cerdos_prevision, num_camiones, vaciado, observaciones, semana_prevision
    } = body

    const result = await sql(
      `INSERT INTO previsiones (
        semana, anio, visitador, granja, codigo_granja, no_registro,
        peso_125_130, peso_120_125, peso_115_120, peso_110_115,
        peso_105_110, peso_100_105, peso_95_100, peso_menos_95,
        saldos, cerdos_prevision, num_camiones, vaciado, observaciones, semana_prevision
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        semana, anio, visitador || '', granja, codigo_granja, no_registro,
        peso_125_130 || 0, peso_120_125 || 0, peso_115_120 || 0, peso_110_115 || 0,
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
    const { id, semana_prevision } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
    }

    const result = await sql(
      'UPDATE previsiones SET semana_prevision = $1 WHERE id = $2 RETURNING *',
      [semana_prevision, id]
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
