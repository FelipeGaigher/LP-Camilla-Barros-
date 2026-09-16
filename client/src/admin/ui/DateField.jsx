import { useEffect, useId, useRef, useState } from 'react'
import MiniCalendario from './MiniCalendario'
import { brtDayStart, brtParts } from '../../lib/brt'

/**
 * Campo de data do painel.
 *
 * Substitui o <input type="date">, que abre o calendario do proprio navegador —
 * com a fonte, as cores e o azul do sistema operacional dentro de uma tela que
 * nao tem nada disso. E o unico controle nativo que traz visual de fora.
 *
 * Dois caminhos de propósito, porque servem a datas diferentes:
 *  - digitar dd/mm/aaaa, que e o jeito rapido pra data de nascimento
 *  - abrir o calendario, que e o jeito certo pra data proxima
 *
 * Entra e sai no formato do banco (YYYY-MM-DD); dd/mm/aaaa so existe na tela.
 */
export default function DateField({ id, value, onChange, placeholder = 'dd/mm/aaaa' }) {
  const [texto, setTexto] = useState(() => paraTela(value))
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  const gerado = useId()
  const campoId = id || gerado

  // O valor pode mudar por fora (escolha no calendario, troca de paciente).
  useEffect(() => { setTexto(paraTela(value)) }, [value])

  // Fechar ao clicar fora e no Esc — sem isso o calendario fica preso aberto.
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  function digitou(e) {
    const bruto = e.target.value
    // Mascara leve: so digito, com barra a cada bloco. Nao bloqueia a digitacao
    // — o campo vira ISO so quando a data fica completa e valida.
    const d = bruto.replace(/\D/g, '').slice(0, 8)
    const partes = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean)
    setTexto(partes.join('/'))

    if (d.length === 8) {
      const iso = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`
      // brtDayStart devolve null pra data que nao existe (31/02, por exemplo).
      if (brtDayStart(iso)) {
        const p = brtParts(brtDayStart(iso))
        // Confere a volta: 31/02 vira 03/03 no Date, e isso nao pode passar.
        if (p.dia === Number(d.slice(0, 2)) && p.mes === Number(d.slice(2, 4))) {
          onChange(iso)
          return
        }
      }
    }
    if (d.length === 0) onChange('')
  }

  return (
    <div className="df" ref={caixa}>
      <input
        id={campoId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={texto}
        onChange={digitou}
      />
      <button
        type="button"
        className="df__abrir"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? 'Fechar o calendario' : 'Escolher no calendario'}
        aria-expanded={aberto}
        title="Escolher no calendario"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {aberto && (
        <div className="df__pop">
          <MiniCalendario
            selecionado={value || ''}
            comHoje={false}
            onSelecionar={(d) => { onChange(d); setAberto(false) }}
          />
          {value && (
            <button type="button" className="df__limpar" onClick={() => { onChange(''); setAberto(false) }}>
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function paraTela(iso) {
  const p = brtParts(brtDayStart(iso))
  if (!p) return ''
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.ano}`
}
