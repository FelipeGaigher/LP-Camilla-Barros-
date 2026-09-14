import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { getDb } from '../api/_lib/db.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

/**
 * Troca a senha do admin direto pelo banco, sem passar pelo painel.
 *
 * Uso: npm run admin:reset -- <usuario> <email> <senha>
 *
 * Serve pra dois casos: o primeiro acesso em producao (quando o seed rodou com
 * a senha de exemplo) e o resgate quando a Camilla perde o acesso e o e-mail
 * de recuperacao tambem nao esta disponivel.
 */
async function run() {
  const [username, email, password] = process.argv.slice(2)

  if (!username || !email || !password) {
    console.error('Uso: npm run admin:reset -- <usuario> <email> <senha>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('A senha precisa ter ao menos 8 caracteres.')
    process.exit(1)
  }

  const sql = getDb()
  const hash = await bcrypt.hash(password, 12)

  const rows = await sql`
    INSERT INTO admin_users (username, password_hash, email)
    VALUES (${username}, ${hash}, ${email})
    ON CONFLICT (username)
    DO UPDATE SET password_hash = ${hash}, email = ${email}, updated_at = NOW()
    RETURNING id
  `

  // Derruba as sessoes abertas: se a senha foi trocada por perda de acesso,
  // quem estava logado no aparelho antigo precisa sair junto.
  await sql`DELETE FROM admin_sessions WHERE user_id = ${rows[0].id}`

  console.log(`[ok] senha de "${username}" atualizada e sessoes encerradas.`)
}

run().catch((err) => {
  console.error('Falha ao resetar a senha:', err)
  process.exit(1)
})
