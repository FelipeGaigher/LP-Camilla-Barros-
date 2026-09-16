import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarAgenda, listarPendentes, confirmarAgendamento, mudarStatusAgendamento,
  buscarConfigAgenda, buscarProcedimentos,
} from '../../data/agendaApi'
import NovoAgendamento from './NovoAgendamento'
import {
  brtParts, brtDayStart, brtTime, brtDataCurta, hojeBRT, somaDias, diffDias,
  nomeDiaSemana, nomeMes, matrizDoMes, minutosParaHora,
} from '../../lib/brt'
import MiniCalendario, { inicioDaSemana } from '../ui/MiniCalendario'
import PanelState from '../ui/PanelState'

/**
 * Agenda em tres modos: dia, semana e mes.
 *
 * A grade comeca no horario de atendimento configurado, nao a meia-noite. Uma
 * regua de 00:00 as 23:00 gasta dois tercos da tela com horas em que ninguem
 * atende, e obriga a rolar toda vez pra chegar nas 08:00.
 *
 * A fila de pedidos fica ao lado da grade de proposito: confirmar exige ver o
 * dia em volta. Em duas telas separadas ela confirmaria as cegas.
 */

const PASSO_MIN = 30 // granularidade das linhas da grade
const VISTAS = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
]

const STATUS_ROTULO = {
  pendente: 'Pedido', confirmado: 'Confirmado', realizado: 'Atendido',
  faltou: 'Faltou', cancelado: 'Cancelado', expirado: 'Expirado',
}

/** Minutos desde 00:00 BRT de um instante ISO. */
const minutosDoDia = (iso) => brtParts(iso).minutosDoDia

