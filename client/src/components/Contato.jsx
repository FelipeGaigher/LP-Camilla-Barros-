import { useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { sendLead } from '../data/api'
import Reveal from './Reveal'
import { waLink, WhatsAppIcon } from './Chrome'
import EditableText from './editable/EditableText'

export default function Contato() {
  const { data } = useSiteData()
  const c = data.contato
  const f = data.footer

  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', message: '', website: '' })
  const [status, setStatus] = useState({ state: 'idle', text: '' })

  const wa = waLink(c.whatsapp.number, c.whatsapp.message)

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setStatus({ state: 'error', text: 'Preencha o nome e ao menos um contato.' })
      return
    }
    setStatus({ state: 'sending', text: 'Enviando...' })
    const res = await sendLead({ ...form, source: 'formulario-site' })
    if (res?.ok) {
      setStatus({ state: 'ok', text: c.successMessage })
      setForm({ name: '', phone: '', email: '', interest: '', message: '', website: '' })
    } else {
      setStatus({ state: 'error', text: res?.error || 'Nao foi possivel enviar. Tente pelo WhatsApp.' })
    }
  }

  return (
    <section id="contato" className="section">
      <div className="container contato__grid">
        <div>
          <Reveal>
            <EditableText path="contato.eyebrow" className="eyebrow" />
            <EditableText as="h2" path="contato.title" style={{ marginTop: '1.25rem' }} />
            <EditableText as="p" path="contato.text" className="lead" style={{ marginTop: '1.5rem' }} multiline />
            {wa && (
              <a className="btn btn--primary" href={wa} target="_blank" rel="noopener noreferrer" style={{ marginTop: '2rem' }}>
                <WhatsAppIcon size={18} />
                {c.whatsapp.label}
              </a>
            )}
          </Reveal>

          <Reveal className="contato__aside" delay={0.1} style={{ marginTop: '3rem' }}>
            <div className="contato__block">
              <h3>Endereco</h3>
              <p>
                {f.endereco.street}
                {f.endereco.complement ? `, ${f.endereco.complement}` : ''}
                <br />
                {f.endereco.district} &middot; {f.endereco.city}/{f.endereco.state}
                <br />
                {f.endereco.cep}
              </p>
            </div>

            <div className="contato__block">
              <h3>Horarios</h3>
              <ul>
                {f.horarios?.map((h, i) => (
                  <li key={i}>
                    {h.day}: {h.hours}
                  </li>
                ))}
              </ul>
            </div>

            {f.endereco.mapsEmbed && (
              <div className="contato__map">
                <iframe src={f.endereco.mapsEmbed} title="Mapa do consultorio" loading="lazy" allowFullScreen />
              </div>
            )}
          </Reveal>
        </div>

        {c.formEnabled && (
          <Reveal delay={0.06}>
            <form className="form" onSubmit={onSubmit} noValidate>
              <div className="form__row">
                <div className="field">
                  <label htmlFor="f-name">Nome</label>
                  <input id="f-name" value={form.name} onChange={set('name')} autoComplete="name" required />
                </div>
                <div className="field">
                  <label htmlFor="f-phone">WhatsApp</label>
                  <input id="f-phone" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="f-email">E-mail</label>
                <input id="f-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </div>

              <div className="field">
                <label htmlFor="f-interest">Sobre o que voce quer falar</label>
                <select id="f-interest" value={form.interest} onChange={set('interest')}>
                  <option value="">Selecione</option>
                  {c.interesses?.map((op, i) => (
                    <option key={i} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="f-message">Mensagem</label>
                <textarea id="f-message" value={form.message} onChange={set('message')} />
              </div>

              {/* honeypot anti-bot, invisivel para pessoas */}
              <div className="field field--hp" aria-hidden="true">
                <label htmlFor="f-website">Nao preencha</label>
                <input id="f-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>

              <button className="btn btn--primary" type="submit" disabled={status.state === 'sending'}>
                {status.state === 'sending' ? 'Enviando...' : 'Enviar mensagem'}
              </button>

              {status.text && (
                <p className={`form__status ${status.state === 'error' ? 'is-error' : status.state === 'ok' ? 'is-ok' : ''}`}>
                  {status.text}
                </p>
              )}

              <p className="form__legal">
                Ao enviar, voce concorda que seus dados sejam usados apenas para retorno sobre este contato.
              </p>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  )
}
