/**
 * Decide se uma URL de video e um link de plataforma (YouTube/Vimeo) ou um
 * arquivo pra tocar direto.
 *
 * A checagem e por padrao de link, nao por onde o arquivo esta hospedado. Foi o
 * que quebrou na migracao pro Blob: o painel testava `startsWith('/uploads')`,
 * que era o caminho do disco da VPS, e passou a classificar todo upload como
 * link externo.
 */
export function embedUrl(url) {
  if (!url) return null
  const yt = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`
  const vimeo = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  return null
}

/** True quando a URL aponta pra uma plataforma de video, nao pra um arquivo. */
export function isEmbed(url) {
  return !!embedUrl(url)
}
