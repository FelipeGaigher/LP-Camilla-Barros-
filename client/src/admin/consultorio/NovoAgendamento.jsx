import { useEffect, useMemo, useRef, useState } from 'react'
import { criarAgendamento, listarPacientes, salvarPaciente } from '../../data/agendaApi'
import { brtParts, brtDayStart, brtToInstant, minutosParaHora, horaParaMinutos, nomeDiaSemana, nomeMes } from '../../lib/brt'
import { ESTAGIO_AO_CONFIRMAR } from '../../lib/funil'
import DateField from '../ui/DateField'

/**
 * Painel de novo agendamento, aberto pela propria agenda.
 *
 * Abre com dia e hora ja preenchidos quando vem de um clique na grade — que e
 * o gesto natural: ela olha o buraco na quinta as 15h e marca ali. Digitar a
 * data de novo, depois de ja ter apontado pra ela, e trabalho repetido.
 *
 * Paciente pode ser existente (busca) ou nova (nome + WhatsApp). O cadastro
 * nasce aqui mesmo, porque interromper pra ir na tela de Pacientes e voltar
 * perderia o horario que ela estava marcando.
 */
export default function NovoAgendamento({ aberto, inicial, procedimentos, onFechar, onCriado }) {
  const [paciente, setPaciente] = useState(null)
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState([])
  const [nova, setNova] = useState({ nome: '', telefone: '' })
  const [criandoNova, setCriandoNova] = useState(false)

  const [dia, setDia] = useState('')
  const [hora, setHora] = useState('')
  const [procedimentoId, setProcedimentoId] = useState('')
  const [duracao, setDuracao] = useState(60)
  const [observacao, setObservacao] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [conflito, setConflito] = useState(false)
  const primeiroCampo = useRef(null)

  // Reabrir sempre comeca limpo, com o horario que veio do clique.
  useEffect(() => {
    if (!aberto) return
    setPaciente(null); setBusca(''); setAchados([])
    setNova({ nome: '', telefone: '' }); setCriandoNova(false)
    setObservacao(''); setMsg(null); setConflito(false)
    setDia(inicial?.dia || '')
    setHora(inicial?.hora || '')
    const padrao = procedimentos[0]
    setProcedimentoId(padrao ? String(padrao.id) : '')
    setDuracao(padrao?.duracaoMin || 60)
    requestAnimationFrame(() => primeiroCampo.current?.focus())
  }, [aberto, inicial, procedimentos])

  // Esc fecha, como em qualquer painel sobreposto.
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  // Busca com folga pra nao disparar uma consulta por tecla.
  useEffect(() => {
    if (!aberto || criandoNova || busca.trim().length < 2) { setAchados([]); return }
    const t = setTimeout(async () => {
      const r = await listarPacientes(busca.trim())
      setAchados(r.ok ? r.data.pacientes.slice(0, 6) : [])
    }, 250)
    return () => clearTimeout(t)
  }, [busca, aberto, criandoNova])

  const horarios = useMemo(() => {
    const lista = []
    for (let m = 6 * 60; m <= 22 * 60; m += 15) lista.push(minutosParaHora(m))
    return lista
  }, [])

  const rotuloDia = useMemo(() => {
    const base = brtDayStart(dia)
    if (!base) return ''
    const p = brtParts(base)
    return `${nomeDiaSemana(p.diaSemana)}, ${p.dia} de ${nomeMes(p.mes)}`
  }, [dia])

  function trocarProcedimento(id) {
    setProcedimentoId(id)
    const p = procedimentos.find((x) => String(x.id) === String(id))
    if (p) setDuracao(p.duracaoMin)
  }

  async function agendar(e, forcar = false) {
    e?.preventDefault?.()
    setMsg(null)

    const base = brtDayStart(dia)
    const minutos = horaParaMinutos(hora)
    if (!base || minutos === null) {
      setMsg({ tipo: 'erro', texto: 'Escolha o dia e o horario.' })
      return
    }

    setSalvando(true)
    let alvo = paciente

    // Paciente nova: cadastra antes, pra o agendamento ja nascer vinculado.
    if (!alvo && criandoNova) {
      if (!nova.nome.trim()) {
        setSalvando(false)
        setMsg({ tipo: 'erro', texto: 'Informe o nome da paciente.' })
        return
      }
      // Nasce em avaliacao, nao em contato novo: ela ja tem horario marcado.
      // E o mesmo estagio que um pedido do site recebe ao ser confirmado.
      const r = await salvarPaciente({
        nome: nova.nome.trim(),
        telefone: nova.telefone.trim(),
        estagio: ESTAGIO_AO_CONFIRMAR,
      })
      if (!r.ok) {
        setSalvando(false)
        setMsg({ tipo: 'erro', texto: r.error })
        return
      }
      alvo = { id: r.data.id, nome: nova.nome.trim() }
    }

    const p = brtParts(base)
    const r = await criarAgendamento({
      pacienteId: alvo?.id || null,
      inicio: brtToInstant(p.ano, p.mes, p.dia, minutos).toISOString(),
      duracaoMin: Number(duracao) || 60,
      procedimentoId: procedimentoId ? Number(procedimentoId) : null,
      observacao,
      forcar,
    })
    setSalvando(false)

    if (!r.ok) {
      // Horario ocupado nao e erro de preenchimento: ou ela escolhe outro, ou
      // passa por cima de um pedido pendente de proposito.
      setConflito(r.code === 'HORARIO_OCUPADO')
      setMsg({ tipo: 'erro', texto: r.error })
      return
    }

    onCriado(r.data)
  }

  if (!aberto) return null

  return (
    <>
      <div className="dr-fundo" onClick={onFechar} aria-hidden="true" />
      <aside className="dr" role="dialog" aria-modal="true" aria-label="Novo agendamento">
        <header className="dr__head">
          <div>
            <h2>Novo agendamento</h2>
            {rotuloDia && <p className="a-hint">{rotuloDia}{hora ? ` as ${hora}` : ''}</p>}
          </div>
          <button type="button" className="a-btn a-btn--sm" onClick={onFechar}>Fechar</button>
        </header>

        <form className="dr__corpo" id="form-agendar" onSubmit={agendar}>
          {/* ---- quem ---- */}
          {paciente ? (
            <div className="dr__escolhida">
              <div>
                <strong>{paciente.nome}</strong>
                {paciente.telefone && <p className="a-hint">{paciente.telefone}</p>}
              </div>
              <button type="button" className="a-btn a-btn--sm" onClick={() => setPaciente(null)}>
                Trocar
              </button>
            </div>
          ) : criandoNova ? (
            <>
              <div className="a-field">
                <label htmlFor="na-nome">Nome da paciente</label>
                <input
                  id="na-nome" type="text" ref={primeiroCampo} required
                  value={nova.nome}
                  onChange={(e) => setNova((n) => ({ ...n, nome: e.target.value }))}
                />
              </div>
              <div className="a-field">
                <label htmlFor="na-tel">WhatsApp</label>
                <input
                  id="na-tel" type="tel" inputMode="tel" placeholder="(27) 99999-0000"
                  value={nova.telefone}
                  onChange={(e) => setNova((n) => ({ ...n, telefone: e.target.value }))}
                />
              </div>
              <button type="button" className="dr__link" onClick={() => setCriandoNova(false)}>
                Buscar uma paciente ja cadastrada
              </button>
            </>
          ) : (
            <>
              <div className="a-field">
                <label htmlFor="na-busca">Paciente</label>
                <input
                  id="na-busca" type="search" ref={primeiroCampo}
                  placeholder="Buscar por nome ou telefone"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {achados.length > 0 && (
                <ul className="dr__achados">
                  {achados.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => { setPaciente(p); setBusca('') }}>
                        <strong>{p.nome}</strong>
                        <span className="a-hint">{p.telefone || 'sem telefone'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {busca.trim().length >= 2 && achados.length === 0 && (
                <p className="a-hint">Ninguem com esse nome.</p>
              )}

              <button type="button" className="dr__link" onClick={() => {
                setCriandoNova(true)
                setNova((n) => ({ ...n, nome: busca.trim() }))
              }}>
                Cadastrar uma paciente nova
              </button>
            </>
          )}

          {/* ---- quando ---- */}
          <div className="dr__linha">
            <div className="a-field">
              <label htmlFor="na-dia">Dia</label>
              <DateField id="na-dia" value={dia} onChange={setDia} />
            </div>
            <div className="a-field">
              <label htmlFor="na-hora">Hora</label>
              <select id="na-hora" value={hora} onChange={(e) => setHora(e.target.value)} required>
                <option value="">--:--</option>
                {horarios.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* ---- o que ---- */}
          <div className="a-field">
            <label htmlFor="na-proc">Procedimento</label>
            <select id="na-proc" value={procedimentoId} onChange={(e) => trocarProcedimento(e.target.value)}>
              {procedimentos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}{p.publico ? '' : ' (interno)'}
                </option>
              ))}
            </select>
          </div>

          <div className="a-field">
            <label htmlFor="na-dur">Duracao (min)</label>
            <input
              id="na-dur" type="number" min="10" max="480" step="5"
              value={duracao} onChange={(e) => setDuracao(e.target.value)}
            />
            <p className="a-hint">
              Vem do procedimento. Mudar aqui vale so pra este agendamento.
            </p>
          </div>

          <div className="a-field">
            <label htmlFor="na-obs">Observacao</label>
            <textarea id="na-obs" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          {msg && <p className={`a-hint a-hint--${msg.tipo === 'erro' ? 'error' : 'ok'}`} role="alert">{msg.texto}</p>}

          {conflito && (
            <div className="dr__conflito">
              <p className="a-hint">
                Se o que esta nesse horario for so um pedido aguardando confirmacao,
                da pra marcar por cima — o pedido e cancelado. Horario ja confirmado
                nao e substituido.
              </p>
              <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={(e) => agendar(e, true)}>
                Marcar por cima do pedido
              </button>
            </div>
          )}
        </form>

        <footer className="dr__pe">
          <button type="button" className="a-btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" form="form-agendar" className="a-btn a-btn--primary" disabled={salvando}>
            {salvando ? 'Agendando...' : 'Agendar'}
          </button>
        </footer>
      </aside>
    </>
  )
}
