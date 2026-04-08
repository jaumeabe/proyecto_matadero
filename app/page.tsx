'use client'

import { useState, useEffect, useCallback } from 'react'
import { granjas } from '@/lib/granjas'

const VISITADORES = ['SERGIO', 'LIVIU', 'BOGDAN', 'VALENTIN', 'JULIA', 'ALEIX', 'JORGE SCARLAT', 'JORDI', 'VANESSA', 'PAU', 'MARIA', 'EDUARD', 'ALICIA']

const PESO_RANGES = [
  { key: 'peso_135_140', label: '135-140', midpoint: 137.5 },
  { key: 'peso_130_135', label: '130-135', midpoint: 132.5 },
  { key: 'peso_125_130', label: '125-130', midpoint: 127.5 },
  { key: 'peso_120_125', label: '120-125', midpoint: 122.5 },
  { key: 'peso_115_120', label: '115-120', midpoint: 117.5 },
  { key: 'peso_110_115', label: '110-115', midpoint: 112.5 },
  { key: 'peso_105_110', label: '105-110', midpoint: 107.5 },
  { key: 'peso_100_105', label: '100-105', midpoint: 102.5 },
  { key: 'peso_95_100', label: '95-100', midpoint: 97.5 },
  { key: 'peso_menos_95', label: '<95', midpoint: 92.5 },
]

const ANIMALS_PER_TRUCK: Record<string, number> = {
  peso_135_140: 170,
  peso_130_135: 180,
  peso_125_130: 190,
  peso_120_125: 200,
  peso_115_120: 210,
  peso_110_115: 220,
  peso_105_110: 220,
  peso_100_105: 220,
  peso_95_100: 220,
  peso_menos_95: 220,
}

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
  peso_135_140: string
  peso_130_135: string
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
  peso_135_140: number
  peso_130_135: number
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
    peso_135_140: '', peso_130_135: '',
    peso_125_130: '', peso_120_125: '', peso_115_120: '', peso_110_115: '',
    peso_105_110: '', peso_100_105: '', peso_95_100: '', peso_menos_95: '',
    saldos: '', vaciado: 'No', observaciones: '', semana_prevision: ''
  }
}

