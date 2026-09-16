export const name = '003_agenda'

/**
 * Agenda e ficha leve de paciente.
 *
 * Aditiva do comeco ao fim: nenhum DROP, nenhum ALTER de tipo. Da pra rodar com
 * o site no ar, e o codigo antigo simplesmente ignora as tabelas novas. E por
 * isso que a ordem correta em producao e migrar primeiro e so depois publicar.
 *
 * Escopo: isto NAO e prontuario eletronico. Guarda o que a Camilla anotaria num
 * caderno — quem e, o que foi feito, o que vem depois. Prontuario exigiria
 * certificacao SBIS/CFM (NGS2, assinatura ICP-Brasil) e mudaria a guarda para
 * permanente.
 *
 * Duas decisoes de modelagem que valem explicacao:
 *
 * 1. A configuracao mora aqui, e nao em site_sections, porque site_sections e
 *    publica: GET /api/sections responde sem autenticacao e o prerender injeta
 *    a tabela inteira no HTML estatico da home. Grade de expediente ate poderia
 *    ser publica; "a Camilla viaja de 10 a 20 de janeiro" nao pode.
 *
 * 2. `fim` e coluna real, nao calculada. `timestamptz + interval` e STABLE, nao
 *    IMMUTABLE, entao o Postgres recusa a expressao numa coluna gerada. Ja
 *    tstzrange(tstz, tstz, text) e imutavel, e por isso `periodo` pode ser
 *    gerada a partir de inicio e fim.
 */
