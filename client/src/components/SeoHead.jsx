import { useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Aplica title, metas e o JSON-LD de schema.org/Dentist a partir do painel.
 * O JSON-LD e o que faz o Google entender que isso e um consultorio em
 * Vitoria/ES, com endereco e horario, o que praticamente ninguem no ES faz.
 */
export default function SeoHead() {
  const { data } = useSiteData()
  const seo = data.seo
  const f = data.footer
  const c = data.contato

  useEffect(() => {
    if (seo.title) document.title = seo.title
    setMeta('name', 'description', seo.description)
    setMeta('name', 'theme-color', seo.themeColor)
    setMeta('property', 'og:title', seo.title)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', seo.siteUrl)
    setMeta('property', 'og:image', seo.ogImage)
    setMeta('name', 'twitter:card', 'summary_large_image')
    if (seo.favicon) setLink('icon', seo.favicon)
    if (seo.siteUrl) setLink('canonical', seo.siteUrl)
  }, [seo])

  useEffect(() => {
    const s = seo.schema || {}
    const phone = String(c?.whatsapp?.number || '').replace(/\D/g, '')
    const json = {
      '@context': 'https://schema.org',
      '@type': 'Dentist',
      name: s.name || seo.title,
      description: seo.description,
      url: seo.siteUrl,
      image: seo.ogImage || undefined,
      telephone: phone ? `+${phone}` : undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: s.street,
        addressLocality: s.city,
        addressRegion: s.state,
        postalCode: s.postalCode,
        addressCountry: 'BR',
      },
      geo:
        s.latitude && s.longitude
          ? { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude }
          : undefined,
      openingHours: (f?.horarios || []).map((h) => `${h.day} ${h.hours}`),
      sameAs: [f?.social?.instagram, f?.social?.facebook].filter(Boolean),
    }

    let el = document.getElementById('ld-json')
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = 'ld-json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify(json, (k, v) => (v === undefined ? undefined : v))
  }, [seo, f, c])

  return null
}
