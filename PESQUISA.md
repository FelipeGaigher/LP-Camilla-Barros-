# Pesquisa e decisões de projeto

Levantamento feito antes de escrever a primeira linha de código, em três frentes:
concorrência no Espírito Santo, referências de design internacional, e as regras
de publicidade do Conselho Federal de Odontologia.

---

## 1. O que o mercado do ES está fazendo

Analisamos 9 sites de dentistas no ES (Vitória, Vila Velha, Cachoeiro) e 6
clínicas premium em SP, RJ, Curitiba e BH.

### O padrão que se repete em quase todos

1. WhatsApp é o CTA universal, presente em 15 de 15. Formulário aparece em menos
   da metade e sempre como secundário.
2. Sequência idêntica: hero genérico, cards de tratamento, "sobre nós", prova
   social, localização, rodapé.
3. Headlines vazias: "excelência", "atendimento humanizado", "seu sorriso em
   equilíbrio". Quase ninguém nomeia a dor do paciente.
4. Paleta convergente: branco com azul-saúde, ou branco com bege/preto/dourado no
   segmento premium.
5. SEO local básico bem feito: cidade no título, endereço no rodapé, mapa embutido.
   É o item mais consistente do mercado.
6. **Compliance frouxa e generalizada**: dos 15 sites, apenas 5 exibem o CRO com
   clareza. Responsável técnico nomeado, só 1.

### Onde dá pra ganhar

| Oportunidade | Quantos concorrentes fazem | Já está no projeto |
|---|---|---|
| CRO e responsável técnico visíveis no rodapé | 1 de 15 | Sim, é obrigatório e virou seção |
| FAQ tratando objeção real (dói? convênio? estacionamento?) | 3 de 15 | Sim, seção dedicada |
| Schema.org LocalBusiness/Dentist | 0 no ES | Sim, gerado do painel |
| Vídeo do próprio dentista | 1 de 15 | Sim, seção dedicada |
| WhatsApp com mensagem pré-preenchida | 1 de 15 | Sim, editável no painel |
| Processo do tratamento explicado em etapas | 1 de 15 | Parcial, cabe no card |
| Site que renderiza rápido, sem depender de JS pesado | Poucos | Sim, bundle enxuto |
| LP por tratamento cruzada com bairro | 0 no ES | Fase 2, ver abaixo |

Os concorrentes diretos mais bem resolvidos, para acompanhar: Carminate
Odontologia (melhor estrutura do ES, mas zero prova social) e Renove Odontologia
(melhor headline). No Brasil, a Clínica KI de Curitiba é a melhor referência de
design do segmento.

### Números do funil, para calibrar expectativa

- 60 a 75% das primeiras consultas nascem de busca local (Google Meu Negócio).
  O perfil no Google pesa mais que o site.
- Resposta no WhatsApp em menos de 2 minutos leva a conversão de contato para
  agendamento de 10-15% para 25-35%. É o maior gargalo do funil.
- Custo por paciente agendado saudável: R$ 40 a 120. Acima de R$ 200, o funil
  está furado.
- No-show fica em 5-10% com confirmação ativa, 15-30% sem.

---

## 2. Direção visual

Referências principais: Antara Spa (paleta sálvia), Asterie Clinic (contenção como
luxo), MINEMAL Dental (tratamentos como lista tipográfica), Aesthetics Clinic
Genebra (três cores só), e os templates Framer Enamel e Oralux para estrutura.

### O receituário aplicado aqui

**Cor.** Regra dos três tons: off-white `#FAF7F2` de base, charcoal `#1A1A1A` no
texto, sálvia `#4A5D4E` como único acento. Nada de branco puro (lê como documento)
e nada de azul-ciano genérico de odontologia. O acento só aparece no que é
clicável; no momento em que ele vira fundo de seção, o luxo evapora.

**Tipografia.** Instrument Serif nos títulos, Inter no corpo. Itálico como ênfase
na segunda linha do título. Etiquetas em caixa alta, 11px, tracking largo.

**Espaço.** 120 a 180px de respiro vertical entre seções no desktop. É o item que
mais separa premium de comum e o mais fácil de errar para menos.

**Movimento.** Menos, mais lento e mais suave. Reveals de 0.8s com easeOutCubic,
deslocamento de 28px, sempre uma única vez. Lenis no scroll. Zero bounce.

**Textura.** Grão a 3.5% de opacidade em multiply. Perceptível de relance,
invisível de perto.

### Animações implementadas

