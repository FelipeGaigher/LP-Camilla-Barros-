/**
 * Normalizacao de telefone brasileiro.
 *
 * Existe porque o telefone e a chave de tres coisas ao mesmo tempo: deduplicar
 * paciente, limitar pedido repetido e cruzar um agendamento com um lead antigo.
 * Se "(27) 99999-0000", "27999990000" e "+55 27 99999-0000" virarem tres chaves
 * diferentes, nenhuma das tres funciona.
 *
 * A saida e sempre so digitos com o DDI 55 na frente. Isso nao da pra fazer no
 * banco com regexp_replace: tirar o que nao e digito ele faz, mas acrescentar o
 * 55 que faltou, nao.
 */

/** Celular tem 11 digitos com DDD, fixo tem 10. Com DDI, 13 e 12. */
const DDI_BR = '55'

/**
 * @returns {string|null} digitos com DDI, ou null se nao parecer telefone
 *   brasileiro. null e resposta legitima: o campo e opcional no cadastro.
 */
export function normalizaTelefone(bruto) {
  let digitos = String(bruto ?? '').replace(/\D/g, '')
  if (!digitos) return null

  // Alguns teclados mandam o 0 do DDD ou o 0800 de operadora na frente.
  if (digitos.length > 11 && digitos.startsWith('0')) digitos = digitos.replace(/^0+/, '')

  if (digitos.length === 10 || digitos.length === 11) return DDI_BR + digitos
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith(DDI_BR)) return digitos

  return null
}

/** O numero e utilizavel como contato? */
export function telefoneValido(bruto) {
  return normalizaTelefone(bruto) !== null
}

/**
 * Digitos normalizados -> '(27) 99999-0000', pra exibir no painel.
 * Numero fora do padrao volta como veio: melhor mostrar torto do que sumir.
 */
export function formataTelefone(chave) {
  const d = String(chave ?? '').replace(/\D/g, '')
  const local = d.startsWith(DDI_BR) && d.length > 11 ? d.slice(2) : d

  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return String(chave ?? '')
}

/** Link de conversa no WhatsApp a partir da chave normalizada. */
export function linkWhatsApp(chave, mensagem) {
  const d = String(chave ?? '').replace(/\D/g, '')
  if (!d) return ''
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${d}${texto}`
}
