# Laudo de fluxos, 17/09/2026

Auditoria do código, teste dos endpoints públicos em produção e leitura do
banco. Itens marcados **[ok]** foram resolvidos nesta sessão.

## Testado de verdade

| Teste | Resultado |
|---|---|
| `GET /api/sections` | 200, lendo do Neon |
| `GET ?action=dias` | `{"ok":true,"aberto":false,"dias":[]}` |
| `GET ?action=procedimentos` | 200, 6 procedimentos públicos |
| HTML de produção | baixado e inspecionado |
| Âncoras da página renderizada | varridas uma a uma |
| Banco: config, horários, procedimentos, leads | lidos |
| `POST /api/leads` | não disparado. Criaria registro e e-mail reais. Prova indireta: o lead `#9` ("teste", 16/09) está gravado, então formulário, API e Neon funcionam |
| `POST ?action=solicitar` | não disparado, mesmo motivo |

## Crítico

**1. `[PLACEHOLDER]` visível ao público [ok]**
Hero, Sobre, rodapé e 6 das 7 respostas do FAQ. Restam dois, ambos dependentes
dela: ano de formatura e CRO.

**2. Site inteiro sem acentuação [ok]**
Incluía o cargo escrito `Cirurgia-Dentista`. O correto é `Cirurgiã-Dentista`.

**3. CRO falso com cara de verdadeiro**
`credenciais.cro` está como `CRO-ES 00000`, sem o prefixo `[PLACEHOLDER]`. Isso
é pior que o placeholder: passa por registro real. Aparece no cartão sobre a
foto do hero. O Art. 43 da CFO 118/2012 exige CRO na publicidade. O número real
nunca foi informado.

**4. Agendamento fechado, e a grade é chute do sistema**
`agenda_config.publico_ativo = false`, então o seletor de horário some do site.
O pipeline está pronto: constraint GiST antisobreposição, três camadas de rate
limit, honeypot, revalidação no servidor, e-mail. Tudo inacessível.

Ligar não é seguro. A grade (seg a sex, 08:00 às 12:00 e 14:00 às 18:00) é byte
a byte o padrão semeado por `scripts/migrations/003_agenda.js:260-266`, que
existe só pra tela de config não nascer vazia. Ligar hoje publicaria horário que
o sistema inventou. Rodar `node scripts/diagnostico-agenda.js` reproduz isso.

**5. WhatsApp com DDD de Tocantins**
`5563999827704`. DDD 63 é Araguaína/TO, o consultório é em Vitória (27). Alimenta
o botão flutuante, o CTA do Contato, o fallback do rodapé e o `telephone` do
JSON-LD, que é o telefone que o Google indexa.

**6. HTML estático dessincronizado do banco**
O HTML servido contém vídeo, consultório e depoimentos. As três estão desligadas
no banco. O prerender só regenera no deploy, e elas foram desligadas depois do
último build. O crawler indexa os três placeholders de depoimento. Deploy novo
resolve, mas o descompasso volta toda vez que ela mexer na visibilidade.

## Alto

**7. Link "Consultório" morto em três lugares, agora**
Varri as âncoras da página em produção:

```
quebrados: [ { href: "#consultorio", alvoExiste: false,
               ondeAparece: "nav, header, footer" } ]
ok:        [ "#top", "#tratamentos", "#sintomas", "#sobre", "#faq", "#contato" ]
```

Sem a seção na página, `scrollToAnchor` retorna `false`, `irPara` não chama
`preventDefault` e nada acontece. Não há validação entre `visibility` e os
`href`. Desligar "Contato" quebraria seis CTAs de uma vez, no mesmo silêncio.

Saída mais rápida: religar o Consultório, já que a copy dele agora está limpa.
Custo: as 4 fotos da galeria não existem e virariam hachura cinza. Alternativa é
tirar o link do menu até as fotos entrarem.

**8. Tela "Contatos recebidos" é órfã**
`LeadsPanel.jsx`, 94 linhas com exportação CSV, não está no `SIDEBAR` nem no
mapa `CUSTOM`. Zero imports. E o `CMS-GUIA.md:83-85` documenta essa tela pra
Camilla. Ela vai procurar e não vai achar.

**9. "Editar o que foi feito" apaga prontuário**
O formulário nasce vazio (`DetalheAgendamento.jsx:37`) e envia só 3 campos. O
UPDATE grava `NULL` em `observacoes` e `retorno_semanas`. Reabrir e salvar
destrói o registro anterior.

**10. Sem tela de férias e feriado**
API completa, tabela criada, gerador de slots já respeita bloqueio, três
clientes escritos em `agendaApi.js:112-122`. Nenhum componente importa. Só dá
pra bloquear escrevendo no banco na mão.

**11. Instagram, Google e mapa não renderizam**
Vazios no banco: `footer.social.instagram` (o site não tem rede social nenhuma),
`depoimentos.googleUrl`, `footer.endereco.mapsEmbed`. O `mapsLink` do "Como
chegar" funciona.

## Médio

| # | Achado |
|---|---|
| 12 | `procedimentoId` nunca é enviado. Todo pedido vira "Avaliação, 60min". Os 6 procedimentos do banco têm exatamente os mesmos nomes das 6 opções do select. Ao ligar, casar por **id**, nunca por texto: a copy nova acentuou os rótulos e o banco não |
| 13 | `interest` é perdido quando escolhe horário. `enviarPedido()` não grava lead |
| 14 | `RESET_TOKEN_HMAC_SECRET` cai em fallback hardcoded com só um `console.warn`. Se a env sumir, tokens de reset viram forjáveis |
| 15 | `www` responde 200 sem redirect. Conteúdo duplicado. Resolve no painel da Vercel com 308 |
| 16 | `wa.me` sem DDI em 4 telas do painel. Existe `linkWhatsApp()` correto em `telefone.js:53-58` com zero usos |

## Baixo

Upload aceita `.mov`, que Chrome e Firefox não tocam. `footer.legal.*` não
renderiza, decisão do Art. 43 ainda em aberto. Ícone de WhatsApp do hero depende
de `href.includes('wa.me')`. `catch {}` em `auth.js:82` deixa o logout funcionar
com sessão viva no banco. `ensureAdmin` roda 10 DDLs em todo cold start.

## Fora de fluxo

As fotos dos 4 cards de Tratamentos são arquivos `Gemini_Generated_Image_*` no
Blob, geradas por IA. O `BRIEFING-CAMILLA.md` diz o contrário: *"Nada de banco
de imagens: foto genérica de sorriso é o marcador número um de site comum."* Se
a queixa é o site parecer genérico, a imagem pesa tanto quanto o texto.

## Pendências com a Camilla

Todas já estavam no `BRIEFING-CAMILLA.md` e nunca voltaram.

1. CRO real, obrigatório pelo Art. 43
2. Confirmar o número de WhatsApp
3. Horário real de atendimento, por dia, e se atende sábado
4. Ano de formatura
5. Instagram
6. Convênio, ou particular com nota pra reembolso
7. Estacionamento no Master Tower
8. Precisa levar exame
9. Três depoimentos reais com autorização
10. Aprovar o "Sobre", principalmente o terceiro parágrafo
11. Fotos reais do consultório e dela
