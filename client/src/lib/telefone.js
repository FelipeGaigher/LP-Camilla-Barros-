/**
 * Telefone no client.
 *
 * Sem codigo proprio, pelo mesmo motivo do brt.js ao lado: a normalizacao e a
 * chave que deduplica paciente e cruza lead com agendamento, e duas
 * implementacoes divergem no dia em que alguem mexe numa so.
 *
 * O que isto resolve na pratica: o painel montava `wa.me/` a partir do telefone
 * de exibicao, tirando so o que nao e digito. "(27) 99999-0000" virava
 * `wa.me/27999990000`, sem o DDI 55 — link que o WhatsApp nao abre. Em quatro
 * telas ao mesmo tempo. `linkWhatsApp` acrescenta o 55 que falta.
 */
export * from '../../../api/_lib/telefone.js'
