import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteData } from '../context/SiteDataContext'
import { buildMeta, buildJsonLd } from '../lib/seo'

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
 * Mantem title, metas e JSON-LD em dia com o que esta no painel.
 *
 * O prerender ja escreve tudo isso no HTML (scripts/prerender.js, mesma fonte
 * em lib/seo.js). Este componente cobre o que muda depois do build: a Camilla
 * editou o titulo pelo CMS e ainda nao houve redeploy.
 */
export default function SeoHead() {
  const { data } = useSiteData()
  const { pathname } = useLocation()

  useEffect(() => {
    // Canonical acompanha a rota: uma rota nova herdaria a canonical da home
    // e diria ao Google que e duplicata dela.
    const m = buildMeta(data, pathname)
    if (m.title) document.title = m.title
    setMeta('name', 'description', m.description)
    setMeta('name', 'theme-color', m.themeColor)
    setMeta('property', 'og:title', m.title)
    setMeta('property', 'og:description', m.description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', m.canonical)
    setMeta('property', 'og:image', m.ogImage)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', m.title)
    setMeta('name', 'twitter:description', m.description)
    if (m.favicon) setLink('icon', m.favicon)
    if (m.canonical) setLink('canonical', m.canonical)
  }, [data, pathname])

  useEffect(() => {
    let el = document.getElementById('ld-json')
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = 'ld-json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify(buildJsonLd(data))
  }, [data])

  return null
}
