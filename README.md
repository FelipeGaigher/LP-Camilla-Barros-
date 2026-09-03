# LP Dra. Camilla Barros

Landing page de consultório odontológico com CMS próprio, para a Camilla editar
textos, fotos e vídeos sozinha, sem mexer em código.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Front | React 19 + Vite | Mesmo padrão do Ibira e do Melton Sello |
| Roteamento | react-router-dom 7 | Site público + `/admin` no mesmo bundle |
| Animação | Motion (Framer Motion) + Lenis | Cards empilhados, reveals e scroll suave |
| Estilo | CSS puro com design tokens | Controle fino da tipografia editorial |
| API | Express 5 | Roda direto na VPS Hetzner, sem serverless |
| Banco | PostgreSQL via `postgres` | Tagged templates, mesma sintaxe do Neon |
| Uploads | Disco do servidor (`/uploads`) | Vídeo da Camilla não cabe em base64 no banco |

## Rodar local

```bash
cp .env.example .env      # preencha DATABASE_URL e ADMIN_PASSWORD
npm install
npm run migrate           # cria as tabelas
npm run seed              # cria o usuário admin e o conteúdo inicial
npm run dev:api           # API na 3001
npm run dev               # front na 5173, já com proxy para a API
```

Site em `http://localhost:5173`, painel em `http://localhost:5173/admin`.

## Build e produção

```bash
npm run build             # gera dist/
npm start                 # Express serve a API + o dist/ na mesma porta
```

Passo a passo completo da VPS em [`DEPLOY-VPS.md`](./DEPLOY-VPS.md).

## Estrutura

```
server.js                   Express: API + estáticos + fallback SPA
api/
  _lib/                     db, auth, rate limit, audit log
  routes/                   sections, auth, leads, media
scripts/
  migrate.js                runner de migrations
  seed.js                   admin inicial + conteúdo padrão
  migrations/               SQL versionado
client/
  index.html
  src/
    components/             seções do site público
    admin/
      schema.js             DEFINE O PAINEL INTEIRO
      SectionEditor.jsx     editor genérico, montado a partir do schema
      sections/             telas próprias (visibilidade, leads, conta)
    context/                SiteData (CMS) e Auth
    data/defaults.js        CONTEÚDO PADRÃO DE TODAS AS SEÇÕES
    pages/                  HomePage, AdminLogin, AdminPanel, NotFound
    styles/                 global.css (site) e admin.css (painel)
```

## Como o CMS funciona

Cada seção é uma linha em `site_sections`, com o conteúdo inteiro em JSONB.
O front carrega tudo de uma vez em `GET /api/sections` no boot, guarda no
`localStorage` como cache, e cai no `defaults.js` se a API estiver fora. Ou seja,
o site nunca aparece quebrado por causa do banco.

### Adicionar um campo novo ao painel

1. Acrescente a chave em `client/src/data/defaults.js`.
2. Declare o campo em `client/src/admin/schema.js`.
3. Use no componente via `useSiteData()`.

Não precisa escrever tela de admin: o `SectionEditor` monta a partir do schema.
Tipos disponíveis: `text`, `textarea`, `url`, `number`, `toggle`, `select`,
`image`, `video`, `stringlist`, `group`, `list`.

### Adicionar uma seção nova

Além dos 3 passos acima: registre no `SECTION_MAP` de `pages/HomePage.jsx`,
no `SIDEBAR` e no `SECTION_LABELS` do schema, e acrescente a chave em
`defaults.visibility` (incluindo o `order`).

Se a mudança quebrar a estrutura antiga, suba o `DATA_VERSION` em
`SiteDataContext.jsx` para invalidar o cache dos visitantes.

## Conformidade CFO

O rodapé traz nome completo, denominação profissional, CRO e responsável técnico.
Isso é exigência do Art. 43 da Resolução CFO 118/2012, não decoração: **não remova
esse bloco**. Os detalhes do que pode e não pode entrar no conteúdo estão em
[`PESQUISA.md`](./PESQUISA.md).

## Pendências

O conteúdo está com placeholders marcados `[PLACEHOLDER]`. A lista exata do que
falta pedir para a Camilla está em [`BRIEFING-CAMILLA.md`](./BRIEFING-CAMILLA.md).
