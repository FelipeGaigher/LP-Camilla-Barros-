# Deploy — Neon + Vercel

Sem servidor. O front vira estático na CDN da Vercel, a API vira quatro funções
serverless, o banco é Neon e os arquivos vão para o Vercel Blob.

---

## 1. Contas necessárias

| Serviço | Para quê | Plano |
|---|---|---|
| [Neon](https://console.neon.tech) | Banco Postgres | Free (0,5 GB) |
| [Vercel](https://vercel.com) | Hospedagem + funções | Hobby |
| Vercel Blob | Fotos e vídeo | Incluso no Hobby (1 GB) |
| [Brevo](https://app.brevo.com) | Aviso de lead e recuperação de senha | Free (300 e-mails/dia) |

Brevo é opcional para subir: sem a chave, o envio vira no-op e só registra no
log. O site funciona, mas ninguém é avisado quando cai um contato.

---

## 2. Banco no Neon

1. Crie um projeto. Região **AWS sa-east-1 (São Paulo)** — o site é local de
   Vitória, e cada query a mais de latência aparece no tempo de resposta.
2. Em **Connection Details**, copie a string **Pooled connection** (o host tem
   `-pooler` no meio). É ela que vai em `DATABASE_URL`.

---

## 3. Rodar local primeiro

Suba local antes de fazer deploy: é mais rápido descobrir aqui que a
`DATABASE_URL` está errada.

```bash
cp .env.example .env.local
# preencha pelo menos DATABASE_URL, ADMIN_PASSWORD e ADMIN_EMAIL

npm install
npm run migrate        # cria as tabelas
npm run seed           # cria o admin e semeia as 14 seções
npm run dev:full       # API na 3000 + front na 5173
```

Gere o segredo dos tokens de recuperação:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Abra `http://localhost:5173/gestao/login` e entre com `ADMIN_USER` e
`ADMIN_PASSWORD`.

---

## 4. Projeto na Vercel

1. **Add New > Project** e importe `FelipeGaigher/LP-Camilla-Barros-`.
2. Root Directory `./`, framework **Vite**. O `vercel.json` já define
   `buildCommand` e `outputDirectory` — não altere no painel.
3. Cole as variáveis de ambiente antes do primeiro deploy (tabela abaixo).
4. **Deploy**.

### Variáveis de ambiente

| Variável | Obrigatória | Observação |
|---|---|---|
| `DATABASE_URL` | Sim | String **pooled** do Neon |
| `BLOB_READ_WRITE_TOKEN` | Sim | Aparece sozinha ao conectar o Blob (passo 5) |
| `RESET_TOKEN_HMAC_SECRET` | Sim | **Gere uma nova**, diferente da de dev |
| `APP_URL` | Sim | URL pública; entra no link do e-mail de recuperação |
| `BREVO_API_KEY` | Não | Sem ela, nenhum e-mail sai |
| `BREVO_SENDER_EMAIL` | Não | Precisa ser de domínio autenticado no Brevo |
| `BREVO_SENDER_NAME` | Não | Nome que aparece no remetente |
| `CONTACT_EMAIL` | Não | Quem recebe o aviso de contato novo |
| `VITE_ENABLE_INLINE_CMS` | Não | `false` desliga a edição inline e deixa só o painel |

`ADMIN_USER` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` são lidos apenas pelo `seed`, que
roda da sua máquina. Não precisam existir na Vercel.

---

## 5. Vercel Blob

**Storage > Create Database > Blob**, conecte ao projeto. A Vercel injeta
`BLOB_READ_WRITE_TOKEN` nas variáveis de produção automaticamente.

Para desenvolver com upload local, copie esse token para o `.env.local`.

> O `onUploadCompleted` do Blob não dispara em `localhost` — a Vercel não alcança
> sua máquina. O upload funciona normalmente: quem recebe a URL final é o próprio
> navegador, não o callback.

---

## 6. Popular o banco de produção

Com a `DATABASE_URL` de produção no `.env.local`:

```bash
npm run migrate
npm run seed
npm run admin:reset -- camilla camilla@dominio.com.br UmaSenhaForte
```

O `admin:reset` troca a senha e derruba todas as sessões abertas. Use-o também
quando ela perder o acesso e o e-mail de recuperação não estiver disponível.

---

## 7. Domínio

1. **Settings > Domains**, adicione `dracamillabarros.com.br`.
2. No registrador: `A` para `76.76.21.21` e `CNAME` de `www` para
   `cname.vercel-dns.com`.
3. **Acrescente o domínio à whitelist em `api/_lib/origin.js`.** Sem isso, toda
   gravação do painel volta 403 em produção — o site aparece certo, mas nada
   salva. É o erro mais fácil de cometer neste deploy.
4. Atualize `APP_URL` na Vercel e o campo **URL do site** em `/gestao > SEO`
   (ele alimenta o canonical, o Open Graph e o sitemap).

---

## 8. Brevo

1. **SMTP & API > API Keys**, gere uma chave.
2. **Senders, Domains & Dedicated IPs**, autentique o domínio com SPF e DKIM.
   Sem isso o e-mail sai, mas cai em spam.
3. Teste: envie o formulário de contato no site e confira se o aviso chega.

---

## 9. Checklist antes de entregar

- [ ] Login funciona e o cookie aparece como `HttpOnly` no DevTools
- [ ] Editar um texto, salvar, dar `Ctrl+Shift+R` — o texto persiste
- [ ] Upload de foto e de um vídeo acima de 10 MB
- [ ] Formulário de contato: o lead aparece no painel **e** o e-mail chega
- [ ] "Esqueci minha senha" entrega o link e o link funciona
- [ ] Link do site colado no WhatsApp mostra título, descrição e imagem
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) valida o `Dentist`
- [ ] Rodapé com CRO e responsável técnico visível no HTML estático
      (`curl -s https://dominio | grep CRO`) — exigência do Art. 43 da
      Res. CFO 118/2012, precisa existir sem depender do JavaScript
- [ ] Senha do seed trocada por uma real

---

## Quando der errado

| Sintoma | Causa provável |
|---|---|
| 500 em qualquer `/api/*` | `DATABASE_URL` errada ou não é a string pooled |
| Site abre com o conteúdo padrão | `npm run seed` não rodou contra este banco |
| Login devolve 401 com a senha certa | Rode `npm run admin:reset` |
| Painel salva e volta 403 | Domínio fora da whitelist de `api/_lib/origin.js` |
| Save "some" depois do reload | Algum GET voltou a mandar `s-maxage`; tem que ser `no-store` |
| Upload falha com 401 | `BLOB_READ_WRITE_TOKEN` ausente ou sessão expirada |
| Nenhum e-mail chega | `BREVO_API_KEY` ou `CONTACT_EMAIL` vazios (o log avisa) |
| WhatsApp mostra link sem imagem | `ogImage` vazio em `/gestao > SEO`, ou faltou redeploy |
| Google vê a página vazia | O prerender falhou no build; procure `prerender:` no log |

O prerender nunca derruba o build de propósito: se ele falhar, o site vai ao ar
como SPA pura e só o SEO degrada. Por isso vale conferir o log de build quando o
HTML estático parecer vazio.

## Desenvolver sem encostar no banco de produção

O `.env.local` aponta para o Neon de produção. Rodar migration, seed ou teste
com ele é mexer no banco da Camilla — um `seed` distraído reverte conteúdo que
ela editou pelo painel.

O driver do Neon só fala o protocolo SQL-over-HTTP, então não dá para apontar
direto para um Postgres local: quem traduz é um proxy. Com `NEON_HTTP_PROXY`
definido, `db.js` redireciona para ele e o projeto inteiro (migrate, seed,
dev-server, prerender) passa a usar o banco local. Sem a variável nada muda, e
em produção ela não existe.

```bash
docker network create camilla-net

docker run -d --name lp-pg --network camilla-net \
  -e POSTGRES_PASSWORD=<uma senha qualquer> -e POSTGRES_DB=camilla \
  postgres:17-alpine

docker run -d --name lp-neon-proxy --network camilla-net -p 4444:4444 \
  -e PG_CONNECTION_STRING="postgres://postgres:<a mesma senha>@lp-pg:5432/camilla" \
  ghcr.io/timowilhelm/local-neon-http-proxy:main
```

Depois, em cada terminal onde for rodar algo do projeto:

```bash
export DATABASE_URL="postgres://postgres:<a mesma senha>@localhost:4444/camilla"
export NEON_HTTP_PROXY="http://localhost:4444/sql"

npm run migrate && npm run seed && npm run dev:full
```

Exportar no shell é de propósito: o `dotenv` não sobrescreve variável que já
existe, então o `.env.local` de produção é ignorado enquanto a sessão durar.
**Não** grave isso no `.env.local` — na próxima vez que você esquecer de
desfazer, o deploy sai apontando para um Postgres em `localhost`.

O `npm run test:db` não precisa de nada disso: ele sobe e derruba o próprio
container.
