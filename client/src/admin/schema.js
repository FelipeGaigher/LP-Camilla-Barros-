/**
 * ESQUEMA DO PAINEL
 *
 * O painel e gerado a partir daqui. Para adicionar um campo novo ao CMS
 * basta declarar aqui e acrescentar a chave correspondente no defaults.js.
 * Nao e preciso escrever tela nova.
 *
 * Tipos disponiveis:
 *   text | textarea | url | number | toggle | select
 *   image | video            -> upload com preview
 *   stringlist               -> lista simples de textos
 *   group  { fields }        -> objeto aninhado
 *   list   { item: fields }  -> array de objetos (adicionar/remover/reordenar)
 */

export const SCHEMA = {
  hero: {
    label: 'Topo do site',
    hint: 'A primeira tela. E o que mais pesa na primeira impressao.',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta acima do titulo', type: 'text' },
      { key: 'title', label: 'Titulo, primeira linha', type: 'text' },
      { key: 'titleAccent', label: 'Titulo, segunda linha (em italico)', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'textarea' },
      {
        key: 'ctaPrimary', label: 'Botao principal', type: 'group',
        fields: [
          { key: 'label', label: 'Texto do botao', type: 'text' },
          { key: 'href', label: 'Link ou ancora (ex: #contato)', type: 'text' },
        ],
      },
      {
        key: 'ctaSecondary', label: 'Botao secundario', type: 'group',
        fields: [
          { key: 'label', label: 'Texto do botao', type: 'text' },
          { key: 'href', label: 'Link ou ancora', type: 'text' },
        ],
      },
      {
        key: 'media', label: 'Imagem ou video de fundo', type: 'group',
        fields: [
          { key: 'type', label: 'Tipo', type: 'select', options: [
            { value: 'image', label: 'Imagem' }, { value: 'video', label: 'Video' },
          ] },
          { key: 'image', label: 'Imagem de fundo', type: 'image' },
          { key: 'video', label: 'Video de fundo (sem som, em loop)', type: 'video' },
          { key: 'poster', label: 'Imagem de capa do video', type: 'image' },
          { key: 'alt', label: 'Descricao da imagem (acessibilidade e SEO)', type: 'text' },
          { key: 'objectPosition', label: 'Enquadramento (ex: center, top, 50% 30%)', type: 'text' },
        ],
      },
    ],
  },

  credenciais: {
    label: 'Identificacao e valores',
    hint: 'Nome, CRO e os tres pilares. O CRO aqui e exigencia do Conselho.',
    fields: [
      { key: 'name', label: 'Nome completo', type: 'text' },
      { key: 'role', label: 'Denominacao profissional', type: 'text' },
      { key: 'cro', label: 'CRO com a UF (ex: CRO-ES 12345)', type: 'text' },
      { key: 'atuacao', label: 'Areas de atuacao', type: 'text', hint: 'So use "especialista em" se houver titulo registrado no CRO.' },
      {
        key: 'valores', label: 'Pilares', type: 'list',
        item: [
          { key: 'title', label: 'Titulo', type: 'text' },
          { key: 'text', label: 'Texto', type: 'textarea' },
        ],
      },
    ],
  },

  video: {
    label: 'Video da Camilla',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'text', label: 'Texto', type: 'textarea' },
      { key: 'videoUrl', label: 'Video', type: 'video', hint: 'Suba o arquivo ou cole um link do YouTube/Vimeo.' },
      { key: 'poster', label: 'Imagem de capa', type: 'image' },
      { key: 'caption', label: 'Legenda abaixo do video', type: 'text' },
    ],
  },

  tratamentos: {
    label: 'Tratamentos',
    hint: 'Renderizado como cards empilhados no scroll. De 3 a 5 itens funciona melhor.',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'intro', label: 'Introducao', type: 'textarea' },
      {
        key: 'items', label: 'Cards', type: 'list',
        item: [
          { key: 'number', label: 'Numero (ex: 01)', type: 'text' },
          { key: 'title', label: 'Titulo do tratamento', type: 'text' },
          { key: 'summary', label: 'Resumo', type: 'textarea' },
          { key: 'list', label: 'Procedimentos incluidos', type: 'stringlist' },
          { key: 'image', label: 'Foto', type: 'image' },
          { key: 'alt', label: 'Descricao da foto', type: 'text' },
        ],
      },
    ],
  },

  sintomas: {
    label: 'Sinais e sintomas',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'intro', label: 'Introducao', type: 'textarea' },
      {
        key: 'items', label: 'Sinais', type: 'list',
        item: [
          { key: 'title', label: 'Sinal', type: 'text' },
          { key: 'text', label: 'Explicacao', type: 'textarea' },
        ],
      },
    ],
  },

  sobre: {
    label: 'Sobre a Camilla',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'lead', label: 'Frase de destaque', type: 'textarea' },
      { key: 'paragraphs', label: 'Paragrafos', type: 'stringlist', multiline: true },
      { key: 'image', label: 'Retrato', type: 'image' },
      { key: 'alt', label: 'Descricao do retrato', type: 'text' },
      {
        key: 'formacao', label: 'Formacao e cursos', type: 'list',
        item: [
          { key: 'label', label: 'Formacao', type: 'text' },
          { key: 'detail', label: 'Instituicao e ano', type: 'text' },
        ],
      },
      {
        key: 'cta', label: 'Botao', type: 'group',
        fields: [
          { key: 'label', label: 'Texto', type: 'text' },
          { key: 'href', label: 'Link ou ancora', type: 'text' },
        ],
      },
    ],
  },

  consultorio: {
    label: 'Consultorio',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'text', label: 'Texto', type: 'textarea' },
      {
        key: 'gallery', label: 'Galeria (4 fotos)', type: 'list',
        item: [
          { key: 'image', label: 'Foto', type: 'image' },
          { key: 'alt', label: 'Descricao', type: 'text' },
        ],
      },
      {
        key: 'diferenciais', label: 'Diferenciais', type: 'list',
        item: [
          { key: 'title', label: 'Titulo', type: 'text' },
          { key: 'text', label: 'Texto', type: 'textarea' },
        ],
      },
      {
        key: 'ctaMaps', label: 'Botao do mapa', type: 'group',
        fields: [
          { key: 'label', label: 'Texto', type: 'text' },
          { key: 'href', label: 'Link do Google Maps', type: 'url' },
        ],
      },
    ],
  },

  depoimentos: {
    label: 'Depoimentos',
    hint: 'Fale da EXPERIENCIA de atendimento, nunca do resultado clinico. Publique so com autorizacao por escrito do paciente.',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'intro', label: 'Introducao', type: 'textarea' },
      {
        key: 'items', label: 'Depoimentos', type: 'list',
        item: [
          { key: 'quote', label: 'Depoimento', type: 'textarea' },
          { key: 'name', label: 'Nome', type: 'text' },
          { key: 'context', label: 'Contexto (ex: paciente desde 2024)', type: 'text' },
        ],
      },
      { key: 'googleUrl', label: 'Link das avaliacoes no Google', type: 'url' },
    ],
  },

  faq: {
    label: 'Perguntas frequentes',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      {
        key: 'items', label: 'Perguntas', type: 'list',
        item: [
          { key: 'q', label: 'Pergunta', type: 'text' },
          { key: 'a', label: 'Resposta', type: 'textarea' },
        ],
      },
    ],
  },

  contato: {
    label: 'Contato e WhatsApp',
    fields: [
      { key: 'eyebrow', label: 'Etiqueta', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'text', label: 'Texto', type: 'textarea' },
      {
        key: 'whatsapp', label: 'WhatsApp', type: 'group',
        fields: [
          { key: 'number', label: 'Numero com DDI e DDD (ex: 5527999999999)', type: 'text' },
          { key: 'message', label: 'Mensagem que ja vem escrita', type: 'textarea' },
          { key: 'label', label: 'Texto do botao', type: 'text' },
        ],
      },
      { key: 'formEnabled', label: 'Mostrar formulario', type: 'toggle' },
      { key: 'interesses', label: 'Opcoes do campo "sobre o que quer falar"', type: 'stringlist' },
      { key: 'successMessage', label: 'Mensagem apos enviar', type: 'text' },
    ],
  },

  footer: {
    label: 'Rodape',
    hint: 'O bloco legal (nome, CRO, responsavel tecnico) e obrigatorio por lei. Preencha, nao apague.',
    fields: [
      { key: 'logoText', label: 'Nome no rodape', type: 'text' },
      { key: 'tagline', label: 'Linha de apoio', type: 'text' },
      {
        key: 'endereco', label: 'Endereco', type: 'group',
        fields: [
          { key: 'street', label: 'Rua e numero', type: 'text' },
          { key: 'complement', label: 'Complemento', type: 'text' },
          { key: 'district', label: 'Bairro', type: 'text' },
          { key: 'city', label: 'Cidade', type: 'text' },
          { key: 'state', label: 'Estado', type: 'text' },
          { key: 'cep', label: 'CEP', type: 'text' },
          { key: 'mapsEmbed', label: 'URL do mapa incorporado', type: 'url', hint: 'No Google Maps: Compartilhar > Incorporar mapa > copie so o endereco dentro do src.' },
          { key: 'mapsLink', label: 'Link "como chegar"', type: 'url' },
        ],
      },
      {
        key: 'horarios', label: 'Horarios', type: 'list',
        item: [
          { key: 'day', label: 'Dias', type: 'text' },
          { key: 'hours', label: 'Horario', type: 'text' },
        ],
      },
      {
        key: 'social', label: 'Redes', type: 'group',
        fields: [
          { key: 'instagram', label: 'Instagram', type: 'url' },
          { key: 'whatsapp', label: 'WhatsApp (deixe vazio para usar o numero acima)', type: 'url' },
          { key: 'facebook', label: 'Facebook', type: 'url' },
        ],
      },
      {
        key: 'legal', label: 'Dados obrigatorios (CFO)', type: 'group',
        fields: [
          { key: 'profissional', label: 'Nome completo', type: 'text' },
          { key: 'denominacao', label: 'Denominacao profissional', type: 'text' },
          { key: 'cro', label: 'CRO com a UF', type: 'text' },
          { key: 'responsavelTecnico', label: 'Responsavel tecnico e CRO', type: 'text' },
          { key: 'cnpj', label: 'CNPJ', type: 'text' },
          { key: 'aviso', label: 'Aviso legal', type: 'textarea' },
        ],
      },
    ],
  },

  nav: {
    label: 'Menu',
    fields: [
      { key: 'logoText', label: 'Nome no menu', type: 'text' },
      { key: 'logoImage', label: 'Logo (imagem)', type: 'image' },
      {
        key: 'links', label: 'Links', type: 'list',
        item: [
          { key: 'label', label: 'Texto', type: 'text' },
          { key: 'href', label: 'Ancora (ex: #tratamentos)', type: 'text' },
        ],
      },
      {
        key: 'cta', label: 'Botao do menu', type: 'group',
        fields: [
          { key: 'label', label: 'Texto', type: 'text' },
          { key: 'href', label: 'Ancora', type: 'text' },
        ],
      },
    ],
  },

  seo: {
    label: 'SEO',
    hint: 'Coloque a cidade no titulo. E o que mais ajuda a aparecer nas buscas locais.',
    fields: [
      { key: 'title', label: 'Titulo da pagina', type: 'text', hint: 'Ate 60 caracteres. Ex: Dra. Camilla Barros | Dentista em Vitoria, ES' },
      { key: 'description', label: 'Descricao', type: 'textarea', hint: 'Ate 155 caracteres.' },
      { key: 'siteUrl', label: 'Endereco do site', type: 'url' },
      { key: 'ogImage', label: 'Imagem de compartilhamento', type: 'image', hint: '1200x630px.' },
      { key: 'favicon', label: 'Favicon', type: 'image' },
      { key: 'themeColor', label: 'Cor do navegador', type: 'text' },
      {
        key: 'schema', label: 'Dados para o Google (negocio local)', type: 'group',
        fields: [
          { key: 'name', label: 'Nome do consultorio', type: 'text' },
          { key: 'street', label: 'Rua e numero', type: 'text' },
          { key: 'district', label: 'Bairro', type: 'text' },
          { key: 'city', label: 'Cidade', type: 'text' },
          { key: 'state', label: 'Estado (sigla)', type: 'text' },
          { key: 'postalCode', label: 'CEP', type: 'text' },
          { key: 'latitude', label: 'Latitude', type: 'text' },
          { key: 'longitude', label: 'Longitude', type: 'text' },
        ],
      },
    ],
  },

  settings: {
    label: 'Configuracoes',
    fields: [
      { key: 'whatsappFloat', label: 'Botao flutuante do WhatsApp', type: 'toggle' },
      { key: 'smoothScroll', label: 'Scroll suave', type: 'toggle' },
      { key: 'grain', label: 'Textura de grao', type: 'toggle' },
      { key: 'loadingScreen', label: 'Tela de carregamento', type: 'toggle' },
    ],
  },
}

