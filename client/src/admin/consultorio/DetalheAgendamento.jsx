import { useEffect, useState } from 'react'
import { confirmarAgendamento, mudarStatusAgendamento, registrarAtendimento } from '../../data/agendaApi'
import { IconeWhatsApp } from '../ui/Icones'

/**
 * Detalhe do agendamento, aberto ao clicar no horario da grade.
 *
 * Todas as acoes moram aqui, e nao no card da grade. Duas razoes: botao dentro
 * de botao e HTML invalido, entao o evento nao podia ser clicavel enquanto
 * tivesse Confirmar e Recusar dentro; e uma grade de semana com quatro botoes
 * por bloco vira ruido no que deveria ser uma leitura rapida do dia.
 *
 * Registrar o atendimento tambem acontece aqui — e o gesto que vem logo depois
 * de a paciente sair, e ela ja esta olhando o horario dela.
 */
const STATUS_ROTULO = {
  pendente: 'Pedido aguardando confirmacao',
  confirmado: 'Confirmado',
  realizado: 'Atendido',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
}

export default function DetalheAgendamento({ evento, onFechar, onMudou }) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [form, setForm] = useState({
    procedimentoRealizado: '', regiao: '', proximosPassos: '',
  })

  useEffect(() => {
    if (!evento) return
    setErro('')
    setRegistrando(false)
    setForm({ procedimentoRealizado: '', regiao: '', proximosPassos: '' })
  }, [evento])

  useEffect(() => {
    if (!evento) return
    const onKey = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [evento, onFechar])

  if (!evento) return null

  const zap = evento.telefone ? `https://wa.me/${String(evento.telefone).replace(/\D/g, '')}` : null

  async function acao(fn) {
    setSalvando(true)
    setErro('')
    const r = await fn()
    setSalvando(false)
    if (!r.ok) { setErro(r.error); return }
    onMudou()
  }

  const mudar = (status, motivo) => acao(() => mudarStatusAgendamento(evento.id, status, motivo))

  async function registrar(e) {
    e.preventDefault()
    await acao(() => registrarAtendimento({ id: evento.id, ...form, marcarRealizado: true }))
  }

  return (
    <>
      <div className="dr-fundo" onClick={onFechar} aria-hidden="true" />
      <aside className="dr" role="dialog" aria-modal="true" aria-label={`Agendamento de ${evento.nome}`}>
        <header className="dr__head">
          <div>
            <h2>{evento.nome}</h2>
            <p className="a-hint">{evento.rotulo}</p>
          </div>
          <button type="button" className="a-btn a-btn--sm" onClick={onFechar}>Fechar</button>
        </header>

        <div className="dr__corpo">
          <ul className="a-kv">
            <li><span>Situacao</span><span>{STATUS_ROTULO[evento.status] || evento.status}</span></li>
            {evento.procedimento && <li><span>Procedimento</span><span>{evento.procedimento}</span></li>}
            {evento.telefone && <li><span>WhatsApp</span><span>{evento.telefone}</span></li>}
            {evento.primeiraConsulta && <li><span>Primeira vez</span><span>Sim</span></li>}
            <li><span>Origem</span><span>{evento.origem === 'site' ? 'Pedido pelo site' : 'Marcado no painel'}</span></li>
            {evento.canceladoMotivo && <li><span>Motivo</span><span>{evento.canceladoMotivo}</span></li>}
          </ul>

          {evento.alerta && <p className="dr__alerta">{evento.alerta}</p>}
          {evento.mensagem && <p className="ag-pend__msg">{evento.mensagem}</p>}
          {evento.observacoes && <p className="a-hint">{evento.observacoes}</p>}

          {erro && <p className="a-hint a-hint--error" role="alert">{erro}</p>}

          {/* Registrar o atendimento so faz sentido depois de a pessoa vir. */}
          {registrando && (
            <form className="a-form" onSubmit={registrar}>
              <div className="a-field">
                <label htmlFor="da-proc">O que foi feito</label>
                <textarea
                  id="da-proc" rows={2} value={form.procedimentoRealizado}
                  onChange={(e) => setForm((f) => ({ ...f, procedimentoRealizado: e.target.value }))}
                />
              </div>
              <div className="a-field">
                <label htmlFor="da-reg">Regiao ou dente</label>
                <input
                  id="da-reg" type="text" value={form.regiao}
                  onChange={(e) => setForm((f) => ({ ...f, regiao: e.target.value }))}
                />
              </div>
              <div className="a-field">
                <label htmlFor="da-prox">Proximo passo</label>
                <input
                  id="da-prox" type="text" value={form.proximosPassos}
                  onChange={(e) => setForm((f) => ({ ...f, proximosPassos: e.target.value }))}
                />
              </div>
              <div className="a-rowactions">
                <button type="submit" className="a-btn a-btn--sm a-btn--primary" disabled={salvando}>
                  Salvar atendimento
                </button>
                <button type="button" className="a-btn a-btn--sm" onClick={() => setRegistrando(false)}>
                  Voltar
                </button>
              </div>
            </form>
          )}
        </div>

        <footer className="dr__pe dr__pe--acoes">
          {zap && (
            <a className="a-btn a-btn--sm" href={zap} target="_blank" rel="noopener noreferrer">
              <IconeWhatsApp /> WhatsApp
            </a>
          )}

          {evento.status === 'pendente' && (
            <>
              <button
                className="a-btn a-btn--sm a-btn--danger"
                disabled={salvando}
                onClick={() => {
                  if (confirm(`Recusar o pedido de ${evento.nome}? O horario volta a ficar livre.`)) {
                    mudar('cancelado', 'Recusado pelo consultorio')
                  }
                }}
              >
                Recusar
              </button>
              <button
                className="a-btn a-btn--sm a-btn--primary"
                disabled={salvando}
                onClick={() => acao(() => confirmarAgendamento(evento.id))}
              >
                Confirmar
              </button>
            </>
          )}

          {evento.status === 'confirmado' && (
            <>
              <button className="a-btn a-btn--sm" disabled={salvando} onClick={() => mudar('faltou')}>
                Faltou
              </button>
              {!registrando && (
                <button className="a-btn a-btn--sm" disabled={salvando} onClick={() => setRegistrando(true)}>
                  Registrar atendimento
                </button>
              )}
              <button
                className="a-btn a-btn--sm a-btn--primary"
                disabled={salvando}
                onClick={() => mudar('realizado')}
              >
                Atendeu
              </button>
            </>
          )}

          {evento.status === 'realizado' && !registrando && (
            <button className="a-btn a-btn--sm" disabled={salvando} onClick={() => setRegistrando(true)}>
              {evento.observacoes ? 'Editar o que foi feito' : 'Registrar o que foi feito'}
            </button>
          )}
        </footer>
      </aside>
    </>
  )
}
