# Marca — Dra. Camilla Barros

Kit digital derivado do logotipo original. Servido estaticamente, então cada
peça tem URL pública: `https://dracamillabarros.com/marca/azul/monograma.png`.

## Peças

Três cores, quatro peças em cada:

```
marca/
  preto/    lockup-horizontal.png  lockup-vertical.png  monograma.png  wordmark.png
  azul/     (as mesmas quatro)
  branco/   (as mesmas quatro)
```

| Peça | Dimensão | Quando usar |
|---|---|---|
| `lockup-horizontal.png` | 1127×385 | Cabeçalho, assinatura de e-mail, banner — onde sobra largura |
| `lockup-vertical.png` | 614×577 | Rodapé, post quadrado, material centralizado |
| `monograma.png` | 459×385 | Favicon, avatar, selo, espaço pequeno. Sempre legível |
| `wordmark.png` | 614×160 | Ao lado de outra marca, ou quando o monograma já aparece perto |

| Cor | Valor | Fundo |
|---|---|---|
| `preto` | `#111111` | Claro |
| `azul` | `#2F4858` | Claro — é a paleta aprovada do site |
| `branco` | `#FFFFFF` | Escuro, foto, ou o azul da marca |

## Limite conhecido: não serve para impressão

A origem é um PNG de 1080×1080, então o monograma extraído tem 459px de
largura. Isso cobre site, e-mail, Instagram e WhatsApp com folga.

**Não use em cartão de visita, fachada, jaleco, papelaria ou qualquer peça
impressa.** Ampliar borra, e vetor não se recupera de bitmap: o monograma CB
entrelaçado não se redesenha à mão com fidelidade.

Para impressão é preciso o arquivo vetorial original (`.ai`, `.eps`, `.svg` ou
PDF vetorial) de quem desenhou a marca. Com ele, este kit inteiro se regenera
em qualquer tamanho — e vale trocar os PNG por SVG também no site.

## Como foram gerados

Todas as peças vêm de `logo-lockup.png`, que guarda a arte em cor chapada com o
antialiasing inteiramente no canal alfa. Por isso recolorir é só trocar o RGB
preservando o alfa: a borda suave continua suave, sem franja cinza.

O corte entre monograma e assinatura foi medido no perfil de tinta por linha —
existe uma faixa de 32px sem tinta nenhuma em `y 385–416`. O lockup horizontal
é composto: monograma à esquerda, wordmark à direita, centrados verticalmente,
com respiro de 14% da altura do monograma.

## Arquivos antigos

`logo-camilla-barros.png`, `logo-lockup.png`, `logo-monograma.png` e os
`-datauri.txt` continuam aqui porque `Navbar.jsx` e `Footer.jsx` apontam para
eles. Ao migrar os componentes para as pastas por cor, estes podem sair.

Os `-datauri.txt` **não servem para e-mail**: o Gmail remove imagens em `data:`.
Em e-mail, sempre URL absoluta `https://`.