export default function AgendaPanel({ onIr }) {
  const [vista, setVista] = useState('semana')
  const [data, setData] = useState(() => hojeBRT())
  const [agendamentos, setAgendamentos] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [faixas, setFaixas] = useState([])
  const [procedimentos, setProcedimentos] = useState([])
  const [novo, setNovo] = useState(null) // { dia, hora } quando o painel esta aberto
  const [estado, setEstado] = useState('carregando')
  const [erro, setErro] = useState('')

  const hoje = hojeBRT()

  // Intervalo que a vista atual precisa carregar.
  const periodo = useMemo(() => {
    if (vista === 'dia') return { de: data, ate: data }
    if (vista === 'semana') {
      const seg = inicioDaSemana(data)
      return { de: seg, ate: somaDias(seg, 6) }
    }
    const p = brtParts(brtDayStart(data))
    const semanas = matrizDoMes(p.ano, p.mes)
    return { de: semanas[0][0], ate: semanas[5][6] }
  }, [vista, data])

  const carregar = useCallback(async () => {
    setEstado('carregando')
    const [ag, pend, cfg, procs] = await Promise.all([
      listarAgenda(periodo),
      listarPendentes(),
      buscarConfigAgenda(),
      buscarProcedimentos(),
    ])
    if (!ag.ok) { setErro(ag.error); setEstado('erro'); return }
    setAgendamentos(ag.data.agendamentos)
    setPendentes(pend.ok ? pend.data.pendentes : [])
    if (cfg.ok) setFaixas(cfg.data.faixas || [])
    // Logada, a lista vem com os internos (retorno, urgencia, encaixe) — que
    // sao justamente os que ela marca a mao e nao aparecem no site.
    if (procs.ok) setProcedimentos(procs.data.procedimentos || [])
    setEstado('pronto')
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  // Cancelado e expirado nao ocupam a cadeira, entao nao aparecem na grade.
  const visiveis = useMemo(
    () => agendamentos.filter((a) => a.status !== 'cancelado' && a.status !== 'expirado'),
    [agendamentos]
  )

  const comEvento = useMemo(() => new Set(visiveis.map((a) => a.dia)), [visiveis])

  /**
   * Limites da regua, tirados do horario de atendimento. Sem faixa configurada
   * cai num padrao comercial — a tela precisa funcionar antes de a Camilla
   * preencher a configuracao.
   */
  const regua = useMemo(() => {
    const ativas = faixas.filter((f) => f.ativo !== false)
    if (ativas.length === 0) return { inicio: 480, fim: 1140 } // 08:00-19:00
    const inicio = Math.min(...ativas.map((f) => Number(f.abre_min)))
    const fim = Math.max(...ativas.map((f) => Number(f.fecha_min)))
    // Arredonda pra hora cheia e sobra meia hora em cima, pro encaixe fora do
    // expediente nao ficar espremido contra a borda.
    return { inicio: Math.floor(inicio / 60) * 60, fim: Math.min(1440, Math.ceil(fim / 60) * 60 + 30) }
  }, [faixas])

  /** Dias da vista de semana: esconde o que nao tem atendimento nem evento. */
  const diasDaSemana = useMemo(() => {
    if (vista !== 'semana') return []
    const seg = inicioDaSemana(data)
    const todos = Array.from({ length: 7 }, (_, i) => somaDias(seg, i))
    const diasAtivos = new Set(faixas.filter((f) => f.ativo !== false).map((f) => Number(f.dia_semana)))
    const filtrados = todos.filter((d) => {
      const ds = brtParts(brtDayStart(d)).diaSemana
      return diasAtivos.has(ds) || comEvento.has(d) || d === hoje
    })
    // Configuracao vazia nao pode zerar a semana inteira.
    return filtrados.length > 0 ? filtrados : todos.slice(0, 6)
  }, [vista, data, faixas, comEvento, hoje])

  const rotuloPeriodo = useMemo(() => {
    if (vista === 'dia') {
      const p = brtParts(brtDayStart(data))
      return `${nomeDiaSemana(p.diaSemana)}, ${p.dia} de ${nomeMes(p.mes)} de ${p.ano}`
    }
    if (vista === 'semana') {
      return `${brtDataCurta(`${periodo.de}T12:00:00Z`)} a ${brtDataCurta(`${periodo.ate}T12:00:00Z`)}`
    }
    const p = brtParts(brtDayStart(data))
    return `${nomeMes(p.mes)} de ${p.ano}`
  }, [vista, data, periodo])

  const andar = (n) => {
    if (vista === 'dia') return setData(somaDias(data, n))
    if (vista === 'semana') return setData(somaDias(data, n * 7))
    const p = brtParts(brtDayStart(data))
    const total = p.mes - 1 + n
    const ano = p.ano + Math.floor(total / 12)
    const mes = ((total % 12) + 12) % 12 + 1
    setData(`${ano}-${String(mes).padStart(2, '0')}-01`)
  }

  const confirmar = async (id) => {
    const r = await confirmarAgendamento(id)
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }
  const recusar = async (id, nome) => {
    if (!confirm(`Recusar o pedido de ${nome || 'essa paciente'}? O horario volta a ficar livre.`)) return
    const r = await mudarStatusAgendamento(id, 'cancelado', 'Recusado pelo consultorio')
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }
  const marcar = async (id, status) => {
    const r = await mudarStatusAgendamento(id, status)
    if (!r.ok) { setErro(r.error); return }
    carregar()
  }

  const diaSel = brtParts(brtDayStart(data))

  return (
    <div className="a-editor">
      <header className="ag-barra">
        <div className="ag-barra__data">
          <span className="ag-chip" aria-hidden="true">
            <small>{nomeDiaSemana(diaSel.diaSemana, { curto: true })}</small>
            <strong>{String(diaSel.dia).padStart(2, '0')}</strong>
          </span>
          <button type="button" className="a-btn a-btn--sm" onClick={() => setData(hoje)}>Hoje</button>
          <div className="a-rowactions">
            <button type="button" onClick={() => andar(-1)} aria-label="Periodo anterior">&lsaquo;</button>
            <button type="button" onClick={() => andar(1)} aria-label="Proximo periodo">&rsaquo;</button>
          </div>
          <h1 className="ag-barra__titulo">{rotuloPeriodo}</h1>
        </div>

        <div className="ag-barra__acoes">
          {/* Leva ao funil, e nao ao dia do pedido: o funil e onde ela ve tudo
              que chegou — pedido de horario, contato do formulario e paciente
              parada — na mesma tela. Pular pro dia mostraria um pedido de cada
              vez e esconderia o resto. */}
          {pendentes.length > 0 && (
            <button
              type="button"
              className="ag-pedidos"
              onClick={() => onIr?.('funil')}
              title="Ver no funil"
            >
              {pendentes.length} {pendentes.length === 1 ? 'pedido' : 'pedidos'}
            </button>
          )}
          <button
            className="a-btn a-btn--sm a-btn--primary"
            onClick={() => setNovo({ dia: data, hora: minutosParaHora(regua.inicio) })}
          >
            + Agendar
          </button>
          <button className="a-btn a-btn--sm" onClick={carregar}>Atualizar</button>
          <div className="ag-vistas" role="tablist" aria-label="Como ver a agenda">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={vista === v.id}
                className={`ag-vistas__item ${vista === v.id ? 'is-active' : ''}`}
                onClick={() => setVista(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {erro && estado === 'pronto' && <p className="a-hint a-hint--error" role="alert">{erro}</p>}

      <PanelState estado={estado} erro={erro} onTentarDeNovo={carregar}>
        <div className="ag-layout">
          {/* Calendario a esquerda, como na referencia. Nada mais mora no rail:
              a fila de pedidos saiu porque ocupava um terco da tela repetindo o
              que a grade ja mostra. */}
          <aside className="ag-rail">
            <MiniCalendario selecionado={data} onSelecionar={setData} marcados={comEvento} />
          </aside>

          <div className="ag-principal">
            {vista === 'mes' ? (
              <GradeMes
                ancora={data}
                eventos={visiveis}
                hoje={hoje}
                onAbrirDia={(d) => { setData(d); setVista('dia') }}
              />
            ) : (
              <GradeTempo
                dias={vista === 'dia' ? [data] : diasDaSemana}
                eventos={visiveis}
                regua={regua}
                hoje={hoje}
                umDiaSo={vista === 'dia'}
                onMarcar={marcar}
                onConfirmar={confirmar}
                onRecusar={recusar}
                onNovo={setNovo}
              />
            )}
          </div>
        </div>

        <NovoAgendamento
          aberto={!!novo}
          inicial={novo}
          procedimentos={procedimentos}
          onFechar={() => setNovo(null)}
          onCriado={() => { setNovo(null); carregar() }}
        />
      </PanelState>
    </div>
  )
}

/**
 * Grade de horas — dia e semana usam a mesma, mudando so o numero de colunas.
 *
 * Cada evento e posicionado por gridRow calculado do horario. A constraint do
 * banco impede sobreposicao entre pendente, confirmado e realizado, entao
 * colisao so acontece com 'faltou'; mesmo assim o calculo de faixa existe, pra
 * dois cards nunca ficarem um por cima do outro.
 */
function GradeTempo({ dias, eventos, regua, hoje, umDiaSo, onMarcar, onConfirmar, onRecusar, onNovo }) {
  const totalLinhas = Math.max(1, (regua.fim - regua.inicio) / PASSO_MIN)
  const horas = []
  for (let m = regua.inicio; m < regua.fim; m += 60) horas.push(m)

  const linha = (minutos) =>
    Math.min(totalLinhas, Math.max(0, Math.round((minutos - regua.inicio) / PASSO_MIN)))

  const porDia = useMemo(() => {
    const mapa = new Map(dias.map((d) => [d, []]))
    for (const e of eventos) if (mapa.has(e.dia)) mapa.get(e.dia).push(e)
    for (const lista of mapa.values()) {
      lista.sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
      // Faixas: evento que comeca antes de o anterior terminar vai pra faixa
      // seguinte, em vez de sobrepor.
      const fins = []
      for (const e of lista) {
        const ini = minutosDoDia(e.inicio)
        let f = fins.findIndex((fim) => fim <= ini)
        if (f === -1) { f = fins.length; fins.push(0) }
        fins[f] = minutosDoDia(e.fim)
        e._faixa = f
        e._faixas = fins.length
      }
      for (const e of lista) e._faixas = fins.length
    }
    return mapa
  }, [dias, eventos])

  return (
    <div
      className={`ag-grade ${umDiaSo ? 'is-dia' : ''}`}
      style={{ '--linhas': totalLinhas, '--colunas': dias.length }}
    >
      <div className="ag-grade__canto" />
      {dias.map((dia) => {
        const p = brtParts(brtDayStart(dia))
        return (
          <header key={dia} className={`ag-grade__dia ${dia === hoje ? 'is-hoje' : ''}`}>
            <span className="ag-grade__dow">{nomeDiaSemana(p.diaSemana, { curto: true })}</span>
            <span className="ag-grade__num">{String(p.dia).padStart(2, '0')}</span>
          </header>
        )
      })}

      {horas.map((m) => (
        <span
          key={m}
          className="ag-grade__hora"
          style={{ gridRow: `${linha(m) + 2} / span 2` }}
        >
          {minutosParaHora(m)}
        </span>
      ))}

      {/* Fundo clicavel: uma celula por faixa de meia hora. E o gesto natural —
          ela ve o buraco na quinta as 15h e marca ali, sem redigitar a data. */}
      {dias.map((dia, ci) =>
        Array.from({ length: totalLinhas }, (_, i) => {
          const m = regua.inicio + i * PASSO_MIN
          const h = minutosParaHora(m)
          return (
            <button
              type="button"
              key={`${dia}-${m}`}
              className={`ag-grade__slot ${m % 60 === 0 ? 'is-hora' : ''}`}
              style={{ gridColumn: ci + 2, gridRow: i + 2 }}
              onClick={() => onNovo({ dia, hora: h })}
              aria-label={`Agendar em ${dia} as ${h}`}
              title={`Agendar as ${h}`}
            />
          )
        })
      )}

      {dias.map((dia, ci) =>
        (porDia.get(dia) || []).map((e) => {
          const ini = linha(minutosDoDia(e.inicio))
          const fim = Math.max(ini + 1, linha(minutosDoDia(e.fim)))
          const largura = 100 / (e._faixas || 1)
          return (
            <article
              key={e.id}
              className={`ag-ev is-${e.status}`}
              style={{
                gridColumn: ci + 2,
                gridRow: `${ini + 2} / ${fim + 2}`,
                width: `calc(${largura}% - 4px)`,
                marginLeft: `${largura * (e._faixa || 0)}%`,
              }}
              title={`${brtTime(e.inicio)} · ${e.nome} · ${e.procedimento || ''}`}
            >
              <span className="ag-ev__hora">
                {brtTime(e.inicio)}
                {e.primeiraConsulta && <em className="ag-ev__primeira" title="Primeira consulta">1a</em>}
              </span>
              <span className="ag-ev__nome">{e.nome || 'Sem nome'}</span>
              <span className="ag-ev__proc">{e.procedimento}</span>

              {/* Pedido e confirmado aqui mesmo, e nao numa fila lateral: pra
                  decidir, ela precisa ver o que tem em volta no dia. */}
              {e.status === 'pendente' && (
                <span className="ag-ev__acoes">
                  <button type="button" onClick={() => onConfirmar(e.id)}>Confirmar</button>
                  <button type="button" onClick={() => onRecusar(e.id, e.nome)}>Recusar</button>
                </span>
              )}
              {e.status === 'confirmado' && (
                <span className="ag-ev__acoes">
                  <button type="button" onClick={() => onMarcar(e.id, 'realizado')}>Atendeu</button>
                  <button type="button" onClick={() => onMarcar(e.id, 'faltou')}>Faltou</button>
                </span>
              )}
              {e.status !== 'confirmado' && e.status !== 'pendente' && (
                <span className="ag-ev__status">{STATUS_ROTULO[e.status]}</span>
              )}
            </article>
          )
        })
      )}
    </div>
  )
}

/** Mes: a matriz ja existe no helper de fuso, aqui e so distribuir os eventos. */
function GradeMes({ ancora, eventos, hoje, onAbrirDia }) {
  const p = brtParts(brtDayStart(ancora))
  const semanas = useMemo(() => matrizDoMes(p.ano, p.mes), [p.ano, p.mes])
  const prefixo = `${p.ano}-${String(p.mes).padStart(2, '0')}`

  const porDia = useMemo(() => {
    const mapa = new Map()
    for (const e of eventos) {
      if (!mapa.has(e.dia)) mapa.set(e.dia, [])
      mapa.get(e.dia).push(e)
    }
    for (const l of mapa.values()) l.sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
    return mapa
  }, [eventos])

  return (
    <div className="ag-mes">
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
        <span className="ag-mes__dow" key={d}>{d}</span>
      ))}

      {semanas.flat().map((dia) => {
        const lista = porDia.get(dia) || []
        const foraDoMes = !dia.startsWith(prefixo)
        return (
          <button
            type="button"
            key={dia}
            className={`ag-mes__cel ${foraDoMes ? 'is-fora' : ''} ${dia === hoje ? 'is-hoje' : ''}`}
            onClick={() => onAbrirDia(dia)}
          >
            <span className="ag-mes__num">{Number(dia.slice(8))}</span>
            {lista.slice(0, 3).map((e) => (
              <span key={e.id} className={`ag-mes__pill is-${e.status}`}>
                {brtTime(e.inicio)} {e.nome}
              </span>
            ))}
            {lista.length > 3 && <span className="ag-mes__mais">+{lista.length - 3}</span>}
          </button>
        )
      })}
    </div>
  )
}