| Efeito | Onde | Como |
|---|---|---|
| Cards empilhados no scroll | Tratamentos | `position: sticky` + `useScroll`/`useTransform` de scale. Sem pinning por JS. |
| Parallax do hero | Topo | `useScroll` com offset, y e scale |
| Text reveal por linha mascarada | Título do hero | `overflow: hidden` + translate de 105% |
| Scroll reveal em cascata | Todas as seções | `whileInView` com stagger |
| Accordion animado | FAQ | `AnimatePresence` com `height: auto` |
| Zoom-out da imagem | Cards de tratamento | `useTransform` na entrada |

Tudo respeita `prefers-reduced-motion`. No celular a pilha vira lista simples:
empilhar em tela pequena esconde conteúdo em vez de organizar.

---

## 3. Regras do CFO, o que pode e o que não pode

Normas aplicáveis: **Resolução CFO 118/2012** (Código de Ética, arts. 42 a 45),
**Resolução CFO 196/2019** (imagens e redes sociais), **Resolução CFO 271/2025**
(alterou os arts. 20 e 44, revogou o art. 32 XIII).

O Art. 45 é o que mais importa para você: proprietários, responsável técnico e
profissionais **respondem solidariamente** por publicidade irregular. Dizer que a
agência fez não protege ninguém.

### Obrigatório em todo o site (Art. 43)

- Nome completo do profissional
- Denominação profissional ("Cirurgiã-Dentista")
- Número de inscrição no CRO com a UF
- Nome e CRO do responsável técnico, se for pessoa jurídica
- Se divulgar especialidade, ter o profissional inscrito nela e disponibilizar a
  relação ao público

Isso está no rodapé, alimentado pelo painel. Não remover.

### Pode

- Áreas de atuação, procedimentos e técnicas
- Especialidades **em que estiver efetivamente inscrita**
- Títulos de mestrado e doutorado
- Endereço, telefone, horário, convênios e credenciamentos
- Expressão "clínico geral"
- Conteúdo educativo (blog, vídeos explicando procedimentos)
- Selfies do profissional, com autorização
- Antes e depois, **só** publicado por quem executou, com Termo de Consentimento
  Livre e Esclarecido, identificação e ressalva de variação por caso

### Não pode

- **Preço, tabela, parcelamento, "a partir de", desconto ou gratuidade.** A CFO
  271/2025 não liberou isso: ela tratou de brindes e cartões de desconto.
- Anunciar título ou especialidade que não possua registrada
- Garantia de resultado ou de prazo ("sorriso perfeito em 24h", "implantes em 4
  semanas", "sem dor", "100% de sucesso")
- Superlativos: "melhor dentista", "referência em Vitória", "nº 1"
- Comparação com colegas ou crítica a técnicas de terceiros
- Diagnóstico ou prescrição por meio de comunicação de massa
- Identificação de paciente para autopromoção, ainda que com autorização
- Imagens do transcurso do procedimento (sangue, tecidos, osso exposto)
- Divulgar caso clínico executado por terceiro
- Telemarketing ativo, panfletagem, mala direta, site de compra coletiva
- Sorteio ou prêmio de serviço odontológico como captação

### Zona cinzenta: depoimentos

O Código não os proíbe nominalmente, mas os CROs enquadram no Art. 44 quando o
depoimento **atesta resultado clínico** ou serve de autopromoção com identificação
do paciente.

Decisão do projeto: os depoimentos falam da **experiência de atendimento**
(acolhimento, pontualidade, clareza, ambiente), nunca do resultado. Isso está
escrito como comentário no código e como aviso no painel, para não se perder
quando a Camilla for editar.

### Sanções

Advertência, censura confidencial, censura pública, suspensão de até 30 dias,
cassação do registro, mais multa. Denúncia pode partir de qualquer pessoa,
inclusive de concorrente, e apagar a publicação depois não extingue a infração.

---

## 4. Fase 2, quando o site estiver no ar

Ordem sugerida de prioridade:

1. **Google Meu Negócio completo**, com fotos e postagens mensais. Pesa mais que
   o site em busca local.
2. **Páginas por tratamento cruzadas com bairro**: `/implante-dentario-jardim-da-penha`.
   Nenhum concorrente no ES faz isso. A estrutura de CMS já comporta.
3. **Blog educativo**, para SEO de cauda longa e para alimentar o Instagram.
4. **Confirmação automática de consulta**, para derrubar o no-show.
5. **Google Analytics + eventos de clique no WhatsApp**, para medir o funil de
   verdade em vez de olhar métrica de vaidade.
