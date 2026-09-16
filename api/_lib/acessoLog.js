/**
 * Trilha de acesso a dado de paciente.
 *
 * Separada do audit_log por duas razoes. A primeira e volume: log de LEITURA
 * cresce muito mais rapido que log de escrita e precisa de retencao propria.
 *
 * A segunda importa mais. O audit_log guarda old_data em JSONB, entao apagar um
 * paciente por la deixaria uma copia integral do dado de saude num lugar onde
 * ninguem vai lembrar de procurar no dia de cumprir um pedido de exclusao. Aqui
 * nao existe payload: so quem, quando, qual recurso e qual acao.
 *
 * Fire and forget, no mesmo espirito do auditLog: registrar o acesso nunca pode
 * atrasar nem derrubar a resposta pra Camilla.
 */
export function logAcesso(sql, { recurso, recursoId, acao, userId, username, ip }) {
  Promise.resolve()
    .then(() =>
      sql`
        INSERT INTO acesso_log (recurso, recurso_id, acao, user_id, username, ip)
        VALUES (
          ${recurso},
          ${recursoId ?? null},
          ${acao},
          ${userId ?? null},
          ${username ?? null},
          ${ip ?? null}
        )
      `
    )
    .catch((err) => console.error('acesso_log:', err.message))
}
