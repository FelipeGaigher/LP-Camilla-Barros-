/**
 * LINK DE NAVEGACAO x SECAO DESLIGADA
 *
 * O painel deixa a Camilla desligar qualquer secao da home, mas os links que
 * apontam para ela ficavam onde estavam. Sem a secao na pagina, a ancora nao
 * encontra alvo: `scrollToAnchor` devolve false, `irPara` nao chama
 * preventDefault, o navegador segue o href e nada acontece. O link continua
 * clicavel, com aparencia de link bom, e some so o efeito.
 *
 * Aconteceu de verdade: com o Consultorio desligado, "Consultorio" continuou no
 * menu, no drawer e no rodape, morto nos tres.
 *
 * Aqui os links sao filtrados pela visibilidade antes de renderizar. A regra
 * vale para qualquer lista de navegacao, entao navbar e rodape compartilham a
 * mesma funcao e nao podem divergir uma da outra.
 */

/** Ancoras que dependem de uma secao ligada para existir na pagina. */
export const SECAO_POR_ANCORA = {
  '#video': 'video',
  '#tratamentos': 'tratamentos',
  '#sintomas': 'sintomas',
  '#sobre': 'sobre',
  '#consultorio': 'consultorio',
  '#depoimentos': 'depoimentos',
  '#faq': 'faq',
  '#contato': 'contato',
}

/**
 * O destino do link existe na pagina?
 *
 * Nao-ancora (rota, http, tel, mailto) passa sempre: nao e assunto da
 * visibilidade. `#top` tambem, porque o hero nao entra no `visibility` e
 * sempre e renderizado.
 */
export function destinoExiste(href, visibility) {
  if (typeof href !== 'string' || !href.startsWith('#')) return true
  const secao = SECAO_POR_ANCORA[href]
  if (!secao) return true
  return visibility?.[secao] !== false
}

/** Filtra uma lista de `{ label, href }` pelas secoes que estao no ar. */
export function linksVisiveis(links, visibility) {
  return (links || []).filter((l) => destinoExiste(l?.href, visibility))
}

/**
 * Destino para um CTA cujo alvo pode estar desligado.
 *
 * Esconder "Agendar consulta" junto com a secao Contato seria pior que o link
 * morto: some o unico caminho de conversao do topo da pagina. Entao o CTA cai
 * para o WhatsApp, que nao depende de secao nenhuma.
 */
export function destinoCta(href, visibility, fallback) {
  if (destinoExiste(href, visibility)) return href
  return fallback || href
}
