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
    title: 'Dra. Camilla Barros | Dentista na Enseada do Sua, Vitoria ES',
    description:
      'Consultorio odontologico na Enseada do Sua, Vitoria ES. Lentes em porcelana e resina, clareamento, gengivoplastia, limpeza e placa para bruxismo.',
    ogImage: '',
    favicon: '',
    siteUrl: 'https://dracamillabarros.com',
    themeColor: '#FDFAF6',
    // Dados estruturados schema.org/Dentist (SEO local)
    schema: {
      name: 'Consultorio Odontologico Dra. Camilla Barros',
      street: 'Rua Jose Alexandre Buaiz, 190, Sala 714, Edificio Master Tower',
      district: 'Enseada do Sua',
      city: 'Vitoria',
      state: 'ES',
      postalCode: '29050-918',
      latitude: '',
      longitude: '',
      priceRange: '',
    },
  },

  // ----------------------------------------------------------------- HERO
  hero: {
    eyebrow: 'Odontologia na Enseada do Sua, Vitoria',
    title: 'Cuidado que se',
    titleAccent: 'nota no detalhe',
    subtitle:
      '[PLACEHOLDER] Um consultorio pensado para que cada etapa do seu tratamento seja clara, tranquila e feita no seu tempo.',
    ctaPrimary: { label: 'Agendar consulta', href: '#contato' },
    ctaSecondary: { label: 'Conhecer os tratamentos', href: '#tratamentos' },
    // Selos que flutuam sobre o retrato. icon: check | relogio | escudo
    chips: [
      { label: 'Confianca', icon: 'check' },
      { label: 'Hora marcada', icon: 'relogio' },
      { label: 'Biosseguranca', icon: 'escudo' },
    ],
    // media.type: 'image' | 'video'
    media: {
      type: 'image',
      image: '',
      video: '',
      poster: '',
      alt: 'Dra. Camilla Barros no consultorio',
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
    atuacao: 'Atuacao em odontologia estetica e preventiva',
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
    // Os 4 cards agrupam os 7 procedimentos que a Camilla realmente realiza.
    // Nao acrescentar procedimento que ela nao faz.
    items: [
      {
        number: '01',
        title: 'Desenho do sorriso',
        summary:
          'Lentes e ajuste de contorno para corrigir forma, cor e proporcao. O desenho e definido antes, junto com voce, e so depois vai para a boca.',
        list: ['Lentes em porcelana', 'Lentes em resina', 'Gengivoplastia'],
        image: '',
        alt: '',
      },
      {
        number: '02',
        title: 'Clareamento',
        summary:
          'Dois caminhos para clarear, escolhidos conforme a causa do escurecimento, a sensibilidade dos seus dentes e a sua rotina.',
        list: ['Clareamento de consultorio', 'Clareamento caseiro supervisionado'],
        image: '',
        alt: '',
      },
      {
        number: '03',
        title: 'Saude e manutencao',
        summary:
          'A base que sustenta qualquer resultado estetico ao longo dos anos: gengiva saudavel, dente sem carie e controle periodico.',
        list: ['Profilaxia', 'Raspagem', 'Restauracoes'],
        image: '',
        alt: '',
      },
      {
        number: '04',
        title: 'Protecao do sorriso',
        summary:
          'Placa feita sob medida para quem aperta ou range os dentes durante o sono, protegendo o esmalte e aliviando a tensao da mandibula.',
        list: ['Placa para bruxismo'],
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
    // Cada sinal aqui tem correspondencia com um dos tratamentos que ela faz.
    items: [
      { title: 'Dentes escuros ou amarelados', text: 'Mudanca de cor pode ser pigmentacao externa, do cafe e do vinho, ou algo interno ao dente. Sao caminhos diferentes.' },
      { title: 'Gengiva que sangra na escovacao', text: 'Sangramento frequente costuma ser sinal de inflamacao e acumulo de tartaro, nao de escovacao forte demais.' },
      { title: 'Sorriso que mostra muita gengiva', text: 'Quando o dente parece curto, muitas vezes ele esta apenas coberto. O contorno da gengiva pode ser ajustado.' },
      { title: 'Dentes lascados, gastos ou tortos', text: 'Pequenas fraturas, desgaste e formas irregulares mudam a proporcao do sorriso inteiro.' },
      { title: 'Dor de cabeca e mandibula ao acordar', text: 'Pode estar ligado a apertamento ou ranger de dentes durante o sono, que tambem desgasta o esmalte.' },
      { title: 'Sensibilidade ao gelado ou ao quente', text: 'Aquele choque rapido ao beber ou comer algo em temperatura diferente costuma ter causa identificavel.' },
    ],
  },

  // ------------------------------------------------------------ SOBRE ELA
  sobre: {
    eyebrow: 'Quem vai te atender',
    title: 'Sobre a Dra. Camilla',
    // RASCUNHO a partir do perfil que a Camilla enviou. Ela precisa ler e
    // aprovar antes de publicar, principalmente o terceiro paragrafo.
    lead: 'Odontologia estetica feita com calma, com o desenho definido antes de encostar em qualquer dente.',
    paragraphs: [
      'Formada em Odontologia pelo Centro Universitario Tocantinense Presidente Antonio Carlos, em Araguaina, [PLACEHOLDER: ano de formatura], a Camilla escolheu a estetica como caminho desde cedo e hoje atende em consultorio proprio na Enseada do Sua, em Vitoria.',
      'Segue em formacao em Dentistica Estetica com enfase em Protese e se especializou em lentes por dois caminhos complementares: o curso de Lentes em Resina com a Dra. Juliana Pereira, em Sao Paulo, e o curso de Laminados na clinica do Dr. Adolfo Martins, aqui em Vitoria. E o que sustenta o trabalho com lentes em resina e em porcelana no consultorio.',
      '[PLACEHOLDER] Terceiro paragrafo, com as palavras dela: como conduz a consulta, o ritmo do atendimento e o que a paciente pode esperar desde a primeira conversa.',
    ],
    image: '',
    alt: 'Dra. Camilla Barros',
    // ATENCAO: pos-graduacao em andamento nao autoriza anunciar "especialista".
    // So titulo de especialista registrado no CRO permite esse termo.
    formacao: [
      { label: 'Graduacao em Odontologia', detail: 'Centro Universitario Tocantinense Presidente Antonio Carlos, Araguaina/TO' },
      { label: 'Dentistica Estetica com enfase em Protese', detail: 'em andamento' },
      { label: 'Curso de Lentes em Resina', detail: 'Dra. Juliana Pereira, Sao Paulo/SP' },
      { label: 'Curso de Laminados', detail: 'Clinica Dr. Adolfo Martins, Vitoria/ES' },
    ],
    cta: { label: 'Falar com a Camilla', href: '#contato' },
  },

  // ----------------------------------------------------------- CONSULTORIO
  consultorio: {
    eyebrow: 'O espaco',
    title: 'Sobre o consultorio',
    text: 'O consultorio fica na Enseada do Sua, no Edificio Master Tower, na rua lateral a Assembleia Legislativa, em frente ao Tribunal de Contas e a poucos minutos do Shopping Vitoria. [PLACEHOLDER] Completar com a descricao do ambiente e dos equipamentos.',
    gallery: [
      { image: '', alt: '[PLACEHOLDER] Recepcao' },
      { image: '', alt: '[PLACEHOLDER] Sala de atendimento' },
      { image: '', alt: '[PLACEHOLDER] Equipamento' },
      { image: '', alt: '[PLACEHOLDER] Detalhe do espaco' },
    ],
    diferenciais: [
      { title: 'Facil de achar', text: 'Na rua lateral a Assembleia Legislativa, em frente ao Tribunal de Contas.' },
      { title: '[PLACEHOLDER] Estacionamento', text: 'Confirmar se o Master Tower tem estacionamento para visitantes ou conveniado.' },
      { title: 'Biosseguranca', text: 'Esterilizacao com controle e material de uso unico em todos os atendimentos.' },
    ],
    ctaMaps: { label: 'Como chegar', href: 'https://maps.google.com/?q=Rua+Jose+Alexandre+Buaiz,+190,+Enseada+do+Sua,+Vitoria+ES' },
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
      { q: 'Como chego ate ai?', a: 'O consultorio fica na sala 714 do Edificio Master Tower, na rua lateral a Assembleia Legislativa e em frente ao Tribunal de Contas, perto do Shopping Vitoria. [PLACEHOLDER] Completar com estacionamento e acesso ao predio.' },
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
      'Lentes em porcelana ou resina',
      'Clareamento',
      'Limpeza, raspagem ou restauracao',
      'Gengivoplastia',
      'Placa para bruxismo',
    ],
    successMessage: 'Recebemos sua mensagem. A gente entra em contato em breve.',
  },

  // ----------------------------------------------------------------- RODAPE
  footer: {
    logoText: 'Dra. Camilla Barros',
    tagline: 'Odontologia na Enseada do Sua, Vitoria ES',
    endereco: {
      street: 'Rua Jose Alexandre Buaiz, 190',
      complement: 'Sala 714, Edificio Master Tower',
      district: 'Enseada do Sua',
      city: 'Vitoria',
      state: 'ES',
      cep: '29050-918',
      mapsEmbed: '',
      mapsLink: 'https://maps.google.com/?q=Rua+Jose+Alexandre+Buaiz,+190,+Enseada+do+Sua,+Vitoria+ES',
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
