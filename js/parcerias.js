/* Skin Expert Pro — Parcerias: estúdio (plano Studio), conexões (plano Essencial) e indicar cliente.
   Carregar no index.html depois de js/agenda-estudio.js.

   Meu Negócio › Parcerias
   - Estúdio: criar (plano Studio), código de convite, profissionais, salas, entrar com código, sair.
   - Conexões: meu código, pedir, aceitar/recusar, desfazer (até 2).
   Pacientes
   - "Indicar para colega" na aba Dados: copia só nome, telefone, e-mail, país e nascimento.
   - Etiqueta "Indicada por …" na lista e aviso quando chega uma indicação.
   Tudo passa por funções do banco que conferem quem está logada. */

(function(){
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || 'Profissional';
  const iniciais = n => { const p = String(n || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
  const msgErro = e => String((e && e.message) || e || 'Erro inesperado.').replace(/^(JA_EXISTE|SALA_OCUPADA|LOCAL_INVALIDO):\s*/, '');
  const CORES = ['pink', 'gold', 'olive'];
  const demo = () => typeof modoDemonstracao !== 'undefined' && modoDemonstracao;
  const dataCurta = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : `${d.getDate()} de ${monthNames[d.getMonth()]}`; };
  const avisarAgenda = () => { try{ window.agendaCompartilhadaRecarregar && window.agendaCompartilhadaRecarregar(); }catch(e){} };

  const P = { plano: 'essencial', estudios: [], equipes: {}, salas: {}, codigo: '', conexoes: [], carregado: false, carregando: null, erro: '' };

  /* ---------- Janela de confirmação (o app não usa confirm() do navegador) ---------- */
  let janela = null;
  function fechar(){ if(janela){ janela.remove(); janela = null; } }
  function abrir(html){
    fechar();
    janela = document.createElement('div');
    janela.className = 'modal-overlay open parc-janela';
    janela.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
    janela.addEventListener('click', e => { if(e.target === janela || e.target.closest('[data-fechar]')) fechar(); });
    document.body.appendChild(janela);
    const f = janela.querySelector('select, input, .modal-btn-confirm'); if(f) f.focus();
    return janela;
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && janela) fechar(); });
  function confirmar(titulo, texto, botao, acao){
    const j = abrir(`<h3>${esc(titulo)}</h3><p class="parc-texto">${esc(texto)}</p><div id="parcConfErro"></div>
      <div class="modal-actions"><button type="button" class="modal-btn-cancel" data-fechar>Cancelar</button><button type="button" class="modal-btn-confirm" id="parcConfOk">${esc(botao)}</button></div>`);
    j.querySelector('#parcConfOk').addEventListener('click', async ev => {
      ev.target.disabled = true;
      try{ await acao(); fechar(); }
      catch(e){ ev.target.disabled = false; j.querySelector('#parcConfErro').innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
    });
  }
  async function rpc(nome, args){
    const { data, error } = await supabaseClient.rpc(nome, args || {});
    if(error) throw error;
    return data;
  }

  /* ---------- Carregar ---------- */
  async function carregar(){
    if(P.carregando) return P.carregando;
    P.carregando = (async () => {
      try{
        const [plano, est, cod, con] = await Promise.all([
          rpc('meu_plano').catch(() => 'essencial'),
          rpc('estudio_meu'),
          rpc('meu_codigo_conexao').catch(() => ''),
          rpc('minhas_conexoes'),
        ]);
        P.plano = plano || 'essencial';
        P.estudios = est || [];
        P.codigo = cod || '';
        P.conexoes = con || [];
        const detalhes = await Promise.all(P.estudios.map(s => Promise.all([
          rpc('estudio_equipe', { p_estudio: s.estudio_id }),
          supabaseClient.from('estudio_salas').select('id, nome, ordem').eq('estudio_id', s.estudio_id).eq('ativo', true).order('ordem').then(r => r.data || []),
        ])));
        P.equipes = {}; P.salas = {};
        P.estudios.forEach((s, i) => {
          P.equipes[s.estudio_id] = (detalhes[i][0] || []).sort((a, b) => Number(a.ordem) - Number(b.ordem));
          P.salas[s.estudio_id] = detalhes[i][1];
        });
        P.erro = ''; P.carregado = true;
      } catch(e){
        P.erro = msgErro(e);
        console.warn('Parcerias:', e);
      } finally { P.carregando = null; }
    })();
    return P.carregando;
  }

  /* ---------- Tela Meu Negócio › Parcerias ---------- */
  const painel = () => document.getElementById('eqpanel-parcerias');

  async function abrirPainel(){
    const el = painel(); if(!el) return;
    if(demo()){ el.innerHTML = `<div class="parc-card"><h2>Parcerias</h2><p class="parc-texto">No modo demonstração não dá para criar estúdio nem conexões. Entre com a sua conta para usar.</p></div>`; return; }
    if(!P.carregado) el.innerHTML = '<div class="parc-card"><p class="parc-texto">Carregando…</p></div>';
    await carregar();
    desenhar();
  }

  function desenhar(){
    const el = painel(); if(!el) return;
    if(P.erro){
      el.innerHTML = `<div class="parc-card"><div class="parc-erro">Não foi possível carregar as parcerias (${esc(P.erro)}). Recarregue a página.</div></div>`;
      return;
    }
    const souTitular = P.estudios.some(s => s.papel === 'titular');
    const podeCriar = ['studio', 'expert'].includes(P.plano) && !souTitular && P.estudios.length < 2;
    const podeEntrar = P.estudios.length < 2;

    let estudioHtml = P.estudios.map(cartaoEstudio).join('');
    if(podeCriar) estudioHtml += cartaoCriar(!P.estudios.length);
    if(podeEntrar) estudioHtml += cartaoEntrar();
    if(!P.estudios.length && !podeCriar) estudioHtml += `<p class="parc-dica">Quer dividir agenda e salas com até 3 profissionais? Isso é o <b>plano Studio</b>: a titular assina e convida as outras pelo código.</p>`;

    el.innerHTML = `
      <div class="parc-grid">
        <section class="parc-col" aria-label="Estúdio">
          <div class="parc-col-head"><h2>Estúdio</h2><span>Plano Studio · agenda e salas divididas, até 3 profissionais</span></div>
          ${estudioHtml}
        </section>
        <section class="parc-col" aria-label="Conexões">
          <div class="parc-col-head"><h2>Conexões</h2><span>Parceiras de confiança · veem só quando você está ocupada</span></div>
          ${cartaoConexoes()}
        </section>
      </div>`;
    ligar(el);
  }

  function linhaMembro(m, i, titular, estId){
    return `<div class="parc-membro" style="--pc:var(--${CORES[i % CORES.length]})">
      <span class="parc-av">${esc(iniciais(m.nome))}</span>
      <span class="parc-membro-nome">${esc(m.nome)}${m.email ? `<small>${esc(m.email)}</small>` : ''}</span>
      <span class="parc-pill ${m.papel === 'titular' ? 'tit' : ''}">${m.papel === 'titular' ? 'Titular' : 'Profissional'}</span>
      ${titular && m.papel !== 'titular' ? `<button type="button" class="parc-link-perigo" data-remover="${esc(m.profissional_id)}" data-estudio="${esc(estId)}" data-nome="${esc(m.nome)}">Remover</button>` : ''}
    </div>`;
  }

  function cartaoEstudio(s){
    const titular = s.papel === 'titular';
    const equipe = P.equipes[s.estudio_id] || [];
    const salas = P.salas[s.estudio_id] || [];
    const vagas = Math.max(0, (s.max_profissionais || 3) - equipe.length);
    const vagasHtml = Array.from({ length: titular ? vagas : 0 }, () => `<div class="parc-membro"><span class="parc-av vazia">+</span><span class="parc-membro-nome vaga">Vaga livre · use o código de convite</span></div>`).join('');
    const espacoTxt = s.espaco === 'separadas' && salas.length ? salas.map(x => esc(x.nome)).join(' · ') : 'Sala compartilhada: um atendimento por vez.';

    if(!titular){
      return `<div class="parc-card">
        <div class="parc-card-head"><div><h3>${esc(s.nome)}</h3><span class="parc-sub">Você é profissional neste estúdio</span></div></div>
        <div class="parc-membros">${equipe.map((m, i) => linhaMembro(m, i, false, s.estudio_id)).join('')}</div>
        <div class="parc-bloco"><div class="parc-rot">${s.espaco === 'separadas' ? 'Salas' : 'Espaço'}</div><p class="parc-texto">${espacoTxt}</p></div>
        <p class="parc-texto">Suas clientes, fichas e financeiro continuam só seus. As colegas veem na Agenda o serviço e o horário dos seus atendimentos neste estúdio, sem o nome da cliente.</p>
        <div class="parc-acoes"><button type="button" class="modal-btn-cancel" data-sair="${esc(s.estudio_id)}" data-nome="${esc(s.nome)}">Sair do estúdio</button></div>
      </div>`;
    }

    const venc = s.codigo_validade ? new Date(s.codigo_validade) : null;
    const vencido = venc && venc < new Date();
    const msg = mensagemConvite(s);
    return `<div class="parc-card">
      <div class="parc-card-head"><div><h3>${esc(s.nome)}</h3><span class="parc-sub">Você é a titular · ${equipe.length} de ${s.max_profissionais || 3} profissionais</span></div>
        <button type="button" class="modal-btn-cancel" data-editar="${esc(s.estudio_id)}">Editar estúdio</button></div>
      <div class="parc-codigo ${vencido || !vagas ? 'off' : ''}">
        <div class="parc-rot">Código de convite</div>
        <div class="parc-codigo-num" id="parcCodigo-${esc(s.estudio_id)}">${esc(s.codigo_convite || '—')}</div>
        <div class="parc-codigo-meta">${!vagas ? 'Estúdio completo: remova alguém para liberar uma vaga' : vencido ? 'Código vencido: gere um novo' : venc ? `Vale até ${dataCurta(s.codigo_validade)} · ${vagas} vaga${vagas > 1 ? 's' : ''}` : ''}</div>
        <div class="parc-acoes centro">
          <button type="button" class="modal-btn-cancel" data-copiar="${esc(s.estudio_id)}" ${vencido || !vagas ? 'disabled' : ''}>Copiar mensagem</button>
          <button type="button" class="modal-btn-cancel" data-novocod="${esc(s.estudio_id)}">Gerar outro código</button>
        </div>
      </div>
      <div class="parc-msg" id="parcMsg-${esc(s.estudio_id)}">${esc(msg)}</div>
      <div class="parc-bloco"><div class="parc-rot">Profissionais</div><div class="parc-membros">${equipe.map((m, i) => linhaMembro(m, i, true, s.estudio_id)).join('')}${vagasHtml}</div></div>
      <div class="parc-bloco"><div class="parc-rot">${s.espaco === 'separadas' ? 'Salas' : 'Espaço'}</div><p class="parc-texto">${espacoTxt}</p></div>
    </div>`;
  }
  function mensagemConvite(s){
    return `Oi! Entra no ${s.nome} no Skin Expert Pro.\n1. Crie sua conta em app.skinexpertpro.com\n2. Vá em Meu Negócio › Parcerias › Entrar num estúdio\n3. Digite o código: ${s.codigo_convite}`;
  }

  function formularioEspaco(prefixo, espaco, salas){
    const nomes = [0, 1, 2].map(i => (salas[i] && salas[i].nome) || `Sala ${i + 1}`);
    return `
      <div class="modal-field"><label>Como é o espaço?</label>
        <div class="parc-opcoes">
          <label class="parc-opcao"><input type="radio" name="${prefixo}Espaco" value="separadas" ${espaco === 'separadas' ? 'checked' : ''}><span><b>Salas separadas</b>Cada atendimento fica numa sala. O app sugere a primeira sala livre.</span></label>
          <label class="parc-opcao"><input type="radio" name="${prefixo}Espaco" value="compartilhada" ${espaco !== 'separadas' ? 'checked' : ''}><span><b>Sala compartilhada</b>Um espaço só. Cabe um atendimento por vez no estúdio.</span></label>
        </div></div>
      <div class="modal-field" id="${prefixo}SalasCampo" ${espaco !== 'separadas' ? 'hidden' : ''}><label>Nome das salas</label>
        <div class="parc-salas">${nomes.map((n, i) => `<input id="${prefixo}Sala${i}" value="${esc(n)}" maxlength="30" aria-label="Sala ${i + 1}">`).join('')}</div>
        <small class="parc-ajuda">Deixe em branco a que não existir. Renomear não tira os atendimentos já marcados na sala.</small></div>`;
  }
  function lerEspaco(raiz, prefixo){
    const espaco = (raiz.querySelector(`input[name="${prefixo}Espaco"]:checked`) || {}).value || 'compartilhada';
    const salas = [0, 1, 2].map(i => (raiz.querySelector(`#${prefixo}Sala${i}`) || {}).value || '').map(s => s.trim()).filter(Boolean);
    return { espaco, salas };
  }
  function ligarEspaco(raiz, prefixo){
    raiz.querySelectorAll(`input[name="${prefixo}Espaco"]`).forEach(r => r.addEventListener('change', () => {
      raiz.querySelector(`#${prefixo}SalasCampo`).hidden = lerEspaco(raiz, prefixo).espaco !== 'separadas';
    }));
  }

  function cartaoCriar(primeiro){
    return `<form class="parc-card" id="parcCriar" novalidate>
      <h3>${primeiro ? 'Criar meu estúdio' : 'Criar o meu próprio estúdio'}</h3>
      <p class="parc-texto">O seu plano Studio permite um estúdio com até 3 profissionais, contando com você. Depois de criar, o app gera o código de convite.</p>
      <div class="modal-field"><label for="parcCriarNome">Nome do estúdio</label><input id="parcCriarNome" maxlength="40" placeholder="Ex.: Estúdio Glow"></div>
      ${formularioEspaco('pc', 'separadas', [])}
      <div id="parcCriarErro"></div>
      <div class="parc-acoes"><button type="submit" class="modal-btn-confirm">Criar estúdio</button></div>
    </form>`;
  }
  function cartaoEntrar(){
    const ja = P.estudios.length;
    return `<form class="parc-card" id="parcEntrar" novalidate>
      <h3>Entrar num estúdio</h3>
      <p class="parc-texto">${ja ? `Você já participa do <b>${esc(P.estudios[0].nome)}</b>. Dá para estar em até 2 estúdios: ao marcar um atendimento, você escolhe o local.` : 'Recebeu um código de convite? Digite aqui. Sua conta, suas clientes e seu financeiro continuam só seus.'}</p>
      <div class="modal-field"><label for="parcCodigoEntrar">Código de convite</label><input id="parcCodigoEntrar" class="parc-code-input" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off"></div>
      <div id="parcEntrarErro"></div>
      <div class="parc-acoes"><button type="submit" class="modal-btn-confirm">Entrar no estúdio</button></div>
    </form>`;
  }

  function cartaoConexoes(){
    const aceitas = P.conexoes.filter(c => c.status === 'aceita');
    const recebidos = P.conexoes.filter(c => c.status === 'pendente' && c.direcao === 'recebido');
    const enviados = P.conexoes.filter(c => c.status === 'pendente' && c.direcao === 'enviado');
    const cheio = aceitas.length >= 2;
    const linha = (c, i, acoes) => `<div class="parc-membro" style="--pc:var(--${CORES[(i + 1) % CORES.length]})">
      <span class="parc-av">${esc(iniciais(c.nome))}</span><span class="parc-membro-nome">${esc(c.nome)}${c.email ? `<small>${esc(c.email)}</small>` : ''}</span>${acoes}</div>`;
    return `<div class="parc-card">
      <div class="parc-card-head"><div><h3>Suas conexões · ${aceitas.length} de 2</h3><span class="parc-sub">Cada uma com o próprio plano, clientes e financeiro</span></div></div>
      <p class="parc-texto">Com uma conexão, a parceira aparece na sua Agenda só como <b>Ocupada</b> nos horários dela, e vocês podem <b>indicar clientes</b> uma para a outra pela aba Dados.</p>
      ${recebidos.length ? `<div class="parc-bloco"><div class="parc-rot">Pedidos de conexão</div>${recebidos.map((c, i) => linha(c, i, `<button type="button" class="modal-btn-cancel" data-recusar="${esc(c.id)}">Recusar</button><button type="button" class="modal-btn-confirm" data-aceitar="${esc(c.id)}" ${cheio ? 'disabled' : ''}>Aceitar</button>`)).join('')}</div>` : ''}
      <div class="parc-bloco"><div class="parc-rot">Conectadas</div>
        ${aceitas.map((c, i) => linha(c, i, `<span class="parc-pill">Conectada</span><button type="button" class="parc-link-perigo" data-desfazer="${esc(c.id)}" data-nome="${esc(c.nome)}">Desfazer</button>`)).join('')}
        ${Array.from({ length: 2 - aceitas.length }, () => `<div class="parc-membro"><span class="parc-av vazia">+</span><span class="parc-membro-nome vaga">Vaga livre</span></div>`).join('')}
      </div>
      ${enviados.length ? `<div class="parc-bloco"><div class="parc-rot">Aguardando resposta</div>${enviados.map((c, i) => linha(c, i, `<span class="parc-pill">Pedido enviado</span><button type="button" class="parc-link-perigo" data-cancelarpedido="${esc(c.id)}">Cancelar</button>`)).join('')}</div>` : ''}
    </div>
    <div class="parc-card">
      <div class="parc-rot">Seu código de conexão</div>
      <div class="parc-codigo"><div class="parc-codigo-num small">${esc(P.codigo || '—')}</div><div class="parc-codigo-meta">Mande para a parceira digitar na conta dela</div>
        <div class="parc-acoes centro"><button type="button" class="modal-btn-cancel" id="parcCopiarCod" ${P.codigo ? '' : 'disabled'}>Copiar código</button></div></div>
      <form id="parcConectar" novalidate>
        <div class="modal-field"><label for="parcCodigoConexao">Conectar com uma parceira</label><input id="parcCodigoConexao" class="parc-code-input" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off" ${cheio ? 'disabled' : ''}>
          <small class="parc-ajuda">${cheio ? 'Você já tem 2 conexões. Desfaça uma para conectar outra pessoa.' : 'Digite o código da parceira. A conexão vale quando ela aceitar.'}</small></div>
        <div id="parcConectarErro"></div>
        <div class="parc-acoes"><button type="submit" class="modal-btn-confirm" ${cheio ? 'disabled' : ''}>Enviar pedido</button></div>
      </form>
    </div>`;
  }

  function mascaraCodigo(inp){
    inp.addEventListener('input', () => { let v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if(v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4); inp.value = v; });
  }
  async function copiar(texto, alvoSel){
    try{ await navigator.clipboard.writeText(texto); showToast('Copiado!'); }
    catch(e){
      const alvo = alvoSel && document.querySelector(alvoSel);
      if(alvo){ const r = document.createRange(); r.selectNodeContents(alvo); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      showToast('Selecionei o texto: copie com Ctrl+C.');
    }
  }
  async function depoisDeMudar(toast){
    P.carregado = false; await carregar(); desenhar(); avisarAgenda();
    if(toast) showToast(toast);
  }

  function ligar(el){
    el.querySelectorAll('.parc-code-input').forEach(mascaraCodigo);

    const criar = el.querySelector('#parcCriar');
    if(criar){
      ligarEspaco(criar, 'pc');
      criar.addEventListener('submit', async ev => {
        ev.preventDefault();
        const nome = criar.querySelector('#parcCriarNome').value.trim();
        const { espaco, salas } = lerEspaco(criar, 'pc');
        const btn = criar.querySelector('button[type=submit]'); btn.disabled = true;
        try{ await rpc('criar_estudio', { p_nome: nome, p_espaco: espaco, p_salas: espaco === 'separadas' ? salas : null }); await depoisDeMudar('Estúdio criado. Agora mande o código de convite.'); }
        catch(e){ btn.disabled = false; criar.querySelector('#parcCriarErro').innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
      });
    }

    const entrar = el.querySelector('#parcEntrar');
    if(entrar) entrar.addEventListener('submit', async ev => {
      ev.preventDefault();
      const cod = entrar.querySelector('#parcCodigoEntrar').value;
      const btn = entrar.querySelector('button[type=submit]'); btn.disabled = true;
      try{
        const r = await supabaseClient.rpc('entrar_no_estudio', { p_codigo: cod });
        if(r.error) throw r.error;
        await depoisDeMudar('Pronto! Você entrou no estúdio.');
      } catch(e){ btn.disabled = false; entrar.querySelector('#parcEntrarErro').innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
    });

    el.querySelectorAll('[data-copiar]').forEach(b => b.addEventListener('click', () => {
      const s = P.estudios.find(x => x.estudio_id === b.dataset.copiar); if(s) copiar(mensagemConvite(s), '#parcMsg-' + s.estudio_id);
    }));
    el.querySelectorAll('[data-novocod]').forEach(b => b.addEventListener('click', () => confirmar('Gerar outro código?',
      'O código atual para de funcionar. Quem já entrou no estúdio continua. O novo código vale por 7 dias.', 'Gerar código',
      async () => { await rpc('gerar_codigo_estudio', { p_estudio: b.dataset.novocod }); await depoisDeMudar('Novo código gerado.'); })));
    el.querySelectorAll('[data-remover]').forEach(b => b.addEventListener('click', () => confirmar(`Remover ${primeiroNome(b.dataset.nome)} do estúdio?`,
      'Ela sai da agenda compartilhada e das salas. A conta, as clientes e o financeiro dela continuam com ela.', 'Remover',
      async () => { await rpc('remover_profissional_do_estudio', { p_estudio: b.dataset.estudio, p_profissional: b.dataset.remover }); await depoisDeMudar(primeiroNome(b.dataset.nome) + ' saiu do estúdio.'); })));
    el.querySelectorAll('[data-sair]').forEach(b => b.addEventListener('click', () => confirmar(`Sair do ${b.dataset.nome}?`,
      'Você deixa de ver a agenda das colegas e as salas desse estúdio. Suas clientes e seu financeiro não mudam.', 'Sair',
      async () => { await rpc('sair_do_estudio', { p_estudio: b.dataset.sair }); await depoisDeMudar('Você saiu do estúdio.'); })));
    el.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => editarEstudio(b.dataset.editar)));

    el.querySelector('#parcCopiarCod')?.addEventListener('click', () => copiar(P.codigo));
    const conectar = el.querySelector('#parcConectar');
    if(conectar) conectar.addEventListener('submit', async ev => {
      ev.preventDefault();
      const btn = conectar.querySelector('button[type=submit]'); btn.disabled = true;
      try{
        const r = await rpc('pedir_conexao', { p_codigo: conectar.querySelector('#parcCodigoConexao').value });
        await depoisDeMudar(r === 'aceita' ? 'Vocês agora estão conectadas.' : 'Pedido enviado. A conexão vale quando ela aceitar.');
      } catch(e){ btn.disabled = false; conectar.querySelector('#parcConectarErro').innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
    });
    el.querySelectorAll('[data-aceitar]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try{ await rpc('responder_conexao', { p_id: b.dataset.aceitar, p_aceitar: true }); await depoisDeMudar('Conexão aceita.'); }
      catch(e){ b.disabled = false; showToast(msgErro(e)); }
    }));
    el.querySelectorAll('[data-recusar]').forEach(b => b.addEventListener('click', async () => {
      try{ await rpc('responder_conexao', { p_id: b.dataset.recusar, p_aceitar: false }); await depoisDeMudar('Pedido recusado.'); }
      catch(e){ showToast(msgErro(e)); }
    }));
    el.querySelectorAll('[data-cancelarpedido]').forEach(b => b.addEventListener('click', async () => {
      try{ await rpc('desfazer_conexao', { p_id: b.dataset.cancelarpedido }); await depoisDeMudar('Pedido cancelado.'); }
      catch(e){ showToast(msgErro(e)); }
    }));
    el.querySelectorAll('[data-desfazer]').forEach(b => b.addEventListener('click', () => confirmar(`Desfazer a conexão com ${primeiroNome(b.dataset.nome)}?`,
      'Vocês deixam de ver quando a outra está ocupada e de indicar clientes. As clientes que já foram indicadas continuam com quem recebeu.', 'Desfazer',
      async () => { await rpc('desfazer_conexao', { p_id: b.dataset.desfazer }); await depoisDeMudar('Conexão desfeita.'); })));
  }

  function editarEstudio(id){
    const s = P.estudios.find(x => x.estudio_id === id); if(!s) return;
    const j = abrir(`<form id="parcEditar" novalidate>
      <h3>Editar estúdio</h3>
      <div class="modal-field"><label for="peNome">Nome do estúdio</label><input id="peNome" maxlength="40" value="${esc(s.nome)}"></div>
      ${formularioEspaco('pe', s.espaco, P.salas[id] || [])}
      <div id="peErro"></div>
      <div class="modal-actions"><button type="button" class="modal-btn-cancel" data-fechar>Cancelar</button><button type="submit" class="modal-btn-confirm">Salvar</button></div>
    </form>`);
    ligarEspaco(j, 'pe');
    j.querySelector('#parcEditar').addEventListener('submit', async ev => {
      ev.preventDefault();
      const { espaco, salas } = lerEspaco(j, 'pe');
      const btn = j.querySelector('button[type=submit]'); btn.disabled = true;
      try{
        await rpc('salvar_estudio', { p_estudio: id, p_nome: j.querySelector('#peNome').value.trim(), p_espaco: espaco, p_salas: espaco === 'separadas' ? salas : null });
        fechar(); await depoisDeMudar('Estúdio salvo.');
      } catch(e){ btn.disabled = false; j.querySelector('#peErro').innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
    });
  }

  /* ---------- Aba e painel em Meu Negócio ---------- */
  (function montarAba(){
    const tabs = document.querySelector('#view-equipe .fin-tabs');
    const tab = tabs && tabs.querySelector('[data-eqtab="parcerias"]');
    if(tab) tab.addEventListener('click', abrirPainel);
  })();

  /* ================= Indicar cliente ================= */
  const I = { colegas: [], recebidas: new Map(), carregado: false };

  async function carregarIndicacoes(){
    if(demo()) return;
    try{
      const [col, rec] = await Promise.all([rpc('colegas_para_indicar'), rpc('indicacoes_recebidas')]);
      I.colegas = col || [];
      I.recebidas = new Map((rec || []).map(r => [String(r.paciente_novo), r]));
      I.carregado = true;
      const novas = (rec || []).filter(r => !r.visto);
      if(novas.length){
        // A lista de pacientes foi carregada antes da indicação: recarrega para ela aparecer.
        try{ if(typeof loadPacientesFromSupabase === 'function') await loadPacientesFromSupabase(); }catch(e){}
        const de = [...new Set(novas.map(n => primeiroNome(n.de_nome)))].join(' e ');
        showToast(novas.length === 1 ? `${de} te indicou uma cliente. Ela já está na sua lista de pacientes.` : `${de} te indicaram ${novas.length} clientes. Elas já estão na sua lista de pacientes.`);
        rpc('marcar_indicacoes_vistas').catch(() => {});
      }
      etiquetarLista();
      atualizarBotaoIndicar();
    } catch(e){ console.warn('Indicações:', e); }
  }

  // Etiqueta "Indicada por …" na lista de pacientes (vale para qualquer redesenho da lista).
  function etiquetarLista(){
    const corpo = document.getElementById('patientsBody'); if(!corpo || !I.recebidas.size) return;
    corpo.querySelectorAll('.patient-name[data-patient-id]').forEach(n => {
      const r = I.recebidas.get(String(n.dataset.patientId));
      if(!r || n.querySelector('.parc-etq')) return;
      const etq = document.createElement('span');
      etq.className = 'parc-etq';
      etq.textContent = 'Indicada por ' + primeiroNome(r.de_nome);
      n.appendChild(etq);
    });
  }
  const corpoLista = document.getElementById('patientsBody');
  if(corpoLista) new MutationObserver(() => etiquetarLista()).observe(corpoLista, { childList: true });

  // Botão na aba Dados da paciente.
  function botaoIndicar(){
    let b = document.getElementById('btnIndicarColega');
    if(b) return b;
    const linha = document.querySelector('#panel-dados .photo-status-row');
    if(!linha) return null;
    b = document.createElement('button');
    b.type = 'button'; b.id = 'btnIndicarColega'; b.className = 'parc-btn-indicar'; b.hidden = true;
    b.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 00-6 6v5"/></svg>Indicar para colega';
    const badges = document.getElementById('patientHeaderBadges');
    if(badges) badges.insertAdjacentElement('afterend', b); else linha.appendChild(b);
    b.addEventListener('click', abrirIndicar);
    return b;
  }
  function pacienteAtual(){ try{ return typeof currentPatient !== 'undefined' ? currentPatient : null; }catch(e){ return null; } }
  function atualizarBotaoIndicar(){
    const b = botaoIndicar(); if(!b) return;
    const p = pacienteAtual();
    b.hidden = demo() || !I.colegas.length || !p || !String(p.id).includes('-');
  }
  // Sempre que abrir o registro de uma paciente.
  if(typeof openPatientRegistro === 'function'){
    const abrirOriginal = openPatientRegistro;
    openPatientRegistro = function(){ const r = abrirOriginal.apply(this, arguments); atualizarBotaoIndicar(); return r; };
  }
  const regObs = document.getElementById('panel-dados');
  if(regObs) new MutationObserver(() => atualizarBotaoIndicar()).observe(regObs, { attributes: true, attributeFilter: ['class'] });

  function abrirIndicar(){
    const p = pacienteAtual(); if(!p) return;
    if(!I.colegas.length){ showToast('Você ainda não tem colegas de estúdio nem conexões para indicar.'); return; }
    const j = abrir(`<form id="parcIndicar" novalidate>
      <h3>Indicar ${esc(primeiroNome(p.name))} para uma colega</h3>
      <p class="parc-texto">A colega recebe uma cópia dos dados de cadastro. Daí em diante, cada uma cuida da própria ficha.</p>
      <div class="modal-field"><label for="piColega">Indicar para</label>
        <select id="piColega">${I.colegas.map(c => `<option value="${esc(c.profissional_id)}">${esc(c.nome)} · ${c.origem === 'conexao' ? 'conexão' : 'estúdio'}</option>`).join('')}</select></div>
      <div class="parc-vai">
        <div><span class="sim">✓</span> Nome, telefone, e-mail, país de residência e data de nascimento</div>
        <div><span class="nao">✕</span> Anamnese, recomendações, histórico e fotos</div>
        <div><span class="nao">✕</span> Comandas e financeiro</div>
      </div>
      <label class="parc-check"><input type="checkbox" id="piAut"><span>A cliente autorizou passar os dados de cadastro dela para <b id="piNome">${esc(primeiroNome(I.colegas[0].nome))}</b>. O app guarda a data desta confirmação.</span></label>
      <div id="piErro"></div>
      <div class="modal-actions"><button type="button" class="modal-btn-cancel" data-fechar>Cancelar</button><button type="submit" class="modal-btn-confirm">Indicar</button></div>
    </form>`);
    const sel = j.querySelector('#piColega');
    sel.addEventListener('change', () => { const c = I.colegas.find(x => x.profissional_id === sel.value); j.querySelector('#piNome').textContent = primeiroNome(c && c.nome); });
    j.querySelector('#parcIndicar').addEventListener('submit', async ev => {
      ev.preventDefault();
      const erro = j.querySelector('#piErro');
      if(!j.querySelector('#piAut').checked){ erro.innerHTML = '<div class="parc-erro">Marque a autorização da cliente para continuar.</div>'; return; }
      const btn = j.querySelector('button[type=submit]'); btn.disabled = true;
      const c = I.colegas.find(x => x.profissional_id === sel.value);
      try{
        await rpc('indicar_paciente', { p_paciente: p.id, p_destino: sel.value, p_autorizado: true });
        fechar(); showToast(`${primeiroNome(p.name)} foi indicada para ${primeiroNome(c && c.nome)}.`);
      } catch(e){ btn.disabled = false; erro.innerHTML = `<div class="parc-erro">${esc(msgErro(e))}</div>`; }
    });
  }

  /* ---------- Começo ---------- */
  function aoEntrar(){
    P.carregado = false; I.carregado = false;
    carregarIndicacoes();
    const v = painel(); if(v && v.classList.contains('active')) abrirPainel();
  }
  try{
    supabaseClient.auth.onAuthStateChange(evento => {
      if(evento === 'SIGNED_IN') aoEntrar();
      if(evento === 'SIGNED_OUT'){ P.carregado = false; I.colegas = []; I.recebidas = new Map(); atualizarBotaoIndicar(); }
    });
  }catch(e){}
  supabaseClient.auth.getUser().then(({ data }) => { if(data && data.user) aoEntrar(); }).catch(() => {});
  // Ao abrir Pacientes, confere se chegou indicação nova.
  document.querySelector('.nav-item[data-view="pacientes"]')?.addEventListener('click', () => carregarIndicacoes());
})();
