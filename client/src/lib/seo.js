/**
 * Metas e dados estruturados derivados do conteudo do CMS.
 *
 * Duas frentes consomem isto: o SeoHead, que aplica no `document` depois que o
 * React monta, e o prerender de build, que escreve o mesmo resultado direto no
 * HTML. Uma definicao so — se fossem duas, a do build envelheceria calada e o
 * Google continuaria lendo o titulo antigo.
 */

/** Titulo, descricao e demais metas da pagina. */
export function buildMeta(data) {
  const seo = data?.seo || {}
  return {
    title: seo.title || '',
    description: seo.description || '',
    canonical: (seo.siteUrl || '').replace(/\/$/, '') || '',
    ogImage: seo.ogImage || '',
    themeColor: seo.themeColor || '',
    favicon: seo.favicon || '',
  }
}

const DIAS = [
  [/\bdomingos?\b/i, 'Su'],
  [/\bsegundas?(-feira)?\b/i, 'Mo'],
  [/\bter[cç]as?(-feira)?\b/i, 'Tu'],
  [/\bquartas?(-feira)?\b/i, 'We'],
  [/\bquintas?(-feira)?\b/i, 'Th'],
  [/\bsextas?(-feira)?\b/i, 'Fr'],
  [/\bs[aá]bados?\b/i, 'Sa'],
]

function normalizaHora(h, m) {
  return `${String(h).padStart(2, '0')}:${m || '00'}`
}

/**
 * Converte "Segunda a sexta" + "08h as 18h" no formato do schema.org
 * ("Mo-Fr 08:00-18:00").
 *
 * O painel pede horario em texto livre, porque quem le no rodape e uma pessoa.
 * O Google, no JSON-LD, so aceita o formato dele — mandar a frase crua nao
 * ajuda e ainda faz o Rich Results Test acusar erro. Quando a frase nao for
 * reconhecida, devolve null e o campo simplesmente nao vai.
 */
export function toSchemaOpeningHours(day, hours) {
  const dia = String(day || '')
  const hora = String(hours || '')
  if (/\[PLACEHOLDER\]/i.test(dia) || /\[PLACEHOLDER\]/i.test(hora)) return null

  const encontrados = DIAS.filter(([re]) => re.test(dia)).map(([, code]) => code)
  if (!encontrados.length) return null

  // "Segunda a sexta" e intervalo; "Segunda, quarta e sexta" e lista.
  const intervalo = /\ba\b|\bate\b|\baté\b|-/.test(dia) && encontrados.length === 2
  const diasToken = intervalo ? `${encontrados[0]}-${encontrados[1]}` : encontrados.join(',')

  const horas = [...hora.matchAll(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/gi)]
  if (horas.length < 2) return null

  const abre = normalizaHora(horas[0][1], horas[0][2])
  const fecha = normalizaHora(horas[1][1], horas[1][2])
  return `${diasToken} ${abre}-${fecha}`
}

/**
 * schema.org/Dentist: e o que faz o Google entender que isto e um consultorio
 * em Vitoria/ES, com endereco e horario. A pesquisa do projeto mediu que
 * nenhum dos concorrentes analisados no ES publica isso.
 */
export function buildJsonLd(data) {
  const seo = data?.seo || {}
  const s = seo.schema || {}
  const f = data?.footer || {}
  const c = data?.contato || {}

  const phone = String(c?.whatsapp?.number || '').replace(/\D/g, '')
  const horarios = (Array.isArray(f?.horarios) ? f.horarios : [])
    .map((h) => toSchemaOpeningHours(h?.day, h?.hours))
    .filter(Boolean)

  const json = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: s.name || seo.title,
    description: seo.description,
    url: seo.siteUrl,
    image: seo.ogImage || undefined,
    telephone: phone ? `+${phone}` : undefined,
    priceRange: s.priceRange || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [s.street, s.district].filter(Boolean).join(', ') || undefined,
      addressLocality: s.city,
      addressRegion: s.state,
      postalCode: s.postalCode,
      addressCountry: 'BR',
    },
    geo:
      s.latitude && s.longitude
        ? { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude }
        : undefined,
    openingHours: horarios.length ? horarios : undefined,
    sameAs: [f?.social?.instagram, f?.social?.facebook].filter(Boolean),
  }

  if (!json.sameAs.length) delete json.sameAs
  return json
}
