/**
 * Log de auditoria: guarda quem alterou o que e quando.
 * Nao bloqueia a resposta (fire and forget) e nunca quebra a request.
 */
export function logAudit(sql, { sectionKey, action, oldData, newData, userId, username }) {
  Promise.resolve()
    .then(() =>
      sql`
        INSERT INTO audit_log (section_key, action, old_data, new_data, user_id, username)
        VALUES (
          ${sectionKey},
          ${action},
          ${oldData ? sql.json(oldData) : null},
          ${newData ? sql.json(newData) : null},
          ${userId || null},
          ${username || null}
        )
      `
    )
    .catch((err) => console.error('audit_log:', err.message))
}
