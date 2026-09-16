/**
 * Carregando, vazio e erro — os tres estados que toda tela do consultorio tem
 * e que, escritos a mao em cada uma, acabam divergindo.
 *
 * O caso de erro traz botao de tentar de novo de proposito: o api engole falha
 * de rede nas telas antigas, e o resultado e uma tela vazia que parece "nao ha
 * nada" quando na verdade e "nao carregou".
 */
export default function PanelState({ estado, erro, vazio, onTentarDeNovo, children }) {
  if (estado === 'carregando') return <p className="a-hint">Carregando...</p>

  if (estado === 'erro') {
    return (
      <div className="a-empty">
        <p className="a-hint a-hint--error">{erro || 'Nao foi possivel carregar.'}</p>
        {onTentarDeNovo && (
          <button type="button" className="a-btn a-btn--sm" onClick={onTentarDeNovo}>
            Tentar de novo
          </button>
        )}
      </div>
    )
  }

  if (estado === 'vazio') {
    return (
      <div className="a-empty">
        <p className="a-hint">{vazio || 'Nada por aqui ainda.'}</p>
      </div>
    )
  }

  return children
}

/**
 * Lista com busca. Debounce de 250ms pra nao disparar uma consulta por tecla.
 * type="search" traz o "x" de limpar nativo, que e o comportamento esperado.
 */
export function SearchField({ valor, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="a-search">
      <input
        type="search"
        className="a-search__input"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  )
}
