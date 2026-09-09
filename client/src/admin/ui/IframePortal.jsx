import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renderiza os filhos dentro de um iframe, via portal do React.
 *
 * O iframe cria um viewport de verdade: as media queries respondem ao tamanho
 * dele, nao ao da janela. E isso que permite conferir o layout de celular sem
 * sair do painel.
 *
 * O preview e inerte de proposito. Todo clique tem a acao real bloqueada na
 * fase de captura, entao nada navega nem abre modal, e o clique vira apenas um
 * aviso de "foca este campo no editor".
 */
export default function IframePortal({ width = '100%', height = '100%', children, onReady }) {
  const iframeRef = useRef(null)
  const [mountNode, setMountNode] = useState(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const montar = () => {
      const doc = iframe.contentDocument
      if (!doc || doc.body?.dataset.pronto) return

      doc.open()
      doc.write(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>'
      )
      doc.close()

      // Leva o CSS do painel para dentro do iframe.
      Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).forEach((node) => {
        doc.head.appendChild(node.cloneNode(true))
      })
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          if (!sheet.href || doc.querySelector(`link[href="${sheet.href}"]`)) return
          const link = doc.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          doc.head.appendChild(link)
        })
      } catch {
        // stylesheet de outra origem, ignora
      }

      doc.body.style.margin = '0'
      doc.body.dataset.pronto = '1'
      // Liga a affordance de clicavel so dentro do preview.
      doc.body.classList.add('cms-preview-body')

      doc.addEventListener(
        'click',
        (e) => {
          const alvo = e.target?.closest?.('[data-cms-path]')
          const path = alvo?.getAttribute('data-cms-path')
          if (path) {
            try {
              window.postMessage({ src: 'cms-preview', type: 'focus', path }, '*')
            } catch {
              // noop
            }
          }
          e.preventDefault()
          e.stopImmediatePropagation()
        },
        true
      )

      doc.addEventListener(
        'submit',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
        },
        true
      )

      setMountNode(doc.body)
      onReady?.(doc)
    }

    iframe.addEventListener('load', montar)
    montar()
    return () => iframe.removeEventListener('load', montar)
  }, [onReady])

  return (
    <iframe
      ref={iframeRef}
      title="Previa do site"
      style={{ width, height, border: 0, background: 'var(--bg, #f2f1ed)', display: 'block' }}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  )
}
