import { useCallback, useEffect, useState } from 'react'
import {
  listarPacientes, buscarFicha, salvarPaciente, registrarAtendimento, arquivarCard,
  apagarPaciente,
} from '../../data/agendaApi'
import { ESTAGIOS } from '../../lib/funil'
import { brtDataCurta } from '../../lib/brt'
import PanelState, { SearchField } from '../ui/PanelState'
import { IconeEditar, IconeExcluir, IconeWhatsApp } from '../ui/Icones'
import DateField from '../ui/DateField'

/**
 * Pacientes: lista a esquerda, ficha a direita.
 *
 * Nao e modal. Ficha e registro que se consulta enquanto se olha outra coisa,
 * e um modal obrigaria fechar pra voltar a lista. Fora que o design system nao
 * tem modal, e criar um (foco preso, Esc, inert no fundo, trava de scroll) e
 * custo real que esta tela nao precisa pagar.
 *
 * A ficha e leve de proposito: nao e prontuario. Anamnese, imagem clinica e
 * odontograma exigiriam certificacao SBIS/CFM e guarda permanente.
 */
export default function PacientesPanel() {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState([])
  const [estado, setEstado] = useState('carregando')
  const [erro, setErro] = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const carregar = useCallback(async (q) => {
    setEstado('carregando')
    const r = await listarPacientes(q)
    if (!r.ok) { setErro(r.error); setEstado('erro'); return }
    setLista(r.data.pacientes)
    setEstado('pronto')
  }, [])

  // Debounce: sem ele, cada tecla vira uma consulta.
  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 250)
    return () => clearTimeout(t)
  }, [busca, carregar])

  /**
   * Exclusao a pedido da titular (LGPD art. 18).
   *
   * Nao derruba a linha: anonimiza. O agendamento passado precisa continuar
   * existindo pra agenda nao ficar com buraco, mas nada nele identifica mais
   * ninguem. Por ser irreversivel, a confirmacao diz o que vai acontecer em
   * vez de perguntar "tem certeza?".
   */
  const excluir = useCallback(
    async (p) => {
      const ok = confirm(
        `Excluir os dados de ${p.nome}?\n\n` +
          'Nome, telefone, e-mail, observacoes e o que foi anotado nos atendimentos ' +
          'sao apagados. Os horarios passados continuam na agenda, sem identificacao.\n\n' +
          'Isso nao tem volta.'
      )
      if (!ok) return
      const r = await apagarPaciente(p.id)
      if (!r.ok) { setErro(r.error); return }
      if (selecionado === p.id) setSelecionado(null)
      carregar(busca)
    },
    [busca, carregar, selecionado]
  )

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Pacientes</h1>
          <p className="a-hint">Cadastro e historico de atendimento.</p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn a-btn--primary" onClick={() => setSelecionado('novo')}>
            Nova paciente
          </button>
        </div>
      </header>

      <div className={`p-master ${selecionado ? 'tem-ficha' : ''}`}>
        <div className="a-card p-lista">
          <div className="a-card__head">
            <strong>
              {estado === 'pronto' ? `${lista.length} ${lista.length === 1 ? 'paciente' : 'pacientes'}` : 'Pacientes'}
            </strong>
          </div>

          <div className="a-card__body p-lista__corpo">
            <SearchField valor={busca} onChange={setBusca} placeholder="Buscar por nome ou telefone" />

            <PanelState
              estado={estado === 'pronto' && lista.length === 0 ? 'vazio' : estado}
              erro={erro}
              vazio={busca ? 'Ninguem com esse nome.' : 'Nenhuma paciente cadastrada ainda.'}
              onTentarDeNovo={() => carregar(busca)}
            >
              <ul className="p-lista__itens">
                {lista.map((p) => {
                  const zap = p.telefone ? `https://wa.me/${String(p.telefone).replace(/\D/g, '')}` : null
                  return (
                    <li key={p.id} className={`p-linha ${selecionado === p.id ? 'is-active' : ''}`}>
                      <button
                        type="button"
                        className="p-linha__quem"
                        onClick={() => setSelecionado(p.id)}
                      >
                        <strong>{p.nome}</strong>
                        <span className="a-hint">
                          {p.telefone || 'sem telefone'}
                          {p.situacao ? ` · ${ESTAGIOS.find((e) => e.id === p.situacao)?.label || p.situacao}` : ''}
                        </span>
                        {p.alerta && <span className="p-linha__alerta" title={p.alerta}>!</span>}
                      </button>

                      {/* Icone em vez de palavra: tres rotulos por linha comiam
                          a largura e empurravam nome e telefone pra tres linhas.
                          Cada um leva aria-label — botao so com icone nao tem
                          nome acessivel nenhum. */}
                      <div className="a-rowactions p-linha__acoes">
                        <button
                          type="button"
                          onClick={() => setSelecionado(p.id)}
                          aria-label={`Editar ${p.nome}`}
                          title="Editar"
                        >
                          <IconeEditar />
                        </button>
                        {zap && (
                          <a
                            href={zap}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Falar com ${p.nome} no WhatsApp`}
                            title="WhatsApp"
                          >
                            <IconeWhatsApp />
                          </a>
                        )}
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => excluir(p)}
                          aria-label={`Excluir os dados de ${p.nome}`}
                          title="Excluir"
                        >
                          <IconeExcluir />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </PanelState>
          </div>
        </div>

        {selecionado && (
          <Ficha
            id={selecionado === 'novo' ? null : selecionado}
            onFechar={() => setSelecionado(null)}
            onSalvou={(id) => { setSelecionado(id); carregar(busca) }}
          />
        )}
      </div>
    </div>
  )
}

const VAZIO = {
  nome: '', telefone: '', email: '', nascimento: '', origem: '', indicadoPor: '',
  bairro: '', cidade: '', contatoPref: '', alerta: '', observacoes: '',
}

function Ficha({ id, onFechar, onSalvou }) {
  const [dados, setDados] = useState(VAZIO)
  const [ficha, setFicha] = useState(null)
  const [estado, setEstado] = useState(id ? 'carregando' : 'pronto')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!id) { setDados(VAZIO); setFicha(null); setEstado('pronto'); return }
    let vivo = true
    setEstado('carregando')
    buscarFicha(id).then((r) => {
      if (!vivo) return
      if (!r.ok) { setMsg({ tipo: 'erro', texto: r.error }); setEstado('erro'); return }
      const p = r.data.paciente
      setDados({
        nome: p.nome || '', telefone: p.telefone || '', email: p.email || '',
        nascimento: p.nascimento ? String(p.nascimento).slice(0, 10) : '',
        origem: p.origem || '', indicadoPor: p.indicado_por || '',
        bairro: p.bairro || '', cidade: p.cidade || '',
        contatoPref: p.contato_pref || '', alerta: p.alerta || '',
        observacoes: p.observacoes || '',
      })
      setFicha(r.data)
      setEstado('pronto')
    })
    return () => { vivo = false }
  }, [id])

  const campo = (k) => ({
    value: dados[k],
    onChange: (e) => setDados((d) => ({ ...d, [k]: e.target.value })),
  })

  async function salvar(e) {
    e.preventDefault()
    setMsg(null)
    const r = await salvarPaciente({ id, ...dados })
    if (!r.ok) { setMsg({ tipo: 'erro', texto: r.error }); return }
    setMsg({ tipo: 'ok', texto: 'Salvo.' })
    onSalvou(r.data.id)
  }

  const estagio = ficha?.paciente?.situacao
  const rotuloEstagio = ESTAGIOS.find((e) => e.id === estagio)?.label

  return (
    <section className="p-ficha">
      <header className="p-ficha__head">
        <div>
          <h2>{id ? dados.nome || 'Ficha' : 'Nova paciente'}</h2>
          {ficha && (
            <p className="a-hint">
              {rotuloEstagio}
              {ficha.primeiraConsulta ? ' · ainda nao foi atendida' : ''}
            </p>
          )}
        </div>
        <button type="button" className="a-btn a-btn--sm" onClick={onFechar}>Fechar</button>
      </header>

      <PanelState estado={estado} erro={msg?.texto}>
        <form className="a-form" onSubmit={salvar}>
          <div className="a-field">
            <label htmlFor="pf-nome">Nome completo</label>
            <input id="pf-nome" type="text" required {...campo('nome')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-tel">WhatsApp</label>
            <input id="pf-tel" type="tel" inputMode="tel" placeholder="(27) 99999-0000" {...campo('telefone')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-email">E-mail</label>
            <input id="pf-email" type="email" {...campo('email')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-nasc">Nascimento</label>
            <DateField id="pf-nasc" value={dados.nascimento}
              onChange={(v) => setDados((d) => ({ ...d, nascimento: v }))} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-origem">Como conheceu</label>
            <input id="pf-origem" type="text" placeholder="indicacao, Instagram, Google..." {...campo('origem')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-indic">Quem indicou</label>
            <input id="pf-indic" type="text" {...campo('indicadoPor')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-alerta">Atencao antes de atender</label>
            <input id="pf-alerta" type="text" placeholder="ansiosa, explicar cada passo" {...campo('alerta')} />
          </div>
          <div className="a-field">
            <label htmlFor="pf-obs">Observacoes</label>
            <textarea id="pf-obs" rows={4} {...campo('observacoes')} />
          </div>

          {msg && <p className={`a-hint a-hint--${msg.tipo === 'erro' ? 'error' : 'ok'}`}>{msg.texto}</p>}

          <div className="a-rowactions">
            <button type="submit" className="a-btn a-btn--primary">Salvar</button>
          </div>
        </form>

        {ficha?.contatos?.length > 0 && (
          <Recados
            contatos={ficha.contatos}
            onMudou={() => id && buscarFicha(id).then((r) => r.ok && setFicha(r.data))}
          />
        )}

        {ficha && <Historico ficha={ficha} onMudou={() => id && buscarFicha(id).then((r) => r.ok && setFicha(r.data))} />}
      </PanelState>
    </section>
  )
}

/**
 * Mensagens que a paciente mandou pelo formulario do site.
 *
 * O card dela no funil avisa que chegou recado, mas o texto so pode ser lido
 * aqui — e sem isso o aviso seria um alerta que nao leva a lugar nenhum.
 *
 * "Marcar como respondida" arquiva o contato: e o que tira o aviso do card.
 * Sem esse gesto o alerta ficaria aceso para sempre.
 */
function Recados({ contatos, onMudou }) {
  async function responder(id) {
    const r = await arquivarCard({ tipo: 'lead', id })
    if (r.ok) onMudou()
  }

  return (
    <div className="p-hist">
      <h3>Mensagens pelo site</h3>
      <ul className="p-hist__lista">
        {contatos.map((m) => (
          <li key={m.id} className="p-hist__item">
            <div className="p-hist__topo">
              <strong>{brtDataCurta(m.created_at)}</strong>
              <span className="a-hint">{m.interest || m.source}</span>
            </div>
            {m.message && <p>{m.message}</p>}
            {m.arquivado_em ? (
              <span className="a-hint">Respondida</span>
            ) : (
              <button type="button" className="a-btn a-btn--sm" onClick={() => responder(m.id)}>
                Marcar como respondida
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Historico({ ficha, onMudou }) {
  const [abrindo, setAbrindo] = useState(null)
  const [form, setForm] = useState({ procedimentoRealizado: '', regiao: '', proximosPassos: '', retornoSemanas: '' })

  async function registrar(e, agendamentoId) {
    e.preventDefault()
    const r = await registrarAtendimento({ id: agendamentoId, ...form, marcarRealizado: true })
    if (!r.ok) return
    setAbrindo(null)
    setForm({ procedimentoRealizado: '', regiao: '', proximosPassos: '', retornoSemanas: '' })
    onMudou()
  }

  return (
    <div className="p-hist">
      <h3>Atendimentos</h3>
      {ficha.historico.length === 0 && <p className="a-hint">Nenhum atendimento registrado.</p>}

      <ul className="p-hist__lista">
        {ficha.historico.map((h) => (
          <li key={h.id} className="p-hist__item">
            <div className="p-hist__topo">
              <strong>{h.data}</strong>
              <span className="a-hint">{h.procedimento_nome} · {h.status}</span>
            </div>
            {h.procedimento_realizado && <p>{h.procedimento_realizado}</p>}
            {h.regiao && <p className="a-hint">Regiao: {h.regiao}</p>}
            {h.proximos_passos && <p className="p-hist__proximo">Proximo: {h.proximos_passos}</p>}

            {!h.procedimento_realizado && h.status !== 'cancelado' && (
              abrindo === h.id ? (
                <form className="a-form p-hist__form" onSubmit={(e) => registrar(e, h.id)}>
                  <div className="a-field">
                    <label htmlFor={`h-proc-${h.id}`}>O que foi feito</label>
                    <textarea
                      id={`h-proc-${h.id}`}
                      rows={2}
                      value={form.procedimentoRealizado}
                      onChange={(e) => setForm((f) => ({ ...f, procedimentoRealizado: e.target.value }))}
                    />
                  </div>
                  <div className="a-field">
                    <label htmlFor={`h-reg-${h.id}`}>Regiao ou dente</label>
                    <input
                      id={`h-reg-${h.id}`}
                      type="text"
                      value={form.regiao}
                      onChange={(e) => setForm((f) => ({ ...f, regiao: e.target.value }))}
                    />
                  </div>
                  <div className="a-field">
                    <label htmlFor={`h-prox-${h.id}`}>Proximo passo</label>
                    <input
                      id={`h-prox-${h.id}`}
                      type="text"
                      value={form.proximosPassos}
                      onChange={(e) => setForm((f) => ({ ...f, proximosPassos: e.target.value }))}
                    />
                  </div>
                  <div className="a-rowactions">
                    <button type="submit" className="a-btn a-btn--sm a-btn--primary">Registrar</button>
                    <button type="button" className="a-btn a-btn--sm" onClick={() => setAbrindo(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="a-btn a-btn--sm" onClick={() => setAbrindo(h.id)}>
                  Registrar atendimento
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
