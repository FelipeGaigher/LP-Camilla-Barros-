/**
 * Icones de traco do site publico.
 *
 * Ficavam dentro do Hero.jsx, usados so pelos selos sobre o retrato. Sairam de
 * la quando a faixa de valores passou a usar os mesmos tres: repetir o mesmo
 * desenho no selo e no valor correspondente e o que amarra as duas secoes.
 *
 * Sao os unicos icones do site publico, fora WhatsApp e Instagram, que sao
 * marcas e vivem no Chrome.jsx. Nao ha biblioteca de icones no projeto e nao
 * deve haver: icone decorativo em caixinha e marca de template. Todos aqui sao
 * traco aberto, sem preenchimento, no mesmo viewBox de 24, para aguentar 13px
 * no selo e 22px na secao de sinais sem redesenhar.
 */

export const ICONS = {
  // --- os tres do hero e da faixa de valores
  check: <path d="M20 6 9 17l-5-5" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  escudo: <path d="M12 3 4 6v6c0 4.4 3.2 8.5 8 9.6 4.8-1.1 8-5.2 8-9.6V6l-8-3z" />,

  // --- os seis sinais
  /** Dente inteiro: cor, manchas. */
  dente: (
    <path d="M12 4.2C10.2 3 6.8 2.7 6 5.6c-.7 2.5.5 4.2.8 6.4.2 1.6.3 3.6.7 5 .4 1.3 1.6 1.3 1.9-.1.4-1.6.4-3.2 1.3-3.2h2.6c.9 0 .9 1.6 1.3 3.2.3 1.4 1.5 1.4 1.9.1.4-1.4.5-3.4.7-5 .3-2.2 1.5-3.9.8-6.4-.8-2.9-4.2-2.6-6-1.4z" />
  ),
  /** Gota: gengiva que sangra.
   *  Tentei escova antes, na diagonal e em pe. Na diagonal o conjunto cabo +
   *  cabeca lia como martelo; em pe, como tomada. Em 22px a silhueta manda
   *  mais que o conceito, e a gota diz sangramento sem depender de detalhe. */
  gota: <path d="M12 3.2c3.4 4 6 7 6 9.9a6 6 0 0 1-12 0c0-2.9 2.6-5.9 6-9.9z" />,
  /** Boca sorrindo: faixa de gengiva no topo e os dentes divididos abaixo.
   *  Sem as divisoes verticais o semicirculo lia como tigela. */
  sorriso: (
    <>
      <path d="M3.6 10.4h16.8c0 4.6-3.8 8.4-8.4 8.4s-8.4-3.8-8.4-8.4z" />
      <path d="M4.2 13.4h15.6" />
      <path d="M8.6 13.4v4.4M12 13.4v5.3M15.4 13.4v4.4" />
    </>
  ),
  /** Dente com o canto quebrado: lascado, gasto, torto. */
  denteLascado: (
    <path d="M12 4.2C10.2 3 6.8 2.7 6 5.6c-.7 2.5.5 4.2.8 6.4.2 1.6.3 3.6.7 5 .4 1.3 1.6 1.3 1.9-.1.4-1.6.4-3.2 1.3-3.2h2.6c.9 0 .9 1.6 1.3 3.2.3 1.4 1.5 1.4 1.9.1.4-1.4.5-3.4.7-5 .2-1.3.7-2.4.9-3.7l-3 1.7 1.4-3.1-3.6 1.3z" />
  ),
  /** Lua: o que aparece ao acordar. */
  lua: <path d="M20.5 14.7A8.6 8.6 0 0 1 9.3 3.5a8.6 8.6 0 1 0 11.2 11.2z" />,
  /** Floco: sensibilidade ao gelado e ao quente. */
  floco: (
    <>
      <path d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4 4 16.6" />
      <path d="M12 6.4 9.7 4.6M12 6.4l2.3-1.8M12 17.6l-2.3 1.8M12 17.6l2.3 1.8" />
    </>
  ),
}

export const NOMES_ICONE = Object.keys(ICONS)

/** `size` em px. Traco mais fino quando o icone cresce, para nao pesar. */
export default function Icone({ name, size = 13, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 20 ? 1.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.check}
    </svg>
  )
}
