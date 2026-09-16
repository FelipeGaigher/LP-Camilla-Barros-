# LP Dra. Camilla Barros

Landing page de consultório odontológico com CMS próprio, para a Camilla editar
textos, fotos e vídeos sozinha, sem mexer em código.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Front | React 19 + Vite | Mesmo padrão do NovaES, Rara Calma e Automatiza |
| Roteamento | react-router-dom 7 | Site público + `/gestao` no mesmo bundle |
| Animação | Motion (Framer Motion) + Lenis | Cards empilhados, reveals e scroll suave |
| Estilo | CSS puro com design tokens | Controle fino da tipografia editorial |
| API | Funções serverless da Vercel | Sem servidor para manter; escala sozinho |
| Banco | Neon Postgres (`@neondatabase/serverless`) | Driver HTTP, sem pool para vazar entre invocações |
| Uploads | Vercel Blob, direto do navegador | O corpo de uma função para em 4,5 MB; o vídeo não |
| SEO | Prerender no build | Crawler e WhatsApp recebem HTML real, não `<div id="root">` |
| E-mail | Brevo (API v3, sem SDK) | Aviso de lead e recuperação de senha |

## Rodar local

```bash
cp .env.example .env.local   # preencha DATABASE_URL (Neon) e ADMIN_PASSWORD
npm install
npm run migrate              # cria as tabelas
npm run seed                 # cria o usuário admin e o conteúdo inicial
npm run dev:full             # API na 3000 + front na 5173
```

Site em `http://localhost:5173`, painel em `http://localhost:5173/gestao`.

`npm run dev:full` sobe um Express que varre `api/` e monta as rotas com os
mesmos handlers que a Vercel executa em produção — o código que você testa é
literalmente o que vai para o ar, sem depender do `vercel dev`.

## Build

```bash
npm run build     # vite build + bundle SSR + prerender + sitemap
```

Push em `main` faz deploy de produção; push em qualquer outra branch gera uma URL
de preview. Passo a passo em [`DEPLOY.md`](./DEPLOY.md).

## Estrutura

```
vercel.json                 build, rewrites e headers de segurança
api/                        uma função serverless por arquivo
  sections.js               GET (todas) · GET/PUT/DELETE ?key=
  auth.js                   ?action=login|logout|me|change-password
                            |forgot-password|reset-password
  leads.js                  POST público · GET/DELETE protegidos
  media.js                  emite o token de upload do Blob · lista · apaga
  _lib/                     db, auth, cookies, origin, rate limit, audit,
                            brevo, templates de e-mail, ensureAdmin, reset
scripts/
  dev-server.js             roda os handlers de api/ localmente
  migrate.js · seed.js      migrations e conteúdo inicial
  admin-reset-password.js   resgate de acesso pelo terminal
  prerender.js              HTML real da home + metas + JSON-LD
  generate-sitemap.js       sitemap.xml e robots.txt
client/
  index.html                metas OG que o prerender reescreve
  src/
    entry-server.jsx        entry usado só pelo prerender
    components/             seções do site público
    admin/
      schema.js             DEFINE O PAINEL INTEIRO
      SectionEditor.jsx     editor genérico, montado a partir do schema
      sections/             telas próprias (visibilidade, leads, conta)
    context/                SiteData (CMS) e Auth
    data/defaults.js        CONTEÚDO PADRÃO DE TODAS AS SEÇÕES
    lib/seo.js              metas e JSON-LD, usados no build e em runtime
    pages/                  HomePage, AdminLogin, AdminPanel, NotFound
    styles/                 global.css (site) e admin.css (painel)
```

### Por que quatro arquivos em `api/`

O plano Hobby da Vercel permite 12 funções serverless. Por isso o auth inteiro
mora em `api/auth.js` com `?action=`, em vez de seis arquivos — mesma convenção
do NovaES. Sobra folga para crescer.

## Como o CMS funciona

Duas formas de editar, com a mesma fonte de verdade:

**Inline, no próprio site.** Logada, a Camilla vê um botão "Editar o site" (ou
tecla `E`). Ligado, cada texto vira editável no lugar onde aparece e as fotos
viram botão de upload. As alterações ficam num buffer até ela clicar em Salvar
(`Ctrl+S`), e só então são agrupadas por seção e gravadas de uma vez, o que evita
uma requisição por tecla digitada. Sair da página sem salvar dispara aviso.

**Painel em `/gestao`, com prévia ao lado.** O editor fica à esquerda e o site de
verdade à direita, dentro de um iframe, renderizando o rascunho antes de gravar.
Como é um iframe, as media queries respondem à largura escolhida, então dá para
conferir o celular sem sair do painel. Clicar num texto da prévia abre a seção
certa e rola até o campo.

O padrão veio do NovaES (`EditModeContext`, `EditableText`, `IframePortal`), com
uma diferença: lá os rótulos de cada caminho são mantidos numa lista à mão; aqui
saem do próprio `schema.js` via `lib/pathLabels.js`, então campo novo já nasce com
rótulo e nada fica desatualizado sem ninguém perceber.

Desligar o inline: `VITE_ENABLE_INLINE_CMS=false` no build. Sobra o painel.

### Arquitetura de dados

Cada seção é uma linha em `site_sections`, com o conteúdo inteiro em JSONB.
O front carrega tudo de uma vez em `GET /api/sections` no boot, guarda no
`localStorage` como cache, e cai no `defaults.js` se a API estiver fora. Ou seja,
o site nunca aparece quebrado por causa do banco.

**Os GETs do CMS vão com `Cache-Control: no-store`, de propósito.** Com
`s-maxage`, o edge da Vercel servia cópia velha por até um minuto depois de um
save — a gravação persistia, mas a Camilla recarregava e via o texto antigo,
concluindo que o painel não salvou. O Neon responde em poucos ms; o custo de ler
direto é irrelevante perto do custo de desconfiar da ferramenta.

### SEO

`npm run build` roda três etapas depois do `vite build`: compila um bundle SSR,
lê um snapshot de `site_sections` no Neon e escreve a home já renderizada em
`dist/index.html`, com `<title>`, Open Graph e o JSON-LD de `schema.org/Dentist`.
O shell da SPA é preservado como `dist/app.html`, para onde o `vercel.json`
manda `/gestao` e as demais rotas.

As metas e o JSON-LD saem de `client/src/lib/seo.js` — a mesma função que o
`SeoHead` aplica em runtime. Uma definição só: se fossem duas, a do build
envelheceria calada.

Conteúdo editado no painel aparece na hora para quem visita (o React busca a API
na montagem), mas só entra no HTML estático no próximo deploy. Para o crawler ver
a edição, é preciso um novo build.

### Sessão

O token fica num cookie `HttpOnly; SameSite=Lax`, não no `sessionStorage`. O
JavaScript da página não lê nem escreve, então um XSS não leva a sessão embora —
e ela sobrevive ao fechar a aba, durando os 7 dias de `admin_sessions`.

Como o cookie viaja sozinho em qualquer requisição, incluindo as disparadas de
outro site, toda mutação passa por `checkOrigin()` (`api/_lib/origin.js`).
**Ao registrar o domínio final, acrescente-o à whitelist desse arquivo** — senão
as gravações do painel voltam 403 em produção.

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
