import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    const sql = getDb()
    const rows = await sql('SELECT codigo, nombre, registro, tipo FROM granjas ORDER BY nombre ASC')
    return NextResponse.json({ success: true, data: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function checkAuth(request: NextRequest): boolean {
  const pwd = request.headers.get('x-admin-password')
  return pwd === (process.env.ADMIN_PASSWORD ?? 'premier')
}

function findColIndex(header: unknown[], aliases: string[]): number {
  const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()
  for (const alias of aliases) {
    const idx = header.findIndex(h => norm(h) === alias.toLowerCase())
    if (idx >= 0) return idx
  }
  for (const alias of aliases) {
    const idx = header.findIndex(h => norm(h).includes(alias.toLowerCase()))
    if (idx >= 0) return idx
  }
  return -1
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Falta el archivo Excel' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'El Excel no tiene hojas' }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
    if (rows.length < 2) {
      return NextResponse.json({ success: false, error: 'Excel vacío' }, { status: 400 })
    }

    const header = rows[0]
    const iCodigo = findColIndex(header, ['Granja', 'Código', 'Codigo'])
    const iNombre = findColIndex(header, ['Nombre'])
    const iTipo = findColIndex(header, ['Tipo Granja', 'Tipo'])
    const iRegistro = findColIndex(header, ['No. Registro', 'Nº Registro', 'Registro'])

    if (iCodigo < 0 || iNombre < 0) {
      return NextResponse.json({
        success: false,
        error: `No se encontraron columnas Granja/Nombre. Cabeceras detectadas: ${header.join(', ')}`,
      }, { status: 400 })
    }

    const parsed: { codigo: string; nombre: string; registro: string; tipo: string }[] = []
    const seen = new Set<string>()
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r) continue
      const codigo = String(r[iCodigo] ?? '').trim()
      const nombre = String(r[iNombre] ?? '').trim()
      if (!codigo || !nombre) continue
      if (seen.has(codigo)) continue
      seen.add(codigo)
      const tipo = iTipo >= 0 ? String(r[iTipo] ?? '').trim() : ''
      const registro = iRegistro >= 0 ? String(r[iRegistro] ?? '').trim() : ''
      parsed.push({ codigo, nombre, registro, tipo })
    }

    if (parsed.length === 0) {
      return NextResponse.json({ success: false, error: 'No se encontraron filas válidas' }, { status: 400 })
    }

    const sql = getDb()
    await sql('DELETE FROM granjas')
    for (const g of parsed) {
      await sql(
        'INSERT INTO granjas (codigo, nombre, registro, tipo) VALUES ($1, $2, $3, $4) ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, registro = EXCLUDED.registro, tipo = EXCLUDED.tipo',
        [g.codigo, g.nombre, g.registro, g.tipo]
      )
    }

    return NextResponse.json({ success: true, count: parsed.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
