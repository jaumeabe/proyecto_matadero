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
  visitador: string
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
  saldos: string
  vaciado: string
  observaciones: string
  semana_prevision: string
}

interface Prevision {
  id: number
  semana: number
  anio: number
  visitador: string
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
  saldos: number
  cerdos_prevision: number
  num_camiones: number
  vaciado: string
  observaciones: string
  semana_prevision: number
  created_at: string
}

function emptyRow(): FormRow {
  return {
    visitador: '', granja: '', codigo_granja: '', no_registro: '',
    peso_125_130: '', peso_120_125: '', peso_115_120: '', peso_110_115: '',
    peso_105_110: '', peso_100_105: '', peso_95_100: '', peso_menos_95: '',
    saldos: '', vaciado: 'No', observaciones: '', semana_prevision: ''
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
  totalCerdos += parseInt(row.saldos) || 0
  const numCamiones = totalKg > 0 ? Math.ceil(totalKg / MAX_KG_PER_TRUCK) : 0
  return { totalCerdos, totalKg, numCamiones }
}

export default function Home() {
  const now = new Date()
  const semanaActual = getWeekNumber(now)
  const anio = now.getFullYear()

  const [semana, setSemana] = useState(semanaActual)
  const [rows, setRows] = useState<FormRow[]>([emptyRow()])
  const [previsiones, setPrevisiones] = useState<Prevision[]>([])
  const [loading, setLoading] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const [filterSemana, setFilterSemana] = useState(semanaActual.toString())
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
        const res = await fetch('/api/previsiones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semana, anio,
            visitador: row.visitador,
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
            saldos: parseInt(row.saldos) || 0,
            cerdos_prevision: totalCerdos,
            num_camiones: numCamiones,
            vaciado: row.vaciado,
            observaciones: row.observaciones,
            semana_prevision: parseInt(row.semana_prevision) || semana
          })
        })
        const result = await res.json()
        if (!result.success) {
          alert('Error al guardar: ' + result.error)
          setLoading(false)
          return
        }
      }
      setRows([emptyRow()])
      fetchPrevisiones()
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
    setLoading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Eliminar esta entrada?')) return
    await fetch(`/api/previsiones?id=${id}`, { method: 'DELETE' })
    fetchPrevisiones()
  }

  async function handleUpdateSemana(id: number, semana_prevision: number) {
    try {
      await fetch('/api/previsiones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, semana_prevision })
      })
      fetchPrevisiones()
    } catch { /* ignore */ }
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
    saldos: acc.saldos + p.saldos,
    cerdos: acc.cerdos + p.cerdos_prevision,
    camiones: acc.camiones + p.num_camiones,
  }), { peso_125_130: 0, peso_120_125: 0, peso_115_120: 0, peso_110_115: 0, peso_105_110: 0, peso_100_105: 0, peso_95_100: 0, peso_menos_95: 0, saldos: 0, cerdos: 0, camiones: 0 })

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg font-bold text-gray-800">Prevision Visitador</h1>
              <p className="text-gray-500 text-xs">Semana {semana} - Ano {anio}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${dbReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs text-gray-600">{dbReady ? 'BD conectada' : 'Sin BD'}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow mb-3">
          <div className="p-2 border-b bg-blue-50 rounded-t-lg flex items-center gap-2">
            <h2 className="text-sm font-semibold text-blue-800">Nueva Prevision - Semana</h2>
            <input
              type="number"
              min="1"
              max="53"
              className="w-14 border rounded px-1 py-0.5 text-sm font-semibold text-blue-800 bg-white"
              value={semana}
              onChange={e => setSemana(parseInt(e.target.value) || semanaActual)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-1 py-1 text-left font-semibold">Visitador</th>
                  <th className="px-1 py-1 text-left font-semibold">Granja</th>
                  <th className="px-1 py-1 text-left font-semibold">No. Reg.</th>
                  {PESO_RANGES.map(r => (
                    <th key={r.key} className="px-1 py-1 text-center font-semibold bg-blue-50">{r.label}</th>
                  ))}
                  <th className="px-1 py-1 text-center font-semibold">Saldos</th>
                  <th className="px-1 py-1 text-center font-semibold bg-green-100">Cerdos</th>
                  <th className="px-1 py-1 text-center font-semibold bg-yellow-100">Camiones</th>
                  <th className="px-1 py-1 text-center font-semibold">Vaciado</th>
                  <th className="px-1 py-1 text-left font-semibold">Obs.</th>
                  <th className="px-1 py-1 text-center font-semibold bg-purple-100">Semana</th>
                  <th className="px-1 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const { totalCerdos, numCamiones } = calcTotals(row)
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-0.5 py-0.5">
                        <input
                          type="text"
                          className="w-20 border rounded px-1 py-0.5 text-xs"
                          value={row.visitador}
                          onChange={e => updateRow(idx, 'visitador', e.target.value)}
                          placeholder="Nombre"
                        />
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input
                          type="text"
                          placeholder="Granja..."
                          className="w-32 border rounded px-1 py-0.5 text-xs"
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
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input
                          type="text"
                          className="w-20 border rounded px-1 py-0.5 text-xs bg-gray-50"
                          value={row.no_registro}
                          readOnly
                          placeholder="Auto"
                        />
                      </td>
                      {PESO_RANGES.map(r => (
                        <td key={r.key} className="px-0.5 py-0.5">
                          <input
                            type="number"
                            min="0"
                            className="w-11 border rounded px-0.5 py-0.5 text-xs text-center"
                            value={row[r.key as keyof FormRow]}
                            onChange={e => updateRow(idx, r.key as keyof FormRow, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-0.5 py-0.5">
                        <input
                          type="number"
                          min="0"
                          className="w-11 border rounded px-0.5 py-0.5 text-xs text-center"
                          value={row.saldos}
                          onChange={e => updateRow(idx, 'saldos', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-0.5 py-0.5 text-center">
                        <span className="bg-green-100 text-green-800 font-bold px-1 py-0.5 rounded text-xs">
                          {totalCerdos}
                        </span>
                      </td>
                      <td className="px-0.5 py-0.5 text-center">
                        <span className="bg-yellow-100 text-yellow-800 font-bold px-1 py-0.5 rounded text-xs">
                          {numCamiones}
                        </span>
                      </td>
                      <td className="px-0.5 py-0.5">
                        <select
                          className="w-12 border rounded px-0.5 py-0.5 text-xs"
                          value={row.vaciado}
                          onChange={e => updateRow(idx, 'vaciado', e.target.value)}
                        >
                          <option value="No">No</option>
                          <option value="Si">Si</option>
                        </select>
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input
                          type="text"
                          className="w-24 border rounded px-1 py-0.5 text-xs"
                          value={row.observaciones}
                          onChange={e => updateRow(idx, 'observaciones', e.target.value)}
                          placeholder="Obs..."
                        />
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input
                          type="number"
                          min="1"
                          max="53"
                          className="w-11 border rounded px-0.5 py-0.5 text-xs text-center bg-purple-50"
                          value={row.semana_prevision}
                          onChange={e => updateRow(idx, 'semana_prevision', e.target.value)}
                          placeholder={semana.toString()}
                        />
                      </td>
                      <td className="px-0.5 py-0.5">
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-red-500 hover:text-red-700 text-sm px-0.5"
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
          <div className="p-2 flex gap-2 border-t">
            <button
              onClick={addRow}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
            >
              + Fila
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs font-medium"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>

        {/* Accumulated data */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-2 border-b bg-green-50 rounded-t-lg flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-green-800">Previsiones Acumuladas</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">
                Sem:
                <input
                  type="number"
                  className="ml-1 w-14 border rounded px-1 py-0.5 text-xs"
                  value={filterSemana}
                  onChange={e => setFilterSemana(e.target.value)}
                />
              </label>
              <label className="text-xs text-gray-600">
                Ano:
                <input
                  type="number"
                  className="ml-1 w-16 border rounded px-1 py-0.5 text-xs"
                  value={filterAnio}
                  onChange={e => setFilterAnio(e.target.value)}
                />
              </label>
              <button
                onClick={fetchPrevisiones}
                className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Filtrar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-1 py-1 text-left font-semibold">Visitador</th>
                  <th className="px-1 py-1 text-left font-semibold">Granja</th>
                  <th className="px-1 py-1 text-left font-semibold">No. Reg.</th>
                  {PESO_RANGES.map(r => (
                    <th key={r.key} className="px-1 py-1 text-center font-semibold bg-blue-50">{r.label}</th>
                  ))}
                  <th className="px-1 py-1 text-center font-semibold">Saldos</th>
                  <th className="px-1 py-1 text-center font-semibold bg-green-50">Cerdos</th>
                  <th className="px-1 py-1 text-center font-semibold bg-yellow-50">Camiones</th>
                  <th className="px-1 py-1 text-center font-semibold">Vaciado</th>
                  <th className="px-1 py-1 text-left font-semibold">Obs.</th>
                  <th className="px-1 py-1 text-center font-semibold bg-purple-50">Semana</th>
                  <th className="px-1 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {previsiones.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-1 py-0.5 text-gray-600">{p.visitador}</td>
                    <td className="px-1 py-0.5 font-medium">{p.granja}</td>
                    <td className="px-1 py-0.5 text-gray-500">{p.no_registro}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_125_130 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_120_125 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_115_120 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_110_115 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_105_110 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_100_105 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_95_100 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.peso_menos_95 || '-'}</td>
                    <td className="px-1 py-0.5 text-center">{p.saldos || '-'}</td>
                    <td className="px-1 py-0.5 text-center font-bold text-green-700">{p.cerdos_prevision}</td>
                    <td className="px-1 py-0.5 text-center font-bold text-yellow-700">{p.num_camiones}</td>
                    <td className="px-1 py-0.5 text-center">
                      <span className={`px-1 rounded text-xs ${p.vaciado === 'Si' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.vaciado}
                      </span>
                    </td>
                    <td className="px-1 py-0.5 text-gray-600 max-w-[100px] truncate">{p.observaciones}</td>
                    <td className="px-0.5 py-0.5 text-center">
                      <input
                        type="number"
                        min="1"
                        max="53"
                        className="w-11 border rounded px-0.5 py-0.5 text-xs text-center bg-purple-50"
                        defaultValue={p.semana_prevision || p.semana}
                        onBlur={e => {
                          const val = parseInt(e.target.value)
                          if (val && val !== (p.semana_prevision || p.semana)) {
                            handleUpdateSemana(p.id, val)
                          }
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-0.5">
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
                  <tr className="bg-gray-100 font-bold text-xs">
                    <td className="px-1 py-1" colSpan={3}>TOTALES</td>
                    <td className="px-1 py-1 text-center">{totals.peso_125_130}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_120_125}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_115_120}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_110_115}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_105_110}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_100_105}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_95_100}</td>
                    <td className="px-1 py-1 text-center">{totals.peso_menos_95}</td>
                    <td className="px-1 py-1 text-center">{totals.saldos}</td>
                    <td className="px-1 py-1 text-center text-green-700">{totals.cerdos}</td>
                    <td className="px-1 py-1 text-center text-yellow-700">{totals.camiones}</td>
                    <td colSpan={4}></td>
                  </tr>
                )}
                {previsiones.length === 0 && (
                  <tr>
                    <td colSpan={18} className="p-4 text-center text-gray-400 text-xs">
                      No hay previsiones para esta semana
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {previsiones.length > 0 && (
            <div className="p-2 border-t text-xs text-gray-500">
              Total: {previsiones.length} | Camiones: {totals.camiones}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
