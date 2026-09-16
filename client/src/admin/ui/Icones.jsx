/**
 * Icones do painel.
 *
 * SVG inline, no mesmo padrao do Chrome.jsx do site: traco de 1.75, sem
 * preenchimento, herdando currentColor. Sem biblioteca — lucide e afins
 * trariam centenas de icones pra usar cinco, e o peso de traco deles nao
 * combina com a tipografia daqui.
 *
 * Sao decorativos: quem da o nome acessivel e o aria-label do botao em volta.
 * Por isso todos vao com aria-hidden e focusable="false" — sem isso o leitor
 * de tela anuncia o icone alem do rotulo, e o IE/Edge antigo entra neles com
 * o Tab.
 */
function Svg({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Lapis: editar. */
export function IconeEditar(props) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  )
}

/** Lixeira: excluir. */
export function IconeExcluir(props) {
  return (
    <Svg {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  )
}

/** Balao do WhatsApp, com o fone dentro. */
export function IconeWhatsApp(props) {
  return (
    <Svg {...props}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-1l-1.3-.7-1 .8a5 5 0 0 1-2.3-2.3l.8-1L11 9.5c-.5 0-1 .4-1 1Z" />
    </Svg>
  )
}

/** Ficha aberta: ver os detalhes. */
export function IconeFicha(props) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </Svg>
  )
}

/** Olho aberto: a senha esta visivel. */
export function IconeOlho(props) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Olho riscado: a senha esta escondida. */
export function IconeOlhoRiscado(props) {
  return (
    <Svg {...props}>
      <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.7 3.6" />
      <path d="M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </Svg>
  )
}
