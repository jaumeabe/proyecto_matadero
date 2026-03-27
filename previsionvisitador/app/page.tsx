'use client'

import { useState, useEffect, useCallback } from 'react'
import { granjas } from '@/lib/granjas'

const PESO_RANGES = [
  { key: 'peso_125_130', label: '125-130', midpoint: 127.5 },
  { key: 'peso_120_125', label: '120-125', midpoint: 122.5 },
  { key: 'peso_115_120', label: '115-120', midpoint: 117.5 },
  { key: 'peso_110_115', label: '110-115', midpoint: 112.5 },
  { key: 'peso_105_110', label: '105-110', midpoint: 107.5 },
  { key: 'peso_100_105', label: '100-105', midpoint: 102.5 },
  { key: 'peso_95_100', label: '95-100', midpoint: 97.5 },
  { key: 'peso_menos_95', label: '<95', midpoint: 92.5 },
]

const MAX_KG_PER_TRUCK = 26000

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

interface FormRow {
  granja: string
  codigo_granja: string
  no_registro: string
  peso_125_130: string
  peso_120_125: string
  peso_115_120: string
  peso_110_115: string
  peso_105_110: string
  peso_100_105: string
  peso_95_100: string
  peso_menos_95: string
  baldos: string
  vaciado: string
  observaciones: string
}

interface Prevision {
  id: number
  semana: number
  anio: number
  granja: string
  codigo_granja: string
  no_registro: string
  peso_125_130: number
  peso_120_125: number
  peso_115_120: number
  peso_110_115: number
  peso_105_110: number
  peso_100_105: number
  peso_95_100: number
  peso_menos_95: number
  baldos: number
  cerdos_prevision: number
  num_camiones: number
  vaciado: string
  observaciones: string
  created_at: string
}

function emptyRow(): FormRow {
  return {
    granja: '', codigo_granja: '', no_registro: '',
    peso_125_130: '', peso_120_125: '', peso_115_120: '', peso_110_115: '',
    peso_105_110: '', peso_100_105: '', peso_95_100: '', peso_menos_95: '',
    baldos: '', vaciado: 'No', observaciones: ''
  }
}

function calcTotals(row: FormRow) {
  let totalCerdos = 0
  let totalKg = 0
  for (const r of PESO_RANGES) {
    const val = parseInt(row[r.key as keyof FormRow] as string) || 0
    totalCerdos += val
    totalKg += val * r.midpoint
  }
  totalCerdos += parseInt(row.baldos) || 0
  const numCamiones = totalKg > 0 ? Math.ceil(totalKg / MAX_KG_PER_TRUCK) : 0
  return { totalCerdos, totalKg, numCamiones }
}

