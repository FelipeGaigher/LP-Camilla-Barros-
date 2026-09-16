import { useEffect, useState, useCallback } from 'react'
import { fetchLeads, deleteLead } from '../../data/api'
import { brtDataHora, brtDateKey } from '../../lib/brt'

// Antes formatava no fuso do navegador, que acerta em Vitoria por acidente e
// erra em qualquer outro lugar. O helper fixa Brasilia.
function fmt(dateStr) {
  return brtDataHora(dateStr) || dateStr || ''
}

export default function LeadsPanel() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setLeads(await fetchLeads())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(id) {
    if (!confirm('Apagar este contato?')) return
    await deleteLead(id)
    load()
  }

  function exportCsv() {
    const header = ['Data', 'Nome', 'WhatsApp', 'E-mail', 'Interesse', 'Mensagem', 'Origem']
    const rows = leads.map((l) => [
      fmt(l.created_at), l.name, l.phone, l.email, l.interest, (l.message || '').replace(/\n/g, ' '), l.source,
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `contatos-${brtDateKey(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Contatos recebidos</h1>
          <p className="a-hint">Mensagens enviadas pelo formulario do site.</p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn" onClick={load}>Atualizar</button>
          <button className="a-btn a-btn--primary" onClick={exportCsv} disabled={!leads.length}>
            Baixar planilha
          </button>
        </div>
      </header>

      <div className="a-editor__body">
        {loading && <p className="a-hint">Carregando...</p>}
        {!loading && leads.length === 0 && <p className="a-hint">Nenhum contato ainda.</p>}

        {leads.map((l) => (
          <div className="a-card" key={l.id}>
            <div className="a-card__head">
              <strong>{l.name}</strong>
              <div className="a-rowactions">
                <span className="a-hint" style={{ marginRight: '0.75rem' }}>{fmt(l.created_at)}</span>
                <button type="button" className="is-danger" onClick={() => remove(l.id)} title="Apagar">&times;</button>
              </div>
            </div>
            <div className="a-card__body">
              <ul className="a-kv">
                {l.phone && (
                  <li>
                    <span>WhatsApp</span>
                    <a href={`https://wa.me/${String(l.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      {l.phone}
                    </a>
                  </li>
                )}
                {l.email && <li><span>E-mail</span><a href={`mailto:${l.email}`}>{l.email}</a></li>}
                {l.interest && <li><span>Interesse</span><span>{l.interest}</span></li>}
                {l.message && <li><span>Mensagem</span><span>{l.message}</span></li>}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
