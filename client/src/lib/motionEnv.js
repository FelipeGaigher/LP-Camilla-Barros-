/**
 * Se ha um navegador para animar.
 *
 * No prerender de build nao existe viewport nem scroll, entao animacao de
 * entrada nunca completa e o estado inicial (opacity: 0) fica gravado no HTML.
 * O texto continua no DOM, e o crawler le — mas quem abre a pagina ve um bloco
 * em branco ate o React montar.
 *
 * Quem usa trata isto como o irmao do prefers-reduced-motion: mesma saida, que
 * e renderizar direto no estado final.
 */
export const podeAnimar = typeof window !== 'undefined'
