import { scrollToAnchor } from '../components/SmoothScroll'

/**
 * Resolve os tres tipos de link que os CTAs do site usam.
 *
 * Existe porque os botoes do site nasceram so com ancora: o handler antigo era
 * `if (scrollToAnchor(href)) e.preventDefault()`. Para um href de rota, o
 * scrollToAnchor devolve false, nada chama preventDefault, e o navegador faz
 * navegacao cheia — recarregando o bundle inteiro e perdendo o estado da SPA.
 *
 * @param {Function} navigate o do useNavigate(), do react-router
 */
export function irPara(e, href, navigate) {
  if (!href) return

  // #ancora: rola na propria pagina.
  if (href.startsWith('#')) {
    if (scrollToAnchor(href)) e.preventDefault()
    return
  }

  // /rota: navega pela SPA. Ctrl/cmd/clique do meio continuam abrindo em aba
  // nova, que e o que a pessoa pediu ao segurar a tecla.
  if (href.startsWith('/')) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
    e.preventDefault()
    navigate(href)
    return
  }

  // http(s) e tel: e mailto: seguem pro navegador.
}
