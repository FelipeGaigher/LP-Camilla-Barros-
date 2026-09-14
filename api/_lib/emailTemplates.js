// Templates de e-mail. HTML inline e tabela: cliente de e-mail nao aplica
// CSS externo nem flexbox de forma confiavel.

const AZUL = '#2F4858'
const AZUL_CLARO = '#5B7B8C'
const FUNDO = '#F5F7F8'
const TEXTO = '#1A1A1A'
const FONTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrap(title, inner) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:${FUNDO};font-family:${FONTE};color:${TEXTO};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #E6EBED;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${AZUL_CLARO};">
            Dra. Camilla Barros
          </div>
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">${inner}</td></tr>
      </table>
      <div style="max-width:560px;padding:16px 8px;font-size:12px;line-height:1.6;color:#7A8A92;">
        Mensagem automatica do site. Nao e preciso responder este e-mail.
      </div>
    </td></tr>
  </table>
</body></html>`
}

function linha(rotulo, valor) {
  if (!valor) return ''
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:${AZUL_CLARO};width:110px;vertical-align:top;">${esc(rotulo)}</td>
    <td style="padding:8px 0;font-size:15px;color:${TEXTO};vertical-align:top;">${esc(valor)}</td>
  </tr>`
}

/**
 * Aviso de lead novo.
 *
 * O botao de WhatsApp ja vai com a primeira mensagem escrita: a Camilla abre o
 * e-mail no celular, toca e esta respondendo. A pesquisa do projeto mede que
 * responder em menos de 2 minutos dobra a conversao.
 */
export function leadNotificationEmail({ name, phone, email, interest, message, source }) {
  const digits = String(phone || '').replace(/\D/g, '')
  const waNumber = digits.length >= 12 ? digits : digits.length >= 10 ? `55${digits}` : ''
  const primeiroNome = String(name || '').trim().split(/\s+/)[0] || ''
  const waText = encodeURIComponent(
    `Ola${primeiroNome ? `, ${primeiroNome}` : ''}! Aqui e a Dra. Camilla Barros. Recebi seu contato pelo site e fico feliz em falar com voce.`
  )

  const botaoWhats = waNumber
    ? `<tr><td style="padding-top:24px;">
        <a href="https://wa.me/${waNumber}?text=${waText}"
           style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;">
          Responder no WhatsApp
        </a>
      </td></tr>`
    : ''

  const botaoEmail = !waNumber && email
    ? `<tr><td style="padding-top:24px;">
        <a href="mailto:${esc(email)}"
           style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;">
          Responder por e-mail
        </a>
      </td></tr>`
    : ''

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Contato novo pelo site</h1>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#5A6B73;">
      ${esc(name)} deixou os dados agora ha pouco.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha('Nome', name)}
      ${linha('WhatsApp', phone)}
      ${linha('E-mail', email)}
      ${linha('Interesse', interest)}
      ${linha('Origem', source)}
      ${message ? linha('Mensagem', message) : ''}
      ${botaoWhats}
      ${botaoEmail}
    </table>`

  const texto = [
    'Contato novo pelo site',
    '',
    `Nome: ${name || '-'}`,
    `WhatsApp: ${phone || '-'}`,
    `E-mail: ${email || '-'}`,
    `Interesse: ${interest || '-'}`,
    `Origem: ${source || '-'}`,
    message ? `Mensagem: ${message}` : '',
    waNumber ? `\nResponder: https://wa.me/${waNumber}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject: `Contato novo no site: ${name || 'sem nome'}`,
    htmlContent: wrap('Contato novo pelo site', inner),
    textContent: texto,
  }
}

/** Link de recuperacao de senha do painel. */
export function passwordResetEmail({ username, resetUrl }) {
  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Recuperar a senha do painel</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5A6B73;">
      Recebemos um pedido para trocar a senha de <strong style="color:${TEXTO};">${esc(username)}</strong>.
      O link abaixo vale por 1 hora e so pode ser usado uma vez.
    </p>
    <a href="${esc(resetUrl)}"
       style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
              padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;">
      Criar uma senha nova
    </a>
    <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#7A8A92;">
      Se nao foi voce quem pediu, pode ignorar este e-mail — a senha atual continua valendo.
    </p>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9AA8AE;word-break:break-all;">
      O botao nao funciona? Cole este endereco no navegador:<br />${esc(resetUrl)}
    </p>`

  return {
    subject: 'Recuperar a senha do painel',
    htmlContent: wrap('Recuperar a senha do painel', inner),
    textContent: `Recuperar a senha do painel\n\nUsuario: ${username}\nLink (vale 1 hora): ${resetUrl}\n\nSe nao foi voce quem pediu, ignore este e-mail.`,
  }
}
