import { useMemo, useState } from 'react'
import { matrizDoMes, brtParts, brtDayStart, nomeMes, hojeBRT, somaDias } from '../../lib/brt'

/**
 * Calendario de mes, usado como navegador da agenda.
 *
 * Escrito a mao, sem biblioteca, e nao por teimosia: toda lib de calendario
 * mainstream formata via Intl.DateTimeFormat com timeZone, que e exatamente o
 * que este projeto nao usa. Instalar uma significaria pagar o bundle E ainda
 * escrever o helper de fuso. A matriz do mes ja existe em brt.js.
 *
 * `marcados` e um Set de 'YYYY-MM-DD' com atendimento no dia — o ponto embaixo
 * do numero e o que faz o calendario valer mais que um seletor de data.
 */
export default function MiniCalendario({ selecionado, onSelecionar, marcados }) {
  const base = brtParts(brtDayStart(selecionado) || new Date())
  const [mes, setMes] = useState({ ano: base.ano, mes: base.mes })

  const semanas = useMemo(() => matrizDoMes(mes.ano, mes.mes), [mes])
  const hoje = hojeBRT()
  const prefixo = `${mes.ano}-${String(mes.mes).padStart(2, '0')}`

  const andar = (n) => {
    const total = mes.mes - 1 + n
    setMes({ ano: mes.ano + Math.floor(total / 12), mes: ((total % 12) + 12) % 12 + 1 })
  }

  return (
    <div className="mc">
      <header className="mc__head">
        <button type="button" onClick={() => andar(-1)} aria-label="Mes anterior">&lsaquo;</button>
        <strong>{nomeMes(mes.mes)} {mes.ano}</strong>
        <button type="button" onClick={() => andar(1)} aria-label="Proximo mes">&rsaquo;</button>
      </header>

      <div className="mc__grade" role="grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span className="mc__dow" key={i} aria-hidden="true">{d}</span>
        ))}

        {semanas.flat().map((dataKey) => {
          const dia = Number(dataKey.slice(8))
          const foraDoMes = !dataKey.startsWith(prefixo)
          const classes = [
            'mc__dia',
            foraDoMes ? 'is-fora' : '',
            dataKey === hoje ? 'is-hoje' : '',
            dataKey === selecionado ? 'is-sel' : '',
            marcados?.has(dataKey) ? 'tem-evento' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              type="button"
              key={dataKey}
              className={classes}
              aria-current={dataKey === selecionado ? 'date' : undefined}
              onClick={() => onSelecionar(dataKey)}
            >
              {dia}
            </button>
          )
        })}
      </div>

      <button type="button" className="mc__hoje" onClick={() => {
        onSelecionar(hoje)
        const p = brtParts(brtDayStart(hoje))
        setMes({ ano: p.ano, mes: p.mes })
      }}>
        Ir para hoje
      </button>
    </div>
  )
}

/** Segunda-feira da semana de uma dataKey. */
export function inicioDaSemana(dataKey) {
  const d = brtParts(brtDayStart(dataKey))
  // brtParts conta domingo como 0; a semana do consultorio comeca na segunda.
  return somaDias(dataKey, d.diaSemana === 0 ? -6 : -(d.diaSemana - 1))
}
