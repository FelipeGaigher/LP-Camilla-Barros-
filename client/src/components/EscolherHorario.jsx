import { useCallback, useEffect, useMemo, useState } from 'react'
import { buscarDias, buscarSlots } from '../data/agendaApi'
import { brtParts, brtDayStart, matrizDoMes, nomeMes, hojeBRT } from '../lib/brt'

/**
 * Escolha de dia e horario, dentro do formulario de contato.
 *
 * Nao e pagina separada: o formulario ja e o lugar onde a pessoa chega depois
 * de ler o site, e mandar ela pra outra tela e um passo a mais pra desistir.
 *
 * O calendario fica ABERTO, nao atras de um botao. Antes havia um "Ver
 * horarios" que escondia a unica coisa que diferencia este formulario de
 * qualquer outro formulario de contato — e o que esta escondido nao converte.
 * O custo e altura de tela; quem so quer mandar uma pergunta rola por cima.
 *
 * Tres estados, e cada um diz o que esta acontecendo:
 *
 *   fechado   o agendamento pelo site esta desligado no painel. O bloco some
 *             inteiro, de proposito — e a unica ausencia silenciosa aceitavel,
 *             porque e uma decisao da Camilla, nao uma falha.
 *   sem vaga  ligado, mas nao ha um dia livre na janela inteira. Antes isto
 *             tambem sumia em silencio, e era indistinguivel de bug.
 *   ok        calendario do mes, dia sem vaga apagado e sem clique.
 */
export default function EscolherHorario({ textos, valor, onEscolher, conflito = 0, whatsappHref }) {
  // null = ainda checando. Antes de haver resposta, o bloco nao existe na tela.
  const [aberto, setAberto] = useState(null)
  const [dias, setDias] = useState([])
  const [janela, setJanela] = useState(null)
  const [dia, setDia] = useState('')
  const [slots, setSlots] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    let vivo = true
    buscarDias().then((r) => {
      if (!vivo) return
      if (!r.ok || !r.data?.aberto) {
        setAberto(false)
        return
      }
      setAberto(true)
      setDias(r.data.dias || [])
      setJanela(r.data.janela || null)
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

  // Dia livre e o que tem pelo menos um horario. O endpoint devolve a janela
  // inteira, inclusive os dias cheios — e e justamente isso que permite
  // desenhar o mes com dia apagado em vez de esconder metade do calendario.
  const comVaga = useMemo(
    () => new Set((dias || []).filter((d) => d.livres > 0).map((d) => d.dia)),
    [dias]
  )

  // Limites de navegacao: o mes do primeiro dia da janela e o do ultimo. Sem
  // isto a pessoa navega pra dezembro e encontra um calendario todo apagado,
  // sem entender que ali nunca houve nada pra ver.
  const limites = useMemo(() => {
    if (!janela) return null
    const de = brtParts(brtDayStart(janela.de))
    const ate = brtParts(brtDayStart(janela.ate))
    if (!de || !ate) return null
    return { de: de.ano * 12 + de.mes, ate: ate.ano * 12 + ate.mes }
  }, [janela])

  const [mes, setMes] = useState(null)
  useEffect(() => {
    if (!janela || mes) return
    const p = brtParts(brtDayStart(janela.de))
    if (p) setMes({ ano: p.ano, mes: p.mes })
  }, [janela, mes])

  if (aberto === null || aberto === false) return null

  // Ligado e sem um unico dia livre na janela. Nao e erro: a agenda dela
  // encheu. Some o calendario, fica o caminho que ainda funciona.
  if (comVaga.size === 0) {
    return (
      <div className="hor hor--vazio">
        <strong>{textos.titulo}</strong>
        <p className="hor__apoio">
          {textos.semVaga || 'A agenda dos proximos dias esta cheia. Manda sua mensagem por aqui que eu retorno com as datas que abrirem.'}
        </p>
        {whatsappHref && (
          <a className="hor__link" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
          </a>
        )}
      </div>
    )
  }

  if (!mes) return null

  const ordinal = mes.ano * 12 + mes.mes
  const podeVoltar = !limites || ordinal > limites.de
  const podeAvancar = !limites || ordinal < limites.ate
  const prefixo = `${mes.ano}-${String(mes.mes).padStart(2, '0')}`
  const hoje = hojeBRT()

  const andar = (n) => {
    const total = mes.mes - 1 + n
    setMes({ ano: mes.ano + Math.floor(total / 12), mes: ((total % 12) + 12) % 12 + 1 })
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
            {textos.limpar || 'Enviar só a mensagem'}
          </button>
        )}
      </div>

      {textos.texto && <p className="hor__apoio">{textos.texto}</p>}

      <div className="hor__cal">
        <header className="hor__cal-topo">
          <button
            type="button" aria-label="Mês anterior"
            onClick={() => andar(-1)} disabled={!podeVoltar}
          >
            &lsaquo;
          </button>
          <strong>{nomeMes(mes.mes)} {mes.ano}</strong>
          <button
            type="button" aria-label="Próximo mês"
            onClick={() => andar(1)} disabled={!podeAvancar}
          >
            &rsaquo;
          </button>
        </header>

        <div className="hor__grade">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span className="hor__dow" key={i} aria-hidden="true">{d}</span>
          ))}

          {matrizDoMes(mes.ano, mes.mes).flat().map((dataKey) => {
            const foraDoMes = !dataKey.startsWith(prefixo)
            const livre = comVaga.has(dataKey)
            const p = brtParts(brtDayStart(dataKey))

            // Buraco, nao botao morto, em dois casos que parecem um so:
            //
            //  - dia de outro mes. Um botao desabilitado ali so serve pra
            //    leitor de tela ler "31, indisponivel" antes do mes comecar.
            //  - dia fora da janela de agendamento. Quase sempre e o passado:
            //    ao abrir dia 21, os 20 primeiros do mes cairiam aqui. Pinta-
            //    los de "sem horario livre" seria mentir — eles nao estao
            //    cheios, eles ja foram. E deixaria a grade morta na estreia.
            const foraDaJanela = janela && (dataKey < janela.de || dataKey > janela.ate)
            if (foraDoMes || foraDaJanela) {
              return <span className="hor__vazio" key={dataKey} aria-hidden="true" />
            }

            const classes = [
              'hor__dia',
              livre ? '' : 'is-cheio',
              dataKey === hoje ? 'is-hoje' : '',
              dataKey === dia ? 'is-sel' : '',
            ].filter(Boolean).join(' ')

            return (
              <button
                type="button"
                key={dataKey}
                className={classes}
                disabled={!livre}
                aria-pressed={dataKey === dia}
                aria-label={`${p.dia} de ${nomeMes(mes.mes)}${livre ? '' : ', sem horário livre'}`}
                onClick={() => escolherDia(dataKey)}
              >
                {p.dia}
              </button>
            )
          })}
        </div>
      </div>

      {dia && carregando && <p className="hor__apoio">Carregando horários...</p>}

      {dia && !carregando && slots.length === 0 && (
        <p className="hor__apoio">{textos.semHorario}</p>
      )}

      {dia && !carregando && slots.length > 0 && (
        // Horario ocupado nao aparece desabilitado: leitor de tela pula, e no
        // visual vira falsa esperanca. So o que esta livre e renderizado.
        <div className="hor__horas" role="radiogroup" aria-label="Escolha o horário">
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
