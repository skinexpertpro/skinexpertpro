/* Skin Expert Pro — Termos de consentimento.
   Meu Negócio → Termos: modelos da profissional (o app traz modelos prontos para editar),
                         cada um pode ser ligado aos serviços que o pedem.
   Ficha da paciente → Termos: enviar por WhatsApp / copiar link, ou assinar ali mesmo no atendimento;
                         ver o termo assinado e salvar em PDF.
   Página pública (?termo=código): a paciente lê, escreve o nome, assina com o dedo e confirma.
   O texto é congelado no envio; na assinatura o banco guarda data/hora, IP, aparelho e um código
   SHA-256 (hash) que prova que nada mudou depois.
   Tabelas: termos_modelos, termos_paciente. Funções: termo_por_token, assinar_termo.
   Carregado depois de login.js e anamneses-especificas.js, antes de paginacao.js e celular.js. */

  const termoToken = new URLSearchParams(window.location.search).get('termo');

  /* ================= MODELOS PRONTOS ================= */
  const TERMO_FECHO = `Declaro que li este termo com atenção, que tive a oportunidade de fazer perguntas e que todas foram respondidas com clareza. Sei que posso interromper o tratamento a qualquer momento, avisando a profissional.

Os meus dados e as informações deste termo serão guardados com sigilo, conforme a legislação de proteção de dados aplicável (LGPD no Brasil / RGPD na União Europeia).

Data: {data}`;

  const TERMOS_PADRAO = [
    { titulo: 'Termo de Consentimento — Limpeza de Pele', chaves: ['limpeza'], texto:
`Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de LIMPEZA DE PELE.

SOBRE O PROCEDIMENTO
A limpeza de pele remove impurezas, células mortas, cravos e excesso de oleosidade. Pode incluir higienização, esfoliação, emoliência, extração manual, máscara e proteção solar. Os resultados variam de pessoa para pessoa e podem ser necessárias outras sessões.

O QUE PODE ACONTECER
Fui informada de que, depois do procedimento, a pele pode ficar avermelhada, sensível ou com pequenos pontos marcados pela extração, normalmente por algumas horas ou poucos dias. Mais raramente podem surgir espinhas, manchas ou irritação.

O QUE EU INFORMEI
Declaro que contei à profissional sobre medicamentos que uso (principalmente isotretinoína, ácidos e anticoagulantes), alergias, gestação ou amamentação, problemas de pele, herpes e procedimentos recentes, e que a ficha de anamnese é verdadeira.

CUIDADOS DEPOIS
Comprometo-me a seguir as orientações recebidas: usar protetor solar, não espremer lesões, evitar sol, maquiagem e ácidos pelo tempo indicado.

${''}`.trim() },
    { titulo: 'Termo de Consentimento — Peeling Químico', chaves: ['peeling quimic'], texto:
`Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de PEELING QUÍMICO.

SOBRE O PROCEDIMENTO
O peeling químico usa ácidos aplicados na pele para renovar as camadas superficiais, melhorando textura, manchas, oleosidade ou acne, conforme a avaliação feita. O tipo de ácido, a concentração e o número de sessões são definidos pela profissional. Os resultados variam de pessoa para pessoa e não são garantidos.

O QUE PODE ACONTECER
Fui informada de que durante a aplicação pode haver ardor, calor ou formigamento, e que depois a pele pode ficar avermelhada, sensível, repuxando e descamando por alguns dias. Mais raramente podem ocorrer manchas (escurecimento ou clareamento), irritação, crostas ou reação alérgica, principalmente se os cuidados depois do procedimento não forem seguidos.

O QUE EU INFORMEI
Declaro que contei à profissional sobre medicamentos que uso (principalmente isotretinoína nos últimos meses, ácidos e corticoides), alergias, gestação ou amamentação, herpes, feridas, exposição recente ao sol e procedimentos recentes, e que a ficha de anamnese é verdadeira.

CUIDADOS DEPOIS
Comprometo-me a usar protetor solar todos os dias e a reaplicá-lo, evitar sol, calor intenso e piscina, não arrancar a pele que descama e usar apenas os produtos indicados, pelo tempo que a profissional orientar.

${''}`.trim() },
    { titulo: 'Termo de Consentimento — Microagulhamento', chaves: ['microagulhamento'], texto:
`Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de MICROAGULHAMENTO.

SOBRE O PROCEDIMENTO
O microagulhamento faz microperfurações controladas na pele com agulhas finas e esterilizadas (descartáveis), estimulando a produção de colágeno. Pode ser associado à aplicação de ativos. É usado para textura, cicatrizes de acne, poros, linhas finas e manchas, conforme a avaliação feita. Os resultados aparecem de forma gradual, variam de pessoa para pessoa e normalmente exigem várias sessões.

O QUE PODE ACONTECER
Fui informada de que posso sentir desconforto durante o procedimento e de que, depois, a pele fica avermelhada, sensível e inchada, podendo ter pequenos pontos de sangramento, descamação ou pequenas crostas por alguns dias. Mais raramente podem ocorrer manchas, infecção, reação aos ativos aplicados ou reativação de herpes.

O QUE EU INFORMEI
Declaro que contei à profissional sobre medicamentos que uso (principalmente isotretinoína, anticoagulantes e corticoides), alergias, gestação ou amamentação, diabetes, problemas de cicatrização ou queloide, herpes, acne inflamada, feridas e procedimentos recentes, e que a ficha de anamnese é verdadeira.

CUIDADOS DEPOIS
Comprometo-me a não usar maquiagem nem ácidos pelo tempo indicado, usar protetor solar, evitar sol, calor, academia e piscina nos primeiros dias, não arrancar crostas e usar apenas os produtos indicados pela profissional.

${''}`.trim() },
    { titulo: 'Termo de Consentimento — Radiofrequência', chaves: ['radiofrequencia'], texto:
`Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de RADIOFREQUÊNCIA.

SOBRE O PROCEDIMENTO
A radiofrequência é um aparelho que aquece as camadas da pele de forma controlada, estimulando o colágeno, para melhorar firmeza, flacidez, textura ou gordura localizada, conforme a área tratada. Os resultados aparecem de forma gradual, variam de pessoa para pessoa e normalmente exigem várias sessões.

O QUE PODE ACONTECER
Fui informada de que durante a sessão sinto calor na área tratada e que, depois, a pele pode ficar avermelhada e quente por algumas horas. Mais raramente podem ocorrer inchaço, sensibilidade ou queimadura.

O QUE EU INFORMEI
Declaro que contei à profissional se uso marca-passo ou outro aparelho eletrônico no corpo, se tenho implantes metálicos, próteses ou preenchimentos na área, se estou gestante, se tenho alterações de sensibilidade, doenças de pele, câncer, problemas de circulação ou febre, e que a ficha de anamnese é verdadeira. Comprometo-me a avisar a profissional imediatamente se sentir calor excessivo ou dor durante a sessão.

CUIDADOS DEPOIS
Comprometo-me a beber água, usar protetor solar nas áreas expostas e seguir as orientações recebidas.

${''}`.trim() },
    { titulo: 'Termo de Consentimento — Drenagem Linfática', chaves: ['drenagem'], texto:
`Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de DRENAGEM LINFÁTICA.

SOBRE O PROCEDIMENTO
A drenagem linfática é uma técnica de massagem com movimentos suaves e ritmados que estimula o sistema linfático, ajudando a reduzir inchaço e retenção de líquidos. Os resultados variam de pessoa para pessoa e podem ser necessárias várias sessões.

O QUE PODE ACONTECER
Fui informada de que, depois da sessão, é comum aumentar a vontade de urinar e sentir relaxamento ou leve cansaço. Mais raramente pode ocorrer desconforto ou pequenas manchas roxas em pele sensível.

O QUE EU INFORMEI
Declaro que contei à profissional se tenho ou já tive trombose, problemas no coração, nos rins ou de pressão, infecção ou febre, câncer, varizes importantes, se estou gestante ou se fiz cirurgia recente (e, nesse caso, as orientações do meu médico), e que a ficha de anamnese é verdadeira.

CUIDADOS DEPOIS
Comprometo-me a beber água e a seguir as orientações recebidas.

${''}`.trim() },
    { titulo: 'Autorização de Registro Fotográfico', chaves: [], texto:
`Eu, {paciente}, autorizo {profissional} a fotografar a minha pele (antes, durante e depois dos tratamentos) para acompanhar a evolução e registrar os atendimentos na minha ficha.

As fotos ficam guardadas com sigilo, junto com a minha ficha, e não serão divulgadas nem mostradas a terceiros sem uma autorização à parte, por escrito. Sempre que possível, o meu rosto inteiro não aparecerá.

Sei que posso pedir para ver, receber uma cópia ou apagar as minhas fotos, ou retirar esta autorização a qualquer momento, falando com a profissional.`.trim() },
    { titulo: 'Autorização de Uso de Imagem nas Redes Sociais', chaves: [], texto:
`Eu, {paciente}, autorizo {profissional} a usar fotos e/ou vídeos dos meus tratamentos (antes e depois) para divulgação do trabalho da profissional nas redes sociais, no site e em materiais de divulgação.

A autorização é gratuita. O meu nome não será divulgado sem a minha permissão. Antes de publicar uma imagem em que eu possa ser reconhecida, a profissional me mostrará o que vai ser publicado.

Sei que posso retirar esta autorização a qualquer momento, falando com a profissional; a partir daí, nenhuma imagem nova será publicada e as publicações já feitas serão apagadas assim que possível.`.trim() },
  ];
  TERMOS_PADRAO.forEach(t => { t.texto = t.texto + '\n\n' + TERMO_FECHO; });

  /* ================= DADOS ================= */
  // modelo: { id, titulo, texto, servicos:[nomes], ativo }
  let termosModelos = [];
  // termo da paciente: { id, pacienteId, modeloId, titulo, status, criadoEm, assinadoEm, token, + (detalhes ao abrir) }
  let termosPaciente = [];
  let termosCarregados = false;

  function termoModeloDoBanco(r){ return { id: r.id, titulo: r.titulo, texto: r.texto, servicos: Array.isArray(r.servicos) ? r.servicos : [], ativo: r.ativo !== false }; }
  function termoPacienteDoBanco(r){
    return { id: r.id, pacienteId: r.paciente_id, modeloId: r.modelo_id, titulo: r.titulo, status: r.status,
      criadoEm: r.criado_em, assinadoEm: r.assinado_em, token: r.token,
      texto: r.texto, assinatura: r.assinatura, nomeAssinante: r.nome_assinante, ip: r.ip, userAgent: r.user_agent, hash: r.hash_documento };
  }
  function servicosQueCombinam(chaves){
    if(!chaves || !chaves.length) return [];
    return (servicosData || []).map(s => s.nome).filter(n => chaves.some(k => semAcento(n).includes(k)));
  }
  let avisoTermosSemTabela = false;
  function avisarErroTermos(error){
    const msg = (error && error.message) || String(error || '');
    console.warn('Termos:', msg);
    if(/relation|does not exist|schema cache/i.test(msg)){
      if(!avisoTermosSemTabela){ avisoTermosSemTabela = true; showToast('Falta criar no Supabase as tabelas de termos (termos_modelos e termos_paciente).'); }
    } else showToast('Termos: ' + msg.slice(0, 90));
  }

  async function carregarTermos(){
    if(modoDemonstracao){
      termosModelos = TERMOS_PADRAO.map(t => ({ id: idLocal(), titulo: t.titulo, texto: t.texto, servicos: servicosQueCombinam(t.chaves), ativo: true }));
      termosPaciente = [];
      termosCarregados = true;
      renderTermosModelos(); renderTermosDaPaciente();
      return;
    }
    const user = await getUsuarioLogado();
    if(!user) return;
    const [{ data: mods, error: e1 }, { data: tps, error: e2 }] = await Promise.all([
      supabaseClient.from('termos_modelos').select('*').eq('profissional_id', user.id).order('criado_em', { ascending: true }),
      // sem a imagem da assinatura e o texto: ficam para quando a profissional abre o termo
      supabaseClient.from('termos_paciente').select('id, paciente_id, modelo_id, titulo, status, criado_em, assinado_em, token').eq('profissional_id', user.id).order('criado_em', { ascending: false }),
    ]);
    if(e1 || e2){ avisarErroTermos(e1 || e2); return; }
    termosModelos = (mods || []).map(termoModeloDoBanco);
    termosPaciente = (tps || []).map(termoPacienteDoBanco);
    // Primeira vez: a conta recebe os modelos prontos (uma vez só; se ela apagar, não voltam)
    if(!termosModelos.length && !(await lerConfig('termos_semeados'))){
      const novos = TERMOS_PADRAO.map(t => ({ profissional_id: user.id, titulo: t.titulo, texto: t.texto, servicos: servicosQueCombinam(t.chaves) }));
      const { data, error } = await supabaseClient.from('termos_modelos').insert(novos).select();
      if(!error){ termosModelos = (data || []).map(termoModeloDoBanco); await salvarConfig('termos_semeados', true); }
      else avisarErroTermos(error);
    }
    termosCarregados = true;
    renderTermosModelos(); renderTermosDaPaciente();
  }

  /* ================= TEXTO: trocar {paciente}, {profissional}, {data} ================= */
  function nomeDaProfissional(){ return (perfilProfissional && perfilProfissional.nome) || 'a profissional responsável'; }
  function preencherTermo(texto, paciente){
    const hoje = new Date().toLocaleDateString('pt-BR');
    return String(texto || '')
      .replace(/\{paciente\}/gi, (paciente && paciente.name) || '________________')
      .replace(/\{profissional\}/gi, nomeDaProfissional())
      .replace(/\{data\}/gi, hoje);
  }
  function dataHoraBR(iso){ try{ return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }catch(e){ return ''; } }
  function linkDoTermo(t){ return enderecoPublico() + '?termo=' + t.token; }

  /* ================= MEU NEGÓCIO → TERMOS ================= */
  function renderTermosModelos(){
    const body = document.getElementById('termosModelosBody');
    if(!body) return;
    const busca = semAcento((document.getElementById('termosBusca') || {}).value || '');
    const lista = termosModelos.filter(m => !busca || semAcento(m.titulo + ' ' + m.servicos.join(' ')).includes(busca));
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="4" class="empty-state">${termosModelos.length ? 'Nenhum termo encontrado.' : 'Nenhum termo cadastrado ainda. Clique em "Novo Termo".'}</td></tr>`;
      return;
    }
    body.innerHTML = '';
    lista.forEach(m => {
      const tr = document.createElement('tr');
      if(!m.ativo) tr.className = 'servico-inativo';
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(m.titulo)}${m.ativo ? '' : ' <span class="pill-desativado">Desativado</span>'}</td>
        <td>${m.servicos.length ? m.servicos.map(s => `<span class="category-chip">${escHTML(s)}</span>`).join(' ') : '<span style="color:var(--text-muted);">Nenhum (envio manual)</span>'}</td>
        <td><div class="fin-acoes" style="justify-content:flex-start;">
          <button class="icon-btn" type="button" title="Editar" aria-label="Editar termo ${escHTML(m.titulo)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="icon-btn" type="button" title="${m.ativo ? 'Desativar termo' : 'Reativar termo'}" aria-label="${m.ativo ? 'Desativar' : 'Reativar'} termo ${escHTML(m.titulo)}">${m.ativo ? ICONE_DESATIVAR : ICONE_REATIVAR}</button>
        </div></td>`;
      const [bEdit, bAtivo] = tr.querySelectorAll('button');
      bEdit.addEventListener('click', () => abrirModeloTermo(m));
      bAtivo.addEventListener('click', () => alternarModeloAtivo(m));
      body.appendChild(tr);
    });
  }
  document.getElementById('termosBusca')?.addEventListener('input', renderTermosModelos);

  let modeloEditando = null;
  function abrirModeloTermo(m){
    modeloEditando = m || null;
    document.getElementById('modalTermoModeloTitle').textContent = m ? 'Editar Termo' : 'Novo Termo';
    document.getElementById('termoModeloTitulo').value = m ? m.titulo : '';
    document.getElementById('termoModeloTexto').value = m ? m.texto : 'Eu, {paciente}, autorizo {profissional} a realizar em mim o procedimento de …\n\n' + TERMO_FECHO;
    const marcados = new Set(m ? m.servicos : []);
    const nomes = [...new Set((servicosData || []).map(s => s.nome).concat([...marcados]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    document.getElementById('termoModeloServicos').innerHTML = nomes.length
      ? nomes.map(n => `<label class="termo-servico-chip"><input type="checkbox" value="${escHTML(n)}"${marcados.has(n) ? ' checked' : ''}> ${escHTML(n)}</label>`).join('')
      : '<span style="color:var(--text-muted); font-size:13px;">Cadastre serviços na aba Serviços para ligá-los a este termo.</span>';
    document.getElementById('modalTermoModeloOverlay').classList.add('open');
    setTimeout(() => document.getElementById('termoModeloTitulo').focus(), 60);
  }
  document.getElementById('btnNovoTermo')?.addEventListener('click', () => abrirModeloTermo(null));
  document.getElementById('modalTermoModeloCancel')?.addEventListener('click', () => document.getElementById('modalTermoModeloOverlay').classList.remove('open'));
  document.getElementById('modalTermoModeloConfirm')?.addEventListener('click', async () => {
    const titulo = document.getElementById('termoModeloTitulo').value.trim();
    const texto = document.getElementById('termoModeloTexto').value.trim();
    const servicos = [...document.querySelectorAll('#termoModeloServicos input:checked')].map(i => i.value);
    if(!titulo){ showToast('Dê um nome ao termo.'); document.getElementById('termoModeloTitulo').focus(); return; }
    if(texto.length < 30){ showToast('Escreva o texto do termo.'); document.getElementById('termoModeloTexto').focus(); return; }
    const btn = document.getElementById('modalTermoModeloConfirm');
    btn.disabled = true;
    try{
      if(modoDemonstracao){
        if(modeloEditando) Object.assign(modeloEditando, { titulo, texto, servicos });
        else termosModelos.push({ id: idLocal(), titulo, texto, servicos, ativo: true });
      } else {
        const user = await usuarioParaSalvar();
        if(!user) return;
        const campos = { titulo, texto, servicos, atualizado_em: new Date().toISOString() };
        if(modeloEditando){
          const { error } = await supabaseClient.from('termos_modelos').update(campos).eq('id', modeloEditando.id);
          if(error){ avisarErroTermos(error); return; }
          Object.assign(modeloEditando, { titulo, texto, servicos });
        } else {
          const { data, error } = await supabaseClient.from('termos_modelos').insert({ ...campos, profissional_id: user.id }).select().single();
          if(error){ avisarErroTermos(error); return; }
          termosModelos.push(termoModeloDoBanco(data));
        }
      }
      document.getElementById('modalTermoModeloOverlay').classList.remove('open');
      renderTermosModelos();
      showToast(modeloEditando ? 'Termo atualizado. Os termos já enviados não mudam.' : 'Termo criado.');
    } finally { btn.disabled = false; }
  });
  async function alternarModeloAtivo(m){
    const ativo = !m.ativo;
    if(!modoDemonstracao){
      const { error } = await supabaseClient.from('termos_modelos').update({ ativo }).eq('id', m.id);
      if(error){ avisarErroTermos(error); return; }
    }
    m.ativo = ativo;
    renderTermosModelos();
    showToast(ativo ? 'Termo reativado.' : 'Termo desativado. Os termos já assinados continuam guardados.');
  }

  /* ================= FICHA DA PACIENTE → TERMOS ================= */
  function termosDaPaciente(pacienteId){ return termosPaciente.filter(t => String(t.pacienteId) === String(pacienteId)); }
  function pacienteTemTermo(pacienteId, modelo, soAssinado){
    return termosDaPaciente(pacienteId).some(t => (t.status === 'assinado' || (!soAssinado && t.status === 'pendente'))
      && (String(t.modeloId) === String(modelo.id) || t.titulo === modelo.titulo));
  }
  // Termos que os serviços (agendados ou informados) pedem e a paciente ainda não tem
  function termosSugeridos(pacienteId, servicos){
    const nomes = servicos.map(semAcento);
    return termosModelos.filter(m => m.ativo && m.servicos.some(s => nomes.includes(semAcento(s))) && !pacienteTemTermo(pacienteId, m, false));
  }
  function servicosAgendadosDaPaciente(pacienteId){
    const hoje = hojeISO(), nomes = new Set();
    Object.keys(appointments || {}).forEach(k => {
      if(k < hoje) return;
      (appointments[k] || []).forEach(a => {
        if(a.type === 'block' || a.status === 'cancelado' || String(a.pacienteId) !== String(pacienteId)) return;
        String(a.servico || '').split(',').map(s => s.trim()).filter(Boolean).forEach(s => nomes.add(s));
      });
    });
    return [...nomes];
  }

  function renderTermosDaPaciente(){
    const box = document.getElementById('termosPacienteLista');
    if(!box || !currentPatient) return;
    const sug = termosSugeridos(currentPatient.id, servicosAgendadosDaPaciente(currentPatient.id));
    const sugBox = document.getElementById('termosSugeridos');
    sugBox.innerHTML = sug.length ? `<span>Os atendimentos agendados pedem: ${sug.map(m => `<strong>${escHTML(m.titulo)}</strong>`).join(', ')}.</span>
      ${sug.map(m => `<button type="button" class="btn-outline btn-sm" data-sug="${escHTML(String(m.id))}">Enviar "${escHTML(m.titulo.replace(/^Termo de Consentimento\s*[—-]\s*/i, ''))}"</button>`).join('')}` : '';
    sugBox.style.display = sug.length ? 'flex' : 'none';
    sugBox.querySelectorAll('[data-sug]').forEach(b => b.addEventListener('click', () => abrirEnvioTermo(termosModelos.find(m => String(m.id) === b.dataset.sug))));

    const lista = termosDaPaciente(currentPatient.id).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    if(!lista.length){
      box.innerHTML = '<div class="empty-state">Nenhum termo enviado para esta paciente ainda.</div>';
      return;
    }
    box.innerHTML = '';
    lista.forEach(t => {
      const div = document.createElement('div');
      div.className = 'termo-item' + (t.status === 'cancelado' ? ' termo-cancelado' : '');
      const situacao = t.status === 'assinado' ? `<span class="status-active">Assinado em ${escHTML(dataHoraBR(t.assinadoEm))}</span>`
        : t.status === 'cancelado' ? '<span class="pill pill-gray">Cancelado</span>'
        : '<span class="pill termo-pill-pendente">Aguardando assinatura</span>';
      const acoes = t.status === 'assinado'
        ? `<button type="button" class="btn-outline btn-sm" data-a="ver">Ver / PDF</button>`
        : t.status === 'pendente'
          ? `<button type="button" class="btn-outline btn-sm" data-a="whats">WhatsApp</button>
             <button type="button" class="btn-outline btn-sm" data-a="copiar">Copiar link</button>
             <button type="button" class="btn-primary btn-sm" data-a="aqui">Assinar aqui</button>
             <button type="button" class="icon-btn" data-a="cancelar" title="Cancelar este termo" aria-label="Cancelar termo">${ICONE_DESATIVAR}</button>`
          : '';
      div.innerHTML = `<div class="termo-item-info"><strong>${escHTML(t.titulo)}</strong>
          <div class="termo-item-meta">Enviado em ${escHTML(dataHoraBR(t.criadoEm))} · ${situacao}</div></div>
        <div class="termo-item-acoes">${acoes}</div>`;
      div.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => acaoTermo(t, b.dataset.a)));
      box.appendChild(div);
    });
  }
  document.querySelector('.registro-tab[data-tab="termos"]')?.addEventListener('click', () => renderTermosDaPaciente());

  async function acaoTermo(t, a){
    if(a === 'whats') return enviarTermoWhatsapp(t);
    if(a === 'copiar') return copiarTexto(linkDoTermo(t), 'Link do termo copiado!');
    if(a === 'aqui') return abrirAssinaturaPresencial(t);
    if(a === 'ver') return verTermoAssinado(t);
    if(a === 'cancelar'){
      if(!confirm(`Cancelar o termo "${t.titulo}"? O link deixa de funcionar.`)) return;
      if(!modoDemonstracao){
        const { error } = await supabaseClient.from('termos_paciente').update({ status: 'cancelado' }).eq('id', t.id).eq('status', 'pendente');
        if(error){ avisarErroTermos(error); return; }
      }
      t.status = 'cancelado';
      renderTermosDaPaciente();
      showToast('Termo cancelado.');
    }
  }
  function copiarTexto(texto, ok){
    let copiado = false;
    try{ if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(texto); copiado = true; } }catch(e){}
    if(!copiado){
      const tmp = document.createElement('textarea'); tmp.value = texto; document.body.appendChild(tmp); tmp.select();
      try{ copiado = document.execCommand('copy'); }catch(e){}
      tmp.remove();
    }
    showToast(copiado ? ok : 'Não foi possível copiar: ' + texto);
  }
  function mensagemTermoWhatsapp(t, paciente){
    const primeiro = primeiroNomeDe(paciente && paciente.name) || 'tudo bem';
    const assinatura = perfilProfissional && perfilProfissional.nome ? `\n\n${perfilProfissional.nome}` : '';
    return `Olá, ${primeiro}! 😊\nAntes do seu atendimento, leia com calma e assine o termo "${t.titulo}" por este link:\n${linkDoTermo(t)}\n\nQualquer dúvida, é só me chamar por aqui.${assinatura}`;
  }
  function enviarTermoWhatsapp(t){
    const p = patients.find(x => String(x.id) === String(t.pacienteId)) || currentPatient;
    if(modoDemonstracao){ showToast('No modo demonstração o link não abre para a paciente. Use "Assinar aqui" para testar.'); return; }
    const url = linkWhatsapp(p, mensagemTermoWhatsapp(t, p));
    if(!url){ copiarTexto(linkDoTermo(t), 'A paciente não tem WhatsApp cadastrado. O link foi copiado para você enviar.'); return; }
    window.open(url, '_blank');
  }

  /* ---------- Novo termo para a paciente ---------- */
  let envioModelo = null;
  function abrirEnvioTermo(modeloInicial){
    if(!currentPatient){ showToast('Selecione uma paciente primeiro.'); return; }
    const ativos = termosModelos.filter(m => m.ativo);
    if(!ativos.length){ showToast('Cadastre um termo em Meu Negócio → Termos.'); return; }
    const sel = document.getElementById('termoEnvioModelo');
    sel.innerHTML = ativos.map(m => `<option value="${escHTML(String(m.id))}">${escHTML(m.titulo)}${pacienteTemTermo(currentPatient.id, m, true) ? ' (já assinado)' : ''}</option>`).join('');
    const inicial = modeloInicial && modeloInicial.ativo ? modeloInicial : (termosSugeridos(currentPatient.id, servicosAgendadosDaPaciente(currentPatient.id))[0] || ativos[0]);
    sel.value = String(inicial.id);
    trocarModeloEnvio();
    document.getElementById('modalTermoEnvioOverlay').classList.add('open');
  }
  function trocarModeloEnvio(){
    envioModelo = termosModelos.find(m => String(m.id) === document.getElementById('termoEnvioModelo').value) || null;
    document.getElementById('termoEnvioTexto').value = envioModelo ? preencherTermo(envioModelo.texto, currentPatient) : '';
  }
  document.getElementById('termoEnvioModelo')?.addEventListener('change', trocarModeloEnvio);
  document.getElementById('btnNovoTermoPaciente')?.addEventListener('click', () => abrirEnvioTermo(null));
  document.getElementById('modalTermoEnvioCancel')?.addEventListener('click', () => document.getElementById('modalTermoEnvioOverlay').classList.remove('open'));

  async function criarTermoDaPaciente(){
    const texto = document.getElementById('termoEnvioTexto').value.trim();
    if(!envioModelo || texto.length < 30){ showToast('Escolha um termo.'); return null; }
    const t = { id: null, pacienteId: currentPatient.id, modeloId: envioModelo.id, titulo: envioModelo.titulo, status: 'pendente',
      criadoEm: new Date().toISOString(), assinadoEm: null, token: null, texto };
    if(modoDemonstracao || !isPacienteReal(currentPatient)){
      Object.assign(t, { id: idLocal(), token: idLocal() });
    } else {
      const user = await usuarioParaSalvar();
      if(!user) return null;
      const { data, error } = await supabaseClient.from('termos_paciente').insert({
        profissional_id: user.id, paciente_id: currentPatient.id, modelo_id: ehIdDoBanco(String(envioModelo.id)) ? envioModelo.id : null,
        titulo: t.titulo, texto,
      }).select('id, paciente_id, modelo_id, titulo, status, criado_em, assinado_em, token, texto').single();
      if(error){ avisarErroTermos(error); return null; }
      Object.assign(t, termoPacienteDoBanco(data));
    }
    termosPaciente.unshift(t);
    return t;
  }
  ['whats', 'copiar', 'aqui'].forEach(modo => document.getElementById('termoEnvio-' + modo)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    // o WhatsApp abre já no clique (senão o navegador bloqueia a janela)
    const janela = modo === 'whats' && !modoDemonstracao ? window.open('about:blank', '_blank') : null;
    btn.disabled = true;
    try{
      const t = await criarTermoDaPaciente();
      if(!t){ if(janela) janela.close(); return; }
      document.getElementById('modalTermoEnvioOverlay').classList.remove('open');
      renderTermosDaPaciente();
      if(modo === 'whats'){
        if(modoDemonstracao){ showToast('Termo criado. No modo demonstração o link não abre para a paciente; use "Assinar aqui".'); return; }
        const url = linkWhatsapp(currentPatient, mensagemTermoWhatsapp(t, currentPatient));
        if(url && janela) janela.location.href = url;
        else { if(janela) janela.close(); copiarTexto(linkDoTermo(t), 'A paciente não tem WhatsApp cadastrado. O link foi copiado para você enviar.'); }
      } else if(modo === 'copiar'){
        if(modoDemonstracao){ showToast('Termo criado. No modo demonstração o link não abre para a paciente; use "Assinar aqui".'); return; }
        copiarTexto(linkDoTermo(t), 'Termo criado e link copiado!');
      } else abrirAssinaturaPresencial(t);
    } finally { btn.disabled = false; }
  }));

  /* ================= ASSINATURA (dedo ou mouse) ================= */
  function criarQuadroAssinatura(canvas){
    const ctx = canvas.getContext('2d');
    let desenhando = false, vazio = true, ultimo = null;
    function ajustar(){
      const r = canvas.getBoundingClientRect();
      if(!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d1d1f';
      vazio = true;
    }
    function ponto(e){ const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); desenhando = true; ultimo = ponto(e); ctx.beginPath(); ctx.arc(ultimo.x, ultimo.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#1d1d1f'; ctx.fill(); vazio = false; canvas.dispatchEvent(new Event('assinou')); });
    canvas.addEventListener('pointermove', e => {
      if(!desenhando) return;
      e.preventDefault();
      const p = ponto(e);
      ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ultimo = p;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => canvas.addEventListener(ev, () => { desenhando = false; }));
    return {
      ajustar, limpar(){ ctx.clearRect(0, 0, canvas.width, canvas.height); vazio = true; },
      vazio: () => vazio,
      imagem(){
        // fundo branco e no máximo 900px de largura (arquivo pequeno)
        const escala = Math.min(1, 900 / canvas.width);
        const c = document.createElement('canvas');
        c.width = Math.round(canvas.width * escala); c.height = Math.round(canvas.height * escala);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0, c.width, c.height);
        return c.toDataURL('image/png');
      },
    };
  }
  function textoTermoHTML(texto){
    // linha só em MAIÚSCULAS (ex.: "SOBRE O PROCEDIMENTO") vira subtítulo
    const titulo = l => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇÀ0-9 ,\-—()]{4,}$/.test(l) && /[A-Z]/.test(l);
    return escHTML(texto).split(/\n{2,}/).map(par => {
      const linhas = par.trim().split('\n');
      let html = '';
      while(linhas.length && titulo(linhas[0].trim())) html += `<h4>${linhas.shift().trim()}</h4>`;
      if(linhas.length) html += `<p>${linhas.join('<br>')}</p>`;
      return html;
    }).join('');
  }

  /* ---------- Assinar aqui (no atendimento, no aparelho da profissional) ---------- */
  let quadroPresencial = null, termoPresencial = null;
  async function abrirAssinaturaPresencial(t){
    if(!t.texto && !modoDemonstracao){
      const { data, error } = await supabaseClient.from('termos_paciente').select('*').eq('id', t.id).single();
      if(error){ avisarErroTermos(error); return; }
      Object.assign(t, termoPacienteDoBanco(data));
    }
    termoPresencial = t;
    const p = patients.find(x => String(x.id) === String(t.pacienteId)) || currentPatient;
    document.getElementById('termoAquiTitulo').textContent = t.titulo;
    document.getElementById('termoAquiTexto').innerHTML = textoTermoHTML(t.texto || '');
    document.getElementById('termoAquiNome').value = (p && p.name) || '';
    document.getElementById('termoAquiAceite').checked = false;
    document.getElementById('modalTermoAquiOverlay').classList.add('open');
    document.querySelector('#modalTermoAquiOverlay .modal-box').scrollTop = 0;
    if(!quadroPresencial) quadroPresencial = criarQuadroAssinatura(document.getElementById('termoAquiCanvas'));
    requestAnimationFrame(() => quadroPresencial.ajustar());
  }
  document.getElementById('termoAquiLimpar')?.addEventListener('click', () => quadroPresencial && quadroPresencial.limpar());
  document.getElementById('modalTermoAquiCancel')?.addEventListener('click', () => document.getElementById('modalTermoAquiOverlay').classList.remove('open'));
  document.getElementById('modalTermoAquiConfirm')?.addEventListener('click', async () => {
    const t = termoPresencial;
    const nome = document.getElementById('termoAquiNome').value.trim();
    if(nome.length < 3){ showToast('Escreva o nome completo de quem assina.'); return; }
    if(quadroPresencial.vazio()){ showToast('Falta a assinatura no quadro.'); return; }
    if(!document.getElementById('termoAquiAceite').checked){ showToast('Marque "Li e concordo" para assinar.'); return; }
    const img = quadroPresencial.imagem();
    const btn = document.getElementById('modalTermoAquiConfirm');
    btn.disabled = true;
    try{
      if(modoDemonstracao || !ehIdDoBanco(String(t.id))){
        Object.assign(t, { status: 'assinado', assinadoEm: new Date().toISOString(), assinatura: img, nomeAssinante: nome, userAgent: navigator.userAgent, ip: null, hash: null });
      } else {
        const { data: r, error } = await supabaseClient.rpc('assinar_termo', { p_token: String(t.token), p_nome: nome, p_assinatura: img, p_user_agent: navigator.userAgent + ' (assinado no aparelho da profissional)' });
        if(error){ avisarErroTermos(error); return; }
        if(r !== 'ok' && r !== 'ja_assinado'){ showToast(r === 'invalido' ? 'Este termo foi cancelado.' : 'Confira o nome e a assinatura.'); return; }
        const { data } = await supabaseClient.from('termos_paciente').select('*').eq('id', t.id).single();
        if(data) Object.assign(t, termoPacienteDoBanco(data));
      }
      document.getElementById('modalTermoAquiOverlay').classList.remove('open');
      renderTermosDaPaciente();
      showToast('Termo assinado e guardado na ficha.');
    } finally { btn.disabled = false; }
  });

  /* ---------- Ver termo assinado / PDF ---------- */
  function documentoTermoAssinadoHTML(t, pacienteNome, profissionalNome){
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHTML(t.titulo)} - ${escHTML(pacienteNome || '')}</title>
<style>
  body{ font-family: Georgia, 'Times New Roman', serif; color:#222; max-width:720px; margin:32px auto; padding:0 20px; line-height:1.55; font-size:14.5px; }
  h1{ font-size:20px; text-align:center; margin:0 0 4px; } .sub{ text-align:center; color:#666; font-size:13px; margin:0 0 26px; }
  h4{ font-size:13px; letter-spacing:.04em; margin:20px 0 6px; } p{ margin:0 0 10px; }
  .ass{ margin-top:34px; border-top:1px solid #ddd; padding-top:18px; }
  .ass img{ max-width:320px; max-height:130px; display:block; border-bottom:1px solid #333; }
  .ass .nome{ font-weight:bold; margin-top:6px; }
  .reg{ margin-top:22px; font-family: Arial, sans-serif; font-size:11px; color:#666; background:#f6f6f6; border-radius:6px; padding:10px 12px; word-break:break-all; }
  @media print{ body{ margin:0 auto; } }
</style></head><body>
<h1>${escHTML(t.titulo)}</h1>
<p class="sub">${escHTML(profissionalNome || '')}</p>
${textoTermoHTML(t.texto || '')}
<div class="ass">
  ${t.assinatura ? `<img src="${escHTML(t.assinatura)}" alt="Assinatura">` : ''}
  <div class="nome">${escHTML(t.nomeAssinante || pacienteNome || '')}</div>
  <div>Assinado eletronicamente em ${escHTML(dataHoraBR(t.assinadoEm))}</div>
</div>
<div class="reg">Registro da assinatura — data e hora: ${escHTML(t.assinadoEm ? new Date(t.assinadoEm).toISOString() : '')}${t.ip ? ' · IP: ' + escHTML(t.ip) : ''}${t.userAgent ? '<br>Aparelho: ' + escHTML(t.userAgent) : ''}${t.hash ? '<br>Código de verificação (SHA-256): ' + escHTML(t.hash) : ''}</div>
</body></html>`;
  }
  async function verTermoAssinado(t){
    const janela = window.open('', '_blank');
    if(!t.assinatura && !modoDemonstracao){
      const { data, error } = await supabaseClient.from('termos_paciente').select('*').eq('id', t.id).single();
      if(error){ if(janela) janela.close(); avisarErroTermos(error); return; }
      Object.assign(t, termoPacienteDoBanco(data));
    }
    const p = patients.find(x => String(x.id) === String(t.pacienteId));
    if(!janela){ showToast('O navegador bloqueou a janela. Libere as janelas deste site.'); return; }
    janela.document.open();
    janela.document.write(documentoTermoAssinadoHTML(t, p && p.name, nomeDaProfissional()) + '<script>setTimeout(function(){ window.print(); }, 400);<\/script>');
    janela.document.close();
  }

  /* ================= AVISO NO AGENDAMENTO ================= */
  function atualizarAvisoTermoAgenda(){
    const aviso = document.getElementById('apptTermoAviso');
    if(!aviso) return;
    const pacId = (document.getElementById('apptPatientSelect') || {}).value;
    let servs = [];
    try{ servs = getServicosSelecionados(); }catch(e){}
    const faltam = pacId ? termosModelos.filter(m => m.ativo && m.servicos.some(s => servs.some(x => semAcento(x) === semAcento(s))) && !pacienteTemTermo(pacId, m, true)) : [];
    aviso.innerHTML = faltam.length ? `Pede termo ainda não assinado: ${faltam.map(m => `<strong>${escHTML(m.titulo)}</strong>`).join(', ')}. Envie pela ficha da paciente, na aba Termos.` : '';
    aviso.style.display = faltam.length ? 'block' : 'none';
  }
  ['apptServicosContainer', 'apptDate'].forEach(id => document.getElementById(id)?.addEventListener('change', atualizarAvisoTermoAgenda));
  try{ new MutationObserver(atualizarAvisoTermoAgenda).observe(document.getElementById('apptPatientSelect'), { childList: true }); }catch(e){}

  /* ================= PÁGINA DA PACIENTE (?termo=código) ================= */
  if(termoToken){
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'none';
    document.getElementById('publicTermoScreen').style.display = 'block';
    (async () => {
      const mostrar = (id) => ['pubTermoCarregando', 'pubTermoConteudo', 'pubTermoFeito', 'pubTermoInvalido'].forEach(x => { document.getElementById(x).style.display = x === id ? 'block' : 'none'; });
      let dados = null;
      try{
        const { data, error } = await supabaseClient.rpc('termo_por_token', { p_token: termoToken });
        if(!error) dados = typeof data === 'string' ? JSON.parse(data) : data;
      }catch(e){}
      if(!dados || dados.status === 'cancelado'){ mostrar('pubTermoInvalido'); return; }
      const primeiro = primeiroNomeDe(dados.paciente_nome || '');
      document.getElementById('pubTermoTituloDoc').textContent = dados.titulo;
      document.title = dados.titulo;
      const mostrarAssinado = (d) => {
        document.getElementById('pubTermoFeitoTexto').textContent = `Assinado${d.nome_assinante ? ' por ' + d.nome_assinante : ''} em ${dataHoraBR(d.assinado_em)}. Obrigada${primeiro ? ', ' + primeiro : ''}! Pode fechar esta página.`;
        mostrar('pubTermoFeito');
        window.scrollTo(0, 0);
      };
      if(dados.status === 'assinado'){ mostrarAssinado(dados); return; }
      document.getElementById('pubTermoSaudacao').textContent = `${primeiro ? 'Oi, ' + primeiro + '! ' : ''}Leia o termo com calma${dados.profissional_nome ? ' — ele foi enviado por ' + dados.profissional_nome : ''}. No fim da página, escreva o seu nome e assine com o dedo.`;
      document.getElementById('pubTermoTexto').innerHTML = textoTermoHTML(dados.texto || '');
      document.getElementById('pubTermoNome').value = dados.paciente_nome || '';
      mostrar('pubTermoConteudo');
      const quadro = criarQuadroAssinatura(document.getElementById('pubTermoCanvas'));
      quadro.ajustar();
      let largura = window.innerWidth;
      window.addEventListener('resize', () => { if(Math.abs(window.innerWidth - largura) > 40 && quadro.vazio()){ largura = window.innerWidth; quadro.ajustar(); } });
      document.getElementById('pubTermoLimpar').addEventListener('click', () => quadro.limpar());
      document.getElementById('pubTermoCanvas').addEventListener('assinou', () => document.getElementById('pubTermoAssinaturaCard').classList.remove('consentimento-alerta'));
      document.getElementById('pubTermoAceite').addEventListener('change', () => document.getElementById('pubTermoAssinaturaCard').classList.remove('consentimento-alerta'));
      document.getElementById('pubTermoAssinar').addEventListener('click', async () => {
        const nome = document.getElementById('pubTermoNome').value.trim();
        const card = document.getElementById('pubTermoAssinaturaCard');
        const falta = nome.length < 3 ? 'Escreva o seu nome completo.' : quadro.vazio() ? 'Faça a sua assinatura no quadro.' : !document.getElementById('pubTermoAceite').checked ? 'Marque "Li e concordo" para assinar.' : '';
        if(falta){ card.classList.add('consentimento-alerta'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); showToast(falta); return; }
        const btn = document.getElementById('pubTermoAssinar');
        btn.disabled = true; btn.textContent = 'Assinando…';
        const { data: r, error } = await supabaseClient.rpc('assinar_termo', { p_token: termoToken, p_nome: nome, p_assinatura: quadro.imagem(), p_user_agent: navigator.userAgent });
        if(error || (r !== 'ok' && r !== 'ja_assinado')){
          showToast(r === 'invalido' ? 'Este link não é mais válido. Fale com a sua profissional.' : 'Não foi possível assinar agora. Tente de novo.');
          btn.disabled = false; btn.textContent = 'Assinar'; return;
        }
        try{ document.getElementById('toast').classList.remove('show'); }catch(e){}
        mostrarAssinado({ nome_assinante: nome, assinado_em: new Date().toISOString() });
      });
    })();
  }
