import { useEffect, useId, useRef, useState } from 'react'

/**
 * Select do design system.
 *
 * O <select> nativo nao tem como ser estilizado por dentro: a lista de opcoes e
 * desenhada pelo sistema operacional, com a cor de selecao azul do Windows e a
 * fonte dele. No meio de um formulario em Montserrat, fundo off-white e raio de
 * 6px, era o unico elemento que denunciava "formulario padrao".
 *
 * Entao aqui e um listbox de verdade, com o mesmo `.field` do resto do form.
 * O que ele precisa cumprir para substituir o nativo sem perder nada:
 *
 *  - teclado completo: setas, Home, End, Enter, Espaco, Esc e Tab
 *  - busca por digitacao, como o nativo faz (digitar "cla" vai em Clareamento)
 *  - ARIA de combobox + listbox, com aria-activedescendant
 *  - fecha ao clicar fora e ao rolar a pagina
 *  - devolve o foco ao botao quando fecha
 *
 * A opcao vazia continua existindo como "Selecione": o campo e opcional e a
 * pessoa precisa poder voltar atras depois de escolher.
 */
export default function Select({ id, value, onChange, options, placeholder = 'Selecione', labelId }) {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const raiz = useRef(null)
  const botao = useRef(null)
  const lista = useRef(null)
  const busca = useRef({ termo: '', quando: 0 })
  const idLista = useId()

  const itens = [{ valor: '', rotulo: placeholder }, ...options.map((o) => ({ valor: o, rotulo: o }))]
  const selecionado = itens.findIndex((i) => i.valor === value)
  const indiceSelecionado = selecionado < 0 ? 0 : selecionado

  const abrir = (indice = indiceSelecionado) => {
    setAtivo(indice)
    setAberto(true)
  }

  const fechar = ({ devolverFoco = true } = {}) => {
    setAberto(false)
    if (devolverFoco) botao.current?.focus()
  }

  const escolher = (indice) => {
    onChange(itens[indice].valor)
    fechar()
  }

  // So clique fora fecha.
  //
  // A primeira versao fechava no scroll tambem, como fazem os dropdowns de
  // position: fixed. Aqui a lista e absolute dentro de `.select`, entao ela ja
  // acompanha o campo sozinha — e o Lenis emite scroll continuamente por causa
  // da inercia, o que fechava a lista antes de dar tempo de escolher.
  useEffect(() => {
    if (!aberto) return
    const clique = (e) => {
      if (!raiz.current?.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', clique)
    return () => document.removeEventListener('mousedown', clique)
  }, [aberto])

  // Mantem a opcao ativa visivel quando anda de teclado.
  useEffect(() => {
    if (!aberto) return
    lista.current?.children[ativo]?.scrollIntoView({ block: 'nearest' })
  }, [aberto, ativo])

  /** Busca por digitacao, igual ao nativo: as teclas se acumulam por 1s. */
  const digitou = (tecla) => {
    const agora = Date.now()
    const termo = (agora - busca.current.quando < 1000 ? busca.current.termo : '') + tecla.toLowerCase()
    busca.current = { termo, quando: agora }
    const achado = itens.findIndex((i) => i.rotulo.toLowerCase().startsWith(termo))
    if (achado < 0) return
    if (aberto) setAtivo(achado)
    else onChange(itens[achado].valor)
  }

  const noTeclado = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!aberto) return abrir()
        return setAtivo((i) => Math.min(i + 1, itens.length - 1))
      case 'ArrowUp':
        e.preventDefault()
        if (!aberto) return abrir()
        return setAtivo((i) => Math.max(i - 1, 0))
      case 'Home':
        if (!aberto) return
        e.preventDefault()
        return setAtivo(0)
      case 'End':
        if (!aberto) return
        e.preventDefault()
        return setAtivo(itens.length - 1)
      case 'Enter':
      case ' ':
        e.preventDefault()
        return aberto ? escolher(ativo) : abrir()
      case 'Escape':
        if (!aberto) return
        e.preventDefault()
        return fechar()
      case 'Tab':
        // Tab sai do campo: fecha sem roubar o foco de quem vem depois.
        if (aberto) setAberto(false)
        return
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault()
          digitou(e.key)
        }
    }
  }

  const rotuloAtual = itens[indiceSelecionado].rotulo
  const vazio = !value

  return (
    <div className="select" ref={raiz}>
      <button
        type="button"
        id={id}
        ref={botao}
        className={`select__campo${vazio ? ' select__campo--vazio' : ''}`}
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-haspopup="listbox"
        aria-labelledby={labelId ? `${labelId} ${id}` : undefined}
        onClick={() => (aberto ? fechar({ devolverFoco: false }) : abrir())}
        onKeyDown={noTeclado}
      >
        <span className="select__valor">{rotuloAtual}</span>
        <svg
          className="select__seta"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <ul className="select__lista" id={idLista} role="listbox" ref={lista} tabIndex={-1}>
          {itens.map((item, i) => (
            <li
              key={item.valor || 'vazio'}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === indiceSelecionado}
              className={`select__opcao${i === ativo ? ' is-ativa' : ''}${i === indiceSelecionado ? ' is-escolhida' : ''}${!item.valor ? ' select__opcao--vazia' : ''}`}
              onMouseEnter={() => setAtivo(i)}
              // mousedown e nao click: o mousedown do documento fecharia a
              // lista antes de o click chegar aqui.
              onMouseDown={(e) => {
                e.preventDefault()
                escolher(i)
              }}
            >
              {item.rotulo}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
