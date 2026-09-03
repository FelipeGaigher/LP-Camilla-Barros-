# Deploy na VPS Hetzner

Mesmo fluxo do Ibira, adaptado: aqui a API é Express nativo (não serverless) e o
PostgreSQL roda na própria máquina, sem Neon.

Assume Ubuntu 22.04+ com Node 20, Nginx e PM2 já instalados. Se for uma VPS nova,
o guia do Ibira cobre os passos 1 a 3 (usuário, SSH, firewall, Node, Nginx, PM2).

---

## 1. PostgreSQL no servidor

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Dentro do psql:

```sql
CREATE DATABASE camilla_odonto;
CREATE USER camilla WITH ENCRYPTED PASSWORD 'senha-forte-aqui';
GRANT ALL PRIVILEGES ON DATABASE camilla_odonto TO camilla;
\c camilla_odonto
GRANT ALL ON SCHEMA public TO camilla;
\q
```

## 2. Clonar e configurar

```bash
cd ~/apps
git clone https://github.com/FelipeGaigher/LP-Camilla-Barros-.git camilla
cd camilla
npm ci
cp .env.example .env
nano .env
```

No `.env`:

```
DATABASE_URL=postgres://camilla:senha-forte-aqui@localhost:5432/camilla_odonto
PORT=3001
ADMIN_USER=camilla
ADMIN_PASSWORD=uma-senha-provisoria-forte
NODE_ENV=production
```

## 3. Banco e conteúdo inicial

```bash
npm run migrate
npm run seed
npm run migrate:status   # confere se tudo aplicou
```

O seed só insere seções que ainda não existem, então pode rodar de novo sem medo
de sobrescrever o que a Camilla já editou.

## 4. Build e subir com PM2

```bash
npm run build
pm2 start server.js --name camilla
pm2 save
pm2 startup            # copie e rode o comando que ele imprimir
```

Testar: `curl http://localhost:3001/api/health`

## 5. Nginx

```bash
sudo nano /etc/nginx/sites-available/camilla
```

```nginx
server {
    listen 80;
    server_name dracamillabarros.com.br www.dracamillabarros.com.br;

    # Upload de vídeo pelo painel
    client_max_body_size 200M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/camilla /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

O `client_max_body_size 200M` não é opcional: sem ele o Nginx corta o upload do
vídeo com 413 antes de chegar no Express.

## 6. SSL

```bash
sudo certbot --nginx -d dracamillabarros.com.br -d www.dracamillabarros.com.br
```

## 7. Primeira coisa a fazer depois de publicar

Entrar em `/admin/login` com o usuário e senha do `.env`, ir em **Minha conta** e
trocar a senha. A senha do `.env` fica em texto puro no servidor.

---

## Atualizar o site depois

```bash
cd ~/apps/camilla
git pull
npm ci
npm run migrate     # se houver migration nova
npm run build
pm2 restart camilla
```

O conteúdo editado pela Camilla vive no banco, não no código. Deploy não sobrescreve
o que ela escreveu.

## Backup

O que precisa de backup é o banco e a pasta `uploads/`.

```bash
# Banco
pg_dump -U camilla camilla_odonto > ~/backups/camilla-$(date +%F).sql

# Arquivos
tar czf ~/backups/camilla-uploads-$(date +%F).tar.gz -C ~/apps/camilla uploads
```

Vale colocar num cron diário:

```bash
crontab -e
# 0 3 * * * pg_dump -U camilla camilla_odonto > ~/backups/camilla-$(date +\%F).sql
```

## Diagnóstico rápido

| Sintoma | Provável causa |
|---|---|
| Site carrega mas todo o conteúdo é placeholder | API fora ou `DATABASE_URL` errada. Ver `pm2 logs camilla`. |
| Painel não salva | Sessão expirada (7 dias). Sair e entrar de novo. |
| Upload de vídeo dá erro 413 | Falta `client_max_body_size` no Nginx. |
| Upload dá 415 | Formato não permitido. Aceita jpg, png, webp, avif, svg, mp4, webm, mov, pdf. |
| 404 ao recarregar `/admin` | O fallback SPA do Express não está ativo, confira se `dist/` existe. |
| "Muitas tentativas" no login | Rate limit de 6 erros em 15 minutos, por IP. Só esperar. |
