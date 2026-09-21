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

// URL absoluta: cliente de e-mail nao resolve caminho relativo, e o Gmail
// descarta imagem em data:. Os arquivos sao servidos por client/public/marca.
const MARCA_BASE = 'https://dracamillabarros.com/marca'

/**
 * Cabecalho com o monograma CB.
 *
 * Usa o monograma, nao o lockup inteiro: num card de 560px o lockup ficaria
 * com a tagline em 4px, ilegivel. O monograma le bem em qualquer tamanho.
 *
 * Sempre a versao azul, sem troca por modo escuro. O card tem fundo #FFFFFF
 * fixo no HTML e nenhum cliente o escurece, entao a variante branca so
 * produziria logo branco sobre fundo branco. Ja aconteceu no Gmail escuro.
 */
function cabecalho() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:14px;vertical-align:middle;line-height:0;">
                <img src="${MARCA_BASE}/azul/monograma.png"
                     width="60" height="50" alt="Dra. Camilla Barros"
                     style="display:block;border:0;outline:none;
                            text-decoration:none;width:60px;height:50px;" />
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${AZUL_CLARO};">
                  Dra. Camilla Barros
                </div>
              </td>
            </tr>
          </table>`
}

// Rodape padrao: aviso interno, pra Camilla. Quem escreve pra paciente troca —
// dizer "nao e preciso responder" a quem espera resposta e o oposto do que o
// e-mail esta fazendo ali.
const RODAPE_INTERNO = 'Mensagem automatica do site. Nao e preciso responder este e-mail.'

function wrap(title, inner, rodape = RODAPE_INTERNO) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:${FUNDO};font-family:${FONTE};color:${TEXTO};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 32px 18px;border-bottom:1px solid #E6EBED;">
          ${cabecalho()}
        </td></tr>
        <tr><td style="padding:28px 32px 32px;">${inner}</td></tr>
      </table>
      <div style="max-width:560px;padding:16px 8px;font-size:12px;line-height:1.6;color:#7A8A92;">
        ${esc(rodape)}
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
    ? `<tr><td colspan="2" style="padding-top:24px;">
        <a href="https://wa.me/${waNumber}?text=${waText}"
           style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;
                  white-space:nowrap;">
          Responder no WhatsApp
        </a>
      </td></tr>`
    : ''

  const botaoEmail = !waNumber && email
    ? `<tr><td colspan="2" style="padding-top:24px;">
        <a href="mailto:${esc(email)}"
           style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;
                  white-space:nowrap;">
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

/**
 * Aviso de solicitacao de horario.
 *
 * Diferente do aviso de lead num ponto que importa: aqui existe prazo. O pedido
 * prende o horario e expira sozinho, entao o e-mail diz ate quando e leva direto
 * pro painel, que e onde a Camilla confirma. O botao de WhatsApp vem depois — a
 * ordem certa e confirmar primeiro, avisar depois.
 */
