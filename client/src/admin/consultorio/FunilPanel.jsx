import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buscarFunil, moverCard, arquivarCard, salvarPaciente } from '../../data/agendaApi'
import PanelState from '../ui/PanelState'

/**
 * Funil da paciente — o kanban.
 *
 * A primeira coluna e uma uniao de tres coisas que o servidor ja resolve:
 * paciente cadastrada, contato do formulario que ainda nao virou paciente, e
 * pedido de horario sem dono. Por isso o card tem `tipo`: mover um lead promove
 * a pessoa a paciente, mover um paciente so troca de coluna.
 *
 * Arrastar usa o drag and drop nativo, sem biblioteca — o alvo e o computador
 * do consultorio. Como HTML5 DnD nao existe no celular, cada card tambem tem um
 * seletor de coluna, que e o caminho acessivel por teclado de quebra.
 */

const ARRASTANDO = 'application/x-funil-card'

export default function FunilPanel() {
  const [colunas, setColunas] = useState([])
  const [estado, setEstado] = useState('carregando')
  const [erro, setErro] = useState('')
  const [sobre, setSobre] = useState(null)
  const [salvando, setSalvando] = useState(null)
  const [adicionando, setAdicionando] = useState(null) // id da coluna com o form aberto

  const carregar = useCallback(async () => {
    setEstado('carregando')
    const r = await buscarFunil()
    if (!r.ok) {
      setErro(r.error)
      setEstado('erro')
      return
    }
    setColunas(r.data.colunas)
    setEstado('pronto')
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const total = useMemo(
    () => colunas.reduce((soma, c) => soma + c.cards.length, 0),
    [colunas]
  )
  const comAlerta = useMemo(
    () => colunas.reduce((soma, c) => soma + c.cards.filter((k) => k.alerta).length, 0),
    [colunas]
  )

  /**
   * Move otimista: a coluna muda na hora e volta atras se o servidor recusar.
   * Esperar a resposta pra so entao mover faria o card "grudar" no mouse.
   */
  const mover = useCallback(
    async (card, destino) => {
      if (card.estagio === destino) return
      const anterior = colunas
      const chave = `${card.tipo}:${card.id}`
      setSalvando(chave)

      setColunas((atual) =>
        atual.map((c) => {
          if (c.id === card.estagio) return { ...c, cards: c.cards.filter((k) => !(k.tipo === card.tipo && k.id === card.id)) }
          if (c.id === destino) return { ...c, cards: [{ ...card, estagio: destino }, ...c.cards] }
          return c
        })
      )

      const r = await moverCard({ tipo: card.tipo, id: card.id, estagio: destino })
      setSalvando(null)

      if (!r.ok) {
        setColunas(anterior)
        setErro(r.error)
        return
      }
      // Lead vira paciente ao ser promovido, e a origem do card muda. Sem
      // recarregar, o proximo arraste tentaria promover de novo.
      if (card.tipo !== 'paciente') carregar()
    },
    [colunas, carregar]
  )

  const arquivar = useCallback(
    async (card) => {
      const rotulo = card.tipo === 'lead' ? 'Arquivar este contato?' : 'Marcar como inativa?'
      if (!confirm(rotulo)) return
      const r = await arquivarCard({ tipo: card.tipo === 'lead' ? 'lead' : 'paciente', id: card.pacienteId || card.id })
      if (!r.ok) { setErro(r.error); return }
      carregar()
    },
    [carregar]
  )

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Funil</h1>
          <p className="a-hint">
            {total} {total === 1 ? 'pessoa' : 'pessoas'}
            {comAlerta > 0 && ` · ${comAlerta} esperando retorno ha tempo demais`}
          </p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn" onClick={carregar}>Atualizar</button>
        </div>
      </header>

      {erro && estado === 'pronto' && (
        <p className="a-hint a-hint--error" role="alert">{erro}</p>
      )}

      <PanelState
        estado={estado === 'pronto' && total === 0 ? 'vazio' : estado}
        erro={erro}
        vazio="Nenhum contato ainda. Os pedidos do site aparecem aqui."
        onTentarDeNovo={carregar}
      >
        <div className="k-quadro">
          {colunas.map((coluna) => (
            <section
              key={coluna.id}
              className={`k-col ${sobre === coluna.id ? 'is-sobre' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setSobre(coluna.id) }}
              onDragLeave={() => setSobre((s) => (s === coluna.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                setSobre(null)
                try {
                  const card = JSON.parse(e.dataTransfer.getData(ARRASTANDO))
                  mover(card, coluna.id)
                } catch { /* arraste de fora da tela */ }
              }}
            >
              <header className="k-col__head">
                <h2 title={coluna.ajuda}>{coluna.label}</h2>
                <span className="k-col__conta">{coluna.cards.length}</span>
                <button
                  type="button"
                  className="k-col__novo"
                  onClick={() => setAdicionando(adicionando === coluna.id ? null : coluna.id)}
                  aria-label={`Adicionar pessoa em ${coluna.label}`}
                  title={`Adicionar em ${coluna.label}`}
                >
                  +
                </button>
              </header>

              <div className="k-col__corpo">
                {adicionando === coluna.id && (
                  <NovoCard
                    estagio={coluna.id}
                    onCancelar={() => setAdicionando(null)}
                    onCriado={() => { setAdicionando(null); carregar() }}
                    onErro={setErro}
                  />
                )}

                {coluna.cards.length === 0 && adicionando !== coluna.id && (
                  <p className="k-col__vazia">—</p>
                )}
                {coluna.cards.map((card) => (
                  <Card
                    key={`${card.tipo}:${card.id}`}
                    card={card}
                    colunas={colunas}
                    salvando={salvando === `${card.tipo}:${card.id}`}
                    onMover={mover}
                    onArquivar={arquivar}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </PanelState>
    </div>
  )
}

/**
 * Cadastro rapido, no formato do proprio card e dentro da coluna.
 *
 * Nasce ja no estagio da coluna onde ela clicou no "+": abrir uma tela de
 * cadastro completa pra anotar um nome que chegou por telefone e obrigar a
 * arrastar o card em seguida sao dois passos que ninguem faz no meio do
 * atendimento. O resto da ficha ela completa depois, em Pacientes.
 */
function NovoCard({ estagio, onCancelar, onCriado, onErro }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = useRef(null)

  useEffect(() => { campo.current?.focus() }, [])

  async function salvar(e) {
    e.preventDefault()
    if (!nome.trim() || salvando) return
    setSalvando(true)
    const r = await salvarPaciente({ nome: nome.trim(), telefone: telefone.trim(), estagio })
    setSalvando(false)
    if (!r.ok) { onErro(r.error); return }
    onCriado()
  }

  return (
    <form className="k-novo" onSubmit={salvar} onKeyDown={(e) => { if (e.key === 'Escape') onCancelar() }}>
      <div className="a-field">
        <label htmlFor={`nc-nome-${estagio}`} className="sr-only">Nome</label>
        <input
          id={`nc-nome-${estagio}`} ref={campo} type="text" required
          placeholder="Nome da pessoa"
          value={nome} onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="a-field">
        <label htmlFor={`nc-tel-${estagio}`} className="sr-only">WhatsApp</label>
        <input
          id={`nc-tel-${estagio}`} type="tel" inputMode="tel"
          placeholder="WhatsApp (opcional)"
          value={telefone} onChange={(e) => setTelefone(e.target.value)}
        />
      </div>
      <div className="a-rowactions">
        <button type="submit" className="a-btn a-btn--sm a-btn--primary" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Adicionar'}
        </button>
        <button type="button" className="a-btn a-btn--sm" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}

function Card({ card, colunas, salvando, onMover, onArquivar }) {
  const zap = card.telefone ? `https://wa.me/${String(card.telefone).replace(/\D/g, '')}` : null

  return (
    <article
      className={`k-card ${card.alerta ? 'is-alerta' : ''} ${salvando ? 'is-salvando' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ARRASTANDO, JSON.stringify(card))
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="k-card__topo">
        <strong className="k-card__nome">{card.nome}</strong>
        {card.tipo !== 'paciente' && (
          <span className="k-card__tag" title="Ainda nao esta no cadastro de pacientes">
            {card.tipo === 'lead' ? 'contato' : 'pediu horario'}
          </span>
        )}
      </div>

      {card.detalhe && <p className="k-card__detalhe">{card.detalhe}</p>}

      {card.aviso && <p className="k-card__aviso">{card.aviso}</p>}

      <div className="k-card__rodape">
        <span className="k-card__tempo">{card.tempo}</span>
        <div className="k-card__acoes">
          {zap && (
            <a href={zap} target="_blank" rel="noopener noreferrer" title="Abrir no WhatsApp">
              WhatsApp
            </a>
          )}
          <button type="button" onClick={() => onArquivar(card)} title="Tirar do funil">
            Arquivar
          </button>
        </div>
      </div>

      {/* Caminho sem arrastar: celular nao tem HTML5 drag and drop, e teclado
          tambem nao alcanca o arraste. */}
      <label className="k-card__mover">
        <span className="sr-only">Mover {card.nome} para outra coluna</span>
        <select
          value={card.estagio}
          disabled={salvando}
          onChange={(e) => onMover(card, e.target.value)}
        >
          {colunas.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
    </article>
  )
}