// Ordem e rotulos do menu lateral. 'visibility' e 'leads' tem telas proprias.
export const SIDEBAR = [
  { key: 'hero', label: 'Topo' },
  { key: 'credenciais', label: 'Identificacao' },
  { key: 'video', label: 'Video' },
  { key: 'tratamentos', label: 'Tratamentos' },
  { key: 'sintomas', label: 'Sinais' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'consultorio', label: 'Consultorio' },
  { key: 'depoimentos', label: 'Depoimentos' },
  { key: 'faq', label: 'Perguntas' },
  { key: 'contato', label: 'Contato' },
  { key: 'nav', label: 'Menu' },
  { key: 'footer', label: 'Rodape' },
  { key: 'visibility', label: 'Secoes do site', custom: true },
  { key: 'leads', label: 'Contatos recebidos', custom: true },
  { key: 'seo', label: 'SEO' },
  { key: 'settings', label: 'Configuracoes' },
  { key: 'conta', label: 'Minha conta', custom: true },
]

export const SECTION_LABELS = {
  credenciais: 'Identificacao e valores',
  video: 'Video da Camilla',
  tratamentos: 'Tratamentos',
  sintomas: 'Sinais e sintomas',
  sobre: 'Sobre a Camilla',
  consultorio: 'Consultorio',
  depoimentos: 'Depoimentos',
  faq: 'Perguntas frequentes',
  contato: 'Contato',
}