export function novaSolicitacaoEmail({ nome, telefone, email, procedimento, quando, expiraEm, mensagem, primeiraConsulta, painelUrl }) {
  const digits = String(telefone || '').replace(/\D/g, '')
  const waNumber = digits.length >= 12 ? digits : digits.length >= 10 ? `55${digits}` : ''
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || ''
  const waText = encodeURIComponent(
    `Ola${primeiroNome ? `, ${primeiroNome}` : ''}! Aqui e a Dra. Camilla Barros. Recebi seu pedido de horario pelo site.`
  )

  const botaoPainel = painelUrl
    ? `<tr><td colspan="2" style="padding-top:24px;">
        <a href="${esc(painelUrl)}"
           style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                  padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;
                  white-space:nowrap;">
          Abrir a agenda e confirmar
        </a>
      </td></tr>`
    : ''

  const botaoWhats = waNumber
    ? `<tr><td colspan="2" style="padding-top:12px;">
        <a href="https://wa.me/${waNumber}?text=${waText}"
           style="display:inline-block;color:${AZUL};text-decoration:underline;font-size:14px;">
          Falar com ${esc(primeiroNome || 'a paciente')} no WhatsApp
        </a>
      </td></tr>`
    : ''

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Pedido de horario novo</h1>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#5A6B73;">
      ${esc(nome)} pediu um horario pelo site. O horario fica reservado ate voce confirmar${
        expiraEm ? `, e o pedido expira em ${esc(expiraEm)}` : ''
      }.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha('Quando', quando)}
      ${linha('Procedimento', procedimento)}
      ${linha('Nome', nome)}
      ${linha('WhatsApp', telefone)}
      ${linha('E-mail', email)}
      ${linha('Primeira vez', primeiraConsulta ? 'Sim' : 'Nao')}
      ${mensagem ? linha('Observacao', mensagem) : ''}
      ${botaoPainel}
      ${botaoWhats}
    </table>`

  const texto = [
    'Pedido de horario novo',
    '',
    `Quando: ${quando || '-'}`,
    `Procedimento: ${procedimento || '-'}`,
    `Nome: ${nome || '-'}`,
    `WhatsApp: ${telefone || '-'}`,
    `E-mail: ${email || '-'}`,
    `Primeira vez: ${primeiraConsulta ? 'Sim' : 'Nao'}`,
    mensagem ? `Observacao: ${mensagem}` : '',
    expiraEm ? `\nO pedido expira em ${expiraEm}.` : '',
    painelUrl ? `Confirmar: ${painelUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject: `Pedido de horario: ${nome || 'sem nome'} — ${quando || ''}`.trim(),
    htmlContent: wrap('Pedido de horario novo', inner),
    textContent: texto,
  }
}

// ------------------------------------------------- avisos para a paciente
//
// Ate 21/09/2026 nenhum canal avisava a paciente de nada: ela pedia horario,
// o pedido nascia pendente com 48h de validade, a Camilla confirmava no painel
// e a paciente nao ficava sabendo. Se expirasse, tambem nao. Os tres e-mails
// abaixo fecham o ciclo — pedido recebido, confirmado e recusado.
//
// Regra que vale para os tres: o aviso NUNCA pode derrubar a acao. A decisao da
// Camilla ja aconteceu; quem nao deixou e-mail simplesmente nao recebe. Quem
// chama trata isso (agenda.js), nao o template.

const RODAPE_PACIENTE = 'Voce recebeu este e-mail porque pediu um horario no site da Dra. Camilla Barros.'

/** Botao grande, na cor da marca. */
function botao(href, rotulo) {
  return `<a href="${esc(href)}"
             style="display:inline-block;background:${AZUL};color:#FFFFFF;text-decoration:none;
                    padding:13px 26px;border-radius:8px;font-size:15px;font-weight:500;
                    white-space:nowrap;">${esc(rotulo)}</a>`
}

/** `55` + DDD + numero, ou vazio quando nao da pra montar link de WhatsApp. */
function paraWhatsApp(telefone) {
  const digits = String(telefone || '').replace(/\D/g, '')
  if (digits.length >= 12) return digits
  return digits.length >= 10 ? `55${digits}` : ''
}

/**
 * Pedido recebido — sai no mesmo instante em que ela envia.
 *
 * O unico conteudo que importa aqui e o prazo: ela acabou de escolher um
 * horario que NAO esta confirmado, e precisa saber disso agora, nao quando
 * aparecer na porta do consultorio.
 */
export function pedidoRecebidoEmail({ nome, procedimento, quando, expiraEm, whatsappConsultorio }) {
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || ''
  const wa = paraWhatsApp(whatsappConsultorio)

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Recebemos seu pedido de horario</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5A6B73;">
      ${primeiroNome ? `${esc(primeiroNome)}, o` : 'O'} horario abaixo esta guardado no seu nome enquanto
      a Dra. Camilla confirma. <strong style="color:${TEXTO};">Ainda nao e um agendamento fechado</strong> —
      voce recebe outro e-mail assim que ela responder.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha('Quando', quando)}
      ${linha('Procedimento', procedimento)}
      ${expiraEm ? linha('Responde ate', expiraEm) : ''}
    </table>
    ${wa ? `<p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#5A6B73;">
      Precisa mudar alguma coisa ou tem pressa?
      <a href="https://wa.me/${wa}" style="color:${AZUL};">Fale no WhatsApp</a>.
    </p>` : ''}`

  const texto = [
    'Recebemos seu pedido de horario',
    '',
    'O horario esta guardado no seu nome enquanto a Dra. Camilla confirma.',
    'Ainda nao e um agendamento fechado.',
    '',
    `Quando: ${quando || '-'}`,
    `Procedimento: ${procedimento || '-'}`,
    expiraEm ? `Responde ate: ${expiraEm}` : '',
    wa ? `\nWhatsApp: https://wa.me/${wa}` : '',
  ].filter(Boolean).join('\n')

  return {
    subject: `Recebemos seu pedido de horario — ${quando || ''}`.trim(),
    htmlContent: wrap('Recebemos seu pedido de horario', inner, RODAPE_PACIENTE),
    textContent: texto,
  }
}

