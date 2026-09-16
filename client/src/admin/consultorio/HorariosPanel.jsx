import { useCallback, useEffect, useState } from 'react'
import { buscarConfigAgenda, salvarConfigAgenda, salvarHorarios } from '../../data/agendaApi'
import { minutosParaHora, horaParaMinutos, nomeDiaSemana } from '../../lib/brt'
import PanelState from '../ui/PanelState'

/**
 * Horarios de atendimento e regras do agendamento pelo site.
 *
 * Tem tela propria, e nao campo no CMS, porque isto nao e conteudo: e entrada
 * de calculo. O gerador de horarios le estas faixas, e texto livre ali deixa a
 * vitrine vazia sem nenhuma mensagem de erro. Por isso hora e um seletor de
 * opcoes fixas, nunca um campo de digitar.
 *
 * O rodape do site continua com o horario escrito em texto — sao coisas
 * diferentes e a tela avisa isso.
 */

// De 06:00 as 22:00, de meia em meia hora. Cobre qualquer consultorio e evita
// o campo de hora nativo, que traz o calendario do sistema pra dentro do painel.
const OPCOES_HORA = Array.from({ length: 33 }, (_, i) => minutosParaHora(360 + i * 30))

const DIAS = [1, 2, 3, 4, 5, 6, 0] // segunda a sabado, domingo por ultimo

export default function HorariosPanel() {
  const [config, setConfig] = useState(null)
  const [faixas, setFaixas] = useState([])
  const [estado, setEstado] = useState('carregando')
  const [msg, setMsg] = useState(null)

  const carregar = useCallback(async () => {
    setEstado('carregando')
    const r = await buscarConfigAgenda()
    if (!r.ok) { setMsg({ tipo: 'erro', texto: r.error }); setEstado('erro'); return }
    setConfig(r.data.config)
    setFaixas(r.data.faixas.map((f) => ({ ...f })))
    setEstado('pronto')
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const addFaixa = (dia) =>
    setFaixas((f) => [...f, { dia_semana: dia, abre_min: 480, fecha_min: 720, ativo: true }])

  const setFaixa = (i, patch) =>
    setFaixas((f) => f.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  const removeFaixa = (i) => setFaixas((f) => f.filter((_, k) => k !== i))

  async function salvarTudo() {
    setMsg(null)
    const invalida = faixas.find((f) => f.fecha_min <= f.abre_min)
    if (invalida) {
      setMsg({ tipo: 'erro', texto: 'Ha uma faixa que termina antes de comecar.' })
      return
    }
    const a = await salvarHorarios(faixas)
    if (!a.ok) { setMsg({ tipo: 'erro', texto: a.error }); return }
    const b = await salvarConfigAgenda(config)
    if (!b.ok) { setMsg({ tipo: 'erro', texto: b.error }); return }
    setMsg({ tipo: 'ok', texto: 'Horarios salvos.' })
    carregar()
  }

  const num = (k) => ({
    value: config?.[k] ?? '',
    onChange: (e) => setConfig((c) => ({ ...c, [k]: Number(e.target.value) })),
  })

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Horarios de atendimento</h1>
          <p className="a-hint">
            E daqui que saem os horarios oferecidos no site. O texto do rodape do
            site e outra coisa, editada em Site &rsaquo; Rodape.
          </p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn a-btn--primary" onClick={salvarTudo}>Salvar</button>
        </div>
      </header>

      <PanelState estado={estado} erro={msg?.texto} onTentarDeNovo={carregar}>
        {config && (
          <>
            <div className="a-group">
              <legend>Agendamento pelo site</legend>

              <label className="a-toggle">
                <input
                  type="checkbox"
                  checked={!!config.publico_ativo}
                  onChange={(e) => setConfig((c) => ({ ...c, publico_ativo: e.target.checked }))}
                />
                <span className="a-toggle__track"><span className="a-toggle__dot" /></span>
                <span>Deixar a paciente escolher horario no site</span>
              </label>
              <p className="a-hint">
                Desligado, o site continua mostrando o formulario de contato e o
                WhatsApp. Ligue so depois de conferir as faixas abaixo.
              </p>

              <div className="h-grade">
                <div className="a-field">
                  <label htmlFor="c-grade">Intervalo entre horarios (min)</label>
                  <input id="c-grade" type="number" min="5" max="120" step="5" {...num('grade_min')} />
                </div>
                <div className="a-field">
                  <label htmlFor="c-buffer">Folga entre consultas (min)</label>
                  <input id="c-buffer" type="number" min="0" max="120" step="5" {...num('buffer_min')} />
                </div>
                <div className="a-field">
                  <label htmlFor="c-ant">Antecedencia minima (horas)</label>
                  <input id="c-ant" type="number" min="0" max="720" {...num('antecedencia_horas')} />
                </div>
                <div className="a-field">
                  <label htmlFor="c-janela">Quantos dias a frente</label>
                  <input id="c-janela" type="number" min="1" max="180" {...num('janela_dias')} />
                </div>
                <div className="a-field">
                  <label htmlFor="c-hold">Pedido expira em (horas)</label>
                  <input id="c-hold" type="number" min="1" max="336" {...num('hold_horas')} />
                </div>
                <div className="a-field">
                  <label htmlFor="c-max">Maximo de pedidos por dia</label>
                  <input id="c-max" type="number" min="1" max="50" {...num('max_pendentes_dia')} />
                </div>
              </div>
              <p className="a-hint">
                O pedido segura o horario ate voce confirmar. Passado o prazo ele
                expira sozinho e o horario volta a aparecer no site.
              </p>
            </div>

            <div className="a-group">
              <legend>Faixas de atendimento</legend>
              <p className="a-hint">
                Turno partido sao duas faixas no mesmo dia — o almoco e o espaco
                entre elas.
              </p>

              {DIAS.map((dia) => {
                const doDia = faixas
                  .map((f, i) => ({ f, i }))
                  .filter(({ f }) => Number(f.dia_semana) === dia)

                return (
                  <div className="h-dia" key={dia}>
                    <div className="h-dia__head">
                      <strong>{nomeDiaSemana(dia)}</strong>
                      <button type="button" className="a-btn a-btn--sm" onClick={() => addFaixa(dia)}>
                        Adicionar faixa
                      </button>
                    </div>

                    {doDia.length === 0 && <p className="a-hint">Nao atende.</p>}

                    {doDia.map(({ f, i }) => (
                      <div className="h-faixa" key={i}>
                        <label className="a-field">
                          <span className="sr-only">Abre</span>
                          <select
                            value={minutosParaHora(f.abre_min)}
                            onChange={(e) => setFaixa(i, { abre_min: horaParaMinutos(e.target.value) })}
                          >
                            {OPCOES_HORA.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                        <span className="h-faixa__ate">ate</span>
                        <label className="a-field">
                          <span className="sr-only">Fecha</span>
                          <select
                            value={minutosParaHora(f.fecha_min)}
                            onChange={(e) => setFaixa(i, { fecha_min: horaParaMinutos(e.target.value) })}
                          >
                            {OPCOES_HORA.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                        <div className="a-rowactions">
                          <button type="button" className="is-danger" onClick={() => removeFaixa(i)} title="Remover">
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {msg && <p className={`a-hint a-hint--${msg.tipo === 'erro' ? 'error' : 'ok'}`}>{msg.texto}</p>}

            <div className="a-rowactions">
              <button type="button" className="a-btn a-btn--primary" onClick={salvarTudo}>Salvar</button>
            </div>
          </>
        )}
      </PanelState>
    </div>
  )
}