export default function Home() {
  const now = new Date()
  const semana = getWeekNumber(now)
  const anio = now.getFullYear()

  const [rows, setRows] = useState<FormRow[]>([emptyRow()])
  const [previsiones, setPrevisiones] = useState<Prevision[]>([])
  const [loading, setLoading] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const [filterSemana, setFilterSemana] = useState(semana.toString())
  const [filterAnio, setFilterAnio] = useState(anio.toString())
  const [searchGranja, setSearchGranja] = useState('')

  const fetchPrevisiones = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterSemana) params.set('semana', filterSemana)
      if (filterAnio) params.set('anio', filterAnio)
      const res = await fetch(`/api/previsiones?${params}`)
      const data = await res.json()
      if (data.success) setPrevisiones(data.data)
    } catch { /* ignore */ }
  }, [filterSemana, filterAnio])

  useEffect(() => {
    async function setup() {
      try {
        await fetch('/api/setup', { method: 'POST' })
        setDbReady(true)
        fetchPrevisiones()
      } catch { setDbReady(false) }
    }
    setup()
  }, [fetchPrevisiones])

  function updateRow(idx: number, field: keyof FormRow, value: string) {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }

      if (field === 'granja') {
        const found = granjas.find(g => g.nombre === value)
        if (found) {
          next[idx].codigo_granja = found.codigo
          next[idx].no_registro = found.registro
        }
      }
      return next
    })
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow()])
  }

  function removeRow(idx: number) {
    setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)
  }

  async function handleSubmit() {
    const validRows = rows.filter(r => r.granja)
    if (validRows.length === 0) return alert('Selecciona al menos una granja')

    setLoading(true)
    try {
      for (const row of validRows) {
        const { totalCerdos, numCamiones } = calcTotals(row)
        await fetch('/api/previsiones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semana, anio,
            granja: row.granja,
            codigo_granja: row.codigo_granja,
            no_registro: row.no_registro,
            peso_125_130: parseInt(row.peso_125_130) || 0,
            peso_120_125: parseInt(row.peso_120_125) || 0,
            peso_115_120: parseInt(row.peso_115_120) || 0,
            peso_110_115: parseInt(row.peso_110_115) || 0,
            peso_105_110: parseInt(row.peso_105_110) || 0,
            peso_100_105: parseInt(row.peso_100_105) || 0,
            peso_95_100: parseInt(row.peso_95_100) || 0,
            peso_menos_95: parseInt(row.peso_menos_95) || 0,
            baldos: parseInt(row.baldos) || 0,
            cerdos_prevision: totalCerdos,
            num_camiones: numCamiones,
            vaciado: row.vaciado,
            observaciones: row.observaciones
          })
        })
      }
      setRows([emptyRow()])
      fetchPrevisiones()
    } catch {
      alert('Error al guardar')
    }
    setLoading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Eliminar esta entrada?')) return
    await fetch(`/api/previsiones?id=${id}`, { method: 'DELETE' })
    fetchPrevisiones()
  }

  const filteredGranjas = searchGranja
    ? granjas.filter(g => g.nombre.toLowerCase().includes(searchGranja.toLowerCase()) || g.codigo.toLowerCase().includes(searchGranja.toLowerCase()))
    : granjas

  // Totals for the accumulated table
  const totals = previsiones.reduce((acc, p) => ({
    peso_125_130: acc.peso_125_130 + p.peso_125_130,
    peso_120_125: acc.peso_120_125 + p.peso_120_125,
    peso_115_120: acc.peso_115_120 + p.peso_115_120,
    peso_110_115: acc.peso_110_115 + p.peso_110_115,
    peso_105_110: acc.peso_105_110 + p.peso_105_110,
    peso_100_105: acc.peso_100_105 + p.peso_100_105,
    peso_95_100: acc.peso_95_100 + p.peso_95_100,
    peso_menos_95: acc.peso_menos_95 + p.peso_menos_95,
    baldos: acc.baldos + p.baldos,
    cerdos: acc.cerdos + p.cerdos_prevision,
    camiones: acc.camiones + p.num_camiones,
  }), { peso_125_130: 0, peso_120_125: 0, peso_115_120: 0, peso_110_115: 0, peso_105_110: 0, peso_100_105: 0, peso_95_100: 0, peso_menos_95: 0, baldos: 0, cerdos: 0, camiones: 0 })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Prevision Visitador</h1>
              <p className="text-gray-500 mt-1">Semana {semana} - Ano {anio}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full ${dbReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">{dbReady ? 'Base de datos conectada' : 'Sin conexion a BD'}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b bg-blue-50 rounded-t-lg">
            <h2 className="text-lg font-semibold text-blue-800">Nueva Prevision - Semana {semana}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold min-w-[200px]">Granja</th>
                  <th className="p-2 text-left font-semibold min-w-[140px]">No. Registro</th>
                  <th colSpan={8} className="p-2 text-center font-semibold bg-blue-100">PESOS (No. cerdos por rango)</th>
                  <th className="p-2 text-center font-semibold">Baldos</th>
                  <th className="p-2 text-center font-semibold bg-green-100">Cerdos Prevision</th>
                  <th className="p-2 text-center font-semibold bg-yellow-100">No. Camiones</th>
                  <th className="p-2 text-center font-semibold min-w-[80px]">Vaciado</th>
                  <th className="p-2 text-left font-semibold min-w-[150px]">Observaciones</th>
                  <th className="p-2"></th>
                </tr>
                <tr className="bg-gray-50 text-xs">
                  <th></th>
                  <th></th>
                  {PESO_RANGES.map(r => (
                    <th key={r.key} className="p-1 text-center bg-blue-50 font-medium">{r.label}</th>
                  ))}
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const { totalCerdos, numCamiones } = calcTotals(row)
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-1">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar granja..."
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={row.granja}
                            onChange={e => {
                              updateRow(idx, 'granja', e.target.value)
                              setSearchGranja(e.target.value)
                            }}
                            list={`granjas-${idx}`}
                          />
                          <datalist id={`granjas-${idx}`}>
                            {filteredGranjas.map(g => (
                              <option key={g.codigo} value={g.nombre}>
                                {g.codigo} - {g.nombre}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
                          value={row.no_registro}
                          readOnly
                          placeholder="Auto"
                        />
                      </td>
                      {PESO_RANGES.map(r => (
                        <td key={r.key} className="p-1">
                          <input
                            type="number"
                            min="0"
                            className="w-16 border rounded px-1 py-1 text-sm text-center"
                            value={row[r.key as keyof FormRow]}
                            onChange={e => updateRow(idx, r.key as keyof FormRow, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <input
                          type="number"
                          min="0"
                          className="w-16 border rounded px-1 py-1 text-sm text-center"
                          value={row.baldos}
                          onChange={e => updateRow(idx, 'baldos', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <span className="inline-block bg-green-100 text-green-800 font-bold px-2 py-1 rounded min-w-[40px]">
                          {totalCerdos}
                        </span>
                      </td>
                      <td className="p-1 text-center">
                        <span className="inline-block bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded min-w-[40px]">
                          {numCamiones}
                        </span>
                      </td>
                      <td className="p-1">
                        <select
                          className="w-full border rounded px-1 py-1 text-sm"
                          value={row.vaciado}
                          onChange={e => updateRow(idx, 'vaciado', e.target.value)}
                        >
                          <option value="No">No</option>
                          <option value="Si">Si</option>
                        </select>
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={row.observaciones}
                          onChange={e => updateRow(idx, 'observaciones', e.target.value)}
                          placeholder="Observaciones..."
                        />
                      </td>
                      <td className="p-1">
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-red-500 hover:text-red-700 text-lg px-1"
                          title="Eliminar fila"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex gap-3 border-t">
            <button
              onClick={addRow}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
            >
              + Anadir fila
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Enviando...' : 'Enviar Prevision'}
            </button>
          </div>
        </div>

        {/* Accumulated data */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-green-50 rounded-t-lg flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-green-800">Previsiones Acumuladas</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">
                Semana:
                <input
                  type="number"
                  className="ml-1 w-16 border rounded px-2 py-1 text-sm"
                  value={filterSemana}
                  onChange={e => setFilterSemana(e.target.value)}
                />
              </label>
              <label className="text-sm text-gray-600">
                Ano:
                <input
                  type="number"
                  className="ml-1 w-20 border rounded px-2 py-1 text-sm"
                  value={filterAnio}
                  onChange={e => setFilterAnio(e.target.value)}
                />
              </label>
              <button
                onClick={fetchPrevisiones}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Filtrar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold">Sem.</th>
                  <th className="p-2 text-left font-semibold">Granja</th>
                  <th className="p-2 text-left font-semibold">No. Registro</th>
                  {PESO_RANGES.map(r => (
                    <th key={r.key} className="p-2 text-center font-semibold text-xs bg-blue-50">{r.label}</th>
                  ))}
                  <th className="p-2 text-center font-semibold">Baldos</th>
                  <th className="p-2 text-center font-semibold bg-green-50">Cerdos</th>
                  <th className="p-2 text-center font-semibold bg-yellow-50">Camiones</th>
                  <th className="p-2 text-center font-semibold">Vaciado</th>
                  <th className="p-2 text-left font-semibold">Observaciones</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {previsiones.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-gray-600">{p.semana}</td>
                    <td className="p-2 font-medium">{p.granja}</td>
                    <td className="p-2 text-xs text-gray-500">{p.no_registro}</td>
                    <td className="p-2 text-center">{p.peso_125_130 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_120_125 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_115_120 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_110_115 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_105_110 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_100_105 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_95_100 || '-'}</td>
                    <td className="p-2 text-center">{p.peso_menos_95 || '-'}</td>
                    <td className="p-2 text-center">{p.baldos || '-'}</td>
                    <td className="p-2 text-center font-bold text-green-700">{p.cerdos_prevision}</td>
                    <td className="p-2 text-center font-bold text-yellow-700">{p.num_camiones}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.vaciado === 'Si' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.vaciado}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600">{p.observaciones}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                        title="Eliminar"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
                {previsiones.length > 0 && (
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-2" colSpan={3}>TOTALES</td>
                    <td className="p-2 text-center">{totals.peso_125_130}</td>
                    <td className="p-2 text-center">{totals.peso_120_125}</td>
                    <td className="p-2 text-center">{totals.peso_115_120}</td>
                    <td className="p-2 text-center">{totals.peso_110_115}</td>
                    <td className="p-2 text-center">{totals.peso_105_110}</td>
                    <td className="p-2 text-center">{totals.peso_100_105}</td>
                    <td className="p-2 text-center">{totals.peso_95_100}</td>
                    <td className="p-2 text-center">{totals.peso_menos_95}</td>
                    <td className="p-2 text-center">{totals.baldos}</td>
                    <td className="p-2 text-center text-green-700">{totals.cerdos}</td>
                    <td className="p-2 text-center text-yellow-700">{totals.camiones}</td>
                    <td colSpan={3}></td>
                  </tr>
                )}
                {previsiones.length === 0 && (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-gray-400">
                      No hay previsiones para esta semana
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {previsiones.length > 0 && (
            <div className="p-4 border-t text-sm text-gray-500">
              Total registros: {previsiones.length} | Nr. Camiones: {totals.camiones}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
