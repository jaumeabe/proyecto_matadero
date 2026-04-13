import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const semana = searchParams.get('semana')
    const anio = searchParams.get('anio')
    const visitador = searchParams.get('visitador')

    let rows
    if (semana && anio) {
      rows = await sql('SELECT * FROM previsiones WHERE semana = $1 AND anio = $2 ORDER BY visitador, granja', [semana, anio])
    } else {
      rows = await sql('SELECT * FROM previsiones ORDER BY anio DESC, semana DESC, visitador, granja')
    }

    const data = (rows as Record<string, unknown>[])
      .filter(r => !visitador || r.visitador === visitador)
      .map(r => ({
        'Semana': r.semana,
        'Año': r.anio,
        'Semana Previsión': r.semana_prevision || r.semana,
        'Visitador': r.visitador,
        'Granja': r.granja,
        'Código Granja': r.codigo_granja,
        'Nº Registro': r.no_registro,
        '135-140 kg': r.peso_135_140,
        '130-135 kg': r.peso_130_135,
        '125-130 kg': r.peso_125_130,
        '120-125 kg': r.peso_120_125,
        '115-120 kg': r.peso_115_120,
        '110-115 kg': r.peso_110_115,
        '105-110 kg': r.peso_105_110,
        '100-105 kg': r.peso_100_105,
        '95-100 kg': r.peso_95_100,
        '<95 kg': r.peso_menos_95,
        'Saldos': r.saldos,
        'Total Cerdos': r.cerdos_prevision,
        'Nº Camiones': r.num_camiones,
        'Vaciado': r.vaciado,
        'Observaciones': r.observaciones,
        'Fecha creación': r.created_at ? new Date(r.created_at as string).toLocaleString('es-ES') : '',
      }))

    const ws = XLSX.utils.json_to_sheet(data)

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 8 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 18 },
    ]
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Previsiones')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = semana && anio ? `previsiones_s${semana}_${anio}.xlsx` : 'previsiones_todas.xlsx'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
