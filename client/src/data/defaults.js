/**
 * CONTEUDO PADRAO DO SITE
 *
 * Tudo aqui e editavel pelo painel (/gestao) e fica salvo no banco.
 * Os textos marcados com [PLACEHOLDER] sao provisorios: trocar assim que
 * a Camilla enviar as informacoes reais.
 *
 * ATENCAO: este arquivo NAO e a fonte da verdade de um site ja semeado.
 * O front busca GET /api/sections e o merge em SiteDataContext so aplica o
 * default quando o campo vem undefined/null — string vazia gravada no banco
 * vence. E o seed usa ON CONFLICT DO NOTHING. Para levar esta copy ao ar,
 * rodar `node scripts/atualizar-copy.js` (tem --dry-run).
 *
 * VOZ: a Camilla fala em primeira pessoa ("eu atendo", "me manda mensagem").
 * Antes o site falava dela em terceira pessoa e da clinica em primeira do
 * plural. Ao escrever texto novo, manter a primeira pessoa do singular.
 *
 * REGRA DE COMPLIANCE (CFO 118/2012 e 196/2019) aplicada em todo o conteudo:
 *  - nada de preco, "a partir de", parcelamento ou "avaliacao gratuita"
 *  - nada de superlativo ("melhor", "referencia", "numero 1")
 *  - nada de promessa de resultado ou prazo ("sorriso perfeito em X dias")
 *  - nada de "especialista": pos-graduacao em andamento nao da esse titulo,
 *    so especialidade registrada no CRO. Usar "me aprofundei em", nunca
 *    "me especializei em".
 *  - depoimentos falam da EXPERIENCIA de atendimento, nunca do resultado clinico
 *  - nome completo + CRO + responsavel tecnico obrigatorios no rodape
 */

