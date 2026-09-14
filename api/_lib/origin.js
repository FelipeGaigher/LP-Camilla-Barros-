// Checagem de Origin/Referer nas mutacoes.
//
// Com o token em cookie, o navegador passa a anexa-lo sozinho em qualquer
// request — inclusive uma disparada de outro site. SameSite=Lax ja barra a
// maior parte; isto e a segunda camada.
//
// Request sem Origin nem Referer passa (curl, server-to-server): nesses casos
// a defesa e a propria sessao, que um site terceiro nao consegue forjar.

const ALLOWED_HOSTS_REGEX = [
  /^camillabarros\.com\.br$/,
  /^www\.camillabarros\.com\.br$/,
  /^lp-camilla-barros\.vercel\.app$/,
  /^lp-camilla-barros-[a-z0-9-]+\.vercel\.app$/, // previews
  /^lp-camilla-barros-git-[a-z0-9-]+\.vercel\.app$/, // previews de branch
  /^[a-z0-9-]+-felipes-projects-[a-z0-9]+\.vercel\.app$/, // previews efemeros
  /^localhost(:\d+)?$/,
  /^127\.0\.0\.1(:\d+)?$/,
]

function hostFromUrl(url) {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

export function checkOrigin(req) {
  const candidate = req.headers?.origin || req.headers?.referer
  if (!candidate) return true

  const host = hostFromUrl(candidate)
  if (!host) return false

  return ALLOWED_HOSTS_REGEX.some((re) => re.test(host))
}