/** Confirmado. Aqui entra o endereco: e o e-mail que ela vai reabrir no dia. */
export function pedidoConfirmadoEmail({ nome, procedimento, quando, endereco, mapsLink, whatsappConsultorio }) {
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || ''
  const wa = paraWhatsApp(whatsappConsultorio)

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Seu horario esta confirmado</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5A6B73;">
      ${primeiroNome ? `${esc(primeiroNome)}, esta` : 'Esta'} tudo certo. A Dra. Camilla te espera:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha('Quando', quando)}
      ${linha('Procedimento', procedimento)}
      ${linha('Onde', endereco)}
    </table>
    ${mapsLink ? `<div style="padding-top:24px;">${botao(mapsLink, 'Como chegar')}</div>` : ''}
    ${wa ? `<p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#5A6B73;">
      Se precisar remarcar ou desmarcar, avise pelo
      <a href="https://wa.me/${wa}" style="color:${AZUL};">WhatsApp</a> — assim o horario fica livre pra outra pessoa.
    </p>` : ''}`

  const texto = [
    'Seu horario esta confirmado',
    '',
    `Quando: ${quando || '-'}`,
    `Procedimento: ${procedimento || '-'}`,
    `Onde: ${endereco || '-'}`,
    mapsLink ? `Como chegar: ${mapsLink}` : '',
    wa ? `\nPrecisa remarcar? https://wa.me/${wa}` : '',
  ].filter(Boolean).join('\n')

  return {
    subject: `Horario confirmado — ${quando || ''}`.trim(),
    htmlContent: wrap('Seu horario esta confirmado', inner, RODAPE_PACIENTE),
    textContent: texto,
  }
}

/**
 * Recusado ou cancelado.
 *
 * Nao expoe o motivo que a Camilla escreveu no painel: aquilo e anotacao
 * interna ("paciente de outro convenio", "remarcou por telefone") e nao foi
 * escrito pra ser lido por quem recebe. O e-mail so abre a porta de volta.
 */
export function pedidoRecusadoEmail({ nome, quando, whatsappConsultorio }) {
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || ''
  const wa = paraWhatsApp(whatsappConsultorio)
  const waText = encodeURIComponent('Ola! Pedi um horario pelo site e gostaria de ver outra data.')

  const inner = `
    <h1 style="margin:0 0 6px;font-size:21px;font-weight:600;color:${TEXTO};">Nao foi possivel confirmar esse horario</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5A6B73;">
      ${primeiroNome ? `${esc(primeiroNome)}, o` : 'O'} horario de <strong style="color:${TEXTO};">${esc(quando || '')}</strong>
      nao ficou disponivel. Isso acontece — e a gente resolve rapido por outro caminho.
    </p>
    ${wa
      ? `<div style="padding-top:4px;">${botao(`https://wa.me/${wa}?text=${waText}`, 'Escolher outra data')}</div>`
      : `<p style="margin:0;font-size:15px;line-height:1.7;color:#5A6B73;">
           Responda este e-mail que a gente encontra outro horario pra voce.
         </p>`}`

  const texto = [
    'Nao foi possivel confirmar esse horario',
    '',
    `O horario de ${quando || '-'} nao ficou disponivel.`,
    wa ? `\nEscolher outra data: https://wa.me/${wa}` : 'Responda este e-mail que a gente encontra outro horario.',
  ].filter(Boolean).join('\n')

  return {
    subject: 'Sobre o seu pedido de horario',
    htmlContent: wrap('Nao foi possivel confirmar esse horario', inner, RODAPE_PACIENTE),
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
