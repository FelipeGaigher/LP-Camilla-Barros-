/**
 * CONTEUDO PADRAO DO SITE
 *
 * Tudo aqui e editavel pelo painel (/admin) e fica salvo no banco.
 * Os textos marcados com [PLACEHOLDER] sao provisorios: trocar assim que
 * a Camilla enviar as informacoes reais.
 *
 * REGRA DE COMPLIANCE (CFO 118/2012 e 196/2019) aplicada em todo o conteudo:
 *  - nada de preco, "a partir de", parcelamento ou "avaliacao gratuita"
 *  - nada de superlativo ("melhor", "referencia", "numero 1")
 *  - nada de promessa de resultado ou prazo ("sorriso perfeito em X dias")
 *  - depoimentos falam da EXPERIENCIA de atendimento, nunca do resultado clinico
 *  - nome completo + CRO + responsavel tecnico obrigatorios no rodape
 */

export const defaults = {
  // ------------------------------------------------------------------ SEO
  seo: {
    title: 'Dra. Camilla Barros | Odontologia em Vitoria, ES',
    description:
      '[PLACEHOLDER] Consultorio odontologico em Vitoria, ES. Atendimento individualizado, planejamento digital e cuidado em cada etapa do seu tratamento.',
    ogImage: '',
    favicon: '',
    siteUrl: 'https://dracamilla.com.br',
    themeColor: '#FAF7F2',
    // Dados estruturados schema.org/Dentist (SEO local)
    schema: {
      name: '[PLACEHOLDER] Consultorio Dra. Camilla Barros',
      street: '[PLACEHOLDER] Rua Exemplo, 000, Sala 00',
      district: '[PLACEHOLDER] Bairro',
      city: 'Vitoria',
      state: 'ES',
      postalCode: '[PLACEHOLDER] 29000-000',
      latitude: '',
      longitude: '',
      priceRange: '',
    },
  },

  // ----------------------------------------------------------------- HERO
  hero: {
    eyebrow: 'Odontologia em Vitoria, ES',
    title: 'Cuidado que se',
    titleAccent: 'nota no detalhe',
    subtitle:
      '[PLACEHOLDER] Um consultorio pensado para que cada etapa do seu tratamento seja clara, tranquila e feita no seu tempo.',
    ctaPrimary: { label: 'Agendar consulta', href: '#contato' },
    ctaSecondary: { label: 'Conhecer os tratamentos', href: '#tratamentos' },
    // media.type: 'image' | 'video'
    media: {
      type: 'image',
      image: '',
      video: '',
      poster: '',
      alt: 'Consultorio da Dra. Camilla',
      objectPosition: 'center',
    },
  },

  // ------------------------------------------------------- FAIXA DE MARCA
  credenciais: {
    name: 'Dra. Camilla Barros',
    role: 'Cirurgia-Dentista',
    cro: '[PLACEHOLDER] CRO-ES 00000',
    // Areas de atuacao. Atencao: so anunciar "especialista em X" se houver
    // titulo de especialista registrado no CRO. Caso contrario, usar
    // "atuacao em" / "clinica geral".
    atuacao: '[PLACEHOLDER] Atuacao em odontologia estetica e reabilitacao oral',
    valores: [
      { title: 'Clareza', text: 'Voce entende o que sera feito, por que e em quanto tempo, antes de comecar.' },
      { title: 'Tempo', text: 'Consultas com hora marcada e sem sobreposicao, para atender uma pessoa por vez.' },
      { title: 'Cuidado', text: 'Protocolo de biosseguranca e material de uso unico em todos os atendimentos.' },
    ],
  },

  // ---------------------------------------------------------------- VIDEO
  video: {
    enabled: true,
    eyebrow: 'Uma conversa antes da consulta',
    title: 'Prazer, sou a Camilla',
    text: '[PLACEHOLDER] Em pouco mais de um minuto eu explico como funciona a primeira consulta, o que voce precisa levar e como montamos o plano de tratamento junto com voce.',
    // Suba o arquivo pelo painel ou cole a URL (YouTube/Vimeo tambem funcionam)
    videoUrl: '',
    poster: '',
    caption: 'Dra. Camilla Barros, no consultorio em Vitoria',
  },

  // ----------------------------------------------------------- TRATAMENTOS
  // Renderizado como cards empilhados (sticky stack) no scroll.
  tratamentos: {
    eyebrow: 'Tratamentos',
    title: 'O que fazemos aqui',
    intro:
      'Cada plano e montado a partir do seu caso, do seu tempo e do que voce quer resolver primeiro. Nada e padrao.',
    items: [
      {
        number: '01',
        title: '[PLACEHOLDER] Odontologia estetica',
        summary:
          'Procedimentos que devolvem forma, cor e proporcao ao sorriso, sempre partindo de um planejamento digital feito antes de qualquer intervencao.',
        list: ['Facetas e lentes', 'Clareamento', 'Restauracoes em resina', 'Planejamento digital do sorriso'],
        image: '',
        alt: '',
      },
      {
        number: '02',
        title: '[PLACEHOLDER] Reabilitacao oral',
        summary:
          'Recuperacao da funcao de mastigar e falar com conforto, com proteses e coroas planejadas caso a caso.',
        list: ['Coroas e proteses', 'Implantes', 'Protese sobre implante', 'Reabilitacao completa'],
        image: '',
        alt: '',
      },
      {
        number: '03',
        title: '[PLACEHOLDER] Prevencao e manutencao',
        summary:
          'O acompanhamento que segura o resultado ao longo dos anos: limpeza, controle e ajuste periodico.',
        list: ['Limpeza e profilaxia', 'Aplicacao de fluor', 'Controle periodico', 'Orientacao de higiene'],
        image: '',
        alt: '',
      },
      {
        number: '04',
        title: '[PLACEHOLDER] Urgencia e dor',
        summary:
          'Atendimento para quem chega com dor, sensibilidade ou algo quebrado, com prioridade na agenda do dia.',
        list: ['Dor de dente', 'Restauracao quebrada', 'Sensibilidade', 'Tratamento de canal'],
        image: '',
        alt: '',
      },
    ],
  },

  // -------------------------------------------------------------- SINTOMAS
  sintomas: {
    eyebrow: 'Sinais',
    title: 'O que costuma trazer alguem ate aqui',
    intro:
      'Se voce se reconheceu em algum destes pontos, vale marcar uma avaliacao para entender a causa antes de decidir qualquer tratamento.',
    items: [
      { title: '[PLACEHOLDER] Sensibilidade ao gelado ou ao quente', text: 'Aquele choque rapido ao beber ou comer algo em temperatura diferente.' },
      { title: '[PLACEHOLDER] Gengiva que sangra na escovacao', text: 'Sangramento frequente costuma ser sinal de inflamacao, nao de escovacao forte demais.' },
      { title: '[PLACEHOLDER] Dificuldade para mastigar de um lado', text: 'Evitar um lado da boca quase sempre indica um problema que ja esta instalado.' },
      { title: '[PLACEHOLDER] Dentes escuros ou manchados', text: 'Mudanca de cor pode ser pigmentacao externa ou algo interno ao dente.' },
      { title: '[PLACEHOLDER] Dor de cabeca e mandibula ao acordar', text: 'Pode estar ligado a apertamento ou ranger de dentes durante o sono.' },
      { title: '[PLACEHOLDER] Falta de um ou mais dentes', text: 'A ausencia de um dente muda a posicao dos vizinhos com o tempo.' },
    ],
  },

  // ------------------------------------------------------------ SOBRE ELA
  sobre: {
    eyebrow: 'Quem vai te atender',
    title: 'Sobre a Dra. Camilla',
    lead: '[PLACEHOLDER] Frase de apresentacao em uma linha, que resume o jeito dela de atender.',
    paragraphs: [
      '[PLACEHOLDER] Paragrafo 1: formacao, onde se graduou, ano, e o caminho ate abrir o consultorio.',
      '[PLACEHOLDER] Paragrafo 2: cursos, atualizacoes e areas em que atua hoje.',
      '[PLACEHOLDER] Paragrafo 3: como ela conduz a consulta e o que a paciente pode esperar do atendimento.',
    ],
    image: '',
    alt: 'Dra. Camilla',
    formacao: [
      { label: '[PLACEHOLDER] Graduacao em Odontologia', detail: 'Instituicao, ano' },
      { label: '[PLACEHOLDER] Curso de atualizacao', detail: 'Instituicao, ano' },
      { label: '[PLACEHOLDER] Curso de atualizacao', detail: 'Instituicao, ano' },
    ],
    cta: { label: 'Falar com a Camilla', href: '#contato' },
  },

  // ----------------------------------------------------------- CONSULTORIO
  consultorio: {
    eyebrow: 'O espaco',
    title: 'Sobre o consultorio',
    text: '[PLACEHOLDER] Descricao do espaco: onde fica, como e o ambiente, o que tem de equipamento, estacionamento, acessibilidade e o que faz a paciente se sentir a vontade.',
    gallery: [
      { image: '', alt: '[PLACEHOLDER] Recepcao' },
      { image: '', alt: '[PLACEHOLDER] Sala de atendimento' },
      { image: '', alt: '[PLACEHOLDER] Equipamento' },
      { image: '', alt: '[PLACEHOLDER] Detalhe do espaco' },
    ],
    diferenciais: [
      { title: '[PLACEHOLDER] Estacionamento', text: 'Vaga no local ou proximo.' },
      { title: '[PLACEHOLDER] Acessibilidade', text: 'Acesso por elevador.' },
      { title: '[PLACEHOLDER] Biosseguranca', text: 'Esterilizacao com controle e material de uso unico.' },
    ],
    ctaMaps: { label: 'Como chegar', href: '' },
  },

  // ----------------------------------------------------------- DEPOIMENTOS
  // ATENCAO COMPLIANCE: depoimento sobre a EXPERIENCIA de atendimento.
  // Nao publicar depoimento que afirme resultado clinico ou garanta sucesso.
  depoimentos: {
    eyebrow: 'Quem ja passou por aqui',
    title: 'Experiencias reais',
    intro: 'Relatos sobre o atendimento, publicados com autorizacao de cada paciente.',
    items: [
      { quote: '[PLACEHOLDER] Depoimento sobre acolhimento, pontualidade e clareza na explicacao.', name: '[PLACEHOLDER] Nome', context: '[PLACEHOLDER] Paciente desde 2024' },
      { quote: '[PLACEHOLDER] Depoimento sobre o ambiente e a sensacao durante a consulta.', name: '[PLACEHOLDER] Nome', context: '[PLACEHOLDER] Paciente' },
      { quote: '[PLACEHOLDER] Depoimento sobre o cuidado no acompanhamento pos-consulta.', name: '[PLACEHOLDER] Nome', context: '[PLACEHOLDER] Paciente' },
    ],
    googleUrl: '',
  },

  // -------------------------------------------------------------------- FAQ
  faq: {
    eyebrow: 'Duvidas',
    title: 'Perguntas frequentes',
    items: [
      { q: 'Como funciona a primeira consulta?', a: '[PLACEHOLDER] Explicar o que acontece: conversa, exame clinico, exames de imagem se necessario, e apresentacao do plano de tratamento.' },
      { q: 'Preciso levar algum exame?', a: '[PLACEHOLDER] Dizer se e preciso levar radiografia, documentacao ou nada.' },
      { q: 'Atende convenio?', a: '[PLACEHOLDER] Listar convenios atendidos, ou informar que o atendimento e particular com nota fiscal para reembolso.' },
      { q: 'Quanto tempo dura o atendimento?', a: '[PLACEHOLDER] Tempo medio da consulta e como a agenda e organizada.' },
      { q: 'Tem estacionamento?', a: '[PLACEHOLDER] Informacao sobre estacionamento e acesso.' },
      { q: 'Atende aos sabados?', a: '[PLACEHOLDER] Horarios e dias de atendimento.' },
      { q: 'E se eu sentir medo de dentista?', a: '[PLACEHOLDER] Como o consultorio lida com pacientes ansiosos: ritmo, pausas, explicacao de cada passo.' },
    ],
  },

  // ---------------------------------------------------------------- CONTATO
  contato: {
    eyebrow: 'Agende',
    title: 'Vamos conversar sobre o seu caso',
    text: 'Envie uma mensagem no WhatsApp ou preencha o formulario. A gente responde no mesmo dia, em horario comercial.',
    whatsapp: {
      number: '[PLACEHOLDER] 5527900000000',
      message: 'Ola! Vim pelo site e gostaria de agendar uma avaliacao.',
      label: 'Chamar no WhatsApp',
    },
    formEnabled: true,
    interesses: [
      'Nao sei ainda, quero uma avaliacao',
      'Odontologia estetica',
      'Reabilitacao oral',
      'Prevencao e limpeza',
      'Estou com dor',
    ],
    successMessage: 'Recebemos sua mensagem. A gente entra em contato em breve.',
  },

  // ----------------------------------------------------------------- RODAPE
  footer: {
    logoText: 'Dra. Camilla Barros',
    tagline: 'Odontologia em Vitoria, ES',
    endereco: {
      street: '[PLACEHOLDER] Rua Exemplo, 000',
      complement: '[PLACEHOLDER] Sala 00',
      district: '[PLACEHOLDER] Bairro',
      city: 'Vitoria',
      state: 'ES',
      cep: '[PLACEHOLDER] 29000-000',
      mapsEmbed: '',
      mapsLink: '',
    },
    horarios: [
      { day: 'Segunda a sexta', hours: '[PLACEHOLDER] 08h as 18h' },
      { day: 'Sabado', hours: '[PLACEHOLDER] sob agendamento' },
    ],
    social: {
      instagram: '',
      whatsapp: '',
      facebook: '',
    },
    // OBRIGATORIO por lei (Art. 43, Resolucao CFO 118/2012). Nao remover.
    legal: {
      profissional: 'Dra. Camilla Barros',
      denominacao: 'Cirurgia-Dentista',
      cro: '[PLACEHOLDER] CRO-ES 00000',
      responsavelTecnico: 'Dra. Camilla Barros, CRO-ES 00000',
      cnpj: '',
      aviso:
        'Os resultados variam conforme o caso de cada paciente. As informacoes deste site tem carater informativo e nao substituem a consulta presencial.',
    },
    credit: { label: 'Site por Felipe Gaigher', href: 'https://felipegaigher.com' },
  },

  // ------------------------------------------------------------ NAVEGACAO
  nav: {
    links: [
      { label: 'Tratamentos', href: '#tratamentos' },
      { label: 'Sinais', href: '#sintomas' },
      { label: 'Sobre', href: '#sobre' },
      { label: 'Consultorio', href: '#consultorio' },
      { label: 'Duvidas', href: '#faq' },
    ],
    cta: { label: 'Agendar consulta', href: '#contato' },
    logoText: 'Dra. Camilla Barros',
    logoImage: '',
  },

  // ------------------------------------------------------------ VISIBILIDADE
  // Liga/desliga e reordena as secoes pelo painel.
  visibility: {
    credenciais: true,
    video: true,
    tratamentos: true,
    sintomas: true,
    sobre: true,
    consultorio: true,
    depoimentos: true,
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