export const defaults = {
  // ------------------------------------------------------------------ SEO
  seo: {
    title: 'Dra. Camilla Barros | Dentista na Enseada do Suá, Vitória ES',
    description:
      'Consultório odontológico na Enseada do Suá, Vitória ES. Lentes em porcelana e resina, clareamento, gengivoplastia, limpeza e placa para bruxismo.',
    ogImage: '',
    favicon: '',
    siteUrl: 'https://dracamillabarros.com',
    themeColor: '#FDFAF6',
    // Dados estruturados schema.org/Dentist (SEO local)
    schema: {
      name: 'Consultório Odontológico Dra. Camilla Barros',
      street: 'Rua José Alexandre Buaiz, 190, Sala 714, Edifício Master Tower',
      district: 'Enseada do Suá',
      city: 'Vitória',
      state: 'ES',
      postalCode: '29050-918',
      latitude: '',
      longitude: '',
      priceRange: '',
    },
  },

  // ----------------------------------------------------------------- HERO
  // Abre pelo incomodo, nao pelo procedimento: quem procura estetica ja sabe
  // o que a incomoda e nao sabe o caminho. O titulo quebra em duas linhas —
  // `titleAccent` e a segunda, em italico azul.
  hero: {
    eyebrow: 'Odontologia estética e cuidados personalizados',
    title: 'Estética, saúde e planejamento para',
    titleAccent: 'cuidar do seu sorriso',
    subtitle:
      'Da primeira avaliação ao resultado, você entende o que será feito, por que cada etapa é indicada e quais caminhos fazem sentido para o seu sorriso.',
    ctaPrimary: { label: 'Agendar consulta', href: '#contato' },
    ctaSecondary: { label: 'Conhecer os tratamentos', href: '#tratamentos' },
    // Selos que flutuam sobre o retrato. icon: check | relogio | escudo
    // Fato verificavel em cada um. "Confianca" e "Biosseguranca" sozinhos nao
    // dizem nada que outro consultorio nao possa dizer igual.
    chips: [
      { label: 'Atendimento individual', icon: 'check' },
      { label: 'Hora marcada', icon: 'relogio' },
      { label: 'Biossegurança', icon: 'escudo' },
    ],
    // media.type: 'image' | 'video'
    media: {
      type: 'image',
      image: '',
      video: '',
      poster: '',
      alt: 'Dra. Camilla Barros no consultório',
      objectPosition: 'center',
    },
  },

  // ------------------------------------------------------- FAIXA DE MARCA
  credenciais: {
    name: 'Dra. Camilla Barros',
    role: 'Cirurgiã-Dentista',
    cro: '[PLACEHOLDER] CRO-ES 00000',
    // Areas de atuacao. Atencao: so anunciar "especialista em X" se houver
    // titulo de especialista registrado no CRO. Caso contrario, usar
    // "atuacao em" / "clinica geral".
    atuacao: 'Atuação em odontologia estética e preventiva',
    // `icon` usa os mesmos tres desenhos dos selos do hero, na mesma ordem: o
    // selo sobre a foto e o pilar logo abaixo mostram a mesma figura.
    valores: [
      { title: 'Clareza em cada etapa', icon: 'check', text: 'Você entende o que está acontecendo, quais são as possibilidades e por que determinado tratamento pode ser indicado para o seu caso.' },
      { title: 'Cuidado do início ao fim', icon: 'escudo', text: 'Do planejamento ao acompanhamento, cada etapa é conduzida de perto, com protocolos de biossegurança e materiais de uso único.' },
      { title: 'Uma consulta sem pressa', icon: 'relogio', text: 'Atendimentos com hora marcada, sem sobreposição de pacientes, para que sua consulta tenha o tempo necessário.' },
    ],
  },

  // ---------------------------------------------------------------- VIDEO
  video: {
    enabled: true,
    eyebrow: 'Uma conversa antes da consulta',
    title: 'Prazer, sou a Camilla',
    text: 'Em pouco mais de um minuto eu conto como funciona a primeira consulta: o que a gente conversa, o que eu examino e como o plano de tratamento é montado junto com você.',
    // Suba o arquivo pelo painel ou cole a URL (YouTube/Vimeo tambem funcionam)
    videoUrl: '',
    poster: '',
    caption: 'Dra. Camilla Barros, no consultório em Vitória',
  },

  // ----------------------------------------------------------- TRATAMENTOS
  // Renderizado como cards empilhados (sticky stack) no scroll.
  //
  // ORCAMENTO DE TEXTO: o card tem altura FIXA com overflow hidden
  // (global.css). Em 375x667 sobram ~22px nos cards 01 e 03, que tem 3
  // procedimentos na lista. Nesses dois, `summary` nao pode crescer. Ao
  // mexer aqui, remedir em 375x667 antes de dar por pronto.
  tratamentos: {
    eyebrow: 'Tratamentos',
    title: 'Nosso tratamento',
    // Esvaziada pelo painel em 17/09. O `.lead` fica renderizado e vazio.
    // Texto anterior, se quiser retomar: "Cada plano sai do seu caso, do seu
    // tempo e do que voce quer resolver primeiro. Nada aqui e pacote fechado."
    intro: '',
    // Os 4 cards agrupam os 7 procedimentos que a Camilla realmente realiza.
    // Nao acrescentar procedimento que ela nao faz.
    items: [
      // ATENCAO ao campo `number`. Ele e renderizado em `.stack__number`, em
      // Playfair pequeno, e foi desenhado para caber "01".."04". Em 17/09 ele
      // passou a receber texto pelo painel ("Transformacao do sorriso",
      // "02 — Clareamento"), o que tira a numeracao da pilha e ocupa altura do
      // card, que tem altura fixa. Esta sincronizado com o banco de proposito;
      // se for para voltar a numerar, trocar por '01'..'04'.
      {
        number: 'Transformação do sorriso',
        title: 'Mais harmonia, sem perder a naturalidade',
        summary:
          'Lentes em porcelana, lentes em resina e gengivoplastia para ajustar forma, proporção, cor e contorno do sorriso.',
        list: ['Lentes em porcelana', 'Lentes em resina', 'Gengivoplastia'],
        image: '',
        alt: '',
      },
      {
        number: '02 — Clareamento',
        title: 'Um sorriso mais claro, respeitando o seu dente.',
        summary:
          'O tratamento é escolhido de acordo com a causa do escurecimento, a sensibilidade e a sua rotina.',
        list: ['Clareamento de consultório', 'Clareamento caseiro supervisionado'],
        image: '',
        alt: '',
      },
      {
        number: '03 — Saúde e manutenção',
        title: 'Antes de pensar na estética, cuidamos da base.',
        summary:
          'Gengiva saudável, controle de cáries, limpeza e acompanhamento periódico ajudam a preservar a saúde e a aparência do seu sorriso ao longo do tempo.',
        list: ['Profilaxia', 'Raspagem', 'Restaurações'],
        image: '',
        alt: '',
      },
      {
        number: '04 — Proteção do sorriso',
        title: 'Cuidar hoje também é evitar problemas amanhã.',
        summary:
          'A placa para bruxismo é confeccionada sob medida para ajudar a proteger os dentes do desgaste causado pelo apertamento e ranger durante o sono.',
        list: ['Placa para bruxismo'],
        image: '',
        alt: '',
      },
    ],
  },

  // -------------------------------------------------------------- SINTOMAS
  sintomas: {
    eyebrow: 'Sinais',
    title: 'O que costuma trazer alguém até aqui',
    intro:
      'Quase ninguém marca a primeira consulta por causa de um diagnóstico. Marca por causa de um incômodo.',
    // Cada sinal aqui tem correspondencia com um dos tratamentos que ela faz.
    // `icon` desenha o sinal antes do titulo ser lido. Os nomes validos estao
    // em components/Icone.jsx.
    items: [
      { title: 'Dentes escuros ou amarelados', icon: 'dente', text: 'A mudança de cor pode vir de fora, do café e do vinho, ou de dentro do dente. São caminhos de tratamento diferentes.' },
      { title: 'Gengiva que sangra na escovação', icon: 'gota', text: 'Sangramento frequente costuma ser sinal de inflamação e acúmulo de tártaro, não de escovação forte demais.' },
      { title: 'Sorriso que mostra muita gengiva', icon: 'sorriso', text: 'Quando o dente parece curto, muitas vezes ele só está coberto. O contorno da gengiva pode ser ajustado.' },
      { title: 'Dentes lascados, gastos ou tortos', icon: 'denteLascado', text: 'Pequenas fraturas, desgaste e formas irregulares mudam a proporção do sorriso inteiro.' },
      { title: 'Dor de cabeça e mandíbula ao acordar', icon: 'lua', text: 'Pode estar ligado a apertar ou ranger os dentes durante o sono, que também desgasta o esmalte.' },
      { title: 'Sensibilidade ao gelado ou ao quente', icon: 'floco', text: 'Aquele choque rápido ao beber ou comer algo em outra temperatura quase sempre tem causa identificável.' },
    ],
  },

  // ------------------------------------------------------------ SOBRE ELA
  sobre: {
    eyebrow: 'Quem vai te atender',
    title: 'Um pouco sobre mim',
    // RASCUNHO a partir do perfil que a Camilla enviou. Ela precisa ler e
    // aprovar antes de publicar, principalmente o terceiro paragrafo, que foi
    // escrito por nos e deveria sair com as palavras dela.
    // `lead` e o terceiro paragrafo estao vazios porque foram esvaziados pelo
    // painel. O componente renderiza os dois mesmo assim, entao sobra um <p>
    // vazio na pagina. Textos anteriores, se quiser retomar:
    //   lead: "Eu nao comeco por lente nenhuma. Comeco entendendo o que te
    //          incomoda e por que. O desenho vem depois disso."
    //   [2]:  "A consulta aqui tem o ritmo que precisa ter. Eu explico cada
    //          passo antes de fazer, mostro o que estou vendo e paro quantas
    //          vezes voce precisar. Se voce tem medo de dentista, me diga logo
    //          na primeira conversa."
    lead: '',
    paragraphs: [
      'Me formei em Odontologia pelo Centro Universitário Tocantinense Presidente Antônio Carlos, em Araguaína. Escolhi a estética como caminho desde cedo e hoje atendo em consultório próprio, na Enseada do Suá, em Vitória.',
      'Sigo em formação em Dentística Estética com ênfase em Prótese e me aprofundei em lentes por dois caminhos complementares: o curso de Lentes em Resina com a Dra. Juliana Pereira, em São Paulo, e o curso de Laminados na clínica do Dr. Adolfo Martins, aqui em Vitória. É o que sustenta o trabalho com lentes em resina e em porcelana no consultório.',
      '',
    ],
    image: '',
    alt: 'Dra. Camilla Barros',
    // ATENCAO: pos-graduacao em andamento nao autoriza anunciar "especialista".
    // So titulo de especialista registrado no CRO permite esse termo.
    formacao: [
      { label: 'Graduação em Odontologia', detail: 'Centro Universitário Tocantinense Presidente Antônio Carlos, Araguaína/TO' },
      { label: 'Dentística Estética com ênfase em Prótese', detail: 'em andamento' },
      { label: 'Curso de Lentes em Resina', detail: 'Dra. Juliana Pereira, São Paulo/SP' },
      { label: 'Curso de Laminados', detail: 'Clínica Dr. Adolfo Martins, Vitória/ES' },
    ],
    cta: { label: 'Falar comigo', href: '#contato' },
  },

  // ----------------------------------------------------------- CONSULTORIO
  consultorio: {
    eyebrow: 'O espaço',
    title: 'Sobre o consultório',
    text: 'O consultório fica na Enseada do Suá, no Edifício Master Tower, na rua lateral à Assembleia Legislativa, em frente ao Tribunal de Contas e a poucos minutos do Shopping Vitória. É uma sala só, com hora marcada e uma pessoa por vez. Você não divide a espera com mais ninguém.',
    gallery: [
      { image: '', alt: 'Recepção do consultório' },
      { image: '', alt: 'Sala de atendimento' },
      { image: '', alt: 'Equipamento do consultório' },
      { image: '', alt: 'Detalhe do espaço' },
    ],
    // O terceiro diferencial era "[PLACEHOLDER] Estacionamento" e ia ao ar
    // assim. Trocado por fato ja confirmado. Quando a Camilla disser se o
    // Master Tower tem estacionamento para visitante, esse vira o quarto.
    diferenciais: [
      { title: 'Fácil de achar', text: 'Na rua lateral à Assembleia Legislativa, em frente ao Tribunal de Contas.' },
      { title: 'Perto de tudo', text: 'A poucos minutos do Shopping Vitória, no centro de negócios da Enseada do Suá.' },
      { title: 'Biossegurança', text: 'Esterilização com controle e material de uso único em todos os atendimentos.' },
    ],
    ctaMaps: { label: 'Como chegar', href: 'https://maps.google.com/?q=Rua+Jose+Alexandre+Buaiz,+190,+Enseada+do+Sua,+Vitoria+ES' },
  },

  // ----------------------------------------------------------- DEPOIMENTOS
  // ATENCAO COMPLIANCE: depoimento sobre a EXPERIENCIA de atendimento.
  // Nao publicar depoimento que afirme resultado clinico ou garanta sucesso.
  //
  // A lista esta VAZIA e a secao esta desligada em `visibility` de proposito.
  // Antes havia tres "[PLACEHOLDER] Depoimento sobre..." indo ao ar como se
  // fossem relatos. Inventar depoimento e prova social fabricada, e o CFO
  // exige autorizacao de cada paciente. Religar so quando houver relato real
  // com autorizacao registrada.
  depoimentos: {
    eyebrow: 'Quem já passou por aqui',
    title: 'Experiências reais',
    intro: 'Relatos sobre o atendimento, publicados com autorização de cada paciente.',
    items: [],
    googleUrl: '',
  },

  // -------------------------------------------------------------------- FAQ
  // Ficaram so as perguntas que dao pra responder com o que ja sabemos.
  // As tres que dependem de informacao da Camilla — se precisa levar exame,
  // se atende convenio e se atende sabado — sairam da lista em vez de ir ao ar
  // como "[PLACEHOLDER]". Ela readiciona pelo painel quando responder.
  faq: {
    eyebrow: 'Dúvidas',
    title: 'Perguntas frequentes',
    items: [
      { q: 'Como funciona a primeira consulta?', a: 'A gente começa conversando: o que te incomoda, há quanto tempo e o que você já tentou. Depois eu faço o exame clínico e, se for necessário, peço exame de imagem. Só então eu monto o plano de tratamento e te apresento, com as etapas e a ordem delas.' },
      { q: 'Quanto tempo dura o atendimento?', a: 'A primeira consulta é a mais longa, porque é onde a gente conversa e examina com calma. As seguintes variam conforme o procedimento. Como eu atendo uma pessoa por vez e com hora marcada, você não fica esperando além do combinado.' },
      { q: 'Como chego até aí?', a: 'O consultório fica na sala 714 do Edifício Master Tower, na rua lateral à Assembleia Legislativa e em frente ao Tribunal de Contas, perto do Shopping Vitória.' },
      { q: 'E se eu sentir medo de dentista?', a: 'Me diga isso logo na primeira conversa. A gente ajusta o ritmo: eu explico cada passo antes de fazer, mostro o que estou vendo e paro sempre que você precisar. Medo de dentista é comum e não é motivo pra adiar a avaliação.' },
    ],
  },

  // ---------------------------------------------------------------- CONTATO
  contato: {
    eyebrow: 'Agende',
    title: 'Vamos conversar sobre o seu caso',
    text: 'Me manda uma mensagem no WhatsApp ou preenche o formulário.',
    whatsapp: {
      // So digitos com DDI: e assim que o waLink monta o link, e e o formato
      // que o JSON-LD de telephone espera.
      // ATENCAO: o DDD 63 e de Araguaina/TO e o consultorio e em Vitoria/ES
      // (DDD 27). Confirmar com a Camilla se este e mesmo o numero de contato.
      number: '5563999827704',
      message: 'Olá! Vim pelo site e gostaria de agendar uma avaliação.',
      label: 'Chamar no WhatsApp',
    },
    formEnabled: true,

    // Escolha de horario dentro do proprio formulario. Nao e pagina separada:
    // o formulario de contato ja e o lugar onde a pessoa chega, e mandar ela
    // pra outra tela e um passo a mais pra desistir.
    //
    // Escolher horario e OPCIONAL. Sem horario, o envio continua sendo o mesmo
    // contato de sempre; com horario, vira pedido de agendamento.
    //
    // Vocabulario travado pelo que a coisa e: a paciente PEDE um horario, nao
    // reserva. Escrever "confirmado" ou "vaga garantida" seria mentira de
    // interface — quem confirma e a Camilla, depois.
    agendamento: {
      titulo: 'Prefere já escolher um horário?',
      texto: 'Opcional. Escolha um dia e um horário e eu confirmo pelo WhatsApp.',
      aviso: 'Este é um pedido de horário, não uma confirmação. Eu confirmo e você recebe o retorno pelo WhatsApp.',
      sucesso: 'Pedido de horário enviado. Eu confirmo pelo WhatsApp.',
      semHorario: 'Nesse dia não há horário livre. Escolha outro dia.',
      semVaga: 'A agenda dos próximos dias está cheia. Me manda sua mensagem por aqui que eu retorno assim que abrir uma data.',
      limpar: 'Enviar só a mensagem',
    },

    // Os rotulos batem com os procedimentos cadastrados na agenda, mas o site
    // ainda nao envia procedimentoId no pedido de horario — todo pedido cai na
    // "Avaliacao" de 60min. Ao ligar esse mapeamento, casar por id, nunca por
    // texto: aqui o nome esta acentuado e no banco nao.
    interesses: [
      'Não sei ainda, quero uma avaliação',
      'Lentes em porcelana ou resina',
      'Clareamento',
      'Limpeza, raspagem ou restauração',
      'Gengivoplastia',
      'Placa para bruxismo',
    ],
    successMessage: 'Recebi sua mensagem. Eu entro em contato em breve.',
  },

  // ----------------------------------------------------------------- RODAPE
  footer: {
    logoText: 'Dra. Camilla Barros',
    tagline: 'Odontologia na Enseada do Suá, Vitória ES',
    endereco: {
      street: 'Rua José Alexandre Buaiz, 190',
      complement: 'Sala 714, Edifício Master Tower',
      district: 'Enseada do Suá',
      city: 'Vitória',
      state: 'ES',
      cep: '29050-918',
      mapsEmbed: '',
      mapsLink: 'https://maps.google.com/?q=Rua+Jose+Alexandre+Buaiz,+190,+Enseada+do+Sua,+Vitoria+ES',
    },
    // Antes ia ao ar "[PLACEHOLDER] 08h as 18h". Inventar faixa de horario e
    // pior que nao ter: a paciente aparece na porta. Ficou o que ja e verdade
    // pelo resto do site. Trocar pela faixa real quando a Camilla informar.
    horarios: [
      { day: 'Segunda a sexta', hours: 'com hora marcada' },
      { day: 'Sábado', hours: 'sob agendamento' },
    ],
    social: {
      instagram: '',
      whatsapp: '',
      facebook: '',
    },
    // Saiu do rodape a pedido da Camilla: o nome dela ja aparece na assinatura
    // e no copyright. Os dados ficam aqui porque o Art. 43 da Resolucao CFO
    // 118/2012 pede nome, CRO e responsavel tecnico na publicidade — se voltar,
    // e so remontar o bloco com estes campos.
    legal: {
      profissional: 'Dra. Camilla Barros',
      denominacao: 'Cirurgiã-Dentista',
      cro: '[PLACEHOLDER] CRO-ES 00000',
      responsavelTecnico: 'Dra. Camilla Barros, CRO-ES 00000',
      cnpj: '',
      aviso:
        'Os resultados variam conforme o caso de cada paciente. As informações deste site têm caráter informativo e não substituem a consulta presencial.',
    },
    credit: { label: 'Site por Felipe Gaigher', href: 'https://felipegaigher.com' },
  },

  // ------------------------------------------------------------ NAVEGACAO
  nav: {
    links: [
      { label: 'Tratamentos', href: '#tratamentos' },
      { label: 'Sinais', href: '#sintomas' },
      { label: 'Sobre', href: '#sobre' },
      { label: 'Consultório', href: '#consultorio' },
      { label: 'Dúvidas', href: '#faq' },
    ],
    cta: { label: 'Agendar consulta', href: '#contato' },
    logoText: 'Dra. Camilla Barros',
    logoImage: '',
  },

  // ------------------------------------------------------------ VISIBILIDADE
  // Liga/desliga e reordena as secoes pelo painel.
  //
  // ATENCAO: desligar uma secao NAO atualiza os links que apontam pra ela. As
  // ancoras (#contato, #tratamentos...) da navbar, do hero, dos sintomas, do
  // sobre e do rodape passam a nao fazer nada, em silencio. Desligar "contato"
  // quebra seis CTAs de uma vez.
  visibility: {
    credenciais: true,
    video: true,
    tratamentos: true,
    sintomas: true,
    sobre: true,
    consultorio: true,
    // Desligada ate haver depoimento real com autorizacao. Ver o comentario
    // na secao `depoimentos`.
    depoimentos: false,
    faq: true,
    contato: true,
    order: [
      'credenciais',
      'video',
      'tratamentos',
      'sintomas',
      'sobre',
      'consultorio',
      'depoimentos',
      'faq',
      'contato',
    ],
  },

  // ------------------------------------------------------------ CONFIGURACOES
  settings: {
    whatsappFloat: true,
    smoothScroll: true,
    grain: true,
    loadingScreen: true,
  },
}

export const SECTION_KEYS = Object.keys(defaults)
