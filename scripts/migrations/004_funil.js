import { IDS_ESTAGIOS } from '../../api/_lib/funil.js'
import { normalizaTelefone } from '../../api/_lib/telefone.js'

export const name = '004_funil'

/**
 * Funil da paciente — o kanban do CRM.
 *
 * A coluna `situacao` deixa de ser um rotulo solto (ativa/manutencao/inativa) e
 * passa a ser o estagio do relacionamento. E o card do kanban que anda por ela.
 *
 * A decisao que molda esta migration: **o lead NAO vira paciente sozinho**.
 *
 * O formulario do site e publico e sem autenticacao. Se o lead virasse linha em
 * `pacientes`, um desconhecido — ou um bot — estaria escrevendo na tabela de
 * dado de saude, que e justamente o que a modelagem da 003 evitou. Entao a
 * primeira coluna do kanban e uma UNIAO: leads ainda nao promovidos aparecem
 * como card sem existirem em `pacientes`, e so viram paciente quando a Camilla
 * arrasta o card ou confirma um horario — acao autenticada, dela.
 *
 * `leads.paciente_id` marca o lead ja promovido, pra ele sair da primeira
 * coluna sem apagar nada nem duplicar a pessoa.
 */

// A lista vai escrita a mao no CHECK, e nao derivada de funil.js, de proposito:
// migration e registro historico e nao pode mudar de comportamento porque
// alguem editou o codigo depois. A trava abaixo garante que as duas nao
// divirjam em silencio — quem acrescentar um estagio tem que escrever uma 005.
const ESTAGIOS_DESTA_MIGRATION = [
  'contato', 'avaliacao', 'orcamento', 'tratamento', 'manutencao', 'inativa',
]

export async function up(sql) {
  if (JSON.stringify(IDS_ESTAGIOS) !== JSON.stringify(ESTAGIOS_DESTA_MIGRATION)) {
    throw new Error(
      'Os estagios de api/_lib/funil.js nao batem com os desta migration. ' +
        'Estagio novo pede uma migration nova (005), nao editar esta.'
    )
  }

  // ------------------------------------------------- estagios em pacientes
  // O CHECK antigo sai antes dos dados mudarem, senao o UPDATE bate nele.
  await sql`ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS chk_situacao`

  // 'ativa' virou generico demais: quem estava ativa estava, na pratica, em
  // tratamento.
  await sql`UPDATE pacientes SET situacao = 'tratamento' WHERE situacao = 'ativa'`

  await sql`ALTER TABLE pacientes ALTER COLUMN situacao SET DEFAULT 'contato'`
  await sql`
    ALTER TABLE pacientes ADD CONSTRAINT chk_situacao CHECK (
      situacao IN ('contato','avaliacao','orcamento','tratamento','manutencao','inativa')
    )
  `

  // Quando o card entrou no estagio atual. E disso que sai o "parado ha 5 dias"
  // e o alerta de card esquecido — sem essa coluna o kanban nao consegue
  // apontar o que precisa de atencao, que e a unica razao dele existir.
  await sql`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS situacao_em TIMESTAMPTZ DEFAULT NOW()`
  await sql`UPDATE pacientes SET situacao_em = criado_em WHERE situacao_em IS NULL`

  // Ordem dentro da coluna, pra priorizar arrastando na vertical.
  await sql`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ordem_funil INTEGER NOT NULL DEFAULT 0`

  await sql`
    CREATE INDEX IF NOT EXISTS idx_pacientes_funil
      ON pacientes (situacao, ordem_funil, situacao_em)
  `

  // -------------------------------------------------------- lead promovido
  await sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS paciente_id INTEGER
      REFERENCES pacientes(id) ON DELETE SET NULL
  `
  // Arquivar sem apagar: spam e engano somem do kanban mas continuam
  // auditaveis. O botao de apagar de vez continua existindo.
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ`
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefone_key VARCHAR(20)`

  await sql`
    CREATE INDEX IF NOT EXISTS idx_leads_pendentes
      ON leads (created_at DESC) WHERE paciente_id IS NULL AND arquivado_em IS NULL
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_telkey ON leads (telefone_key)`

  // Backfill do telefone normalizado. Em JS, e nao em SQL, porque normalizar
  // aqui e acrescentar o DDI 55 que a pessoa nao digitou — regexp_replace sabe
  // remover caractere, nao completar numero.
  const semChave = await sql`
    SELECT id, phone FROM leads WHERE telefone_key IS NULL AND phone IS NOT NULL
  `
  for (const lead of semChave) {
    const chave = normalizaTelefone(lead.phone)
    if (chave) await sql`UPDATE leads SET telefone_key = ${chave} WHERE id = ${lead.id}`
  }

  // --------------------------------------------------- historico do estagio
  // Quanto tempo o funil leva de contato a tratamento e a pergunta que vem
  // depois de tres meses de uso. Sem registrar a passagem a resposta se perde:
  // `pacientes` so guarda o estado atual.
  await sql`
    CREATE TABLE IF NOT EXISTS funil_eventos (
      id          SERIAL PRIMARY KEY,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
      de          VARCHAR(20),
      para        VARCHAR(20) NOT NULL,
      user_id     INTEGER,
      criado_em   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_funil_paciente
      ON funil_eventos (paciente_id, criado_em DESC)
  `
}
