import { useCallback, useEffect, useState } from 'react'
import { buscarDias, buscarSlots } from '../data/agendaApi'
import { brtParts, brtDayStart, nomeDiaSemana, nomeMes } from '../lib/brt'

/**
 * Escolha de dia e horario, dentro do formulario de contato.
 *
 * Nao e pagina separada: o formulario ja e o lugar onde a pessoa chega depois
 * de ler o site, e mandar ela pra outra tela e um passo a mais pra desistir.
 *
 * Fica recolhido ate ela pedir. Quem so quer mandar uma pergunta nao precisa
 * encarar um calendario, e o formulario continua sendo o de sempre.
 *
 * Some inteiro quando o agendamento pelo site esta desligado no painel — nao
 * mostra bloco vazio nem mensagem de erro.
 */
export default function EscolherHorario({ textos, valor, onEscolher, conflito = 0 }) {
  const [aberto, setAberto] = useState(false)
  const [disponivel, setDisponivel] = useState(null) // null = ainda checando
  const [dias, setDias] = useState([])
  const [dia, setDia] = useState('')
  const [slots, setSlots] = useState([])
  const [carregando, setCarregando] = useState(false)

  // Checa uma vez, na montagem, se ha o que oferecer. Antes de haver, o bloco
  // nao existe na tela.
  useEffect(() => {
    let vivo = true
    buscarDias().then((r) => {
      if (!vivo) return
      const comVaga = r.ok && r.data.aberto ? (r.data.dias || []).filter((d) => d.livres > 0) : []
      setDias(comVaga)
      setDisponivel(comVaga.length > 0)
    })
    return () => { vivo = false }
  }, [])

  const escolherDia = useCallback(async (alvo) => {
    setDia(alvo)
    onEscolher(null)
    setCarregando(true)
    const r = await buscarSlots({ dia: alvo })
    setCarregando(false)
    setSlots(r.ok ? r.data.slots || [] : [])
  }, [onEscolher])

  // `conflito` e um contador que o Contato incrementa quando o servidor recusa
  // por horario ocupado. A lista na tela so sabe o que era verdade ha alguns
  // segundos, entao ela precisa ser refeita — e nao so avisar.
  useEffect(() => {
    if (conflito > 0 && dia) escolherDia(dia)
    // `dia` fora das dependencias de proposito: recarregar so quando houver
    // conflito novo, nao a cada troca de dia (que ja recarrega sozinha).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflito])

  if (disponivel === null || disponivel === false) return null

  if (!aberto) {
    return (
      <div className="field">
        <button type="button" className="hor__abrir" onClick={() => setAberto(true)}>
          {textos.verMais || 'Ver horarios'}
        </button>
        <p className="hor__apoio">{textos.texto}</p>
      </div>
    )
  }

  return (
    <div className="hor">
      <div className="hor__topo">
        <strong>{textos.titulo}</strong>
        {valor && (
          <button
            type="button"
            className="hor__limpar"
            onClick={() => { onEscolher(null); setDia(''); setSlots([]) }}
          >
            {textos.limpar || 'Enviar so a mensagem'}
          </button>
        )}
      </div>

      <div className="hor__faixa" role="radiogroup" aria-label="Escolha o dia">
        {dias.map((d) => {
          const p = brtParts(brtDayStart(d.dia))
          return (
            <label className="hor__dia" key={d.dia}>
              <input
                type="radio" name="hor-dia" className="sr-only"
                checked={dia === d.dia}
                onChange={() => escolherDia(d.dia)}
              />
              <span>
                <small>{nomeDiaSemana(p.diaSemana, { curto: true })}</small>
                <strong>{String(p.dia).padStart(2, '0')}</strong>
                <em>{nomeMes(p.mes).slice(0, 3)}</em>
              </span>
            </label>
          )
        })}
      </div>

      {dia && carregando && <p className="hor__apoio">Carregando horarios...</p>}

      {dia && !carregando && slots.length === 0 && (
        <p className="hor__apoio">{textos.semHorario}</p>
      )}

      {dia && !carregando && slots.length > 0 && (
        // Horario ocupado nao aparece desabilitado: leitor de tela pula, e no
        // visual vira falsa esperanca. So o que esta livre e renderizado.
        <div className="hor__horas" role="radiogroup" aria-label="Escolha o horario">
          {slots.map((s) => (
            <label className="hor__hora" key={s.inicio}>
              <input
                type="radio" name="hor-hora" className="sr-only"
                checked={valor?.inicio === s.inicio}
                onChange={() => onEscolher(s)}
              />
              <span>{s.hora}</span>
            </label>
          ))}
        </div>
      )}

      {valor && <p className="hor__aviso">{textos.aviso}</p>}
    </div>
  )
}