function calcTotals(row: FormRow) {
  let totalCerdos = 0
  let numCamiones = 0
  for (const r of PESO_RANGES) {
    const val = parseInt(row[r.key as keyof FormRow] as string) || 0
    totalCerdos += val
    numCamiones += val / (ANIMALS_PER_TRUCK[r.key] || 220)
  }
  totalCerdos += parseInt(row.saldos) || 0
  numCamiones = Math.round(numCamiones * 100) / 100
  return { totalCerdos, numCamiones }
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
  const [filterVisitador, setFilterVisitador] = useState('')
  const [searchGranja, setSearchGranja] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<FormRow>(emptyRow())

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
    setRows(prev => {
      const lastVisitador = prev.length > 0 ? prev[prev.length - 1].visitador : ''
      return [...prev, { ...emptyRow(), visitador: lastVisitador }]
    })
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
            peso_135_140: parseInt(row.peso_135_140) || 0,
            peso_130_135: parseInt(row.peso_130_135) || 0,
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

  function startEdit(p: Prevision) {
    setEditingId(p.id)
    setEditRow({
      visitador: p.visitador || '',
      granja: p.granja || '',
      codigo_granja: p.codigo_granja || '',
      no_registro: p.no_registro || '',
      peso_135_140: p.peso_135_140 ? p.peso_135_140.toString() : '',
      peso_130_135: p.peso_130_135 ? p.peso_130_135.toString() : '',
      peso_125_130: p.peso_125_130 ? p.peso_125_130.toString() : '',
      peso_120_125: p.peso_120_125 ? p.peso_120_125.toString() : '',
      peso_115_120: p.peso_115_120 ? p.peso_115_120.toString() : '',
      peso_110_115: p.peso_110_115 ? p.peso_110_115.toString() : '',
      peso_105_110: p.peso_105_110 ? p.peso_105_110.toString() : '',
      peso_100_105: p.peso_100_105 ? p.peso_100_105.toString() : '',
      peso_95_100: p.peso_95_100 ? p.peso_95_100.toString() : '',
      peso_menos_95: p.peso_menos_95 ? p.peso_menos_95.toString() : '',
      saldos: p.saldos ? p.saldos.toString() : '',
      vaciado: p.vaciado || 'No',
      observaciones: p.observaciones || '',
      semana_prevision: (p.semana_prevision || p.semana).toString(),
    })
  }

  function updateEditRow(field: keyof FormRow, value: string) {
    setEditRow(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'granja') {
        const found = granjas.find(g => g.nombre === value)
        if (found) {
          next.codigo_granja = found.codigo
          next.no_registro = found.registro
        }
      }
      return next
    })
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setLoading(true)
    try {
      const { totalCerdos, numCamiones } = calcTotals(editRow)
      const res = await fetch('/api/previsiones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          visitador: editRow.visitador,
          granja: editRow.granja,
          codigo_granja: editRow.codigo_granja,
          no_registro: editRow.no_registro,
          peso_135_140: parseInt(editRow.peso_135_140) || 0,
          peso_130_135: parseInt(editRow.peso_130_135) || 0,
          peso_125_130: parseInt(editRow.peso_125_130) || 0,
          peso_120_125: parseInt(editRow.peso_120_125) || 0,
          peso_115_120: parseInt(editRow.peso_115_120) || 0,
          peso_110_115: parseInt(editRow.peso_110_115) || 0,
          peso_105_110: parseInt(editRow.peso_105_110) || 0,
          peso_100_105: parseInt(editRow.peso_100_105) || 0,
          peso_95_100: parseInt(editRow.peso_95_100) || 0,
          peso_menos_95: parseInt(editRow.peso_menos_95) || 0,
          saldos: parseInt(editRow.saldos) || 0,
          cerdos_prevision: totalCerdos,
          num_camiones: numCamiones,
          vaciado: editRow.vaciado,
          observaciones: editRow.observaciones,
          semana_prevision: parseInt(editRow.semana_prevision) || 0,
        })
      })
      const result = await res.json()
      if (!result.success) {
        alert('Error al guardar: ' + result.error)
      } else {
        setEditingId(null)
        fetchPrevisiones()
      }
    } catch (err) {
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
    setLoading(false)
  }

  const filteredGranjas = searchGranja
    ? granjas.filter(g => g.nombre.toLowerCase().includes(searchGranja.toLowerCase()) || g.codigo.toLowerCase().includes(searchGranja.toLowerCase()))
    : granjas

  // Filter previsiones by visitador
  const filteredPrevisiones = filterVisitador
    ? previsiones.filter(p => p.visitador === filterVisitador)
    : previsiones

  // Totals for the accumulated table
  const totals = filteredPrevisiones.reduce((acc, p) => ({
    peso_135_140: acc.peso_135_140 + (p.peso_135_140 || 0),
    peso_130_135: acc.peso_130_135 + (p.peso_130_135 || 0),
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
    camiones: acc.camiones + Number(p.num_camiones),
  }), { peso_135_140: 0, peso_130_135: 0, peso_125_130: 0, peso_120_125: 0, peso_115_120: 0, peso_110_115: 0, peso_105_110: 0, peso_100_105: 0, peso_95_100: 0, peso_menos_95: 0, saldos: 0, cerdos: 0, camiones: 0 })

  // Truck breakdown per farm
  const rd = (n: number) => Math.round(n * 100) / 100
  const farmTrucks = filteredPrevisiones.map(p => {
    const below115 = p.peso_110_115 + p.peso_105_110 + p.peso_100_105 + p.peso_95_100 + p.peso_menos_95
    const t135 = rd((p.peso_135_140 || 0) / 170)
    const t130 = rd((p.peso_130_135 || 0) / 180)
    const t125 = rd(p.peso_125_130 / 190)
    const t120 = rd(p.peso_120_125 / 200)
    const t115 = rd(p.peso_115_120 / 210)
    const tBelow = rd(below115 / 220)
    const total = rd(t135 + t130 + t125 + t120 + t115 + tBelow)
    return { granja: p.granja, t135, t130, t125, t120, t115, tBelow, total }
  })
  const farmTruckTotals = {
    t135: rd(farmTrucks.reduce((s, f) => s + f.t135, 0)),
    t130: rd(farmTrucks.reduce((s, f) => s + f.t130, 0)),
    t125: rd(farmTrucks.reduce((s, f) => s + f.t125, 0)),
    t120: rd(farmTrucks.reduce((s, f) => s + f.t120, 0)),
    t115: rd(farmTrucks.reduce((s, f) => s + f.t115, 0)),
    tBelow: rd(farmTrucks.reduce((s, f) => s + f.tBelow, 0)),
    total: rd(farmTrucks.reduce((s, f) => s + f.total, 0)),
  }

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

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
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
                        <input type="text" className="w-20 border rounded px-1 py-0.5 text-xs" value={row.visitador} onChange={e => updateRow(idx, 'visitador', e.target.value)} placeholder="Nombre" list="visitadores-list" />
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input type="text" placeholder="Granja..." className="w-32 border rounded px-1 py-0.5 text-xs" value={row.granja} onChange={e => { updateRow(idx, 'granja', e.target.value); setSearchGranja(e.target.value) }} list={`granjas-${idx}`} />
                        <datalist id={`granjas-${idx}`}>{filteredGranjas.map(g => <option key={g.codigo} value={g.nombre}>{g.codigo} - {g.nombre}</option>)}</datalist>
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input type="text" className="w-20 border rounded px-1 py-0.5 text-xs bg-gray-50" value={row.no_registro} readOnly placeholder="Auto" />
                      </td>
                      {PESO_RANGES.map(r => (
                        <td key={r.key} className="px-0.5 py-0.5">
                          <input type="number" min="0" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center" value={row[r.key as keyof FormRow]} onChange={e => updateRow(idx, r.key as keyof FormRow, e.target.value)} placeholder="0" />
                        </td>
                      ))}
                      <td className="px-0.5 py-0.5">
                        <input type="number" min="0" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center" value={row.saldos} onChange={e => updateRow(idx, 'saldos', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-0.5 py-0.5 text-center"><span className="bg-green-100 text-green-800 font-bold px-1 py-0.5 rounded text-xs">{totalCerdos}</span></td>
                      <td className="px-0.5 py-0.5 text-center"><span className="bg-yellow-100 text-yellow-800 font-bold px-1 py-0.5 rounded text-xs">{numCamiones}</span></td>
                      <td className="px-0.5 py-0.5">
                        <select className="w-12 border rounded px-0.5 py-0.5 text-xs" value={row.vaciado} onChange={e => updateRow(idx, 'vaciado', e.target.value)}><option value="No">No</option><option value="Si">Si</option></select>
                      </td>
                      <td className="px-0.5 py-0.5"><input type="text" className="w-24 border rounded px-1 py-0.5 text-xs" value={row.observaciones} onChange={e => updateRow(idx, 'observaciones', e.target.value)} placeholder="Obs..." /></td>
                      <td className="px-0.5 py-0.5"><input type="number" min="1" max="53" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center bg-purple-50" value={row.semana_prevision} onChange={e => updateRow(idx, 'semana_prevision', e.target.value)} placeholder={semana.toString()} /></td>
                      <td className="px-0.5 py-0.5"><button onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700 text-sm px-0.5" title="Eliminar fila">x</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <datalist id="visitadores-list">{VISITADORES.map(v => <option key={v} value={v} />)}</datalist>

          {/* Mobile cards */}
          <div className="lg:hidden p-2 space-y-3">
            {rows.map((row, idx) => {
              const { totalCerdos, numCamiones } = calcTotals(row)
              return (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50 relative">
                  <button onClick={() => removeRow(idx)} className="absolute top-1 right-2 text-red-500 hover:text-red-700 text-lg font-bold">x</button>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Visitador</label>
                      <input type="text" className="w-full border rounded px-2 py-1.5 text-sm" value={row.visitador} onChange={e => updateRow(idx, 'visitador', e.target.value)} placeholder="Nombre" list="visitadores-list" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Vaciado</label>
                      <select className="w-full border rounded px-2 py-1.5 text-sm" value={row.vaciado} onChange={e => updateRow(idx, 'vaciado', e.target.value)}><option value="No">No</option><option value="Si">Si</option></select>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 font-medium">Granja</label>
                    <input type="text" placeholder="Buscar granja..." className="w-full border rounded px-2 py-1.5 text-sm" value={row.granja} onChange={e => { updateRow(idx, 'granja', e.target.value); setSearchGranja(e.target.value) }} list={`granjas-m-${idx}`} />
                    <datalist id={`granjas-m-${idx}`}>{filteredGranjas.map(g => <option key={g.codigo} value={g.nombre}>{g.codigo} - {g.nombre}</option>)}</datalist>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 font-medium">No. Registro</label>
                    <input type="text" className="w-full border rounded px-2 py-1.5 text-sm bg-white" value={row.no_registro} readOnly placeholder="Auto" />
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Pesos (No. cerdos)</label>
                    <div className="grid grid-cols-4 gap-1">
                      {PESO_RANGES.map(r => (
                        <div key={r.key}>
                          <label className="text-[10px] text-gray-400 block text-center">{r.label}</label>
                          <input type="number" min="0" className="w-full border rounded px-1 py-1 text-sm text-center" value={row[r.key as keyof FormRow]} onChange={e => updateRow(idx, r.key as keyof FormRow, e.target.value)} placeholder="0" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Saldos</label>
                      <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-sm text-center" value={row.saldos} onChange={e => updateRow(idx, 'saldos', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Semana</label>
                      <input type="number" min="1" max="53" className="w-full border rounded px-2 py-1.5 text-sm text-center bg-purple-50" value={row.semana_prevision} onChange={e => updateRow(idx, 'semana_prevision', e.target.value)} placeholder={semana.toString()} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Observaciones</label>
                      <input type="text" className="w-full border rounded px-2 py-1.5 text-sm" value={row.observaciones} onChange={e => updateRow(idx, 'observaciones', e.target.value)} placeholder="Obs..." />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t">
                    <span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded text-sm">Cerdos: {totalCerdos}</span>
                    <span className="bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded text-sm">Camiones: {numCamiones}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-2 flex gap-2 border-t">
            <button onClick={addRow} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium">+ Fila</button>
            <button onClick={handleSubmit} disabled={loading} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs font-medium">{loading ? 'Enviando...' : 'Enviar'}</button>
          </div>
        </div>

        {/* Accumulated data */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-2 border-b bg-green-50 rounded-t-lg flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-green-800">Previsiones Acumuladas</h2>
            <div className="flex items-center gap-2 flex-wrap">
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
              <label className="text-xs text-gray-600">
                Visitador:
                <select
                  className="ml-1 border rounded px-1 py-0.5 text-xs"
                  value={filterVisitador}
                  onChange={e => setFilterVisitador(e.target.value)}
                >
                  <option value="">Todos</option>
                  {VISITADORES.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={fetchPrevisiones}
                className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Filtrar
              </button>
            </div>
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
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
                {filteredPrevisiones.map(p => (
                  editingId === p.id ? (
                    <tr key={p.id} className="border-b bg-yellow-50">
                      <td className="px-0.5 py-0.5">
                        <input type="text" className="w-20 border rounded px-1 py-0.5 text-xs" value={editRow.visitador} onChange={e => updateEditRow('visitador', e.target.value)} list="visitadores-list" />
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input type="text" className="w-32 border rounded px-1 py-0.5 text-xs" value={editRow.granja} onChange={e => updateEditRow('granja', e.target.value)} list="granjas-edit" />
                        <datalist id="granjas-edit">{granjas.map(g => <option key={g.codigo} value={g.nombre}>{g.codigo} - {g.nombre}</option>)}</datalist>
                      </td>
                      <td className="px-0.5 py-0.5">
                        <input type="text" className="w-20 border rounded px-1 py-0.5 text-xs bg-gray-50" value={editRow.no_registro} readOnly />
                      </td>
                      {PESO_RANGES.map(r => (
                        <td key={r.key} className="px-0.5 py-0.5">
                          <input type="number" min="0" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center" value={editRow[r.key as keyof FormRow]} onChange={e => updateEditRow(r.key as keyof FormRow, e.target.value)} placeholder="0" />
                        </td>
                      ))}
                      <td className="px-0.5 py-0.5">
                        <input type="number" min="0" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center" value={editRow.saldos} onChange={e => updateEditRow('saldos', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-0.5 py-0.5 text-center"><span className="bg-green-100 text-green-800 font-bold px-1 py-0.5 rounded text-xs">{calcTotals(editRow).totalCerdos}</span></td>
                      <td className="px-0.5 py-0.5 text-center"><span className="bg-yellow-100 text-yellow-800 font-bold px-1 py-0.5 rounded text-xs">{calcTotals(editRow).numCamiones}</span></td>
                      <td className="px-0.5 py-0.5">
                        <select className="w-12 border rounded px-0.5 py-0.5 text-xs" value={editRow.vaciado} onChange={e => updateEditRow('vaciado', e.target.value)}><option value="No">No</option><option value="Si">Si</option></select>
                      </td>
                      <td className="px-0.5 py-0.5"><input type="text" className="w-24 border rounded px-1 py-0.5 text-xs" value={editRow.observaciones} onChange={e => updateEditRow('observaciones', e.target.value)} /></td>
                      <td className="px-0.5 py-0.5"><input type="number" min="1" max="53" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center bg-purple-50" value={editRow.semana_prevision} onChange={e => updateEditRow('semana_prevision', e.target.value)} /></td>
                      <td className="px-0.5 py-0.5 whitespace-nowrap">
                        <button onClick={handleSaveEdit} disabled={loading} className="text-green-600 hover:text-green-800 text-xs font-bold mr-1" title="Guardar">{loading ? '...' : '✓'}</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs" title="Cancelar">✗</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-1 py-0.5 text-gray-600">{p.visitador}</td>
                      <td className="px-1 py-0.5 font-medium">{p.granja}</td>
                      <td className="px-1 py-0.5 text-gray-500">{p.no_registro}</td>
                      {PESO_RANGES.map(r => (
                        <td key={r.key} className="px-1 py-0.5 text-center">{(p[r.key as keyof Prevision] as number) || '-'}</td>
                      ))}
                      <td className="px-1 py-0.5 text-center">{p.saldos || '-'}</td>
                      <td className="px-1 py-0.5 text-center font-bold text-green-700">{p.cerdos_prevision}</td>
                      <td className="px-1 py-0.5 text-center font-bold text-yellow-700">{p.num_camiones}</td>
                      <td className="px-1 py-0.5 text-center">
                        <span className={`px-1 rounded text-xs ${p.vaciado === 'Si' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.vaciado}</span>
                      </td>
                      <td className="px-1 py-0.5 text-gray-600 max-w-[100px] truncate">{p.observaciones}</td>
                      <td className="px-0.5 py-0.5 text-center">
                        <input type="number" min="1" max="53" className="w-11 border rounded px-0.5 py-0.5 text-xs text-center bg-purple-50" defaultValue={p.semana_prevision || p.semana} onBlur={e => { const val = parseInt(e.target.value); if (val && val !== (p.semana_prevision || p.semana)) handleUpdateSemana(p.id, val) }} />
                      </td>
                      <td className="px-0.5 py-0.5 whitespace-nowrap">
                        <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-blue-600 text-xs mr-1" title="Editar">✎</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs" title="Eliminar">x</button>
                      </td>
                    </tr>
                  )
                ))}
                {filteredPrevisiones.length > 0 && (
                  <tr className="bg-gray-100 font-bold text-xs">
                    <td className="px-1 py-1" colSpan={3}>TOTALES</td>
                    {PESO_RANGES.map(r => (
                      <td key={r.key} className="px-1 py-1 text-center">{totals[r.key as keyof typeof totals]}</td>
                    ))}
                    <td className="px-1 py-1 text-center">{totals.saldos}</td>
                    <td className="px-1 py-1 text-center text-green-700">{totals.cerdos}</td>
                    <td className="px-1 py-1 text-center text-yellow-700">{rd(totals.camiones)}</td>
                    <td colSpan={4}></td>
                  </tr>
                )}
                {filteredPrevisiones.length === 0 && (
                  <tr><td colSpan={20} className="p-4 text-center text-gray-400 text-xs">No hay previsiones para esta semana</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden p-2 space-y-2">
            {filteredPrevisiones.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No hay previsiones para esta semana</p>
            )}
            {filteredPrevisiones.map(p => (
              editingId === p.id ? (
                <div key={p.id} className="border-2 border-yellow-400 rounded-lg p-3 bg-yellow-50">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Visitador</label>
                      <input type="text" className="w-full border rounded px-2 py-1.5 text-sm" value={editRow.visitador} onChange={e => updateEditRow('visitador', e.target.value)} list="visitadores-list" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Vaciado</label>
                      <select className="w-full border rounded px-2 py-1.5 text-sm" value={editRow.vaciado} onChange={e => updateEditRow('vaciado', e.target.value)}><option value="No">No</option><option value="Si">Si</option></select>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 font-medium">Granja</label>
                    <input type="text" className="w-full border rounded px-2 py-1.5 text-sm" value={editRow.granja} onChange={e => updateEditRow('granja', e.target.value)} list="granjas-edit-m" />
                    <datalist id="granjas-edit-m">{granjas.map(g => <option key={g.codigo} value={g.nombre}>{g.codigo} - {g.nombre}</option>)}</datalist>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Pesos (No. cerdos)</label>
                    <div className="grid grid-cols-4 gap-1">
                      {PESO_RANGES.map(r => (
                        <div key={r.key}>
                          <label className="text-[10px] text-gray-400 block text-center">{r.label}</label>
                          <input type="number" min="0" className="w-full border rounded px-1 py-1 text-sm text-center" value={editRow[r.key as keyof FormRow]} onChange={e => updateEditRow(r.key as keyof FormRow, e.target.value)} placeholder="0" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Saldos</label>
                      <input type="number" min="0" className="w-full border rounded px-2 py-1.5 text-sm text-center" value={editRow.saldos} onChange={e => updateEditRow('saldos', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Semana</label>
                      <input type="number" min="1" max="53" className="w-full border rounded px-2 py-1.5 text-sm text-center bg-purple-50" value={editRow.semana_prevision} onChange={e => updateEditRow('semana_prevision', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Observaciones</label>
                      <input type="text" className="w-full border rounded px-2 py-1.5 text-sm" value={editRow.observaciones} onChange={e => updateEditRow('observaciones', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded text-sm">Cerdos: {calcTotals(editRow).totalCerdos}</span>
                    <span className="bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded text-sm">Cam: {calcTotals(editRow).numCamiones}</span>
                    <button onClick={handleSaveEdit} disabled={loading} className="ml-auto px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">{loading ? '...' : 'Guardar'}</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div key={p.id} className="border rounded-lg p-3 bg-gray-50 relative">
                  <div className="absolute top-1 right-2 flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-blue-600 text-lg" title="Editar">✎</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-lg font-bold">x</button>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{p.granja}</span>
                    {p.visitador && <span className="text-xs text-gray-500">({p.visitador})</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{p.no_registro}</p>
                  <div className="grid grid-cols-4 gap-1 mb-2 text-xs">
                    {PESO_RANGES.map(r => {
                      const val = p[r.key as keyof Prevision] as number
                      return val ? (
                        <div key={r.key} className="bg-blue-50 rounded px-1 py-0.5 text-center">
                          <span className="text-[10px] text-gray-400 block">{r.label}</span>
                          <span className="font-medium">{val}</span>
                        </div>
                      ) : null
                    })}
                    {p.saldos > 0 && (
                      <div className="bg-gray-100 rounded px-1 py-0.5 text-center">
                        <span className="text-[10px] text-gray-400 block">Saldos</span>
                        <span className="font-medium">{p.saldos}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-xs">Cerdos: {p.cerdos_prevision}</span>
                    <span className="bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded text-xs">Cam: {p.num_camiones}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.vaciado === 'Si' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{p.vaciado === 'Si' ? 'Vaciado' : 'No vaciado'}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-purple-600">Sem:</span>
                      <input type="number" min="1" max="53" className="w-12 border rounded px-1 py-0.5 text-xs text-center bg-purple-50" defaultValue={p.semana_prevision || p.semana} onBlur={e => { const val = parseInt(e.target.value); if (val && val !== (p.semana_prevision || p.semana)) handleUpdateSemana(p.id, val) }} />
                    </div>
                  </div>
                  {p.observaciones && <p className="text-xs text-gray-500 mt-1">{p.observaciones}</p>}
                </div>
              )
            ))}
            {filteredPrevisiones.length > 0 && (
              <div className="bg-gray-100 rounded-lg p-3 font-bold text-sm">
                <span className="text-green-700">Cerdos: {totals.cerdos}</span>
                <span className="mx-2">|</span>
                <span className="text-yellow-700">Camiones: {rd(totals.camiones)}</span>
              </div>
            )}
          </div>
          {filteredPrevisiones.length > 0 && (
            <div className="p-2 border-t text-xs text-gray-500">
              Total: {filteredPrevisiones.length} | Camiones: {farmTruckTotals.total}
            </div>
          )}
        </div>

        {/* Truck breakdown per farm */}
        {filteredPrevisiones.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-3">
            <div className="p-2 border-b bg-yellow-50 rounded-t-lg">
              <h2 className="text-sm font-semibold text-yellow-800">Tipos de Camiones por Granja</h2>
              <p className="text-xs text-yellow-600">135-140: 170 anim/cam | 130-135: 180 | 125-130: 190 | 120-125: 200 | 115-120: 210 | &lt;115: 220</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left font-semibold">Granja</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">135-140</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">130-135</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">125-130</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">120-125</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">115-120</th>
                    <th className="px-2 py-1 text-center font-semibold bg-blue-50">&lt;115</th>
                    <th className="px-2 py-1 text-center font-semibold bg-yellow-100">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {farmTrucks.map((f, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 font-medium">{f.granja}</td>
                      <td className="px-2 py-1 text-center">{f.t135 || '-'}</td>
                      <td className="px-2 py-1 text-center">{f.t130 || '-'}</td>
                      <td className="px-2 py-1 text-center">{f.t125 || '-'}</td>
                      <td className="px-2 py-1 text-center">{f.t120 || '-'}</td>
                      <td className="px-2 py-1 text-center">{f.t115 || '-'}</td>
                      <td className="px-2 py-1 text-center">{f.tBelow || '-'}</td>
                      <td className="px-2 py-1 text-center font-bold text-yellow-700">{f.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-2 py-1">TOTAL</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.t135}</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.t130}</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.t125}</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.t120}</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.t115}</td>
                    <td className="px-2 py-1 text-center">{farmTruckTotals.tBelow}</td>
                    <td className="px-2 py-1 text-center text-yellow-700">{farmTruckTotals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
