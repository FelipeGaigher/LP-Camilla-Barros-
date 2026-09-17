import { useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { sendLead } from '../data/api'
import { solicitarHorario } from '../data/agendaApi'
import Reveal from './Reveal'
import { waLink, WhatsAppIcon } from './Chrome'
import EditableText from './editable/EditableText'
import EscolherHorario from './EscolherHorario'
import Select from './Select'

const VAZIO = { name: '', phone: '', email: '', interest: '', message: '', website: '' }

export default function Contato() {
  const { data } = useSiteData()
  const c = data.contato
  const f = data.footer
  const ag = c.agendamento || {}

  const [form, setForm] = useState(VAZIO)
  const [horario, setHorario] = useState(null)
  const [conflito, setConflito] = useState(0)
  const [status, setStatus] = useState({ state: 'idle', text: '' })

  const wa = waLink(c.whatsapp.number, c.whatsapp.message)

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setStatus({ state: 'error', text: 'Preencha o nome e ao menos um contato.' })
      return
    }

    // Escolher horario e opcional, e e ele que decide o destino do envio. Sem
    // horario, continua sendo exatamente o contato de sempre.
    if (horario) return enviarPedido()

    setStatus({ state: 'sending', text: 'Enviando...' })
    const res = await sendLead({ ...form, source: 'formulario-site' })
    if (res?.ok) {
      setStatus({ state: 'ok', text: c.successMessage })
      setForm(VAZIO)
    } else {
      setStatus({ state: 'error', text: res?.error || 'Não foi possível enviar. Tente pelo WhatsApp.' })
    }
  }

  async function enviarPedido() {
    // O endpoint de agendamento exige WhatsApp: e por ele que a confirmacao
    // volta. O de contato aceita so e-mail, dai a checagem extra aqui.
    if (!form.phone.trim()) {
      setStatus({ state: 'error', text: 'Para marcar horário, informe o WhatsApp. É por ele que a confirmação chega.' })
      return
    }

    setStatus({ state: 'sending', text: 'Enviando seu pedido...' })
    const res = await solicitarHorario({
      nome: form.name,
      telefone: form.phone,
      email: form.email,
      mensagem: form.message,
      inicio: horario.inicio,
      consentimento: true,
      website: form.website,
    })

    if (res.ok) {
      setStatus({ state: 'ok', text: ag.sucesso || c.successMessage })
      setForm(VAZIO)
      setHorario(null)
      return
    }

    // Horario tomado entre carregar a lista e enviar nao e borda, e o contrato:
    // a tela so sabe o que era verdade ha alguns segundos. Refaz a lista do dia
    // e limpa a escolha invalida, sem tocar no que ela ja digitou.
    if (res.code === 'HORARIO_OCUPADO' || res.code === 'HORARIO_INVALIDO') {
      setHorario(null)
      setConflito((n) => n + 1)
      setStatus({ state: 'error', text: 'Esse horário acabou de ser pedido por outra pessoa. Escolha outro.' })
      return
    }

    if (res.code === 'REDE') {
      setStatus({ state: 'error', text: 'Sem conexão. Tente de novo ou fale pelo WhatsApp.' })
      return
    }
    setStatus({ state: 'error', text: res.error })
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
              <h3>Endereço</h3>
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
              <h3>Horários</h3>
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
                <iframe src={f.endereco.mapsEmbed} title="Mapa do consultório" loading="lazy" allowFullScreen />
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

              {/* O <select> nativo desenha a lista de opcoes pelo sistema
                  operacional, com a cor de selecao do Windows. Era o unico
                  elemento do formulario fora da identidade. Ver Select.jsx. */}
              <div className="field">
                <label id="f-interest-label" htmlFor="f-interest">Sobre o que você quer falar</label>
                <Select
                  id="f-interest"
                  labelId="f-interest-label"
                  value={form.interest}
                  onChange={(v) => setForm((prev) => ({ ...prev, interest: v }))}
                  options={c.interesses || []}
                />
              </div>

              <div className="field">
                <label htmlFor="f-message">Mensagem</label>
                <textarea id="f-message" value={form.message} onChange={set('message')} />
              </div>

              <EscolherHorario
                textos={ag}
                valor={horario}
                conflito={conflito}
                onEscolher={(s) => {
                  setHorario(s)
                  setStatus({ state: 'idle', text: '' })
                }}
              />

              {/* honeypot anti-bot, invisivel para pessoas */}
              <div className="field field--hp" aria-hidden="true">
                <label htmlFor="f-website">Não preencha</label>
                <input id="f-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>

              <button className="btn btn--primary" type="submit" disabled={status.state === 'sending'}>
                {status.state === 'sending'
                  ? 'Enviando...'
                  : horario
                    ? 'Pedir este horário'
                    : 'Enviar mensagem'}
              </button>

              {status.text && (
                <p className={`form__status ${status.state === 'error' ? 'is-error' : status.state === 'ok' ? 'is-ok' : ''}`}>
                  {status.text}
                </p>
              )}

              <p className="form__legal">
                Ao enviar, você concorda que seus dados sejam usados apenas para retorno sobre este contato.
              </p>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  )
}
