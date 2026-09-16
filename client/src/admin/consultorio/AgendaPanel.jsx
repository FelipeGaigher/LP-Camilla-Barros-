import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarAgenda, listarPendentes, confirmarAgendamento, mudarStatusAgendamento,
} from '../../data/agendaApi'
import { brtDateKey, somaDias, hojeBRT, brtDataCurta, nomeDiaSemana, brtParts, brtTime } from '../../lib/brt'
import PanelState from '../ui/PanelState'

/**
 * Agenda da semana, com a fila de pedidos ao lado.
 *
 * A fila fica aqui e nao numa tela propria porque confirmar exige ver o dia em
 * volta: "tem alguem as 14h?" e a primeira pergunta. Em duas telas separadas
 * ela confirmaria as cegas.
 *
 * A grade rola com a pagina, sem scroller interno. E deliberado — cada
 * container que rola por dentro e uma briga a mais com altura, e aqui nao ha
 * ganho nenhum em ter duas barras de rolagem.
 */

const STATUS_ROTULO = {
  pendente: 'Pedido',
  confirmado: 'Confirmado',
  realizado: 'Atendido',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
}

/** Segunda da semana de uma data, no calendario de Brasilia. */
function inicioDaSemana(dataKey) {
  const diaSemana = brtParts(new Date(`${dataKey}T12:00:00.000Z`)).diaSemana
  // brtParts conta domingo como 0; a semana da Camilla comeca na segunda.
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1
  return somaDias(dataKey, -recuo)
}

export default function AgendaPanel() {
  const [semana, setSemana] = useState(() => inicioDaSemana(hojeBRT()))
  const [agendamentos, setAgendamentos] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [estado, setEstado] = useState('carregando')
  const [erro, setErro] = useState('')
  const [recusando, setRecusando] = useState(null)
  const [motivo, setMotivo] = useState('')

  const dias = useMemo(
    () => Array.from({ length: 6 }, (_, i) => somaDias(semana, i)), // segunda a sabado
    [semana]
  )

  const carregar = useCallback(async () => {
    setEstado('carregando')
    const [ag, pend] = await Promise.all([
      listarAgenda({ de: dias[0], ate: dias[dias.length - 1] }),
      listarPendentes(),
    ])
    if (!ag.ok) {
      setErro(ag.error)
      setEstado('erro')
      return
    }
    setAgendamentos(ag.data.agendamentos)
    setPendentes(pend.ok ? pend.data.pendentes : [])
    setEstado('pronto')
  }, [dias])

  useEffect(() => { carregar() }, [carregar])

  const porDia = useMemo(() => {
    const mapa = new Map(dias.map((d) => [d, []]))
    for (const a of agendamentos) {
      if (a.status === 'cancelado' || a.status === 'expirado') continue
      if (mapa.has(a.dia)) mapa.get(a.dia).push(a)
    }
    return mapa
  }, [agendamentos, dias])

  const confirmar = async (id) => {
    const r = await confirmarAgendamento(id)
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }

  const recusar = async (id) => {
    const r = await mudarStatusAgendamento(id, 'cancelado', motivo || 'Recusado pelo consultorio')
    setRecusando(null)
    setMotivo('')
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }

  const marcar = async (id, status) => {
    const r = await mudarStatusAgendamento(id, status)
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }

  const hoje = hojeBRT()

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Agenda</h1>
          <p className="a-hint">
            Semana de {brtDataCurta(`${dias[0]}T12:00:00Z`)} a {brtDataCurta(`${dias[5]}T12:00:00Z`)}
          </p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn a-btn--sm" onClick={() => setSemana(somaDias(semana, -7))}>&larr; Anterior</button>
          <button className="a-btn a-btn--sm" onClick={() => setSemana(inicioDaSemana(hoje))}>Hoje</button>
          <button className="a-btn a-btn--sm" onClick={() => setSemana(somaDias(semana, 7))}>Seguinte &rarr;</button>
          <button className="a-btn" onClick={carregar}>Atualizar</button>
        </div>
      </header>

      {erro && estado === 'pronto' && <p className="a-hint a-hint--error" role="alert">{erro}</p>}

      <PanelState estado={estado} erro={erro} onTentarDeNovo={carregar}>
        <div className="ag-layout">
          <div className="ag-semana">
            {dias.map((dia) => {
              const lista = porDia.get(dia) || []
              const partes = brtParts(new Date(`${dia}T12:00:00.000Z`))
              return (
                <section key={dia} className={`ag-dia ${dia === hoje ? 'is-hoje' : ''}`}>
                  <header className="ag-dia__head">
                    <span className="ag-dia__semana">{nomeDiaSemana(partes.diaSemana, { curto: true })}</span>
                    <span className="ag-dia__numero">{String(partes.dia).padStart(2, '0')}</span>
                  </header>
                  <div className="ag-dia__corpo">
                    {lista.length === 0 && <p className="ag-dia__vazio">—</p>}
                    {lista.map((a) => (
                      <article key={a.id} className={`ag-item is-${a.status}`}>
                        <span className="ag-item__hora">{brtTime(a.inicio)}</span>
                        <span className="ag-item__nome">{a.nome || 'Sem nome'}</span>
                        <span className="ag-item__proc">{a.procedimento}</span>
                        {a.alerta && <span className="ag-item__alerta" title={a.alerta}>!</span>}
                        {a.status === 'confirmado' && (
                          <div className="ag-item__acoes">
                            <button type="button" onClick={() => marcar(a.id, 'realizado')}>Atendeu</button>
                            <button type="button" onClick={() => marcar(a.id, 'faltou')}>Faltou</button>
                          </div>
                        )}
                        {a.status !== 'confirmado' && (
                          <span className="ag-item__status">{STATUS_ROTULO[a.status]}</span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          <aside className="ag-fila">
            <header className="ag-fila__head">
              <h2>Pedidos</h2>
              <span className="k-col__conta">{pendentes.length}</span>
            </header>

            {pendentes.length === 0 && <p className="a-hint">Nenhum pedido aguardando.</p>}

            <ul className="ag-fila__lista">
              {pendentes.map((p) => (
                <li key={p.id} className="ag-pend">
                  <strong>{p.nome}</strong>
                  <p className="ag-pend__quando">{p.rotulo}</p>
                  <p className="a-hint">
                    {p.procedimento}
                    {p.primeiraConsulta ? ' · primeira vez' : ''}
                  </p>
                  {p.mensagem && <p className="ag-pend__msg">{p.mensagem}</p>}
                  {p.sugestaoPaciente && (
                    <p className="a-hint">Ja e paciente: {p.sugestaoPaciente.nome}</p>
                  )}

                  {recusando === p.id ? (
                    <div className="ag-pend__recusa">
                      <label className="a-field">
                        <span className="sr-only">Motivo da recusa</span>
                        <input
                          type="text"
                          value={motivo}
                          placeholder="Motivo (opcional)"
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                      </label>
                      <div className="a-rowactions">
                        <button className="a-btn a-btn--sm a-btn--danger" onClick={() => recusar(p.id)}>
                          Confirmar recusa
                        </button>
                        <button className="a-btn a-btn--sm" onClick={() => setRecusando(null)}>Voltar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ag-pend__acoes">
                      <button className="a-btn a-btn--sm a-btn--primary" onClick={() => confirmar(p.id)}>
                        Confirmar
                      </button>
                      <button className="a-btn a-btn--sm" onClick={() => setRecusando(p.id)}>Recusar</button>
                      {p.telefone && (
                        <a
                          className="a-btn a-btn--sm"
                          href={`https://wa.me/${String(p.telefone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </PanelState>
    </div>
  )
}