export async function up(sql) {
  // ------------------------------------------------------------ configuracao
  // Singleton: o CHECK(id=1) impede uma segunda linha de configuracao aparecer
  // e o resto do codigo ter que escolher qual vale.
  await sql`
    CREATE TABLE IF NOT EXISTS agenda_config (
      id                   SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      publico_ativo        BOOLEAN  NOT NULL DEFAULT FALSE,
      grade_min            SMALLINT NOT NULL DEFAULT 30  CHECK (grade_min BETWEEN 5 AND 120),
      buffer_min           SMALLINT NOT NULL DEFAULT 0   CHECK (buffer_min BETWEEN 0 AND 120),
      antecedencia_horas   SMALLINT NOT NULL DEFAULT 12  CHECK (antecedencia_horas BETWEEN 0 AND 720),
      janela_dias          SMALLINT NOT NULL DEFAULT 45  CHECK (janela_dias BETWEEN 1 AND 180),
      hold_horas           SMALLINT NOT NULL DEFAULT 48  CHECK (hold_horas BETWEEN 1 AND 336),
      max_pendentes_dia    SMALLINT NOT NULL DEFAULT 6   CHECK (max_pendentes_dia BETWEEN 1 AND 50),
      consentimento_versao VARCHAR(20) NOT NULL DEFAULT 'v1',
      atualizado_em        TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // publico_ativo nasce FALSE de proposito: a migration chega em producao antes
  // de a Camilla cadastrar a grade, e a pagina publica nao pode oferecer
  // horario as 3 da manha enquanto isso.
  await sql`INSERT INTO agenda_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`

  // -------------------------------------------------------- grade da semana
  // Minutos desde 00:00 em Brasilia, nao TIME: mata a duvida "em que fuso esta
  // este TIME", compara com < e casa direto com brtParts().minutosDoDia.
  // Turno partido sao duas linhas; o almoco e a lacuna entre elas.
  await sql`
    CREATE TABLE IF NOT EXISTS agenda_horarios (
      id         SERIAL PRIMARY KEY,
      dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
      abre_min   SMALLINT NOT NULL CHECK (abre_min  BETWEEN 0 AND 1440),
      fecha_min  SMALLINT NOT NULL CHECK (fecha_min BETWEEN 0 AND 1440),
      ativo      BOOLEAN NOT NULL DEFAULT TRUE,
      CONSTRAINT chk_faixa CHECK (fecha_min > abre_min)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_horarios_dia ON agenda_horarios (dia_semana)`

  // ---------------------------------------------------- catalogo e duracao
  // A duracao mora no procedimento porque o servidor precisa dela no momento da
  // escrita, pra calcular o fim. `publico` separa o que a paciente pode pedir
  // pelo site do que so a Camilla agenda (retorno, urgencia, encaixe).
  await sql`
    CREATE TABLE IF NOT EXISTS agenda_procedimentos (
      id          SERIAL PRIMARY KEY,
      nome        VARCHAR(120) NOT NULL,
      duracao_min INTEGER NOT NULL CHECK (duracao_min BETWEEN 10 AND 480),
      publico     BOOLEAN NOT NULL DEFAULT TRUE,
      ordem       INTEGER NOT NULL DEFAULT 0,
      ativo       BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em   TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // ------------------------------------------------------------- bloqueios
  // Um conceito so: um intervalo [inicio, fim). Feriado, ferias, congresso e
  // "saio as 14h na quinta" sao todos a mesma linha. Sem motor de recorrencia.
  // Bloqueio sobrepondo bloqueio e inofensivo (semantica de uniao), entao aqui
  // nao entra EXCLUDE.
  await sql`
    CREATE TABLE IF NOT EXISTS agenda_bloqueios (
      id        SERIAL PRIMARY KEY,
      inicio    TIMESTAMPTZ NOT NULL,
      fim       TIMESTAMPTZ NOT NULL,
      motivo    VARCHAR(160),
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_bloqueio CHECK (fim > inicio)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bloqueios_inicio ON agenda_bloqueios (inicio)`

  // ------------------------------------------------------------- pacientes
  // telefone_key e o telefone so com digitos, normalizado com DDI, gravado pela
  // API (regexp no banco nao sabe acrescentar o 55 que falta). E a chave de
  // deduplicacao. Indice unico parcial: sem telefone, sem dedupe, e tudo bem.
  await sql`
    CREATE TABLE IF NOT EXISTS pacientes (
      id                   SERIAL PRIMARY KEY,
      nome                 VARCHAR(160) NOT NULL,
      telefone             VARCHAR(40),
      telefone_key         VARCHAR(20),
      email                VARCHAR(200),
      nascimento           DATE,
      origem               VARCHAR(60),
      indicado_por         VARCHAR(160),
      bairro               VARCHAR(120),
      cidade               VARCHAR(120),
      contato_pref         VARCHAR(120),
      alerta               TEXT,
      observacoes          TEXT,
      situacao             VARCHAR(20) NOT NULL DEFAULT 'ativa',
      consentimento_em     TIMESTAMPTZ,
      consentimento_versao VARCHAR(20),
      consentimento_origem VARCHAR(20),
      ativo                BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em            TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em        TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_situacao CHECK (situacao IN ('ativa','manutencao','inativa'))
    )
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_tel
      ON pacientes (telefone_key) WHERE telefone_key IS NOT NULL
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes (lower(nome))`

  // ---------------------------------------------------------- agendamentos
  // Os campos solicitante_* guardam quem pediu antes de virar paciente. O
  // pedido publico nasce com paciente_id NULL: deixar um desconhecido escrever
  // na tabela de dado de saude e ruim pra LGPD, e decidir "esta Maria e a mesma
  // Maria de 2024?" e trabalho humano, nao ON CONFLICT cego.
  //
  // Nao existe coluna de duracao: fim - inicio E a duracao congelada. Uma
  // coluna a mais so serviria pra divergir.
  await sql`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id                     SERIAL PRIMARY KEY,
      paciente_id            INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
      procedimento_id        INTEGER REFERENCES agenda_procedimentos(id) ON DELETE SET NULL,
      procedimento_nome      VARCHAR(120),
      inicio                 TIMESTAMPTZ NOT NULL,
      fim                    TIMESTAMPTZ NOT NULL,
      periodo                TSTZRANGE GENERATED ALWAYS AS (tstzrange(inicio, fim, '[)')) STORED,
      status                 VARCHAR(20) NOT NULL DEFAULT 'pendente',
      origem                 VARCHAR(20) NOT NULL DEFAULT 'site',
      solicitante_nome       VARCHAR(160),
      solicitante_telefone   VARCHAR(40),
      solicitante_tel_key    VARCHAR(20),
      solicitante_email      VARCHAR(200),
      solicitante_mensagem   TEXT,
      primeira_consulta      BOOLEAN,
      consentimento_em       TIMESTAMPTZ,
      consentimento_versao   VARCHAR(20),
      procedimento_realizado TEXT,
      regiao                 VARCHAR(120),
      proximos_passos        TEXT,
      observacoes            TEXT,
      retorno_semanas        INTEGER,
      cancelado_motivo       VARCHAR(200),
      expira_em              TIMESTAMPTZ,
      confirmado_em          TIMESTAMPTZ,
      criado_por             INTEGER,
      criado_em              TIMESTAMPTZ DEFAULT NOW(),
      atualizado_em          TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_periodo CHECK (fim > inicio),
      CONSTRAINT chk_status CHECK (
        status IN ('pendente','confirmado','cancelado','expirado','realizado','faltou')
      ),
      CONSTRAINT chk_origem CHECK (origem IN ('site','painel'))
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_agend_inicio ON agendamentos (inicio)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agend_status ON agendamentos (status, inicio)`
  await sql`CREATE INDEX IF NOT EXISTS idx_agend_pac ON agendamentos (paciente_id, inicio DESC)`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_agend_telkey
      ON agendamentos (solicitante_tel_key, criado_em DESC)
  `

  // Duplo agendamento morre no banco, nao no if do handler. Checar-antes-de-
  // inserir e TOCTOU por definicao, e com o driver HTTP do Neon nem seria
  // possivel: sql.transaction() nao e interativa, nao da pra ler o resultado de
  // uma statement pra decidir a proxima. A constraint decide sozinha, atomica.
  //
  // btree_gist nao e necessario: o unico operando e um tstzrange, e o GiST tem
  // opclass nativa pra range. A extensao so entraria com uma coluna escalar na
  // exclusao (cadeira_id WITH =), ou seja, no dia da segunda cadeira.
  //
  // ADD CONSTRAINT nao aceita IF NOT EXISTS, entao a checagem e aqui em JS.
  const jaExiste = await sql`
    SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_sem_sobreposicao'
  `
  if (jaExiste.length === 0) {
    await sql`
      ALTER TABLE agendamentos
        ADD CONSTRAINT agendamentos_sem_sobreposicao
        EXCLUDE USING gist (periodo WITH &&)
        WHERE (status IN ('pendente','confirmado','realizado'))
    `
  }

  // ------------------------------------------------------ trilha de acesso
  // Separada de audit_log de proposito. Primeiro porque log de LEITURA cresce
  // muito mais rapido que log de escrita e precisa de retencao propria.
  // Segundo, e mais importante: audit_log guarda old_data JSONB, entao apagar
  // um paciente por la deixaria uma copia integral do dado de saude num lugar
  // que ninguem lembra que existe. Aqui nao ha payload — so quem, quando, qual
  // id e qual acao.
  await sql`
    CREATE TABLE IF NOT EXISTS acesso_log (
      id         SERIAL PRIMARY KEY,
      recurso    VARCHAR(30) NOT NULL,
      recurso_id INTEGER,
      acao       VARCHAR(20) NOT NULL,
      user_id    INTEGER,
      username   VARCHAR(100),
      ip         VARCHAR(45),
      criado_em  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_acesso_criado ON acesso_log (criado_em DESC)`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_acesso_recurso
      ON acesso_log (recurso, recurso_id, criado_em DESC)
  `

  // --------------------------------------------------------------- semente
  // Procedimentos derivados de contato.interesses e da secao de tratamentos do
  // site. As duracoes sao ponto de partida — a Camilla ajusta no painel, que e
  // onde ela sabe quanto cada coisa leva na cadeira dela.
  const procedimentos = [
    ['Avaliacao', 60, true, 1],
    ['Lentes em porcelana ou resina', 90, true, 2],
    ['Clareamento', 60, true, 3],
    ['Limpeza, raspagem ou restauracao', 60, true, 4],
    ['Gengivoplastia', 60, true, 5],
    ['Placa para bruxismo', 45, true, 6],
    ['Retorno', 30, false, 7],
    ['Urgencia', 30, false, 8],
  ]
  for (const [nome, duracao, publico, ordem] of procedimentos) {
    await sql`
      INSERT INTO agenda_procedimentos (nome, duracao_min, publico, ordem)
      SELECT ${nome}, ${duracao}, ${publico}, ${ordem}
      WHERE NOT EXISTS (SELECT 1 FROM agenda_procedimentos WHERE nome = ${nome})
    `
  }

  // Grade inicial de segunda a sexta, manha e tarde. E chute: o rodape do site
  // ainda esta com [PLACEHOLDER] no horario. Serve pra tela de configuracao
  // nascer com algo pra editar em vez de vazia, e nao vaza pra lugar nenhum
  // enquanto publico_ativo for FALSE.
  const temGrade = await sql`SELECT 1 FROM agenda_horarios LIMIT 1`
  if (temGrade.length === 0) {
    for (let dia = 1; dia <= 5; dia += 1) {
      await sql`INSERT INTO agenda_horarios (dia_semana, abre_min, fecha_min) VALUES (${dia}, 480, 720)`
      await sql`INSERT INTO agenda_horarios (dia_semana, abre_min, fecha_min) VALUES (${dia}, 840, 1080)`
    }
  }
}
