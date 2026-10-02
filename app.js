  /* ================= SUPABASE ================= */
  const SUPABASE_URL = 'https://fpnphcbczyhhllmhqusy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xQoS6dQpOM11j0FibRIaPw_GIRRkjTD';
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- Consentimento para dados de saúde (RGPD / LGPD) ----------
     Mudou o texto? Troque a versão: cada anamnese guarda a versão e o texto que a paciente aceitou. */
  const CONSENTIMENTO_VERSAO = 'v1.1 · 01/10/2026';
  const CONSENTIMENTO_TEXTO = 'Autorizo a profissional responsável pelo meu atendimento a coletar e guardar os dados pessoais e de saúde que informei nesta ficha, exclusivamente para avaliar a minha pele, planejar e registrar os meus tratamentos e entrar em contato comigo sobre os meus atendimentos.\n\nSei que estes dados são confidenciais e não serão compartilhados com terceiros para outros fins. A qualquer momento posso pedir para consultar, corrigir, receber uma cópia ou apagar os meus dados, ou retirar este consentimento, falando diretamente com a profissional.';
  const DECLARACAO_ANAMNESE = 'Declaro que as informações desta ficha são verdadeiras e completas, que me responsabilizo por elas e que vou avisar a profissional se algo mudar (por exemplo: medicamentos, gestação, alergias ou problemas de saúde).';
  function linkConfirmacaoAnamnese(token){ return window.location.origin + window.location.pathname + '?confirmar=' + token; }
  function camposConsentimento(){
    return { consentimento_em: new Date().toISOString(), consentimento_versao: CONSENTIMENTO_VERSAO, consentimento_texto: CONSENTIMENTO_TEXTO };
  }
  // Insere a anamnese; se o banco ainda não tiver as colunas de consentimento, salva assim mesmo e avisa.
  async function inserirAnamneseComConsentimento(payload){
    let { error } = await supabaseClient.from('anamneses').insert(payload);
    if(error && /consentimento|confirmacao/i.test(error.message || '')){
      console.warn('Consentimento não registrado (rode consentimento.sql):', error.message);
      const semConsent = { ...payload };
      delete semConsent.consentimento_em; delete semConsent.consentimento_versao; delete semConsent.consentimento_texto; delete semConsent.confirmacao_token;
      ({ error } = await supabaseClient.from('anamneses').insert(semConsent));
      if(!error) return { error: null, consentimentoNaoGravado: true };
    }
    return { error };
  }

  /* ---------- Velocidade: "quem está logado?" sem ir ao servidor toda vez ----------
     auth.getUser() faz uma chamada de rede a cada uso (eram ~15 ao abrir o app).
     A sessão já fica guardada no navegador (e é renovada sozinha pelo Supabase), então
     lemos dela. A segurança continua no banco: cada consulta leva o token e o RLS confere. */
  (function(){
    const auth = supabaseClient.auth;
    const getUserServidor = auth.getUser.bind(auth);
    auth.getUserServidor = getUserServidor;
    auth.getUser = async function(jwt){
      if(jwt) return getUserServidor(jwt);
      try{
        const { data, error } = await auth.getSession();
        if(error) return { data: { user: null }, error };
        return { data: { user: (data && data.session && data.session.user) || null }, error: null };
      }catch(e){
        return getUserServidor();
      }
    };
  })();

  /* ---------- Meus Dados Profissionais (aparecem nos PDFs e na sidebar) ---------- */
  // Textos genéricos abaixo são usados SOMENTE no modo demonstração. Em contas reais,
  // se a profissional não tiver preenchido algo em Configurações, o campo fica em branco.
  const PLACEHOLDER_DEMO = { nome: 'Profissional Skin Expert Pro', titulo: 'Esteticista e Cosmetóloga', telefone: '', email: 'contato@skinexpertpro.app' };
  let perfilProfissional = { nome: '', titulo: '', telefone: '', email: '' };

  function iniciaisDoNome(nome){
    if(!nome) return 'SE';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if(partes.length === 0) return 'SE';
    if(partes.length === 1) return partes[0].slice(0,2).toUpperCase();
    return (partes[0][0] + partes[partes.length-1][0]).toUpperCase();
  }

  function atualizarSidebarPerfil(){
    document.querySelector('.topbar-avatar').textContent = iniciaisDoNome(perfilProfissional.nome);
    document.querySelector('.profile-name').textContent = perfilProfissional.nome || '—';
    if(typeof atualizarProfissionalPrincipal === 'function') atualizarProfissionalPrincipal();
  }

  function preencherCamposConfiguracoesPerfil(){
    const nomeEl = document.getElementById('cfgNomeProfissional');
    const tituloEl = document.getElementById('cfgTituloProfissional');
    const telefoneEl = document.getElementById('cfgTelefoneProfissional');
    const emailEl = document.getElementById('cfgEmailProfissional');
    if(nomeEl) nomeEl.value = perfilProfissional.nome || '';
    if(tituloEl) tituloEl.value = perfilProfissional.titulo || '';
    if(telefoneEl) telefoneEl.value = perfilProfissional.telefone || '';
    if(emailEl) emailEl.value = perfilProfissional.email || '';
  }

  async function carregarPerfilProfissionalReal(){
    perfilProfissional = { nome: '', titulo: '', telefone: '', email: '' };
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return;
      const user = userData.user;
      perfilProfissional.email = user.email || '';

      const { data, error } = await supabaseClient.from('perfis').select('nome, titulo, telefone').eq('id', user.id).maybeSingle();
      if(!error && data){
        perfilProfissional.nome = data.nome || '';
        perfilProfissional.titulo = data.titulo || '';
        perfilProfissional.telefone = data.telefone || '';
      }
    } catch(err){
      console.warn('Não foi possível carregar Meus Dados Profissionais.', err);
    }
    atualizarSidebarPerfil();
    preencherCamposConfiguracoesPerfil();
  }

  function carregarPerfilProfissionalDemo(){
    perfilProfissional = {
      nome: localStorage.getItem('skinExpertDemoNome') || PLACEHOLDER_DEMO.nome,
      titulo: localStorage.getItem('skinExpertDemoTitulo') || PLACEHOLDER_DEMO.titulo,
      telefone: localStorage.getItem('skinExpertDemoTelefone') || PLACEHOLDER_DEMO.telefone,
      email: localStorage.getItem('skinExpertDemoEmail') || PLACEHOLDER_DEMO.email
    };
    atualizarSidebarPerfil();
    preencherCamposConfiguracoesPerfil();
  }

  /* ---------- Integração com WhatsApp (Modelo 1: cada profissional conecta sua própria conta) ---------- */
  let integracaoWhatsapp = { provider: 'meta_cloud_api', phone_number_id: '', access_token: '', numero_whatsapp: '', ativo: false };

  function preencherCamposWhatsapp(){
    const numeroEl = document.getElementById('cfgWhatsappNumero');
    const phoneIdEl = document.getElementById('cfgWhatsappPhoneId');
    const tokenEl = document.getElementById('cfgWhatsappToken');
    const statusEl = document.getElementById('whatsappStatusLabel');
    if(numeroEl) numeroEl.value = integracaoWhatsapp.numero_whatsapp || '';
    if(phoneIdEl) phoneIdEl.value = integracaoWhatsapp.phone_number_id || '';
    if(tokenEl) tokenEl.value = integracaoWhatsapp.access_token || '';
    if(statusEl){
      statusEl.innerHTML = integracaoWhatsapp.ativo
        ? 'Status: <strong style="color:#1a9c5a;">Conectado</strong>'
        : 'Status: <strong style="color:var(--text-muted);">Não conectado</strong>';
    }
  }

  async function carregarIntegracaoWhatsappReal(){
    integracaoWhatsapp = { provider: 'meta_cloud_api', phone_number_id: '', access_token: '', numero_whatsapp: '', ativo: false };
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return;
      const { data, error } = await supabaseClient.from('integracoes_whatsapp')
        .select('provider, phone_number_id, access_token, numero_whatsapp, ativo')
        .eq('profissional_id', userData.user.id).maybeSingle();
      if(!error && data){
        integracaoWhatsapp = {
          provider: data.provider || 'meta_cloud_api',
          phone_number_id: data.phone_number_id || '',
          access_token: data.access_token || '',
          numero_whatsapp: data.numero_whatsapp || '',
          ativo: !!data.ativo
        };
      }
    } catch(err){
      console.warn('Não foi possível carregar a integração de WhatsApp.', err);
    }
    preencherCamposWhatsapp();
  }

  function carregarIntegracaoWhatsappDemo(){
    integracaoWhatsapp = {
      provider: 'meta_cloud_api',
      phone_number_id: localStorage.getItem('skinExpertWhatsappPhoneId') || '',
      access_token: localStorage.getItem('skinExpertWhatsappToken') || '',
      numero_whatsapp: localStorage.getItem('skinExpertWhatsappNumero') || '',
      ativo: localStorage.getItem('skinExpertWhatsappAtivo') === 'true'
    };
    preencherCamposWhatsapp();
  }

  /* ---------- Google Agenda (cada profissional conecta sua própria conta do Google) ---------- */
  // Troque pelo Client ID gerado no Google Cloud Console (OAuth 2.0 Client ID, tipo "Aplicativo da Web").
  const GOOGLE_CLIENT_ID = '26417237147-prh95l1dug846iarojmcq2mgahme58gc.apps.googleusercontent.com';
  // URL da Edge Function que recebe o retorno do Google (precisa ser a mesma cadastrada no Google Cloud Console).
  const GOOGLE_REDIRECT_URI = SUPABASE_URL + '/functions/v1/google-agenda-callback';

  let googleAgendaConectado = false;

  function preencherStatusGoogleAgenda(){
    const statusEl = document.getElementById('googleAgendaStatusLabel');
    const btnConectar = document.getElementById('btnConectarGoogleAgenda');
    const btnDesconectar = document.getElementById('btnDesconectarGoogleAgenda');
    if(statusEl){
      statusEl.innerHTML = googleAgendaConectado
        ? 'Status: <strong style="color:#1a9c5a;">Conectado</strong>'
        : 'Status: <strong style="color:var(--text-muted);">Não conectado</strong>';
    }
    if(btnConectar) btnConectar.style.display = googleAgendaConectado ? 'none' : '';
    if(btnDesconectar) btnDesconectar.style.display = googleAgendaConectado ? '' : 'none';
  }

  async function carregarIntegracaoGoogleAgendaReal(){
    googleAgendaConectado = false;
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return;
      const { data, error } = await supabaseClient.from('integracoes_google_agenda')
        .select('ativo').eq('profissional_id', userData.user.id).maybeSingle();
      if(!error && data) googleAgendaConectado = !!data.ativo;
    } catch(err){
      console.warn('Não foi possível carregar a integração com a Google Agenda.', err);
    }
    preencherStatusGoogleAgenda();
  }

  function iniciarConexaoGoogleAgenda(userId){
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      state: userId,
    });
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  }

  // Depois de voltar do Google, a Edge Function redireciona de volta com ?google_agenda=conectado ou =erro na URL.
  function verificarRetornoGoogleAgenda(){
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google_agenda');
    if(!status) return;
    if(status === 'conectado') showToast('Google Agenda conectada com sucesso!');
    else showToast('Não foi possível conectar sua Google Agenda. Tente novamente.');
    params.delete('google_agenda');
    const novaUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', novaUrl);
  }

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimeout;
  function showToast(msg){
    clearTimeout(toastTimeout);
    toastEl.classList.remove('has-action');
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(()=> toastEl.classList.remove('show'), 2400);
  }
  verificarRetornoGoogleAgenda();
  // Toast com ação "Desfazer", no estilo do Google Agenda.
  function showUndoToast(msg, onUndo){
    clearTimeout(toastTimeout);
    toastEl.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = 'Desfazer';
    btn.addEventListener('click', () => {
      clearTimeout(toastTimeout);
      toastEl.classList.remove('show', 'has-action');
      onUndo();
    });
    toastEl.appendChild(span);
    toastEl.appendChild(btn);
    toastEl.classList.add('show', 'has-action');
    toastTimeout = setTimeout(()=> toastEl.classList.remove('show', 'has-action'), 5000);
  }

  /* ---------- Navigation between views ---------- */
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  /* ---------- Histórico de navegação (botão voltar) ---------- */
  const navHistory = [];
  function captureViewSnapshot(){
    const activeView = document.querySelector('.view.active');
    if(!activeView) return null;
    const activeNav = document.querySelector('.nav-item.active');
    return {
      viewId: activeView.id,
      title: pageTitle.textContent,
      subtitleText: pageSubtitle.textContent,
      subtitleVisible: pageSubtitle.style.display !== 'none',
      navView: activeNav ? activeNav.dataset.view : null,
    };
  }
  function pushNavHistory(){
    const snap = captureViewSnapshot();
    if(snap) navHistory.push(snap);
  }
  function restoreViewSnapshot(snap){
    navItems.forEach(i => i.classList.remove('active'));
    if(snap.navView){
      const navEl = document.querySelector(`.nav-item[data-view="${snap.navView}"]`);
      if(navEl) navEl.classList.add('active');
    }
    views.forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(snap.viewId);
    if(viewEl) viewEl.classList.add('active');
    pageTitle.textContent = snap.title;
    pageSubtitle.textContent = snap.subtitleText;
    pageSubtitle.style.display = snap.subtitleVisible ? 'block' : 'none';
  }
  document.querySelector('.collapse-btn').title = 'Voltar';
  document.querySelector('.collapse-btn').addEventListener('click', () => {
    const snap = navHistory.pop();
    if(snap) restoreViewSnapshot(snap);
    else showToast('Não há mais telas anteriores');
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if(item.dataset.locked){ showToast('Recurso disponível em planos superiores 🔒'); return; }
      if(item.dataset.soon){
        const nomeItem = item.textContent.replace(/em breve/i, '').trim();
        showToast(nomeItem ? `${nomeItem} estará disponível em breve ✨` : 'Em breve nesta versão');
        return;
      }
      if(item.dataset.logout){
        supabaseClient.auth.signOut().then(() => {
          document.getElementById('appRoot').style.display = 'none';
          document.getElementById('authScreen').style.display = 'flex';
        });
        return;
      }
      if(!item.dataset.view) return;

      pushNavHistory();

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const viewName = item.dataset.view;
      views.forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + viewName).classList.add('active');
      if(viewName === 'agenda'){ try{ ultimaRolagemAgenda = ''; rolarAgendaParaHorarioDeTrabalho(); }catch(e){} }

      pageTitle.textContent = item.dataset.title;
      if (item.dataset.subtitle) {
        pageSubtitle.textContent = item.dataset.subtitle;
        pageSubtitle.style.display = 'block';
      } else {
        pageSubtitle.style.display = 'none';
      }
    });
  });


  /* ---------- Patients table ---------- */
  const patients = [
    { id:"p1", initials:"P1", color:"#8a949a", bg:"#eef0f2", name:"Paciente Teste 1", age:60, gender:"Feminino", phone:"+55 (11) 00000-0001", phoneCode:"+55", phoneNumber:"(11) 00000-0001", email:"", cep:"00000-000", endereco:"Rua Exemplo", numero:"", complemento:"", bairro:"Bairro Teste", cidade:"São Paulo", estado:"SP", pais:"Brasil", rotina:"08/04/2026", acomp:{type:"gray", label:"Encerrado"}, status:"Ativo" },
    { id:"p2", initials:"P2", color:"#c65d8a", bg:"#fbe8f0", name:"Paciente Teste 2", age:24, gender:"Feminino", phone:"+351 900 000 002", phoneCode:"+351", phoneNumber:"900 000 002", rotina:null, acomp:{type:"dash"}, status:"Ativo" },
    { id:"p3", initials:"P3", color:"#7c5dc6", bg:"#efe8fb", name:"Paciente Teste 3", age:24, gender:"Feminino", phone:"+55 (11) 00000-0003", phoneCode:"+55", phoneNumber:"(11) 00000-0003", rotina:"20/04/2026", acomp:{type:"gray", label:"Encerrado"}, status:"Ativo" },
    { id:"p4", initials:"P4", color:"#c65d5d", bg:"#fbe8e8", name:"Paciente Teste 4", age:37, gender:"Feminino", phone:"+55 (11) 00000-0004", phoneCode:"+55", phoneNumber:"(11) 00000-0004", rotina:"27/04/2026", acomp:{type:"green", label:"Dia 87 / 90"}, status:"Ativo" },
    { id:"p5", initials:"P5", color:"#5d8ac6", bg:"#e8f0fb", name:"Paciente Teste 5", age:45, gender:"Feminino", phone:"+55 (11) 00000-0005", phoneCode:"+55", phoneNumber:"(11) 00000-0005", rotina:"15/05/2026", acomp:{type:"green", label:"Dia 12 / 60"}, status:"Ativo" },
  ];


  const whatsappIcon = `<svg class="whatsapp-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.4-5.6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7 1-.1.1-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 4 3.4.6.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>`;
  const calendarIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  function acompHTML(a){
    if(a.type === "gray") return `<span class="pill pill-gray">${a.label}</span>`;
    if(a.type === "green") return `<span class="pill pill-green">${a.label}</span>`;
    return `<span class="pill-dash">--</span>`;
  }

  // Modo demonstração: duas pacientes de exemplo com aniversário neste mês,
  // para o cartão "Aniversariantes do Dia" aparecer preenchido. Contas reais usam a data da ficha.
  (function(){
    const h = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const p2 = patients.find(p => p.id === 'p2');
    if(p2 && !p2.dataNascimento) p2.dataNascimento = iso(new Date(h.getFullYear() - 24, h.getMonth(), h.getDate()));
    const p4 = patients.find(p => p.id === 'p4');
    if(p4 && !p4.dataNascimento){
      const d = Math.min(h.getDate() + 3, new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate());
      p4.dataNascimento = iso(new Date(h.getFullYear() - 37, h.getMonth(), d));
    }
    const p5 = patients.find(p => p.id === 'p5');
    if(p5 && !p5.dataNascimento && h.getDate() > 2) p5.dataNascimento = iso(new Date(h.getFullYear() - 45, h.getMonth(), 2));
  })();

  /* ================= ANIVERSARIANTES DO DIA ================= */
  const MESES_CURTOS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

  // Lê "AAAA-MM-DD" (formato do banco) ou "DD/MM/AAAA" e devolve { ano, mes (0-11), dia }.
  function partesDataNascimento(str){
    if(!str) return null;
    let m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return { ano:+m[1], mes:+m[2]-1, dia:+m[3] };
    m = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m) return { ano:+m[3], mes:+m[2]-1, dia:+m[1] };
    return null;
  }

  // Data do aniversário num determinado ano (quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos).
  function aniversarioNoAno(n, ano){
    const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    const dia = (n.mes === 1 && n.dia === 29 && !bissexto) ? 28 : n.dia;
    return new Date(ano, n.mes, dia);
  }

  function linkWhatsapp(p, msg){
    if(!p) return null;
    const digitosNumero = String(p.phoneNumber || p.phone || '').replace(/\D/g, '');
    if(digitosNumero.length < 8) return null;
    let codigo = String(p.phoneCode || '').replace(/\D/g, '');
    let numero = digitosNumero;
    if(!codigo){
      if(numero.length >= 12) codigo = '';
      else codigo = (p.pais === 'Portugal') ? '351' : '55';
    } else if(numero.startsWith(codigo) && numero.length > 11){
      codigo = '';
    }
    return `https://wa.me/${codigo}${numero}` + (msg ? `?text=${encodeURIComponent(msg)}` : '');
  }

  function linkWhatsappAniversario(p){
    const digitosNumero = String(p.phoneNumber || p.phone || '').replace(/\D/g, '');
    if(digitosNumero.length < 8) return null;
    let codigo = String(p.phoneCode || '').replace(/\D/g, '');
    let numero = digitosNumero;
    if(!codigo){
      // Sem código do país: se o número já parece incluir (55… / 351…), usa como está; senão deduz pelo país.
      if(numero.length >= 12) codigo = '';
      else codigo = (p.pais === 'Portugal') ? '351' : '55';
    } else if(numero.startsWith(codigo) && numero.length > 11){
      codigo = '';
    }
    const msg = msgDoModelo('aniversario', { paciente: p });
    return `https://wa.me/${codigo}${numero}?text=${encodeURIComponent(msg)}`;
  }

  function avatarAnivHTML(p){
    if(p.foto_url) return `<div class="aniv-avatar"><img src="${p.foto_url}" alt=""></div>`;
    return `<div class="aniv-avatar" style="background:${p.bg || '#eef0f2'}; color:${p.color || '#8a949a'};">${initialsFromName(p.name)}</div>`;
  }

  function renderAniversariantes(){
    const container = document.getElementById('aniversariantesContainer');
    const pill = document.getElementById('anivDatePill');
    if(!container) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear();
    if(pill) pill.textContent = `${MESES_CURTOS[mesAtual]} ${anoAtual}`;

    const doMes = [];
    let semData = 0;
    patients.forEach(p => {
      const n = partesDataNascimento(p.dataNascimento);
      if(!n){ semData++; return; }
      const aniv = aniversarioNoAno(n, anoAtual);
      if(aniv.getMonth() !== mesAtual) return;
      const diasAte = Math.round((aniv - hoje) / 86400000);
      doMes.push({ p, n, aniv, diasAte, idade: anoAtual - n.ano });
    });
    // Ordem: hoje primeiro, depois os próximos, e os que já passaram no fim.
    doMes.sort((a, b) => {
      const ga = a.diasAte === 0 ? 0 : (a.diasAte > 0 ? 1 : 2);
      const gb = b.diasAte === 0 ? 0 : (b.diasAte > 0 ? 1 : 2);
      return ga - gb || a.aniv - b.aniv;
    });

    container.innerHTML = '';
    if(doMes.length === 0){
      container.innerHTML = '<div class="empty-state">Nenhum aniversariante este mês.</div>';
    }

    const iconeWhats = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.7.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';

    doMes.forEach(({ p, n, aniv, diasAte, idade }) => {
      const ehHoje = diasAte === 0;
      const idadeOk = idade > 0 && idade < 130;
      let quando;
      if(ehHoje) quando = idadeOk ? `Faz ${idade} anos hoje` : 'Aniversário hoje';
      else if(diasAte > 0) quando = (diasAte === 1 ? 'Amanhã' : `Em ${diasAte} dias`) + (idadeOk ? ` · fará ${idade} anos` : '');
      else quando = (diasAte === -1 ? 'Foi ontem' : `Foi há ${-diasAte} dias`) + (idadeOk ? ` · fez ${idade} anos` : '');

      const link = linkWhatsappAniversario(p);
      const item = document.createElement('div');
      item.className = 'aniv-item' + (ehHoje ? ' hoje' : (diasAte < 0 ? ' passou' : ''));
      item.innerHTML = `
        <div class="aniv-dia">${pad(aniv.getDate())}<small>${MESES_CURTOS[aniv.getMonth()]}</small></div>
        ${avatarAnivHTML(p)}
        <div class="aniv-info">
          <div class="aniv-nome">${ehHoje ? '🎂 ' : ''}${p.name}${ehHoje ? '<span class="aniv-badge-hoje">HOJE</span>' : ''}</div>
          <div class="aniv-sub">${quando}</div>
        </div>
        ${diasAte >= 0 ? `<button class="aniv-whats" ${link ? '' : 'disabled title="Paciente sem telefone cadastrado"'} title="${ehHoje ? 'Enviar parabéns pelo WhatsApp' : 'Abrir WhatsApp com mensagem de parabéns'}">${iconeWhats}${ehHoje ? ' Parabenizar' : ''}</button>` : ''}
      `;
      item.addEventListener('click', () => openPatientRegistro(p.id, 'dados'));
      const btn = item.querySelector('.aniv-whats');
      if(btn) btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(link) window.open(link, '_blank', 'noopener');
      });
      container.appendChild(item);
    });

    if(semData > 0 && patients.length > 0){
      const dica = document.createElement('div');
      dica.className = 'aniv-dica';
      dica.innerHTML = `${semData} de ${patients.length} paciente${patients.length === 1 ? '' : 's'} ainda ${semData === 1 ? 'não tem' : 'não têm'} data de nascimento na ficha. <a id="anivVerPacientes">Completar cadastros</a>`;
      container.appendChild(dica);
      dica.querySelector('#anivVerPacientes').addEventListener('click', () => {
        const nav = document.querySelector('.nav-item[data-view="pacientes"]');
        if(nav) nav.click();
      });
    }
  }

  // Atualiza sozinho quando vira o dia com o app aberto.
  (function agendarVirada(){
    const agora = new Date();
    const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 5);
    setTimeout(() => { try{ renderAniversariantes(); }catch(e){} agendarVirada(); }, amanha - agora);
  })();

  function renderPacientesTable(){
    try{ renderAniversariantes(); }catch(e){ console.warn('Aniversariantes:', e); }
    try{ renderLembretes(); }catch(e){}
    const termo = (document.getElementById('pacientesSearch').value || '').trim().toLowerCase();
    const statusFiltro = document.getElementById('pacientesFiltroStatus').value;
    const rotinaFiltro = document.getElementById('pacientesFiltroRotina').value;

    const filtrados = patients.filter(p => {
      if(termo && !(p.name || '').toLowerCase().includes(termo)) return false;
      if(statusFiltro && p.status !== statusFiltro) return false;
      if(rotinaFiltro === 'com' && !p.rotina) return false;
      if(rotinaFiltro === 'sem' && p.rotina) return false;
      return true;
    });

    const tbody = document.getElementById('patientsBody');
    tbody.innerHTML = '';
    filtrados.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="patient-cell">
            <div class="patient-avatar" style="background:${p.bg}; color:${p.color};">${p.initials}</div>
            <div>
              <div class="patient-name" data-patient-id="${p.id}" style="cursor:pointer; color: var(--pink);">${p.name}</div>
              <div class="patient-age">${p.age ? p.age + ' anos' : '—'}</div>
            </div>
          </div>
        </td>
        <td><div class="phone-cell">${p.phone || '—'} ${p.phone ? whatsappIcon : ''}</div></td>
        <td><div class="date-cell">${calendarIcon} ${p.rotina ? p.rotina : '<span class="date-dash">--</span>'}</div></td>
        <td>${acompHTML(p.acomp)}</td>
        <td><span class="status-active">${p.status}</span></td>
      `;
      tr.querySelector('.patient-name').addEventListener('click', () => openPatientRegistro(p.id, 'dados'));
      tbody.appendChild(tr);
    });
  }
  renderPacientesTable();
  document.getElementById('pacientesSearch').addEventListener('input', renderPacientesTable);
  document.getElementById('pacientesFiltroStatus').addEventListener('change', renderPacientesTable);
  document.getElementById('pacientesFiltroRotina').addEventListener('change', renderPacientesTable);

  const avatarPalette = [
    {color:'#8a949a', bg:'#eef0f2'}, {color:'#c65d8a', bg:'#fbe8f0'}, {color:'#7c5dc6', bg:'#efe8fb'},
    {color:'#c65d5d', bg:'#fbe8e8'}, {color:'#5d8ac6', bg:'#e8f0fb'},
  ];
  function initialsFromName(nome){
    return (nome || '').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase() || '—';
  }

  function calcularIdade(dataNascimentoStr){
    if(!dataNascimentoStr) return null;
    const nasc = new Date(dataNascimentoStr + 'T00:00:00');
    if(isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const aindaNaoFezAniversario = (hoje.getMonth() < nasc.getMonth()) ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
    if(aindaNaoFezAniversario) idade--;
    return idade;
  }

  async function loadPacientesFromSupabase(){
    const { data, error } = await supabaseClient
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false });

    if(error){ console.warn('Não foi possível carregar pacientes do Supabase:', error.message); return; }
    if(!data) return;

    patients.length = 0;
    data.forEach((row, i) => {
      const pal = avatarPalette[i % avatarPalette.length];
      patients.push({
        id: row.id, initials: initialsFromName(row.nome), color: pal.color, bg: pal.bg,
        name: row.nome, age: calcularIdade(row.data_nascimento), gender: row.genero,
        phone: [row.telefone_codigo, row.telefone_numero].filter(Boolean).join(' '),
        phoneCode: row.telefone_codigo, phoneNumber: row.telefone_numero, email: row.email,
        dataNascimento: row.data_nascimento, pais: row.pais, foto_url: row.foto_url || '',
        rotina: null, acomp: { type: 'dash' }, status: row.status || 'Ativo',
      });
    });
    renderPacientesTable();
  }

  /* ---------- Nova paciente: janela com código do país e país (nada pré-definido) ---------- */
  const modalNovaPacienteOverlay = document.getElementById('modalNovaPacienteOverlay');
  const PAIS_POR_CODIGO = { '+55':'Brasil', '+351':'Portugal', '+34':'Espanha', '+33':'França', '+39':'Itália', '+49':'Alemanha', '+353':'Irlanda', '+31':'Países Baixos', '+1':'Estados Unidos' };
  let resolverNovaPaciente = null;
  (function prepararJanelaNovaPaciente(){
    // mesmas opções da aba Dados (começando em "Selecionar")
    document.getElementById('npPhoneCode').innerHTML = document.getElementById('regPhoneCode').innerHTML;
    document.getElementById('npPais').innerHTML = document.getElementById('regPais').innerHTML;
  })();
  // "+351 912 345 678" ou "00351…" → escolhe o código e deixa só o número
  function separarCodigoDoTelefone(){
    const inp = document.getElementById('npTelefone'), sel = document.getElementById('npPhoneCode');
    const bruto = inp.value.trim();
    const m = bruto.match(/^(?:\+|00)\s*(\d{1,4})[\s\-.]*(.*)$/);
    if(!m) return;
    const opcoes = Array.from(sel.options).map(o => o.value).filter(Boolean).sort((a, b) => b.length - a.length);
    const digitos = m[1] + m[2].replace(/\D/g, '');
    const codigo = opcoes.find(c => digitos.startsWith(c.slice(1)));
    if(!codigo) return;
    sel.value = codigo;
    inp.value = digitos.slice(codigo.length - 1).replace(/^0+/, '');
    sugerirPaisPeloCodigo();
  }
  function sugerirPaisPeloCodigo(){
    const pais = document.getElementById('npPais');
    const sugestao = PAIS_POR_CODIGO[document.getElementById('npPhoneCode').value];
    if(!pais.value && sugestao && Array.from(pais.options).some(o => o.value === sugestao)) pais.value = sugestao;
  }
  document.getElementById('npTelefone').addEventListener('blur', separarCodigoDoTelefone);
  document.getElementById('npPhoneCode').addEventListener('change', sugerirPaisPeloCodigo);

  function abrirNovaPaciente(nomeInicial){
    document.getElementById('npNome').value = nomeInicial || '';
    document.getElementById('npPhoneCode').value = '';
    document.getElementById('npTelefone').value = '';
    document.getElementById('npPais').value = '';
    document.getElementById('npNascimento').value = '';
    modalNovaPacienteOverlay.classList.add('open');
    setTimeout(() => document.getElementById(nomeInicial ? 'npPhoneCode' : 'npNome').focus(), 50);
    return new Promise(res => { resolverNovaPaciente = res; });
  }
  function fecharNovaPaciente(resultado){
    modalNovaPacienteOverlay.classList.remove('open');
    if(resolverNovaPaciente){ const r = resolverNovaPaciente; resolverNovaPaciente = null; r(resultado || null); }
  }
  document.getElementById('npCancelar').addEventListener('click', () => fecharNovaPaciente(null));
  modalNovaPacienteOverlay.addEventListener('click', (e) => { if(e.target === modalNovaPacienteOverlay) fecharNovaPaciente(null); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalNovaPacienteOverlay.classList.contains('open')) fecharNovaPaciente(null); });
  document.getElementById('npSalvar').addEventListener('click', async () => {
    separarCodigoDoTelefone();
    const nome = document.getElementById('npNome').value.trim();
    const codigo = document.getElementById('npPhoneCode').value;
    const numero = document.getElementById('npTelefone').value.trim();
    const pais = document.getElementById('npPais').value;
    const nascimento = document.getElementById('npNascimento').value;
    if(!nome){ showToast('Informe o nome da paciente.'); document.getElementById('npNome').focus(); return; }
    if(!codigo){ showToast('Selecione o código do país do telefone.'); document.getElementById('npPhoneCode').focus(); return; }
    if(!numero){ showToast('O telefone é obrigatório para cadastrar uma nova paciente.'); document.getElementById('npTelefone').focus(); return; }
    const btn = document.getElementById('npSalvar');
    btn.disabled = true;
    try{
      const criada = await criarPaciente({ nome, codigo, numero, pais, nascimento });
      if(criada) fecharNovaPaciente(criada);
    } finally { btn.disabled = false; }
  });

  document.getElementById('btnNovoPaciente').addEventListener('click', async () => {
    const criada = await abrirNovaPaciente('');
    if(criada) showToast('Paciente cadastrada com sucesso!');
  });

  /* ================= REGISTRO DE PACIENTE MODULE ================= */
  let currentPatient = null;

  const patientPhotoDefaultIcon = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function setPatientPhotoCircle(url, initials, color, bg){
    const circle = document.getElementById('patientPhotoCircle');
    const inner = document.getElementById('patientPhotoInner');
    circle.classList.toggle('has-photo', !!url);
    if(url){
      inner.style.background = '';
      inner.style.color = '';
      inner.innerHTML = `<img src="${url}" alt="Foto da paciente">`;
    } else if(initials){
      inner.style.background = bg || 'var(--tag-bg)';
      inner.style.color = color || 'var(--tag-text)';
      inner.innerHTML = `<span style="font-weight:700; font-size:26px;">${initials}</span>`;
    } else {
      inner.style.background = '';
      inner.style.color = '';
      inner.innerHTML = patientPhotoDefaultIcon;
    }
  }

  document.getElementById('patientPhotoCircle').addEventListener('click', () => {
    document.getElementById('patientPhotoInput').click();
  });

  document.getElementById('patientPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentPatient) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setPatientPhotoCircle(dataUrl);
        currentPatient.foto_url = dataUrl;

        if(isPacienteReal(currentPatient)){
          const { error } = await supabaseClient.from('pacientes').update({ foto_url: dataUrl }).eq('id', currentPatient.id);
          if(error){ showToast('Não foi possível salvar a foto: ' + error.message); return; }
          await loadPacientesFromSupabase();
        } else {
          renderPacientesTable();
        }
        showToast('Foto atualizada!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Busca a moeda de investimento definida na anamnese clínica mais recente da paciente,
  // para usar como referência de preço no Plano de SkinCare.
  async function carregarMoedaAnamnese(patient){
    if(!patient || !String(patient.id).includes('-')) return; // pula pacientes de demonstração
    try{
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('investimento_moeda')
        .eq('paciente_id', patient.id)
        .order('respondida_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if(!error && data && data.investimento_moeda) patient.moedaAnamnese = data.investimento_moeda;
    } catch(e){ /* mantém a moeda padrão em caso de falha */ }
  }

  /* ---------- Troca de paciente: nada da paciente anterior pode ficar nos formulários ----------
     Antes, Anamnese Clínica, Avaliação Cutânea e Plano de SkinCare eram preenchidos na tela
     e nunca limpos: ao abrir outra paciente, os dados da anterior continuavam lá (e podiam
     ser salvos na ficha errada). */
  function limparFormulariosDaPaciente(){
    ['panel-anamnese', 'panel-avaliacao', 'panel-planoskincare'].forEach(id => {
      const painel = document.getElementById(id);
      if(!painel) return;
      painel.querySelectorAll('input, textarea, select').forEach(el => {
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked;
        else if(el.tagName === 'SELECT'){
          let algum = false;
          Array.from(el.options).forEach(o => { o.selected = o.defaultSelected; algum = algum || o.defaultSelected; });
          if(!algum) el.selectedIndex = 0;
        }
        else if(!['button', 'submit', 'hidden', 'file'].includes(el.type)) el.value = el.defaultValue;
      });
    });
    // Anamnese: produtos de skincare e perguntas da integrativa
    ['skincareAtualContainer', 'skincareParadoContainer'].forEach(id => { const c = document.getElementById(id); if(c) c.innerHTML = ''; });
    const perguntas = document.getElementById('questionsContainer');
    if(perguntas){ perguntas.innerHTML = ''; addQuestionRow(); }
    const moedaInv = document.getElementById('paInvestimentoMoeda');
    if(moedaInv) moedaInv.dispatchEvent(new Event('change')); // refaz as faixas de investimento
    // Avaliação: cartões e chips marcados, seções abertas, Baumann
    document.querySelectorAll('#panel-avaliacao .selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('#panel-avaliacao .switch input[data-toggle-target]').forEach(inp => {
      const alvo = document.getElementById(inp.dataset.toggleTarget);
      if(alvo) alvo.classList.toggle('hidden', !inp.checked);
    });
    updateBaumannResult();
    const aviso = document.getElementById('avUltimaAviso');
    if(aviso) aviso.style.display = 'none';
    // Plano de SkinCare: rotina montada e filtros do assistente
    routineEntries.splice(0, routineEntries.length);
    skcAtivosDesejados.clear();
    document.querySelectorAll('#panel-planoskincare .chip.selected').forEach(el => el.classList.remove('selected'));
    try{ renderSkcAtivosDesejadosChips(); }catch(e){}
    try{ renderSkcProdutosEncontrados(); }catch(e){}
    renderJornada();
    updateSkincareMeta();
  }

  // Coloca no formulário a última avaliação cutânea salva DESTA paciente (para consultar/atualizar).
  let seqAvaliacaoCarregada = 0;
  async function carregarUltimaAvaliacao(p){
    const minhaVez = ++seqAvaliacaoCarregada;
    if(!isPacienteReal(p)) return;
    let av = null;
    try{
      const { data, error } = await supabaseClient.from('avaliacoes_cutaneas').select('*')
        .eq('paciente_id', p.id).order('data_avaliacao', { ascending: false }).limit(1);
      if(error || !data || !data.length) return;
      av = data[0];
    }catch(e){ return; }
    // se nesse meio tempo abriu outra paciente, não preenche
    if(minhaVez !== seqAvaliacaoCarregada || !currentPatient || String(currentPatient.id) !== String(p.id)) return;

    const marcar = (grupo, valor) => {
      if(valor == null || valor === '') return;
      const el = Array.from(document.querySelectorAll(`#panel-avaliacao [data-group="${grupo}"]`)).find(x => x.dataset.value === String(valor));
      if(el) el.classList.add('selected');
    };
    const marcarChips = (grupo, lista) => (lista || []).forEach(txt => {
      const el = Array.from(document.querySelectorAll(`#panel-avaliacao .chip[data-chip-group="${grupo}"]`)).find(c => (c.dataset.valor || c.textContent.trim()) === txt);
      if(el) el.classList.add('selected');
    });
    const ligar = (alvoId, ligado) => {
      const inp = document.querySelector(`#panel-avaliacao [data-toggle-target="${alvoId}"]`);
      if(!inp) return;
      inp.checked = !!ligado;
      const alvo = document.getElementById(alvoId);
      if(alvo) alvo.classList.toggle('hidden', !inp.checked);
    };
    const marcarPorTexto = (seletor, textos) => {
      const lista = Array.isArray(textos) ? textos : (textos ? [textos] : []);
      document.querySelectorAll(seletor).forEach(inp => {
        const item = inp.closest('.checkbox-item');
        if(item && lista.includes(item.textContent.trim())) inp.checked = true;
      });
    };

    marcar('fitzpatrick', av.fitzpatrick);
    const letras = String(av.baumann || '');
    ['oleosidade', 'sensibilidade', 'pigmentacao', 'envelhecimento'].forEach((g, i) => marcar(g, letras[i]));
    marcar('glogau', av.glogau);
    marcar('hidratacao', av.hidratacao);
    marcarPorTexto('#panel-avaliacao .av-integridade', av.integridade);
    marcarPorTexto('#panel-avaliacao input[name="textura"]', av.textura);
    marcarPorTexto('#panel-avaliacao input[name="poros"]', av.poros);
    const ole = av.oleosidade || {}, acne = av.acne || {}, ros = av.rosacea || {}, dis = av.discromias || {}, olh = av.olheiras || {};
    ligar('oleosidadeBody', ole.presente); marcarChips('areas-oleosas', ole.areas); marcar('intensidade-oleosidade', ole.intensidade);
    ligar('acneBody', acne.presente); marcar('grau-acne', acne.grau); marcarChips('licoes-acne', acne.licoes);
    ligar('rosaceaBody', ros.presente); marcar('rosacea-subtipo', ros.subtipo);
    ligar('discromiasBody', dis.presente); marcarChips('discromias', dis.tipos);
    ligar('olheirasBody', olh.presente); marcar('olheiras-tipo', olh.tipo);
    document.getElementById('avObservacoes').value = av.observacoes || '';
    updateBaumannResult();
    updateSkincareMeta();

    let aviso = document.getElementById('avUltimaAviso');
    if(!aviso){
      aviso = document.createElement('div');
      aviso.id = 'avUltimaAviso';
      aviso.className = 'comanda-aviso';
      document.getElementById('panel-avaliacao').prepend(aviso);
    }
    const dt = av.data_avaliacao ? new Date(av.data_avaliacao) : null;
    aviso.textContent = `Mostrando a última avaliação de ${p.name}${dt && !isNaN(dt) ? ' (' + dt.toLocaleDateString('pt-BR') + ')' : ''}. Ao salvar, uma nova avaliação é registrada no histórico.`;
    aviso.style.display = 'block';
  }

  function openPatientRegistro(patientId, tab){
    const p = patients.find(x => x.id === patientId);
    if(!p) return;
    pushNavHistory();
    const trocouDePaciente = !currentPatient || String(currentPatient.id) !== String(p.id);
    currentPatient = p;
    if(trocouDePaciente){
      limparFormulariosDaPaciente();
      try{ limparEspecificas(); }catch(e){}
      carregarUltimaAvaliacao(p);
    }
    carregarMoedaAnamnese(p);

    document.getElementById('regBreadcrumbName').textContent = p.name;
    document.getElementById('regNome').value = p.name || '';
    document.getElementById('regStatus').value = p.status || 'Ativo';
    document.getElementById('regEmail').value = p.email || '';
    document.getElementById('regPhoneCode').value = p.phoneCode || '';
    document.getElementById('regPhoneNumber').value = p.phoneNumber || '';
    document.getElementById('regDataNascimento').value = p.dataNascimento || '';
    document.getElementById('regPais').value = p.pais || '';
    setPatientPhotoCircle(p.foto_url || '', initialsFromName(p.name), p.color, p.bg);
    atualizarHeaderPaciente(p);

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForRegistro = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForRegistro) pacientesNavForRegistro.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';

    switchRegistroTab(tab || 'dados');
  }

  function switchRegistroTab(tabName){
    document.querySelectorAll('.registro-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.registro-panel').forEach(p => p.classList.remove('active'));
    const tabEl = document.querySelector(`.registro-tab[data-tab="${tabName}"]`);
    if(tabEl) tabEl.classList.add('active');
    const panel = document.getElementById('panel-' + tabName);
    if(panel){ panel.classList.add('active'); }
    else { document.getElementById('panel-placeholder').classList.add('active'); }
    if(tabName === 'planoskincare') updateSkincareMeta();
    if(tabName === 'fotos') renderFotosEvolucao();
    if(typeof ESPECIALIDADES !== 'undefined' && ESPECIALIDADES[tabName]){
      if(!areasAtuacao[tabName]){ switchRegistroTab('dados'); return; }
      carregarEspecifica(tabName);
    }
    if(tabName === 'historico'){
      renderAnamnesesRespondidas().then(updateHistoricoCountBadge);
      renderPlanosSkincareHistorico().then(updateHistoricoCountBadge);
      renderAvaliacoesHistorico().then(updateHistoricoCountBadge);
    }
  }

  document.querySelectorAll('.registro-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if(tab.dataset.soon){ showToast('Esta aba estará disponível em breve'); return; }
      switchRegistroTab(tab.dataset.tab);
    });
  });

  document.getElementById('breadcrumbPacientes').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-pacientes').classList.add('active');
    const pacientesNav = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNav) pacientesNav.classList.add('active');
    pageTitle.textContent = 'Pacientes';
    pageSubtitle.textContent = 'Gerencie a lista de pacientes da clínica';
    pageSubtitle.style.display = 'block';
  });

  document.getElementById('btnSalvarAlteracoes').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }

    const nome = document.getElementById('regNome').value.trim();
    const status = document.getElementById('regStatus').value;
    const email = document.getElementById('regEmail').value.trim();
    const phoneCode = document.getElementById('regPhoneCode').value;
    const phoneNumber = document.getElementById('regPhoneNumber').value.trim();
    const dataNascimento = document.getElementById('regDataNascimento').value;
    const pais = document.getElementById('regPais').value.trim();

    if(!nome){ showToast('O nome completo é obrigatório.'); return; }
    if(!phoneNumber){ showToast('O telefone / WhatsApp é obrigatório.'); return; }
    if(!phoneCode){ showToast('Selecione o código do país do telefone.'); document.getElementById('regPhoneCode').focus(); return; }

    const duplicada = encontrarPacienteDuplicado(nome, phoneNumber, currentPatient.id);
    if(duplicada){ showToast('Já existe uma paciente cadastrada com esse nome e telefone: ' + duplicada.name); return; }

    if(isPacienteReal(currentPatient)){
      const { error } = await supabaseClient.from('pacientes').update({
        nome, status, email,
        telefone_codigo: phoneCode, telefone_numero: phoneNumber,
        data_nascimento: dataNascimento || null, pais: pais || null,
      }).eq('id', currentPatient.id);

      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      await loadPacientesFromSupabase();
    } else {
      Object.assign(currentPatient, {
        name: nome, status, email, phoneCode, phoneNumber,
        phone: [phoneCode, phoneNumber].filter(Boolean).join(' '),
        dataNascimento, pais, age: calcularIdade(dataNascimento),
      });
      renderPacientesTable();
    }

    document.getElementById('regBreadcrumbName').textContent = nome;
    showToast('Dados salvos com sucesso!');
  });
  // Excluir cadastro e Exportar dados (LGPD): ver o bloco "LGPD — DIREITOS DA PACIENTE" mais abaixo.

  document.getElementById('btnGerarLinkPaciente').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Selecione uma paciente primeiro.'); return; }
    const { data: userData } = await supabaseClient.auth.getUser();
    if(!userData || !userData.user){ showToast('Faça login com uma conta real (fora do modo demonstração) para gerar o link.'); return; }

    const { data, error } = await supabaseClient
      .from('links_anamnese')
      .insert({ paciente_id: currentPatient.id, paciente_nome: currentPatient.name, profissional_id: userData.user.id })
      .select()
      .single();

    if(error){ showToast('Não foi possível gerar o link: ' + error.message); return; }

    const link = window.location.origin + window.location.pathname + '?anamnese=' + data.token;
    document.getElementById('linkGeradoInput').value = link;
    document.getElementById('modalLinkGeradoOverlay').classList.add('open');
  });

  document.getElementById('modalLinkGeradoFechar').addEventListener('click', () => {
    document.getElementById('modalLinkGeradoOverlay').classList.remove('open');
  });
  document.getElementById('btnCopiarLinkGerado').addEventListener('click', () => {
    const input = document.getElementById('linkGeradoInput');
    input.select();
    input.setSelectionRange(0, 99999);
    let copiado = false;
    try {
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(input.value);
        copiado = true;
      }
    } catch(e){ /* segue para o fallback abaixo */ }
    if(!copiado){
      try { copiado = document.execCommand('copy'); } catch(e){ copiado = false; }
    }
    showToast(copiado ? 'Link copiado!' : 'Não foi possível copiar automaticamente — selecione e copie manualmente.');
  });
  let salvandoAnamnese = false;
  document.getElementById('paConsentimentoTexto').textContent = DECLARACAO_ANAMNESE + '\n\n' + CONSENTIMENTO_TEXTO;
  document.getElementById('paConsentimentoVer').addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.getElementById('paConsentimentoTexto');
    t.style.display = t.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btnSalvarAnamnese').addEventListener('click', async () => {
    if(salvandoAnamnese) return; // clique duplo não grava duas vezes
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }
    salvandoAnamnese = true;
    const btnSalvarAn = document.getElementById('btnSalvarAnamnese');
    btnSalvarAn.disabled = true;
    try{

    const principalQueixa = document.getElementById('paPrincipalQueixa').value.trim();
    if(!principalQueixa){ showToast('Preencha a Principal Queixa — esse campo é obrigatório.'); return; }
    // Link para a paciente confirmar: a janela do WhatsApp abre já no clique (senão o navegador bloqueia)
    const querConfirmacao = document.getElementById('paEnviarConfirmacao').checked && isPacienteReal(currentPatient);
    const pacienteConf = currentPatient;
    let janelaConf = null, janelaUsada = false;
    if(querConfirmacao && numeroWhatsappDaPaciente(pacienteConf)){
      janelaConf = window.open('', '_blank');
      if(janelaConf){ try{ janelaConf.opener = null; janelaConf.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Abrindo o WhatsApp…</p>'); }catch(e){} }
    }
    const tokenConf = querConfirmacao ? (crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))) : null;
    try{

    const autopercepcao = Array.from(document.querySelectorAll('.pa-autopercepcao:checked'))
      .map(el => el.closest('.checkbox-item').textContent.trim());

    const integrativa = Array.from(document.querySelectorAll('#questionsContainer .question-row'))
      .map(row => {
        const inputs = row.querySelectorAll('input[type="text"]');
        const pergunta = inputs[0] ? inputs[0].value.trim() : '';
        const resposta = inputs[1] ? inputs[1].value.trim() : '';
        return pergunta ? `${pergunta}: ${resposta || '—'}` : '';
      })
      .filter(Boolean)
      .join(' | ');

    function resumoProductRow(row){
      const [nome, marca] = Array.from(row.querySelectorAll('input')).map(i => i.value.trim());
      const periodos = Array.from(row.querySelectorAll('.product-period-btn.on')).map(b => b.dataset.periodo === 'manha' ? 'Manhã' : 'Noite');
      const partes = [nome, marca].filter(Boolean);
      if(periodos.length) partes.push(periodos.join(' e '));
      return partes.join(' - ');
    }
    const skincareAtual = Array.from(document.querySelectorAll('#skincareAtualContainer .product-row'))
      .map(resumoProductRow).filter(Boolean).join('; ');
    const skincareParado = Array.from(document.querySelectorAll('#skincareParadoContainer .product-row'))
      .map(resumoProductRow).filter(Boolean).join('; ');

    const payload = {
      paciente_id: currentPatient.id,
      ...(tokenConf ? { confirmacao_token: tokenConf } : {}),
      principal_queixa: principalQueixa,
      tratamentos_anteriores: document.getElementById('paTratamentosAnteriores').value.trim(),
      autopercepcao,
      integrativa,
      sistemica: {
        medicamentos: document.getElementById('paMedicamentos').value.trim(),
        alergias: document.getElementById('paAlergias').value,
        alergia_tipo: document.getElementById('paAlergiaTipo').value.trim(),
        gestante: document.getElementById('paGestante').value,
        lactante: document.getElementById('paLactante').value,
        diabetica: document.getElementById('paDiabetico').value,
        diabetica_tipo: document.getElementById('paDiabeticoTipo').value,
        tireoide: document.getElementById('paTireoide').value,
        tireoide_tipo: document.getElementById('paTireoideTipo').value,
        hipertensao: document.getElementById('paHipertensao').value,
        hipotensao: document.getElementById('paHipotensao').value,
        cardiopatologia: document.getElementById('paCardiopatologia').value,
        epilepsia: document.getElementById('paEpilepsia').value,
        trombose: document.getElementById('paTrombose').value,
        insuficiencia_renal: document.getElementById('paInsuficienciaRenal').value,
        hepatite: document.getElementById('paHepatite').value,
        sop: document.getElementById('paSOP').value,
        oncologicos: document.getElementById('paOncologicos').value,
        bariatrico: document.getElementById('paBariatrico').value,
        ansiedade: document.getElementById('paAnsiedade').value,
        depressao: document.getElementById('paDepressao').value,
        dermatite: document.getElementById('paDermatite').value,
        dermatite_frequencia: document.getElementById('paDermatiteFrequencia').value.trim(),
        asma: document.getElementById('paAsma').value,
        asma_frequencia: document.getElementById('paAsmaFrequencia').value.trim(),
        outras_doencas: document.getElementById('paOutrasDoencas').value.trim(),
      },
      estilo_vida: {
        atividade_fisica: document.getElementById('paAtividadeFisica').value,
        alimentacao: document.getElementById('paAlimentacao').value,
        agua: document.getElementById('paAgua').value,
        sono: document.getElementById('paSono').value,
        sol: document.getElementById('paSol').value,
        tabagista: document.getElementById('paTabagista').value,
        alcool: document.getElementById('paAlcool').value,
        alcool_frequencia: document.getElementById('paAlcoolFrequencia').value.trim(),
        evacuacao: document.getElementById('paEvacuacao').value,
        habito_urinario: document.getElementById('paHabitoUrinario').value,
        frequencia_menstrual: document.getElementById('paFrequenciaMenstrual').value,
      },
      skincare: {
        atual: skincareAtual,
        parado: skincareParado,
        regularidade: document.getElementById('paRegularidade').value,
        como_gostaria: document.getElementById('paComoGostaria').value,
      },
      investimento: document.getElementById('paInvestimento').value,
      investimento_moeda: document.getElementById('paInvestimentoMoeda').value,
      observacoes: document.getElementById('paObservacoes').value.trim(),
    };

    if(currentPatient) currentPatient.moedaAnamnese = payload.investimento_moeda;

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }
      payload.profissional_id = userData.user.id;

      const { error, consentimentoNaoGravado } = await inserirAnamneseComConsentimento(payload);
      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      if(consentimentoNaoGravado){
        setTimeout(() => showToast('Anamnese salva, mas o link de confirmação não foi criado: rode o arquivo consentimento.sql no Supabase.'), 2600);
      } else if(tokenConf){
        const texto = msgDoModelo('confirmar_anamnese', { paciente: pacienteConf, link: linkConfirmacaoAnamnese(tokenConf) });
        const url = linkWhatsapp(pacienteConf, texto);
        if(url && janelaConf){ janelaConf.location.href = url; janelaUsada = true; try{ registrarEnvio(pacienteConf, 'confirmar_anamnese', texto); }catch(e){} }
        else setTimeout(() => showToast(url ? 'Anamnese salva. Envie o link de confirmação pela aba Histórico.' : 'Anamnese salva. A paciente não tem telefone cadastrado: envie o link pela aba Histórico.'), 2600);
      }
    } else {
      payload.respondida_em = new Date().toISOString();
      payload.token = null;
      if(!demoAnamnesesPorPaciente[currentPatient.id]) demoAnamnesesPorPaciente[currentPatient.id] = [];
      demoAnamnesesPorPaciente[currentPatient.id].unshift(payload);
    }

    renderAnamnesesRespondidas().then(updateHistoricoCountBadge);
    atualizarHeaderPaciente(currentPatient);
    showToast(janelaUsada ? 'Anamnese salva! Envie o link no WhatsApp para a paciente confirmar.' : 'Anamnese salva com sucesso!');
    } finally {
      if(janelaConf && !janelaUsada){ try{ janelaConf.close(); }catch(e){} }
    }
    } finally {
      salvandoAnamnese = false;
      btnSalvarAn.disabled = false;
    }
  });

  /* Anamnese Integrativa - dynamic questions */
  /* ---------- Investimento Confortável: faixas por moeda ---------- */
  const faixasInvestimentoPorMoeda = {
    BRL: ['Selecionar...', 'Até R$ 200', 'R$ 200 - R$ 500', 'Acima de R$ 500'],
    USD: ['Selecionar...', 'Até $ 40', '$ 40 - $ 100', 'Acima de $ 100'],
    EUR: ['Selecionar...', 'Até € 40', '€ 40 - € 90', 'Acima de € 90'],
  };

  function popularFaixasInvestimento(moedaSelectId, faixaSelectId){
    const moedaSelect = document.getElementById(moedaSelectId);
    const faixaSelect = document.getElementById(faixaSelectId);
    function atualizar(){
      const faixas = faixasInvestimentoPorMoeda[moedaSelect.value] || faixasInvestimentoPorMoeda.BRL;
      faixaSelect.innerHTML = faixas.map(f => `<option>${f}</option>`).join('');
    }
    moedaSelect.addEventListener('change', atualizar);
    atualizar();
  }
  popularFaixasInvestimento('paInvestimentoMoeda', 'paInvestimento');
  popularFaixasInvestimento('pubInvestimentoMoeda', 'pubInvestimento');

  function addQuestionRow(){
    const container = document.getElementById('questionsContainer');
    const row = document.createElement('div');
    row.className = 'question-row';
    row.innerHTML = `
      <div class="question-row-top">
        <input type="text" placeholder="Digite a pergunta...">
        <label class="switch"><input type="checkbox" checked><span class="switch-slider"></span></label>
        <button class="icon-btn trash" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
      <div class="question-row-answer"><input type="text" placeholder="Resposta..."></div>
    `;
    row.querySelector('.icon-btn.trash').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }
  document.getElementById('btnNovaPergunta').addEventListener('click', addQuestionRow);
  addQuestionRow();

  /* Skincare product rows */
  function addProductRow(containerId){
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <input type="text" placeholder="Nome">
      <input type="text" placeholder="Marca">
      <div class="product-period-toggle">
        <button type="button" class="product-period-btn" data-periodo="manha">☀ Manhã</button>
        <button type="button" class="product-period-btn" data-periodo="noite">🌙 Noite</button>
      </div>
      <button class="icon-btn trash" title="Remover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    row.querySelectorAll('.product-period-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('on'));
    });
    row.querySelector('.icon-btn.trash').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }
  document.getElementById('btnAddSkincareAtual').addEventListener('click', () => addProductRow('skincareAtualContainer'));
  document.getElementById('btnAddSkincareParado').addEventListener('click', () => addProductRow('skincareParadoContainer'));

  /* ================= AVALIAÇÃO CUTÂNEA MODULE ================= */
  // single-select scale cards / baumann options (grouped by data-group)
  document.querySelectorAll('#panel-avaliacao .scale-card, #panel-avaliacao .baumann-option').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.dataset.group;
      document.querySelectorAll(`#panel-avaliacao [data-group="${group}"]`).forEach(sibling => sibling.classList.remove('selected'));
      el.classList.add('selected');
      updateBaumannResult();
    });
  });


  /* Escala de Glogau: fotos de peles claras (Fitzpatrick I–III ou sem fototipo) ou negras (IV–VI) */
  const GLOGAU_FOTOS = {"clara": ["avaliacao/glogau-clara-1.jpg", "avaliacao/glogau-clara-2.jpg", "avaliacao/glogau-clara-3.jpg", "avaliacao/glogau-clara-4.jpg", "avaliacao/glogau-clara-5.jpg"], "negra": ["avaliacao/glogau-negra-1.jpg", "avaliacao/glogau-negra-2.jpg", "avaliacao/glogau-negra-3.jpg", "avaliacao/glogau-negra-4.jpg", "avaliacao/glogau-negra-5.jpg"]};
  const GLOGAU_DESC = {"clara": ["Sinais mínimos de envelhecimento. Pele lisa, sem rugas visíveis, apenas alterações sutis de textura e luminosidade.", "Linhas finas iniciais, especialmente na região periorbicular. Leve irregularidade na textura da pele, com pequenas alterações de pigmentação e perda discreta de firmeza.", "Rugas mais evidentes, perda de elasticidade e início de flacidez. Manchas senis mais frequentes e textura menos uniforme.", "Rugas profundas, flacidez moderada a acentuada, manchas pigmentares mais visíveis e alterações estruturais significativas da pele.", "Rugas profundas e generalizadas, flacidez acentuada, lentigos e alterações pigmentares extensas, com perda significativa da estrutura e densidade da pele."], "negra": ["Sinais mínimos de envelhecimento. Pele lisa, com leve perda de viço e elasticidade. Podem surgir as primeiras alterações pigmentares discretas.", "Linhas finas iniciais, especialmente na região periorbicular. Leve irregularidade na textura da pele, com pequenas manchas pigmentares e perda discreta de firmeza.", "Rugas mais evidentes, perda de elasticidade, flacidez leve e manchas pigmentares mais frequentes. O contorno facial pode começar a perder definição.", "Rugas profundas, flacidez acentuada, manchas pigmentares mais visíveis e alterações estruturais significativas da pele. A textura se torna mais irregular e espessa.", "Rugas profundas e generalizadas, flacidez intensa, lentigos e alterações pigmentares extensas. A pele apresenta aspecto mais fino, com perda significativa de volume e firmeza."]};
  let glogauTomAtual = 'clara';
  function atualizarFotosGlogau(){
    const fitz = document.querySelector('#panel-avaliacao .scale-card.selected[data-group="fitzpatrick"]');
    const tom = fitz && ['IV', 'V', 'VI'].includes(fitz.dataset.value) ? 'negra' : 'clara';
    const aviso = document.getElementById('glogauTomAviso');
    if(aviso) aviso.textContent = fitz ? '· imagens para fototipo ' + fitz.dataset.value : '· escolha o fototipo acima para ver as imagens do tom de pele';
    if(tom === glogauTomAtual) return;
    glogauTomAtual = tom;
    document.querySelectorAll('#panel-avaliacao .scale-card[data-group="glogau"]').forEach((card, i) => {
      const img = card.querySelector('.glogau-foto'); if(img) img.src = GLOGAU_FOTOS[tom][i];
      const d = card.querySelector('.sc-desc'); if(d) d.textContent = GLOGAU_DESC[tom][i];
    });
  }
  function updateBaumannResult(){
    try{ atualizarFotosGlogau(); }catch(e){}
    const groups = ['oleosidade','sensibilidade','pigmentacao','envelhecimento'];
    let code = '';
    for(const g of groups){
      const sel = document.querySelector(`#panel-avaliacao .baumann-option.selected[data-group="${g}"]`);
      if(!sel){ code = null; break; }
      code += sel.dataset.value;
    }
    document.getElementById('baumannResult').textContent = code || '—';
  }

  // multi-select chips
  document.querySelectorAll('#panel-avaliacao .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });

  // toggle switches that reveal/hide a detail section
  document.querySelectorAll('#panel-avaliacao .switch input[data-toggle-target]').forEach(input => {
    input.addEventListener('change', () => {
      const target = document.getElementById(input.dataset.toggleTarget);
      if(target) target.classList.toggle('hidden', !input.checked);
    });
  });

  function getGroupValue(group){
    const el = document.querySelector(`#panel-avaliacao [data-group="${group}"].selected`);
    return el ? el.dataset.value : null;
  }
  function getChipGroupValues(group){
    return Array.from(document.querySelectorAll(`#panel-avaliacao .chip.selected[data-chip-group="${group}"]`)).map(c => (c.dataset.valor || c.textContent.trim()));
  }
  function getRadioLabel(name){
    const el = document.querySelector(`#panel-avaliacao input[name="${name}"]:checked`);
    return el ? el.closest('.checkbox-item').textContent.trim() : null;
  }
  function isToggleOn(targetId){
    const el = document.querySelector(`#panel-avaliacao [data-toggle-target="${targetId}"]`);
    return el ? el.checked : false;
  }

  document.getElementById('btnSalvarAvaliacao').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }

    const payload = {
      paciente_id: currentPatient.id,
      fitzpatrick: getGroupValue('fitzpatrick'),
      baumann: (() => { const t = document.getElementById('baumannResult').textContent; return t !== '—' ? t : null; })(),
      glogau: getGroupValue('glogau'),
      hidratacao: getGroupValue('hidratacao'),
      integridade: Array.from(document.querySelectorAll('.av-integridade:checked')).map(el => el.closest('.checkbox-item').textContent.trim()),
      textura: getRadioLabel('textura'),
      poros: getRadioLabel('poros'),
      oleosidade: {
        presente: isToggleOn('oleosidadeBody'),
        areas: getChipGroupValues('areas-oleosas'),
        intensidade: getGroupValue('intensidade-oleosidade'),
      },
      acne: {
        presente: isToggleOn('acneBody'),
        grau: getGroupValue('grau-acne'),
        licoes: getChipGroupValues('licoes-acne'),
      },
      rosacea: {
        presente: isToggleOn('rosaceaBody'),
        subtipo: getGroupValue('rosacea-subtipo'),
      },
      discromias: {
        presente: isToggleOn('discromiasBody'),
        tipos: getChipGroupValues('discromias'),
      },
      olheiras: {
        presente: isToggleOn('olheirasBody'),
        tipo: getGroupValue('olheiras-tipo'),
      },
      observacoes: document.getElementById('avObservacoes').value.trim(),
    };

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }
      payload.profissional_id = userData.user.id;

      const { error } = await supabaseClient.from('avaliacoes_cutaneas').insert(payload);
      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
      renderAvaliacoesHistorico().then(updateHistoricoCountBadge);
    }

    showToast('Avaliação cutânea salva com sucesso!');
  });

  async function renderAvaliacoesHistorico(){
    const container = document.getElementById('avaliacoesHistoricoContainer');
    container.innerHTML = '';
    if(!isPacienteReal(currentPatient)) return;

    const { data, error } = await supabaseClient
      .from('avaliacoes_cutaneas')
      .select('*')
      .eq('paciente_id', currentPatient.id)
      .order('data_avaliacao', { ascending: false });

    if(error || !data || data.length === 0) return;

    data.forEach(av => {
      const dt = new Date(av.data_avaliacao);
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      const ole = av.oleosidade || {};
      const acne = av.acne || {};
      const rosacea = av.rosacea || {};
      const discromias = av.discromias || {};
      const olheiras = av.olheiras || {};

      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = `
        <summary>
          <div class="historico-entry-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </div>
          <div>
            <div class="historico-entry-title">Avaliação Cutânea</div>
            <div class="historico-entry-date">${dataFormatada}</div>
          </div>
          <div class="historico-entry-spacer"></div>
          <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="historico-entry-body">
          <div class="toggle-subtitle">Classificação Estrutural</div>
          <div class="rotina-summary-item">Fototipo (Fitzpatrick): ${av.fitzpatrick || '—'}</div>
          <div class="rotina-summary-item">Sistema Baumann: ${av.baumann || '—'}</div>
          <div class="rotina-summary-item">Escala de Glogau: ${av.glogau || '—'}</div>
          <div class="toggle-subtitle">Hidratação</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${av.hidratacao || '—'}</div>
          <div class="toggle-subtitle">Integridade e Sensibilidade</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${(av.integridade || []).join(', ') || 'Nenhum item marcado.'}</div>
          <div class="toggle-subtitle">Textura e Poros</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Textura: ${av.textura || '—'} · Poros: ${av.poros || '—'}</div>
          <div class="toggle-subtitle">Oleosidade</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${ole.presente ? `Áreas: ${(ole.areas||[]).join(', ') || '—'} · Intensidade: ${ole.intensidade || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Acne</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${acne.presente ? `Grau: ${acne.grau || '—'} · Lesões: ${(acne.licoes||[]).join(', ') || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Rosácea</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${rosacea.presente ? `Subtipo: ${rosacea.subtipo || '—'}` : 'Não relatada'}</div>
          <div class="toggle-subtitle">Discromias</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${discromias.presente ? (discromias.tipos||[]).join(', ') || '—' : 'Não relatadas'}</div>
          <div class="toggle-subtitle">Olheiras</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${olheiras.presente ? `Tipo: ${olheiras.tipo || '—'}` : 'Não relatadas'}</div>
          ${av.observacoes ? `<div class="toggle-subtitle">Observações Clínicas</div><div class="rotina-summary-item" style="border:none;">${av.observacoes}</div>` : ''}
        </div>
      `;
      container.appendChild(details);
    });
  }

  /* ================= FOTOS DE EVOLUÇÃO MODULE ================= */
  function resizeImageFile(file, maxSize){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
          else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Igual ao resizeImageFile, mas devolve um Blob (usado no upload real pro Storage)
  function resizeImageFileToBlob(file, maxSize){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
          else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if(blob) resolve(blob); else reject(new Error('Falha ao gerar imagem'));
          }, 'image/jpeg', 0.82);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const fotosEvolucaoDemo = []; // fallback local para pacientes de demonstração

  document.getElementById('btnAdicionarFotoEvolucao').addEventListener('click', async () => {
    if(!currentPatient){ showToast('Nenhuma paciente selecionada.'); return; }
    const fileInput = document.getElementById('fotoEvolucaoInput');
    const file = fileInput.files[0];
    if(!file){ showToast('Selecione uma foto primeiro.'); return; }

    const dataFoto = document.getElementById('fotoEvolucaoData').value || new Date().toISOString().slice(0,10);
    const etiqueta = document.getElementById('fotoEvolucaoEtiqueta').value.trim();
    const observacoes = document.getElementById('fotoEvolucaoObs').value.trim();

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }

      // Paciente real: a foto vai pro Supabase Storage (bucket fotos-evolucao),
      // não fica mais salva em base64 dentro da tabela.
      let blob;
      try {
        blob = await resizeImageFileToBlob(file, 900);
      } catch(e) {
        showToast('Não foi possível processar a imagem.');
        return;
      }

      const fotoPath = `${userData.user.id}/${currentPatient.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabaseClient.storage
        .from('fotos-evolucao')
        .upload(fotoPath, blob, { contentType: 'image/jpeg' });
      if(uploadError){ showToast('Erro ao enviar a foto: ' + uploadError.message); return; }

      const { error } = await supabaseClient.from('fotos_evolucao').insert({
        paciente_id: currentPatient.id,
        profissional_id: userData.user.id,
        data_foto: dataFoto,
        etiqueta: etiqueta || null,
        observacoes: observacoes || null,
        foto_path: fotoPath,
      });
      if(error){
        // se salvar a linha falhar, remove o arquivo órfão do Storage
        await supabaseClient.storage.from('fotos-evolucao').remove([fotoPath]);
        showToast('Erro ao salvar: ' + error.message);
        return;
      }
    } else {
      // Paciente de demonstração: continua só em memória, sem ir pro banco/Storage
      let fotoDataUrl;
      try {
        fotoDataUrl = await resizeImageFile(file, 900);
      } catch(e) {
        showToast('Não foi possível processar a imagem.');
        return;
      }
      fotosEvolucaoDemo.push({ id: 'demo-' + Date.now(), data_foto: dataFoto, etiqueta, observacoes, foto_url: fotoDataUrl });
    }

    fileInput.value = '';
    document.getElementById('fotoEvolucaoEtiqueta').value = '';
    document.getElementById('fotoEvolucaoObs').value = '';
    showToast('Foto de evolução adicionada!');
    renderFotosEvolucao();
  });

  async function renderFotosEvolucao(){
    const grid = document.getElementById('fotosEvolucaoGrid');
    const vazio = document.getElementById('fotosEvolucaoVazio');
    grid.innerHTML = '';
    if(!currentPatient){ vazio.style.display = 'block'; return; }

    let fotos = [];
    if(isPacienteReal(currentPatient)){
      const { data, error } = await supabaseClient
        .from('fotos_evolucao')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('data_foto', { ascending: false });
      if(!error && data){
        // Bucket é privado: gera uma URL assinada (temporária) pra cada foto na hora de exibir
        fotos = await Promise.all(data.map(async (f) => {
          if(f.foto_path){
            const { data: signed } = await supabaseClient.storage
              .from('fotos-evolucao')
              .createSignedUrl(f.foto_path, 3600);
            return { ...f, foto_url: signed ? signed.signedUrl : '' };
          }
          // compatibilidade com fotos antigas que ainda estejam em base64
          return { ...f, foto_url: f.foto_base64 || '' };
        }));
      }
    } else {
      fotos = fotosEvolucaoDemo.slice().sort((a,b) => b.data_foto.localeCompare(a.data_foto));
    }

    vazio.style.display = fotos.length === 0 ? 'block' : 'none';

    fotos.forEach(f => {
      const dt = new Date(f.data_foto + 'T00:00:00');
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`;
      const card = document.createElement('div');
      card.className = 'foto-evolucao-card';
      card.innerHTML = `
        <button class="foto-evolucao-remove" title="Remover">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src="${f.foto_url}" alt="Foto de evolução">
        <div class="foto-evolucao-card-info">
          <div class="foto-evolucao-card-data">${dataFormatada}</div>
          ${f.etiqueta ? `<div class="foto-evolucao-card-etiqueta">${f.etiqueta}</div>` : ''}
        </div>
      `;
      card.querySelector('img').addEventListener('click', () => openFotoEvolucaoLightbox(f, dataFormatada));
      card.querySelector('.foto-evolucao-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(isPacienteReal(currentPatient)){
          if(f.foto_path){
            await supabaseClient.storage.from('fotos-evolucao').remove([f.foto_path]);
          }
          await supabaseClient.from('fotos_evolucao').delete().eq('id', f.id);
        } else {
          const idx = fotosEvolucaoDemo.findIndex(x => x.id === f.id);
          if(idx > -1) fotosEvolucaoDemo.splice(idx, 1);
        }
        renderFotosEvolucao();
      });
      grid.appendChild(card);
    });
  }

  function openFotoEvolucaoLightbox(f, dataFormatada){
    const box = document.createElement('div');
    box.className = 'foto-evolucao-lightbox';
    box.innerHTML = `
      <button class="foto-evolucao-lightbox-close">&times;</button>
      <img src="${f.foto_url}" alt="Foto de evolução">
      <div class="foto-evolucao-lightbox-info">
        <div style="font-weight:700;">${dataFormatada}${f.etiqueta ? ' · ' + f.etiqueta : ''}</div>
        ${f.observacoes ? `<div style="margin-top:4px; opacity:.85; max-width:500px;">${f.observacoes}</div>` : ''}
      </div>
    `;
    box.addEventListener('click', (e) => { if(e.target === box) box.remove(); });
    box.querySelector('.foto-evolucao-lightbox-close').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }

  /* ================= PLANO DE SKINCARE MODULE ================= */
  const skincareCategories = ["Demaquilante","Limpador","Tônico","Esfoliante","Hidratante","Área dos Olhos","Tratamento","Protetor Solar"];
  const routineEntries = []; // { id, category, product, period, frequency, selectedDays:[], usage, link, expanded }
  const weekdayLabels = ["D","S","T","Q","Q","S","S"];

  function updateSkincareMeta(){
    const basicEl = document.getElementById('skincareMetaBasic');
    if(currentPatient){
      basicEl.textContent = `${currentPatient.age} anos · ${currentPatient.gender || '—'}`;
    } else {
      basicEl.textContent = '— anos · —';
    }
    const baumannVal = document.getElementById('baumannResult') ? document.getElementById('baumannResult').textContent : '—';
    document.getElementById('skincareBaumannBadge').textContent = baumannVal || '—';
    const fitzSel = document.querySelector('#panel-avaliacao .scale-card.selected[data-group="fitzpatrick"]');
    document.getElementById('skincareFototipoBadge').textContent = fitzSel ? fitzSel.querySelector('.sc-title').textContent : '—';
  }

  function toggleRoutineEntry(product, period, why){
    const idx = routineEntries.findIndex(e => e.product.id === product.id && e.period === period);
    if(idx >= 0){
      routineEntries.splice(idx, 1);
    } else {
      routineEntries.push({
        id: 'r' + Date.now() + Math.random().toString(36).slice(2,6),
        category: product.category || 'Outros',
        product: product,
        period: period,
        frequency: 'diario',
        selectedDays: [],
        usage: product.usage || '',
        link: '',
        expanded: false,
        why: why || [],
      });
    }
    renderSkcProdutosEncontrados();
    renderJornada();
  }

  function renderJornada(){
    const container = document.getElementById('jornadaContainer');
    container.innerHTML = '';
    if(routineEntries.length === 0){
      container.innerHTML = '<div class="routine-empty">Nenhum produto adicionado ainda. Escolha produtos ao lado para montar a rotina.</div>';
      return;
    }

    routineEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'routine-entry' + (entry.expanded ? ' expanded' : '');

      const daysHTML = weekdayLabels.map((label, i) => `
        <div class="weekday-chip ${entry.selectedDays.includes(i) ? 'selected' : ''}" data-day="${i}">${label}</div>
      `).join('');

      card.innerHTML = `
        <div class="routine-entry-head">
          <div class="routine-entry-title">
            <span class="routine-period-pill ${entry.period}">${entry.period === 'manha' ? 'Manhã' : 'Noite'}</span>
            ${entry.product.name} <span style="color:var(--text-muted); font-weight:500;">— ${entry.category}</span>
          </div>
          <button class="routine-remove-btn" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
        <div class="routine-entry-body">
          <label>Frequência</label>
          <select class="freq-select">
            <option value="diario" ${entry.frequency === 'diario' ? 'selected' : ''}>Diário</option>
            <option value="personalizar" ${entry.frequency === 'personalizar' ? 'selected' : ''}>Personalizar</option>
          </select>
          <div class="weekday-picker" style="${entry.frequency === 'personalizar' ? '' : 'display:none;'}">${daysHTML}</div>
          <label>Modo de uso</label>
          <textarea class="usage-input">${entry.usage}</textarea>
          <label>Link do produto (opcional)</label>
          <input type="text" class="link-input" value="${entry.link}" placeholder="https://...">
        </div>
      `;

      card.querySelector('.routine-entry-head').addEventListener('click', (e) => {
        if(e.target.closest('.routine-remove-btn')) return;
        entry.expanded = !entry.expanded;
        renderJornada();
      });
      card.querySelector('.routine-remove-btn').addEventListener('click', () => {
        const idx = routineEntries.indexOf(entry);
        if(idx >= 0) routineEntries.splice(idx, 1);
        renderJornada();
        renderSkcProdutosEncontrados();
      });
      const freqSelect = card.querySelector('.freq-select');
      freqSelect.addEventListener('click', (e) => e.stopPropagation());
      freqSelect.addEventListener('change', () => {
        entry.frequency = freqSelect.value;
        renderJornada();
      });
      card.querySelectorAll('.weekday-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const day = parseInt(chip.dataset.day, 10);
          const pos = entry.selectedDays.indexOf(day);
          if(pos >= 0) entry.selectedDays.splice(pos, 1); else entry.selectedDays.push(day);
          chip.classList.toggle('selected');
        });
      });
      const usageInput = card.querySelector('.usage-input');
      usageInput.addEventListener('click', (e) => e.stopPropagation());
      usageInput.addEventListener('input', () => { entry.usage = usageInput.value; });
      const linkInput = card.querySelector('.link-input');
      linkInput.addEventListener('click', (e) => e.stopPropagation());
      linkInput.addEventListener('input', () => { entry.link = linkInput.value; });

      container.appendChild(card);
    });
  }

  /* ================= RECOMENDAÇÕES MODULE (planos de skincare salvos) ================= */
  const recomendacoesDataDemo = []; // usado apenas no modo demonstração (pacientes fictícias)
  const demoAnamnesesPorPaciente = {}; // { pacienteId: [ payload, payload, ... ] } — usado apenas no modo demonstração

  function isPacienteReal(p){
    return p && String(p.id).includes('-');
  }

  // Evita cadastrar a mesma cliente duas vezes: considera duplicado quando o nome
  // (ignorando maiúsculas/espaços) e o número de telefone (só os dígitos) já existem
  // em outra paciente cadastrada. excludeId serve para não comparar a paciente com ela mesma ao editar.
  function encontrarPacienteDuplicado(nome, telefoneNumero, excludeId){
    const nomeNorm = (nome || '').trim().toLowerCase();
    const telNorm = (telefoneNumero || '').replace(/\D/g, '');
    if(!nomeNorm || !telNorm) return null;
    return patients.find(p => {
      if(excludeId && String(p.id) === String(excludeId)) return false;
      const pNome = (p.name || '').trim().toLowerCase();
      const pTel = (p.phoneNumber || '').replace(/\D/g, '');
      return pNome === nomeNorm && pTel === telNorm;
    }) || null;
  }

  /* ---------- Cabeçalho de alerta da paciente (gestante/lactante/alergia) ---------- */
  async function atualizarHeaderPaciente(p){
    const badgesEl = document.getElementById('patientHeaderBadges');
    if(!badgesEl || !p) return;

    badgesEl.innerHTML = '';

    let sist = null;
    if(isPacienteReal(p)){
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('sistemica')
        .eq('paciente_id', p.id)
        .order('respondida_em', { ascending: false })
        .limit(1);
      if(!error && data && data[0]) sist = data[0].sistemica || {};
    } else {
      const lista = demoAnamnesesPorPaciente[p.id] || [];
      if(lista[0]) sist = lista[0].sistemica || {};
    }
    if(!sist || currentPatient !== p) return;

    const badges = [];
    if(sist.gestante === 'Sim') badges.push({ tipo:'atencao', label:'Atenção', valor:'Gestante' });
    if(sist.lactante === 'Sim') badges.push({ tipo:'atencao', label:'Atenção', valor:'Lactante' });
    if(sist.alergias === 'Sim') badges.push({ tipo:'alergia', label:'Alergia', valor: sist.alergia_tipo || 'Não especificada' });

    badgesEl.innerHTML = badges.map(b => `
      <div class="patient-alert-badge ${b.tipo}">
        <span class="pab-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L14.71 3.86a2 2 0 00-3.42 0z"/></svg>
        </span>
        <span>
          <span class="pab-label">${b.label}</span>
          <span class="pab-value">${b.valor}</span>
        </span>
      </div>
    `).join('');
  }

  function planoCardHTML(plano){
    const manhaHTML = plano.manha.length
      ? plano.manha.map(p => `<div class="rotina-summary-item">${p.name} — ${p.brand}</div>`).join('')
      : '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum produto adicionado.</div>';
    const noiteHTML = plano.noite.length
      ? plano.noite.map(p => `<div class="rotina-summary-item">${p.name} — ${p.brand}</div>`).join('')
      : '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum produto adicionado.</div>';

    return `
      <summary>
        <div class="historico-entry-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>
        </div>
        <div>
          <div class="historico-entry-title">${plano.objetivo || 'Plano de SkinCare'}</div>
          <div class="historico-entry-date">${plano.dataGerada}${plano.duracao ? ' · Acompanhamento de ' + plano.duracao + ' dias' : ''}</div>
        </div>
        <div class="historico-entry-spacer"></div>
        <button class="historico-pdf-btn" data-pdf-plano="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Baixar PDF
        </button>
        <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="historico-entry-body">
        <div class="rotina-summary-cols">
          <div>
            <div class="rotina-summary-title">Rotina da Manhã</div>
            ${manhaHTML}
          </div>
          <div>
            <div class="rotina-summary-title">Rotina da Noite</div>
            ${noiteHTML}
          </div>
        </div>
      </div>
    `;
  }

  function attachPlanoPdfButton(details, plano){
    details.querySelector('[data-pdf-plano]').addEventListener('click', (e) => {
      e.preventDefault();
      openPlanoPdf(plano);
    });
  }

  async function renderRecomendacoes(){
    const list = document.getElementById('recomendacoesList');
    const badge = document.getElementById('recomendacoesCountBadge');
    list.innerHTML = '';

    let planos = [];

    if(isPacienteReal(currentPatient)){
      const { data, error } = await supabaseClient
        .from('planos_skincare')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('data_gerada', { ascending: false });

      if(!error && data){
        planos = data.map(row => {
          const dt = new Date(row.data_gerada);
          return {
            objetivo: row.objetivo,
            duracao: row.duracao_dias,
            dataGerada: `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`,
            manha: row.rotina_manha || [],
            noite: row.rotina_noite || [],
          };
        });
      }
    } else {
      planos = recomendacoesDataDemo.slice().reverse();
    }

    badge.textContent = planos.length + (planos.length === 1 ? ' plano' : ' planos');

    if(planos.length === 0){
      list.innerHTML = '<div class="registro-card empty-state">Nenhum plano de SkinCare foi salvo ainda para esta paciente.</div>';
      return;
    }

    planos.forEach(plano => {
      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = planoCardHTML(plano);
      attachPlanoPdfButton(details, plano);
      list.appendChild(details);
    });
  }
  renderRecomendacoes();

  document.getElementById('btnFinalizarSkincarePlano').addEventListener('click', async () => {
    const objetivo = document.getElementById('skincareObjetivo').value.trim();
    const duracao = document.getElementById('skincareDuracao').value.trim();
    const manha = routineEntries.filter(e => e.period === 'manha').map(e => ({ name: e.product.name, brand: e.product.brand, image: e.product.image || '', categoria: e.category || e.product.category || '', usage: e.usage || e.product.usage || '', func: e.product.func || '', why: e.why || [] }));
    const noite = routineEntries.filter(e => e.period === 'noite').map(e => ({ name: e.product.name, brand: e.product.brand, image: e.product.image || '', categoria: e.category || e.product.category || '', usage: e.usage || e.product.usage || '', func: e.product.func || '', why: e.why || [] }));

    if(isPacienteReal(currentPatient)){
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){ showToast('Sessão expirada, faça login novamente.'); return; }

      const { error } = await supabaseClient.from('planos_skincare').insert({
        paciente_id: currentPatient.id,
        profissional_id: userData.user.id,
        objetivo, duracao_dias: parseInt(duracao, 10) || null,
        rotina_manha: manha, rotina_noite: noite,
      });

      if(error){ showToast('Erro ao salvar: ' + error.message); return; }
    } else {
      const hoje = new Date();
      recomendacoesDataDemo.push({
        objetivo, duracao,
        dataGerada: `${hoje.getDate()} de ${monthNames[hoje.getMonth()]}, ${hoje.getFullYear()}`,
        manha, noite,
      });
    }

    await renderRecomendacoes();
    await renderPlanosSkincareHistorico();
    showToast('Plano de SkinCare salvo com sucesso!');
  });

  /* ---------- Planos de SkinCare no Histórico ---------- */
  async function renderPlanosSkincareHistorico(){
    const container = document.getElementById('planosSkincareHistoricoContainer');
    container.innerHTML = '';
    if(!isPacienteReal(currentPatient)) return;

    const { data, error } = await supabaseClient
      .from('planos_skincare')
      .select('*')
      .eq('paciente_id', currentPatient.id)
      .order('data_gerada', { ascending: false });

    if(error || !data) return;

    data.forEach(row => {
      const dt = new Date(row.data_gerada);
      const plano = {
        objetivo: row.objetivo,
        duracao: row.duracao_dias,
        dataGerada: `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()}`,
        manha: row.rotina_manha || [],
        noite: row.rotina_noite || [],
      };
      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = planoCardHTML(plano);
      attachPlanoPdfButton(details, plano);
      container.appendChild(details);
    });
  }

  function updateHistoricoCountBadge(){
    const total = document.querySelectorAll('#anamnesesRespondidasContainer .historico-entry, #planosSkincareHistoricoContainer .historico-entry, #avaliacoesHistoricoContainer .historico-entry').length;
    const badge = document.getElementById('historicoCountBadge');
    if(badge) badge.textContent = total + (total === 1 ? ' registro' : ' registros');
  }

  document.getElementById('backFromPdf').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavBack = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavBack) pacientesNavBack.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';
    switchRegistroTab('historico');
  });

  document.getElementById('btnBaixarPdf').addEventListener('click', () => window.print());

  /* ================= CATÁLOGO DE PRODUTOS MODULE ================= */
  /* Categorias do catálogo: o cadastro às vezes usa nomes diferentes para a mesma coisa
     ("Protetor Solar" x "Filtro Solar", "Limpeza" x "Limpador"...). Tudo é convertido para o
     mesmo nome usado nos filtros da rotina, senão o produto não aparece ao filtrar. */
  function categoriaCanonica(cat){
    const t = String(cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if(!t) return 'Tratamento';
    if(/protetor|filtro solar|fotoprote|fps|solar|sunscreen|spf/.test(t)) return 'Protetor Solar';
    if(/demaquil|micelar|cleansing (oil|balm)|oleo de limpeza/.test(t)) return 'Demaquilante';
    if(/limp|sabonete|cleanser|espuma/.test(t)) return 'Limpador';
    if(/tonic|toner|loção tonica|essencia/.test(t)) return 'Tônico';
    if(/esfolia|peeling|scrub|exfolia/.test(t)) return 'Esfoliante';
    if(/olho|olheira|eye/.test(t)) return 'Área dos Olhos';
    if(/hidrat|moistur|creme facial/.test(t)) return 'Hidratante';
    return 'Tratamento'; // sérum, ampola, antiacne, máscara etc.
  }

  /* products: em js/dados.js */
  products.forEach(p => { p.category = categoriaCanonica(p.category); });

  function formatPrice(v){ return fmtMoeda(v); } // segue a moeda escolhida em Configurações

  const faixasPrecoBRL = ['Até R$ 50', 'R$ 50 – R$ 100', 'R$ 100 – R$ 200', 'R$ 200 – R$ 500', 'Acima de R$ 500'];
  const faixasPrecoUSD = ['Até $ 10', '$ 10 – $ 20', '$ 20 – $ 40', '$ 40 – $ 100', 'Acima de $ 100'];
  const faixasPrecoEUR = ['Até € 10', '€ 10 – € 20', '€ 20 – € 40', '€ 40 – € 90', 'Acima de € 90'];

  function faixaIndex(v){
    if(v < 50) return 0;
    if(v < 100) return 1;
    if(v < 200) return 2;
    if(v < 500) return 3;
    return 4;
  }
  function faixaDePreco(v){
    const i = faixaIndex(v);
    return `${faixasPrecoBRL[i]} · ${faixasPrecoUSD[i]} · ${faixasPrecoEUR[i]}`;
  }

  function moedaPreferidaAtual(){
    let escolhida = '';
    try{ escolhida = localStorage.getItem('skinExpertMoeda') || ''; }catch(e){}
    if(escolhida === 'BRL' || escolhida === 'EUR' || escolhida === 'USD') return escolhida;
    let pais = 'BR';
    try{ pais = localStorage.getItem('skinExpertPaisAtuacao') || 'BR'; }catch(e){}
    if(pais === 'US') return 'USD';
    if(pais === 'BR') return 'BRL';
    return 'EUR'; // PT, ES, FR, IT, DE, EU
  }
  // Deduz a moeda a partir do país escrito/selecionado no cadastro da paciente.
  const PAISES_UNIAO_EUROPEIA = [
    'alemanha', 'austria', 'áustria', 'belgica', 'bélgica', 'bulgaria', 'bulgária', 'chipre',
    'croacia', 'croácia', 'dinamarca', 'eslovaquia', 'eslováquia', 'eslovenia', 'eslovênia',
    'espanha', 'spain', 'estonia', 'estônia', 'finlandia', 'finlândia', 'franca', 'frança', 'france',
    'grecia', 'grécia', 'hungria', 'irlanda', 'ireland', 'italia', 'itália', 'italy', 'letonia', 'letônia',
    'lituania', 'lituânia', 'luxemburgo', 'malta', 'paises baixos', 'países baixos', 'holanda', 'netherlands',
    'polonia', 'polônia', 'portugal', 'republica tcheca', 'república tcheca', 'romenia', 'romênia', 'suecia', 'suécia',
    'europa', 'europe',
  ];
  function moedaPorPais(pais){
    if(!pais) return null;
    const p = pais.trim().toLowerCase();
    if(!p) return null;
    if(p.includes('brasil') || p.includes('brazil')) return 'BRL';
    if(p.includes('united states') || p.includes('estados unidos') || p === 'eua' || p === 'usa') return 'USD';
    if(PAISES_UNIAO_EUROPEIA.some(pais2 => p.includes(pais2))) return 'EUR';
    return null;
  }

  // Moeda a usar para a paciente atual: prioriza o que foi definido na anamnese clínica
  // (campo "Investimento"); se ainda não houver isso, deduz pelo país do cadastro;
  // e por último cai na moeda padrão do profissional.
  function moedaAnamnesePaciente(){
    if(currentPatient && currentPatient.moedaAnamnese) return currentPatient.moedaAnamnese;
    const moedaPais = currentPatient ? moedaPorPais(currentPatient.pais) : null;
    if(moedaPais) return moedaPais;
    return moedaPreferidaAtual();
  }
  function faixasOrdenadasPorMoeda(i){
    const todas = { BRL: faixasPrecoBRL[i], USD: faixasPrecoUSD[i], EUR: faixasPrecoEUR[i] };
    const principal = moedaPreferidaAtual();
    const outras = ['BRL', 'USD', 'EUR'].filter(m => m !== principal);
    return { principal: todas[principal], secundarias: outras.map(m => todas[m]) };
  }
  function faixaDePrecoLinhas(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil) return `${faixasPrecoBRL[i]}<br><span style="font-size:11px; color:var(--text-muted);">Venda somente no Brasil</span>`;
    const { principal, secundarias } = faixasOrdenadasPorMoeda(i);
    return `${principal}<br>${secundarias.join('<br>')}`;
  }
  function faixaDePrecoCompacta(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil){
      return `<div class="faixa-preco-compacta">
        <div class="faixa-preco-principal">${faixasPrecoBRL[i]}</div>
        <div class="faixa-preco-secundaria">Venda somente no Brasil</div>
      </div>`;
    }
    const { principal, secundarias } = faixasOrdenadasPorMoeda(i);
    return `<div class="faixa-preco-compacta">
      <div class="faixa-preco-principal">${principal}</div>
      <div class="faixa-preco-secundaria">${secundarias.join(' · ')}</div>
    </div>`;
  }

  // Mostra apenas a faixa de preço na moeda definida na anamnese clínica da paciente
  // (sem as outras moedas), para os cards do Plano de SkinCare.
  function faixaDePrecoUnica(v, apenasBrasil){
    const i = faixaIndex(v);
    if(apenasBrasil){
      return `<div class="faixa-preco-compacta">
        <div class="faixa-preco-principal">${faixasPrecoBRL[i]}</div>
        <div class="faixa-preco-secundaria">Venda somente no Brasil</div>
      </div>`;
    }
    const todas = { BRL: faixasPrecoBRL[i], USD: faixasPrecoUSD[i], EUR: faixasPrecoEUR[i] };
    const moeda = moedaAnamnesePaciente();
    return `<div class="faixa-preco-compacta">
      <div class="faixa-preco-principal">${todas[moeda] || todas.BRL}</div>
    </div>`;
  }

  let catalogoPaginaAtual = 1;
  const CATALOGO_POR_PAGINA = 10;

  function renderCatalogo(){
    const searchTerm = document.getElementById('catalogoSearch').value.trim().toLowerCase();
    const categoryFilter = document.getElementById('catalogoCategoria').value;
    const filtered = products.filter(p => {
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm) || p.brand.toLowerCase().includes(searchTerm);
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    document.getElementById('catalogoCount').textContent = filtered.length;

    const totalPaginas = Math.max(1, Math.ceil(filtered.length / CATALOGO_POR_PAGINA));
    if(catalogoPaginaAtual > totalPaginas) catalogoPaginaAtual = totalPaginas;
    if(catalogoPaginaAtual < 1) catalogoPaginaAtual = 1;

    const inicio = (catalogoPaginaAtual - 1) * CATALOGO_POR_PAGINA;
    const paginaItens = filtered.slice(inicio, inicio + CATALOGO_POR_PAGINA);

    const body = document.getElementById('catalogoBody');
    body.innerHTML = '';
    if(filtered.length === 0){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5"><div class="empty-state">Nenhum produto encontrado.</div></td>`;
      body.appendChild(tr);
      renderCatalogoPagination(0);
      return;
    }
    paginaItens.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="product-name-cell" data-product-id="${p.id}" style="display:flex; align-items:center; gap:10px;">
            ${p.image
              ? `<span class="img-zoomavel mini cat-thumb" role="button" tabindex="0" title="Ver imagem maior" style="display:inline-block; width:50px; height:50px; flex-shrink:0;"><img src="${p.image}" alt="${p.name}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; display:block;"><span class="img-zoom-hint">${ICONE_LUPA}</span></span>`
              : `<div style="width:50px; height:50px; border-radius:8px; background:var(--gold-light); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--gold-dark);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg></div>`}
            <span>${p.name}</span>
          </div>
        </td>
        <td>${p.brand}</td>
        <td><span class="category-chip">${p.category}</span></td>
        <td><div class="product-func-cell">${p.func}</div></td>
        <td><div class="price-cell">${faixaDePrecoCompacta(p.price, p.apenasBrasil)}</div></td>
      `;
      tr.querySelector('.product-name-cell').addEventListener('click', () => openProduto(p.id));
      const thumb = tr.querySelector('.cat-thumb');
      if(thumb){
        const abrir = (e) => { e.stopPropagation(); abrirImagemTelaCheia(p.image, p.name, p.brand); };
        thumb.addEventListener('click', abrir);
        thumb.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(e); } });
      }
      body.appendChild(tr);
    });

    renderCatalogoPagination(totalPaginas);
  }

  function renderCatalogoPagination(totalPaginas){
    const bar = document.getElementById('catalogoPagination');
    bar.innerHTML = '';
    if(totalPaginas <= 1) return;

    const btnAnterior = document.createElement('button');
    btnAnterior.className = 'pagination-btn';
    btnAnterior.textContent = '‹';
    btnAnterior.disabled = catalogoPaginaAtual === 1;
    btnAnterior.addEventListener('click', () => { catalogoPaginaAtual--; renderCatalogo(); });
    bar.appendChild(btnAnterior);

    for(let i = 1; i <= totalPaginas; i++){
      const btn = document.createElement('button');
      btn.className = 'pagination-btn' + (i === catalogoPaginaAtual ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => { catalogoPaginaAtual = i; renderCatalogo(); });
      bar.appendChild(btn);
    }

    const btnProximo = document.createElement('button');
    btnProximo.className = 'pagination-btn';
    btnProximo.textContent = '›';
    btnProximo.disabled = catalogoPaginaAtual === totalPaginas;
    btnProximo.addEventListener('click', () => { catalogoPaginaAtual++; renderCatalogo(); });
    bar.appendChild(btnProximo);
  }

  document.getElementById('catalogoSearch').addEventListener('input', () => { catalogoPaginaAtual = 1; renderCatalogo(); });

  document.querySelectorAll('#view-catalogo .fin-tab[data-catalogosubview]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-catalogo .fin-tab[data-catalogosubview]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.catalogo-subpanel').forEach(p => p.classList.remove('active'));
      document.getElementById('catalogo-subpanel-' + tab.dataset.catalogosubview).classList.add('active');
    });
  });
  document.getElementById('catalogoCategoria').addEventListener('change', () => { catalogoPaginaAtual = 1; renderCatalogo(); });

  /* ---------- Visualizar imagem em tela cheia (produtos do catálogo) ---------- */
  function abrirImagemTelaCheia(src, titulo, subtitulo){
    if(!src) return;
    document.querySelectorAll('.img-viewer').forEach(v => v.remove());
    const anteriorFoco = document.activeElement;
    const v = document.createElement('div');
    v.className = 'img-viewer';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', titulo ? 'Imagem de ' + titulo : 'Imagem ampliada');
    v.innerHTML = `
      <button class="img-viewer-fechar" aria-label="Fechar">&times;</button>
      <div class="img-viewer-palco"><img alt=""></div>
      <div class="img-viewer-info"></div>
      <div class="img-viewer-dica">Clique na imagem para ampliar · Esc para fechar</div>
    `;
    const img = v.querySelector('img');
    img.src = src;
    img.alt = titulo || 'Imagem';
    const info = v.querySelector('.img-viewer-info');
    if(titulo){
      const t = document.createElement('strong'); t.textContent = titulo; info.appendChild(t);
    }
    if(subtitulo){
      const st = document.createElement('span'); st.textContent = subtitulo; info.appendChild(st);
    }
    const palco = v.querySelector('.img-viewer-palco');
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const ligando = !palco.classList.contains('zoom');
      palco.classList.toggle('zoom', ligando);
      if(ligando){
        // mostra a imagem no tamanho original (ou 2x, se ela for pequena) e centraliza no ponto clicado
        const larguraAlvo = Math.max(img.naturalWidth, (img.getBoundingClientRect().width || 0) * 2);
        img.style.width = larguraAlvo + 'px';
        requestAnimationFrame(() => {
          palco.scrollLeft = (palco.scrollWidth - palco.clientWidth) / 2;
          palco.scrollTop = (palco.scrollHeight - palco.clientHeight) / 2;
        });
      } else {
        img.style.width = '';
      }
    });
    function fechar(){
      v.remove();
      document.removeEventListener('keydown', onKey);
      if(anteriorFoco && anteriorFoco.focus) anteriorFoco.focus();
    }
    function onKey(e){ if(e.key === 'Escape') fechar(); }
    v.addEventListener('click', (e) => { if(e.target === v) fechar(); });
    v.querySelector('.img-viewer-fechar').addEventListener('click', fechar);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(v);
    v.querySelector('.img-viewer-fechar').focus();
  }

  const ICONE_LUPA = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

  function openProduto(productId){
    const p = products.find(x => x.id === productId);
    if(!p) return;
    pushNavHistory();

    document.getElementById('produtoBreadcrumbName').textContent = p.name;
    document.getElementById('produtoNome').textContent = p.name;
    document.getElementById('produtoMarca').textContent = p.brand;
    document.getElementById('produtoCategoria').textContent = p.category;
    document.getElementById('produtoPreco').innerHTML = faixaDePrecoLinhas(p.price, p.apenasBrasil);
    document.getElementById('produtoDescricao').textContent = p.func;
    document.getElementById('produtoInstrucoes').textContent = p.usage;

    const thumbEl = document.getElementById('produtoThumbLg');
    thumbEl.onclick = null; thumbEl.onkeydown = null;
    thumbEl.classList.remove('img-zoomavel');
    thumbEl.removeAttribute('tabindex'); thumbEl.removeAttribute('role'); thumbEl.removeAttribute('title');
    if(p.image){
      thumbEl.innerHTML = `<img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain; border-radius:14px;"><span class="img-zoom-hint">${ICONE_LUPA}</span>`;
      thumbEl.classList.add('img-zoomavel');
      thumbEl.setAttribute('tabindex', '0');
      thumbEl.setAttribute('role', 'button');
      thumbEl.setAttribute('title', 'Clique para ver a imagem em tamanho maior');
      const abrir = () => abrirImagemTelaCheia(p.image, p.name, p.brand);
      thumbEl.onclick = abrir;
      thumbEl.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(); } };
    } else {
      thumbEl.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>`;
    }

    const chipsWrap = document.getElementById('produtoAtivosChips');
    chipsWrap.innerHTML = '';
    (p.ativos || []).forEach(ativoId => {
      const ativoIdx = ativosData.findIndex(a => a.id === ativoId);
      if(ativoIdx < 0) return;
      const chip = document.createElement('div');
      chip.className = 'ativo-link-chip';
      chip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l1.9 4.6L18 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4z"/></svg> ${ativosData[ativoIdx].nome}`;
      chip.addEventListener('click', () => openAtivoDetail(ativoIdx));
      chipsWrap.appendChild(chip);
    });
    document.getElementById('produtoOutrosIngredientes').textContent = p.outrosIngredientes || '—';

    navItems.forEach(i => i.classList.remove('active'));
    const catalogoNavForProduto = document.querySelector('.nav-item[data-view="catalogo"]');
    if(catalogoNavForProduto) catalogoNavForProduto.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-produto').classList.add('active');
    pageTitle.textContent = 'Visualizar Produto';
    pageSubtitle.style.display = 'none';
  }

  document.getElementById('breadcrumbCatalogo').addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-catalogo').classList.add('active');
    const catalogoNav = document.querySelector('.nav-item[data-view="catalogo"]');
    if(catalogoNav) catalogoNav.classList.add('active');
    pageTitle.textContent = 'Catálogo de Produtos';
    pageSubtitle.textContent = 'Gerencie sua lista de produtos e recomendações';
    pageSubtitle.style.display = 'block';
  });

  renderCatalogo();

  renderJornada();

  /* ---------- Carrega Catálogo de Produtos do Supabase (com fallback ao mock) ---------- */
  async function loadProdutosFromSupabase(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém o mock local

      const { data, error } = await supabaseClient.from('produtos').select('*');
      if(error || !data || data.length === 0) return; // erro ou tabela vazia: mantém o mock

      products = data.map(p => ({
        id: p.id,
        name: p.nome,
        image: p.imagem_url || '',
        brand: p.marca,
        apenasBrasil: !!p.apenas_brasil,
        category: categoriaCanonica(p.categoria),
        func: p.funcao,
        price: p.preco != null ? parseFloat(p.preco) : null,
        usage: p.modo_uso,
        ativos: p.ativos || [],
        outrosIngredientes: p.outros_ingredientes,
      }));

      renderCatalogo();
      renderSkcProdutosEncontrados();
    } catch(e){
      // qualquer falha de rede/consulta: segue com o mock local, sem travar o app
    }
  }
  // (loadProdutosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)

  /* ================= PLANOS MODULE ================= */
  const planData = [
    {
      id: "iniciante", name: "Iniciante", tagline: "Organiza sua rotina clínica",
      desc: "Gestão manual dos seus atendimentos. Ideal para quem está começando na estética integrativa.",
      price: { BRL: 197, EUR: 39, USD: 42 },
      cta: "Organizar minha rotina", featured: false,
      features: [
        { label: "Análise de rótulos cosméticos (20/mês)", on: true },
        { label: "Cadastro de até 10 clientes", on: true },
        { label: "Anamnese básica", on: true },
        { label: "Gestão financeira simples", on: true },
        { label: "Link público de agendamento", on: false },
        { label: "Secretária digital automática", on: false },
        { label: "Notificações por e-mail ao paciente", on: false },
      ]
    },
    {
      id: "profissional", name: "Profissional", tagline: "Automatiza sua agenda e atendimentos",
      desc: "Automação real: secretária digital, link de agendamento, notificações e análises completas.",
      price: { BRL: 397, EUR: 79, USD: 85 },
      cta: "Automatizar meu atendimento", featured: true,
      features: [
        { label: "Tudo do Iniciante, sem limites", on: true },
        { label: "Link público de agendamento", on: true },
        { label: "Secretária digital automática", on: true },
        { label: "Confirmação + lembrete por e-mail", on: true },
        { label: "Análises de rótulos completas", on: true },
        { label: "Catálogo de produtos por região", on: true },
        { label: "Antes & Depois avançado", on: true },
        { label: "Pacientes e análises ilimitados", on: true },
      ]
    },
    {
      id: "business", name: "Business", tagline: "Escala sua clínica com equipe",
      desc: "Para clínicas com múltiplos profissionais. Gestão de equipe, SMS e branding personalizado.",
      price: { BRL: 797, EUR: 159, USD: 169 },
      cta: "Criar minha operação", featured: false,
      features: [
        { label: "Tudo do Profissional", on: true },
        { label: "Notificações por SMS", on: true },
        { label: "Gestão de equipe multi-profissional", on: true },
        { label: "Follow-up automatizado de pacientes", on: true },
        { label: "Exportação de relatórios", on: true },
        { label: "Suporte VIP prioritário", on: true },
      ]
    },
  ];

  const currencySymbols = { BRL: "R$", EUR: "€", USD: "$" };
  const periodConfig = {
    mensal: { months: 1, discount: 0, label: "/mês" },
    trimestral: { months: 3, discount: 0.10, label: "/trimestre" },
    anual: { months: 12, discount: 0.20, label: "/ano" },
  };

  let currentCurrency = "BRL";
  let currentPeriod = "mensal";

  function formatMoney(v){
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderPlanos(){
    const symbol = currencySymbols[currentCurrency];
    const pcfg = periodConfig[currentPeriod];
    const grid = document.getElementById('planosGrid');
    grid.innerHTML = '';

    planData.forEach(plan => {
      const monthly = plan.price[currentCurrency];
      const total = monthly * pcfg.months * (1 - pcfg.discount);
      const monthlyEquivalent = total / pcfg.months;

      const card = document.createElement('div');
      card.className = 'plan-card' + (plan.featured ? ' featured' : '');
      card.id = 'plancard-' + plan.id;

      const featuresHTML = plan.features.map(f => `
        <div class="plan-feature ${f.on ? 'on' : 'off'}">
          <span class="feat-icon">${f.on
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}</span>
          <span>${f.label}</span>
        </div>
      `).join('');

      card.innerHTML = `
        ${plan.featured ? '<div class="plan-badge">Mais popular</div>' : ''}
        <div class="plan-name">${plan.name}</div>
        <div class="plan-tagline">${plan.tagline}</div>
        <div class="plan-price-row">
          <span class="plan-price">${symbol} ${formatMoney(total)}</span>
          <span class="plan-price-period">${pcfg.label}</span>
        </div>
        <div class="plan-price-sub">${currentPeriod !== 'mensal' ? 'equivalente a ' + symbol + ' ' + formatMoney(monthlyEquivalent) + '/mês' : ''}</div>
        <div class="plan-desc">${plan.desc}</div>
        <div class="plan-features">${featuresHTML}</div>
        <button class="plan-cta">${plan.cta} ›</button>
      `;
      card.querySelector('.plan-cta').addEventListener('click', () => showToast('Assinatura do plano ' + plan.name + ' (demonstração)'));
      grid.appendChild(card);
    });
  }

  document.querySelectorAll('#currencySegment button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#currencySegment button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCurrency = btn.dataset.currency;
      renderPlanos();
    });
  });

  document.querySelectorAll('#periodSegment button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#periodSegment button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderPlanos();
    });
  });

  document.querySelectorAll('.qn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qn-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('plancard-' + btn.dataset.plan);
      if(target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  renderPlanos();

  /* ================= AGENDA MODULE ================= */
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const weekdayFull = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

  function pad(n){ return n.toString().padStart(2,'0'); }
  function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function sameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  /* ---------- Helpers para interação estilo Google Agenda (clicar/arrastar) ---------- */
  const monthAbbrev = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
  function snapMinutes(mins, step){ return Math.round(mins/step)*step; }
  function minutesToTimeStr(mins){
    const total = Math.max(0, Math.min(23*60+45, mins));
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function timeStrToMinutes(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
  function formatarDataCurta(key){
    const [ano, mes, dia] = key.split('-').map(Number);
    return `${dia} de ${monthAbbrev[mes-1]}`;
  }
  function isAgendamentoReal(item){ return typeof item.id === 'string' && item.id.includes('-'); }

  /* ---------- Nada de dois agendamentos no mesmo horário ----------
     Vale para atendimentos e bloqueios. "ignorar" é o próprio item quando ele está sendo
     editado/arrastado (não conflita consigo mesmo). */
  function conflitoDeHorario(key, hora, duracao, ignorar){
    const ini = timeStrToMinutes(hora), fim = ini + (parseInt(duracao, 10) || 60);
    return (appointments[key] || []).find(a => {
      if(a === ignorar || (ignorar && a.id != null && a.id === ignorar.id)) return false;
      const aIni = timeStrToMinutes(a.time || '00:00'), aFim = aIni + (parseInt(a.duration, 10) || 60);
      return ini < aFim && aIni < fim;
    }) || null;
  }
  function mensagemConflito(key, a){
    const oque = a.type === 'block' ? `um bloqueio (${a.label || 'Horário bloqueado'})` : `o atendimento de ${a.label || 'outra paciente'}`;
    return `Horário ocupado: em ${formatarDataBR(key)} já existe ${oque} das ${a.time} às ${horaFim(a.time, parseInt(a.duration, 10) || 60)}. Escolha outro horário.`;
  }
  // Avisa se já existem horários com dois agendamentos (feitos antes desta regra), de hoje em diante.
  function avisarHorariosDuplicados(){
    const hojeKey = dateKey(today);
    const choques = [];
    Object.keys(appointments).filter(k => k >= hojeKey).sort().forEach(k => {
      const lista = (appointments[k] || []).slice().sort((x, y) => (x.time || '').localeCompare(y.time || ''));
      lista.forEach((a, i) => {
        const outro = conflitoDeHorario(k, a.time, a.duration, a);
        if(outro && lista.indexOf(outro) > i) choques.push(`${formatarDataBR(k)} ${a.time} (${a.label} × ${outro.label})`);
      });
    });
    if(!choques.length) return;
    console.warn('Horários com dois agendamentos:', choques);
    showToast(`Atenção: ${choques.length} horário${choques.length > 1 ? 's' : ''} com dois agendamentos — ${choques.slice(0, 3).join('; ')}${choques.length > 3 ? '…' : ''}. Remarque um deles.`);
  }

  // Traduz o erro do banco quando a regra de "horário ocupado" (SQL) barrar o salvamento.
  function mensagemErroAgenda(error, prefixo){
    const msg = (error && error.message) || '';
    if(/HORARIO_OCUPADO/i.test(msg)) return 'Horário ocupado: já existe outro agendamento nesse horário. Escolha outro horário.';
    return (prefixo || 'Erro: ') + msg;
  }

  // Move um atendimento/bloqueio para um novo horário, persiste (se for um registro real
  // do Supabase) e mostra um toast com opção de "Desfazer", no estilo do Google Agenda.
  async function reagendarItem(key, item, novaHora, rerenderFn){
    const horaAntiga = item.time;
    if(novaHora === horaAntiga) return;
    const conflito = conflitoDeHorario(key, novaHora, item.duration, item);
    if(conflito){ rerenderFn(); showToast(mensagemConflito(key, conflito)); return; }
    item.time = novaHora;
    rerenderFn();

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').update({ hora: novaHora }).eq('id', item.id);
      if(error){
        item.time = horaAntiga;
        rerenderFn();
        showToast(mensagemErroAgenda(error, 'Erro ao remarcar: '));
        return;
      }
      sincronizarComGoogleAgenda(item.id);
    }

    showUndoToast(`Remarcado para ${formatarDataCurta(key)}, ${novaHora}`, async () => {
      if(conflitoDeHorario(key, horaAntiga, item.duration, item)){ showToast('Não dá para desfazer: o horário anterior foi ocupado.'); return; }
      item.time = horaAntiga;
      rerenderFn();
      if(isAgendamentoReal(item)){
        await supabaseClient.from('agendamentos').update({ hora: horaAntiga }).eq('id', item.id);
        sincronizarComGoogleAgenda(item.id);
      }
    });
  }

  // Cancela um atendimento/bloqueio: pede confirmação, remove da lista local, exclui do Supabase
  // (se for real) e apaga o evento correspondente na Google Agenda, se houver.
  // "Cancelar" = a paciente cancelou: o atendimento sai da agenda mas fica registrado,
  // e a comanda fica Inativa. (Bloqueios não têm comanda: cancelar um bloqueio = remover.)
  async function cancelarAtendimento(key, item, rerenderFn){
    if(item.type === 'block') return excluirAtendimento(key, item, rerenderFn);
    if(!confirm(`Cancelar o atendimento de ${item.label} (${formatarDataBR(key)}, ${item.time})?\n\nEle sai da agenda e a comanda fica inativa.`)) return;

    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const { error } = await supabaseClient.from('agendamentos').update({ status: 'cancelado' }).eq('id', item.id);
      if(error){
        showToast(/status/i.test(error.message || '')
          ? 'Para cancelar mantendo o registro, rode o arquivo comandas-agenda.sql no Supabase. (Você pode usar "Excluir".)'
          : 'Erro ao cancelar: ' + error.message);
        return;
      }
      if(item.googleEventId){
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: item.googleEventId } }).catch(()=>{});
      }
    }
    const lista = appointments[key] || [];
    const idx = lista.indexOf(item);
    if(idx !== -1) lista.splice(idx, 1);
    rerenderFn();
    inativarComandaDoAgendamento(item.id).catch(e => console.warn('Comanda:', e));
    showToast('Atendimento cancelado. A comanda ficou inativa.');
  }

  // "Excluir" = desmarcar/apagar: remove o atendimento de vez e apaga a comanda dele.
  async function excluirAtendimento(key, item, rerenderFn){
    const isBlock = item.type === 'block';
    const tipoLabel = isBlock ? 'bloqueio de horário' : 'atendimento';
    const confirmado = confirm(isBlock
      ? `Remover este bloqueio (${item.label}, ${item.time})?`
      : `Excluir o atendimento de ${item.label} (${formatarDataBR(key)}, ${item.time})?\n\nEle será apagado da agenda e a comanda também.`);
    if(!confirmado) return;
    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
    }

    const lista = appointments[key] || [];
    const idx = lista.findIndex(a => a.id === item.id);
    if(idx !== -1) lista.splice(idx, 1);
    rerenderFn();

    // A comanda vai antes (se o banco ligar comanda → atendimento, o atendimento não fica preso).
    if(!isBlock) await apagarComandaDoAgendamento(item.id).catch(e => console.warn('Comanda:', e));

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').delete().eq('id', item.id);
      if(error){
        showToast('Erro ao excluir: ' + error.message);
        await loadAgendamentosFromSupabase();
        rerenderFn();
        return;
      }
      if(item.googleEventId){
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: item.googleEventId } }).catch(()=>{});
      }
    }
    showToast(isBlock ? 'Bloqueio removido.' : 'Atendimento excluído e comanda apagada.');
  }

  let suprimirCliqueAgenda = false;

  /* ---------- Painel de detalhes do atendimento ---------- */
  const modalApptDetOverlay = document.getElementById('modalApptDetOverlay');
  let apptDetAtual = null; // { key, item, rerenderFn }

  function keyParaData(key){ const [a,m,d] = key.split('-').map(Number); return new Date(a, m-1, d); }
  function formatarDataBR(key){ const [a,m,d] = key.split('-'); return `${d}/${m}/${a}`; }
  function diasEntre(keyA, keyB){ return Math.round((keyParaData(keyB) - keyParaData(keyA)) / 86400000); }
  function descreverIntervalo(dias){
    if(dias <= 0) return 'no mesmo dia';
    if(dias === 1) return 'há 1 dia';
    if(dias < 14) return `há ${dias} dias`;
    if(dias < 60){ const s = Math.round(dias/7); return `há ${s} semana${s>1?'s':''}`; }
    if(dias < 365){ const m = Math.round(dias/30); return `há ${m} ${m>1?'meses':'mês'}`; }
    const anos = Math.floor(dias/365); const resto = Math.round((dias%365)/30);
    return `há ${anos} ano${anos>1?'s':''}` + (resto ? ` e ${resto} ${resto>1?'meses':'mês'}` : '');
  }
  function descreverFrequencia(dias){
    if(dias < 1) return 'várias vezes no mesmo dia';
    if(dias <= 1) return 'a cada 1 dia';
    if(dias < 14) return `a cada ${dias} dias`;
    if(dias < 60){ const s = Math.round(dias/7); return `a cada ${s} semana${s>1?'s':''}`; }
    const m = Math.round(dias/30); return `a cada ${m} ${m>1?'meses':'mês'}`;
  }
  function horaFim(inicio, duracaoMin){ return minutesToTimeStr(timeStrToMinutes(inicio) + (duracaoMin || 0)); }

  function pacienteDoItem(item){
    if(item.pacienteId != null){
      const p = patients.find(x => String(x.id) === String(item.pacienteId));
      if(p) return p;
    }
    return patients.find(x => (x.name || '').trim().toLowerCase() === (item.label || '').trim().toLowerCase()) || null;
  }

  // Todos os atendimentos (não bloqueios) da mesma paciente, em ordem cronológica.
  function historicoDaPaciente(item){
    const mesmo = (a) => (item.pacienteId != null && a.pacienteId != null)
      ? String(a.pacienteId) === String(item.pacienteId)
      : (a.label || '').trim().toLowerCase() === (item.label || '').trim().toLowerCase();
    const lista = [];
    Object.keys(appointments).forEach(k => {
      (appointments[k] || []).forEach(a => { if(a.type === 'appt' && mesmo(a)) lista.push({ key:k, item:a }); });
    });
    lista.sort((x, y) => (x.key + x.item.time).localeCompare(y.key + y.item.time));
    return lista;
  }

  function preencherRecorrencia(key, item){
    const hist = historicoDaPaciente(item);
    const idx = hist.findIndex(h => h.item === item);
    const anteriores = idx > 0 ? hist.slice(0, idx) : [];
    const posteriores = idx >= 0 ? hist.slice(idx + 1) : [];
    const hojeKey = dateKey(today);
    const set = (id, txt) => { document.getElementById(id).textContent = txt; };

    // Última visita antes deste atendimento
    if(anteriores.length){
      const ult = anteriores[anteriores.length - 1];
      const dias = diasEntre(ult.key, key);
      set('apptDetUltima', descreverIntervalo(dias).replace(/^./, c => c.toUpperCase()));
      set('apptDetUltimaSub', `em ${formatarDataBR(ult.key)}${ult.item.servico ? ' · ' + ult.item.servico : ''}`);
    } else {
      set('apptDetUltima', 'Primeira visita');
      set('apptDetUltimaSub', 'Nenhum atendimento anterior na agenda');
    }

    // Frequência média entre visitas (até este atendimento)
    const ate = hist.slice(0, idx + 1);
    if(ate.length >= 2){
      const totalDias = diasEntre(ate[0].key, ate[ate.length - 1].key);
      const media = Math.round(totalDias / (ate.length - 1));
      set('apptDetFrequencia', descreverFrequencia(media).replace(/^./, c => c.toUpperCase()));
      set('apptDetFrequenciaSub', `média entre ${ate.length} visitas`);
    } else {
      set('apptDetFrequencia', '—');
      set('apptDetFrequenciaSub', 'Precisa de 2+ visitas para calcular');
    }

    // Quantos atendimentos no total e qual é este
    const realizados = hist.filter(h => h.key < hojeKey).length;
    set('apptDetTotal', `${idx + 1}º atendimento`);
    set('apptDetTotalSub', `${hist.length} no total · ${realizados} já realizado${realizados === 1 ? '' : 's'}`);

    // Próximo agendamento depois deste
    if(posteriores.length){
      const prox = posteriores[0];
      set('apptDetProximo', formatarDataBR(prox.key));
      set('apptDetProximoSub', `${prox.item.time}${prox.item.servico ? ' · ' + prox.item.servico : ''}`);
    } else {
      set('apptDetProximo', 'Nenhum');
      set('apptDetProximoSub', 'Sem retorno marcado');
    }
  }

  function abrirDetalhesAtendimento(key, item, rerenderFn){
    apptDetAtual = { key, item, rerenderFn };
    const isBlock = item.type === 'block';
    const data = keyParaData(key);

    const tag = document.getElementById('apptDetTag');
    tag.textContent = isBlock ? 'Horário bloqueado' : 'Atendimento';
    tag.classList.toggle('block', isBlock);
    document.getElementById('apptDetNome').textContent = isBlock ? (item.label || 'Horário bloqueado') : (item.label || 'Paciente sem nome');
    document.getElementById('apptDetServico').textContent = isBlock
      ? 'Horário indisponível para agendamentos'
      : (item.servico || 'Serviço não informado');
    document.getElementById('apptDetData').textContent =
      `${weekdayFull[data.getDay()]}, ${data.getDate()} de ${monthNames[data.getMonth()]} de ${data.getFullYear()}`;
    document.getElementById('apptDetHorario').textContent = `${item.time} – ${horaFim(item.time, item.duration)}`;
    const dur = item.duration || 0;
    document.getElementById('apptDetDuracao').textContent = dur >= 60
      ? `${Math.floor(dur/60)}h${dur%60 ? pad(dur%60) : ''} (${dur} min)`
      : `${dur} min`;

    document.getElementById('apptDetRecorrenciaWrap').style.display = isBlock ? 'none' : 'block';
    if(!isBlock) preencherRecorrencia(key, item);

    document.getElementById('apptDetObs').value = item.observacoes || '';
    document.getElementById('apptDetCancelar').textContent = isBlock ? 'Remover bloqueio' : 'Cancelar atendimento';
    document.getElementById('apptDetExcluir').style.display = isBlock ? 'none' : '';
    const paciente = isBlock ? null : pacienteDoItem(item);
    const btnFicha = document.getElementById('apptDetFicha');
    btnFicha.style.display = paciente ? '' : 'none';
    document.getElementById('apptDetWhatsapp').style.display = paciente && numeroWhatsappDaPaciente(paciente) ? '' : 'none';

    modalApptDetOverlay.classList.add('open');
  }

  function fecharDetalhesAtendimento(){
    modalApptDetOverlay.classList.remove('open');
    apptDetAtual = null;
  }

  document.getElementById('apptDetClose').addEventListener('click', fecharDetalhesAtendimento);
  modalApptDetOverlay.addEventListener('click', (e) => { if(e.target === modalApptDetOverlay) fecharDetalhesAtendimento(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modalApptDetOverlay.classList.contains('open')) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetWhatsapp').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const { key, item } = apptDetAtual;
    const paciente = pacienteDoItem(item);
    if(!paciente || !numeroWhatsappDaPaciente(paciente)){ showToast('Esta paciente não tem telefone cadastrado para o WhatsApp.'); return; }
    const hojeK = dateKey(today), amanhaK = addDiasKey(hojeK, 1);
    const modelo = key < hojeK ? 'pos' : key === amanhaK ? 'lembrete' : 'confirmacao';
    fecharDetalhesAtendimento();
    abrirEnvioMensagem({ paciente, key, hora: item.time, servico: item.servico, modelo });
  });

  document.getElementById('apptDetFicha').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const paciente = pacienteDoItem(apptDetAtual.item);
    fecharDetalhesAtendimento();
    if(paciente) openPatientRegistro(paciente.id, 'dados');
  });

  document.getElementById('apptDetCancelar').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { key, item, rerenderFn } = apptDetAtual;
    const antes = (appointments[key] || []).length;
    await cancelarAtendimento(key, item, () => { rerenderFn(); renderCalendar(); });
    if((appointments[key] || []).length < antes) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetExcluir').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { key, item, rerenderFn } = apptDetAtual;
    const antes = (appointments[key] || []).length;
    await excluirAtendimento(key, item, () => { rerenderFn(); renderCalendar(); });
    if((appointments[key] || []).length < antes) fecharDetalhesAtendimento();
  });

  document.getElementById('apptDetSalvar').addEventListener('click', async () => {
    if(!apptDetAtual) return;
    const { item } = apptDetAtual;
    const novoTexto = document.getElementById('apptDetObs').value.trim();
    const anterior = item.observacoes || '';
    if(novoTexto === anterior){ fecharDetalhesAtendimento(); return; }

    if(isAgendamentoReal(item)){
      const { error } = await supabaseClient.from('agendamentos').update({ observacoes: novoTexto || null }).eq('id', item.id);
      if(error){
        showToast('Não foi possível salvar a observação: ' + error.message);
        return;
      }
    }
    item.observacoes = novoTexto;
    fecharDetalhesAtendimento();
    showToast('Observação salva!');
  });

  // Ativa "arrastar para remarcar" em um bloco (.schedule-block ou .week-block) já posicionado.
  // Clique com o botão direito (ou pressionar e segurar, no touch) abre a opção de cancelar.
  function attachDragToReschedule(block, item, key, rowH, rerenderFn){
    block.title = 'Clique para ver detalhes, editar ou cancelar · arraste para remarcar';
    // Clique simples (sem arrastar) abre o painel com os detalhes do atendimento.
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      if(suprimirCliqueAgenda) return;
      abrirDetalhesAtendimento(key, item, rerenderFn);
    });
    block.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirDetalhesAtendimento(key, item, rerenderFn); // lá dá para escolher Cancelar ou Excluir
    });
    block.addEventListener('mousedown', (e) => {
      if(e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const originalTop = parseFloat(block.style.top);
      let moved = false;
      block.classList.add('dragging');

      function onMove(ev){
        const delta = ev.clientY - startY;
        if(Math.abs(delta) > 3) moved = true;
        block.style.top = (originalTop + delta) + 'px';
      }
      function onUp(ev){
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        block.classList.remove('dragging');
        if(!moved){ block.style.top = originalTop + 'px'; return; }
        // Evita que o "click" disparado ao soltar o mouse abra detalhes ou um novo atendimento.
        suprimirCliqueAgenda = true;
        setTimeout(() => { suprimirCliqueAgenda = false; }, 0);
        const delta = ev.clientY - startY;
        const deltaMinutes = snapMinutes((delta/rowH)*30, 15);
        const novoTotal = Math.max(0, Math.min(23*60+45, timeStrToMinutes(item.time) + deltaMinutes));
        const novaHora = minutesToTimeStr(novoTotal);
        block.style.top = originalTop + 'px'; // rerenderFn() desenha na posição correta
        reagendarItem(key, item, novaHora, rerenderFn);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  const today = new Date(); today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = new Date(today);

  // sample demo data so the calendar isn't empty
  const appointments = {};
  const sampleAppt = new Date(viewYear, viewMonth, Math.min(15, new Date(viewYear, viewMonth+1,0).getDate()));
  const sampleBlock = new Date(viewYear, viewMonth, Math.min(29, new Date(viewYear, viewMonth+1,0).getDate()));
  appointments[dateKey(sampleAppt)] = [{ id:1, time:'09:00', duration:60, label:'Paciente Teste 1', servico:'Limpeza de Pele', type:'appt', observacoes:'Pele sensível na região das bochechas — evitar extração agressiva.' }];
  // Exemplos para os lembretes automáticos no modo demonstração: um atendimento há 2 dias
  // (gera "pós-atendimento") e uma paciente que não vem há 70 dias (gera "paciente sumida").
  [[2, 'Paciente Teste 3', 'Limpeza de Pele Profunda', 201], [70, 'Paciente Teste 5', 'Drenagem Linfática', 202]].forEach(([diasAtras, nome, serv, id]) => {
    const d = new Date(today); d.setDate(d.getDate() - diasAtras);
    (appointments[dateKey(d)] = appointments[dateKey(d)] || []).push({ id, time:'15:00', duration:60, label:nome, servico:serv, type:'appt', observacoes:'' });
  });
  // Visitas anteriores de exemplo, para o painel de detalhes mostrar a recorrência no modo demonstração.
  [56, 28].forEach((diasAntes, i) => {
    const d = new Date(sampleAppt); d.setDate(d.getDate() - diasAntes);
    (appointments[dateKey(d)] = appointments[dateKey(d)] || []).push({ id: 100 + i, time:'10:00', duration:60, label:'Paciente Teste 1', servico: i === 0 ? 'Drenagem Linfática' : 'Limpeza de Pele', type:'appt', observacoes:'' });
  });
  appointments[dateKey(sampleBlock)] = [{ id:2, time:'12:00', duration:120, label:'Almoço', type:'block' }];

  const calMonthLabel = document.getElementById('calMonthLabel');
  const calDays = document.getElementById('calDays');
  const scheduleDate = document.getElementById('scheduleDate');
  const scheduleCount = document.getElementById('scheduleCount');
  const scheduleRows = document.getElementById('scheduleRows');

  function renderCalendar(){
    calMonthLabel.textContent = `${monthNames[viewMonth]} de ${viewYear}`;
    calDays.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();

    for(let i=0;i<startWeekday;i++){
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calDays.appendChild(empty);
    }

    for(let day=1; day<=daysInMonth; day++){
      const cellDate = new Date(viewYear, viewMonth, day);
      const key = dateKey(cellDate);
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if(sameDate(cellDate, today)) cell.classList.add('today');
      if(sameDate(cellDate, selectedDate)) cell.classList.add('selected');

      cell.innerHTML = `<span>${day}</span>`;

      const dayItems = appointments[key] || [];
      const hasAppt = dayItems.some(a => a.type === 'appt');
      const hasBlock = dayItems.some(a => a.type === 'block');
      if(hasAppt || hasBlock){
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'day-dots';
        if(hasAppt){ const d = document.createElement('span'); d.className='day-dot'; d.style.background='var(--yellow)'; dotsWrap.appendChild(d); }
        if(hasBlock){ const d = document.createElement('span'); d.className='day-dot'; d.style.background='var(--block-red)'; dotsWrap.appendChild(d); }
        cell.appendChild(dotsWrap);
      }

      cell.addEventListener('click', () => {
        selectedDate = cellDate;
        renderCalendar();
        renderCurrentView();
      });
      calDays.appendChild(cell);
    }
  }

  const DAY_ROW_H = 44;
  function renderSchedule(){
    scheduleDate.textContent = `${weekdayFull[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`;
    const key = dateKey(selectedDate);
    const list = appointments[key] || [];
    const apptCount = list.filter(a => a.type === 'appt').length;
    scheduleCount.textContent = `${apptCount} atendimento(s)`;

    scheduleRows.innerHTML = '';
    const ROW_H = DAY_ROW_H;

    for(let h=0; h<24; h++){
      for(const half of [0,30]){
        const row = document.createElement('div');
        row.className = 'time-row' + (half===0 ? ' hour' : '');
        row.style.height = ROW_H + 'px';
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = half===0 ? `${pad(h)}:00` : ':30';
        const line = document.createElement('div');
        line.className = 'time-line';
        row.appendChild(label);
        row.appendChild(line);
        scheduleRows.appendChild(row);
      }
    }

    list.forEach(item => {
      const [h, m] = item.time.split(':').map(Number);
      const minutesFromMidnight = h*60 + m;
      const top = (minutesFromMidnight/30) * ROW_H;
      const height = Math.max((item.duration/30) * ROW_H - 4, 20);

      const block = document.createElement('div');
      block.className = 'schedule-block ' + (item.type === 'block' ? 'block' : 'appt');
      block.style.top = top + 'px';
      block.style.height = height + 'px';
      block.innerHTML = `<div class="sb-title">${item.type === 'block' ? '🚫 ' : ''}${item.label}</div><div class="sb-time">${item.servico ? item.servico + ' · ' : ''}${item.time} · ${item.duration} min</div>`;
      attachDragToReschedule(block, item, key, ROW_H, renderSchedule);
      scheduleRows.appendChild(block);
    });
  }

  // Clicar em um horário vazio da grade abre "Novo Atendimento" já com a hora preenchida,
  // do mesmo jeito que o Google Agenda faz.
  scheduleRows.addEventListener('click', (e) => {
    if(suprimirCliqueAgenda) return;
    if(e.target.closest('.schedule-block')) return;
    const rect = scheduleRows.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = snapMinutes((offsetY / DAY_ROW_H) * 30, 15);
    openModal('appt', minutesToTimeStr(minutes));
  });

  /* ---------- Semanal (week) view ---------- */
  const weekdayShort = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  let agendaViewMode = 'diario';
  const scheduleScrollDay = document.getElementById('scheduleScrollDay');
  const scheduleScrollWeek = document.getElementById('scheduleScrollWeek');
  const weekGrid = document.getElementById('weekGrid');

  function getWeekStart(d){
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0,0,0,0);
    return start;
  }

  const WEEK_ROW_H = 36;
  function renderWeekSchedule(){
    const ROW_H = WEEK_ROW_H;
    const weekStart = getWeekStart(selectedDate);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    scheduleDate.textContent = sameMonth
      ? `${weekStart.getDate()}–${weekEnd.getDate()} de ${monthNames[weekStart.getMonth()]}`
      : `${weekStart.getDate()} de ${monthNames[weekStart.getMonth()]} – ${weekEnd.getDate()} de ${monthNames[weekEnd.getMonth()]}`;

    let totalAppt = 0;
    for(let i=0;i<7;i++){
      const d = new Date(weekStart); d.setDate(d.getDate()+i);
      totalAppt += (appointments[dateKey(d)] || []).filter(a => a.type === 'appt').length;
    }
    scheduleCount.textContent = `${totalAppt} atendimento(s) na semana`;

    weekGrid.innerHTML = '';

    const gutter = document.createElement('div');
    gutter.className = 'week-time-gutter';
    const gutterHeader = document.createElement('div');
    gutterHeader.className = 'week-day-header';
    gutterHeader.innerHTML = '&nbsp;';
    gutter.appendChild(gutterHeader);
    for(let h=0; h<24; h++){
      for(const half of [0,30]){
        const row = document.createElement('div');
        row.className = 'time-row' + (half===0 ? ' hour' : '');
        row.style.height = ROW_H + 'px';
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = half===0 ? `${pad(h)}:00` : '';
        row.appendChild(label);
        gutter.appendChild(row);
      }
    }
    weekGrid.appendChild(gutter);

    for(let i=0;i<7;i++){
      const d = new Date(weekStart); d.setDate(d.getDate()+i);
      const key = dateKey(d);
      const col = document.createElement('div');
      col.className = 'week-day-col';

      const header = document.createElement('div');
      header.className = 'week-day-header' + (sameDate(d, today) ? ' is-today' : '');
      header.innerHTML = `${weekdayShort[d.getDay()]}<span class="wdh-date">${pad(d.getDate())}/${pad(d.getMonth()+1)}</span>`;
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        selectedDate = d;
        renderCalendar();
        renderWeekSchedule();
      });
      col.appendChild(header);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'week-day-rows';
      for(let h=0; h<24; h++){
        for(const half of [0,30]){
          const row = document.createElement('div');
          row.className = 'time-row';
          row.style.height = ROW_H + 'px';
          rowsWrap.appendChild(row);
        }
      }

      const dayItems = appointments[key] || [];
      dayItems.forEach(item => {
        const [h, m] = item.time.split(':').map(Number);
        const minutesFromMidnight = h*60 + m;
        const top = (minutesFromMidnight/30) * ROW_H;
        const height = Math.max((item.duration/30) * ROW_H - 3, 16);
        const block = document.createElement('div');
        block.className = 'week-block ' + (item.type === 'block' ? 'block' : 'appt');
        block.style.top = top + 'px';
        block.style.height = height + 'px';
        block.innerHTML = `<div class="wb-title">${item.type === 'block' ? '🚫 ' : ''}${item.label}</div><div>${item.time}</div>`;
        attachDragToReschedule(block, item, key, ROW_H, renderWeekSchedule);
        rowsWrap.appendChild(block);
      });

      // Clicar em um horário vazio dessa coluna abre "Novo Atendimento" nesse dia e hora.
      rowsWrap.addEventListener('click', (e) => {
        if(suprimirCliqueAgenda) return;
        if(e.target.closest('.week-block')) return;
        const rect = rowsWrap.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minutes = snapMinutes((offsetY / WEEK_ROW_H) * 30, 15);
        selectedDate = d;
        renderCalendar();
        renderWeekSchedule();
        openModal('appt', minutesToTimeStr(minutes));
      });

      col.appendChild(rowsWrap);
      weekGrid.appendChild(col);
    }
  }

  /* ---------- Abrir a grade no horário de trabalho (não em 00:00) ----------
     Rola só quando muda o dia, a semana ou a visão — redesenhos (arrastar, salvar) não pulam. */
  let ultimaRolagemAgenda = '';
  function horaInicialDaGrade(keys){
    // meia hora antes do primeiro atendimento/bloqueio; senão, o início do Horário de Atendimento
    let primeiro = null;
    keys.forEach(k => (appointments[k] || []).forEach(a => {
      const m = timeStrToMinutes(a.time || '00:00');
      if(primeiro == null || m < primeiro) primeiro = m;
    }));
    let inicio = 8 * 60;
    try{
      const exp = expedientesData && expedientesData[0];
      if(exp){
        const dia = keyParaData(keys[0]).getDay();
        const entradas = keys.length > 1 ? exp.entradas.filter((e, i) => !(exp.fechados || [])[i]) : [exp.entradas[dia]];
        const mins = entradas.filter(Boolean).map(timeStrToMinutes);
        if(mins.length) inicio = Math.min(...mins);
      }
    }catch(e){}
    const alvo = primeiro != null ? Math.min(primeiro, inicio) : inicio;
    return Math.max(0, alvo - 30);
  }
  function rolarAgendaParaHorarioDeTrabalho(){
    const semanal = agendaViewMode === 'semanal';
    const base = semanal ? getWeekStart(selectedDate) : selectedDate;
    const chave = (semanal ? 's' : 'd') + dateKey(base);
    if(chave === ultimaRolagemAgenda) return;
    const scroller = document.getElementById(semanal ? 'scheduleScrollWeek' : 'scheduleScrollDay');
    if(!scroller || scroller.offsetParent === null) return; // aba escondida: rola quando aparecer
    ultimaRolagemAgenda = chave;
    const keys = semanal ? Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return dateKey(d); }) : [dateKey(base)];
    const minutos = horaInicialDaGrade(keys);
    requestAnimationFrame(() => {
      if(semanal){
        const sc = document.getElementById('scheduleScrollWeek');
        const linhas = sc.querySelector('.week-day-rows');
        if(!linhas) return;
        const topoLinhas = linhas.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        const cabecalho = sc.querySelector('.week-day-header');
        sc.scrollTop = topoLinhas + (minutos / 30) * WEEK_ROW_H - (cabecalho ? cabecalho.offsetHeight : 0);
      } else {
        document.getElementById('scheduleScrollDay').scrollTop = (minutos / 30) * DAY_ROW_H;
      }
    });
  }

  function renderCurrentView(){
    if(agendaViewMode === 'semanal') renderWeekSchedule();
    else renderSchedule();
    rolarAgendaParaHorarioDeTrabalho();
    try{ renderLembretes(); }catch(e){}
  }

  document.querySelectorAll('.view-mode-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-mode-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      agendaViewMode = btn.dataset.agendaView;
      if(agendaViewMode === 'semanal'){
        scheduleScrollDay.style.display = 'none';
        scheduleScrollWeek.style.display = 'block';
      } else {
        scheduleScrollDay.style.display = 'block';
        scheduleScrollWeek.style.display = 'none';
      }
      renderCurrentView();
    });
  });

  document.getElementById('scheduleNavPrev').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - (agendaViewMode === 'semanal' ? 7 : 1));
    selectedDate = new Date(selectedDate);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });
  document.getElementById('scheduleNavNext').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + (agendaViewMode === 'semanal' ? 7 : 1));
    selectedDate = new Date(selectedDate);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });
  document.getElementById('scheduleNavToday').addEventListener('click', () => {
    selectedDate = new Date(today);
    viewMonth = selectedDate.getMonth(); viewYear = selectedDate.getFullYear();
    renderCalendar();
    renderCurrentView();
  });

  document.getElementById('calPrev').addEventListener('click', () => {
    viewMonth--;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    viewMonth++;
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    renderCalendar();
  });


  /* ---------- Seletor de duração (horas + minutos, sem opções fixas) ---------- */
  const DUR_MAX_HORAS = 12;
  function formatarDuracaoMin(min){
    min = Math.max(0, Math.round(min || 0));
    const h = Math.floor(min / 60), m = min % 60;
    if(!h) return `${m} min`;
    return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
  }
  // Monta os dois seletores (horas e minutos de 5 em 5) e mantém o campo escondido atualizado.
  // formato: 'min' guarda o número de minutos (atendimentos); 'texto' guarda "1h30", "45 min" (serviços).
  function criarSeletorDuracao(pickerId, hiddenId, formato){
    const wrap = document.getElementById(pickerId);
    const hidden = document.getElementById(hiddenId);
    const selH = wrap.querySelector('.dur-h'), selM = wrap.querySelector('.dur-m'), total = wrap.querySelector('.dur-total');
    for(let h = 0; h <= DUR_MAX_HORAS; h++) selH.add(new Option(h === 1 ? '1 hora' : `${h} horas`, String(h)));
    for(let m = 0; m < 60; m += 5) selM.add(new Option(`${String(m).padStart(2,'0')} min`, String(m)));
    function atualizar(){
      let min = parseInt(selH.value, 10) * 60 + parseInt(selM.value, 10);
      if(min === 0){ selM.value = '5'; min = 5; } // duração mínima de 5 minutos
      hidden.value = formato === 'texto' ? formatarDuracaoMin(min) : String(min);
      total.textContent = min >= 60 ? `= ${min} min` : '';
    }
    selH.addEventListener('change', atualizar);
    selM.addEventListener('change', atualizar);
    return {
      definir(min){
        min = Math.round((parseInt(min, 10) || 60) / 5) * 5;
        min = Math.min(Math.max(min, 5), DUR_MAX_HORAS * 60 + 55);
        selH.value = String(Math.floor(min / 60));
        selM.value = String(min % 60);
        atualizar();
      },
      minutos(){ return parseInt(selH.value, 10) * 60 + parseInt(selM.value, 10); },
    };
  }
  const seletorDuracaoAtendimento = criarSeletorDuracao('apptDurPicker', 'apptDuration', 'min');
  seletorDuracaoAtendimento.definir(60);

  /* ---------- Modal (Novo Atendimento / Bloquear Horários) ---------- */
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalPatientLabel = document.getElementById('modalPatientLabel');
  const apptPatient = document.getElementById('apptPatient');
  const apptPatientSelect = document.getElementById('apptPatientSelect');
  const apptPatientSearchWrap = document.getElementById('apptPatientSearchWrap');
  const apptPatientSearch = document.getElementById('apptPatientSearch');
  const apptPatientResults = document.getElementById('apptPatientResults');
  const modalServiceField = document.getElementById('modalServiceField');
  const apptServicosContainer = document.getElementById('apptServicosContainer');
  const apptTime = document.getElementById('apptTime');
  const apptDuration = document.getElementById('apptDuration');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalWhatsappField = document.getElementById('modalWhatsappField');
  const apptEnviarWhatsapp = document.getElementById('apptEnviarWhatsapp');
  let modalMode = 'appt';

  function selecionarPacienteNoModal(paciente){
    apptPatientSelect.innerHTML = `<option value="${paciente.id}" selected>${paciente.name}</option>`;
    apptPatientSearch.value = paciente.name;
    apptPatientResults.classList.remove('open');
  }

  function limparSelecaoPaciente(){
    apptPatientSelect.innerHTML = '';
  }

  // Cria uma paciente rapidamente a partir da busca, sem sair do modal de agendamento.
  // Funciona tanto para contas reais (salva no Supabase) quanto no modo demonstração (só em memória).
  async function criarPaciente({ nome, codigo, numero, pais, nascimento }){
    const duplicada = encontrarPacienteDuplicado(nome, numero);
    if(duplicada){
      showToast('Já existe uma paciente cadastrada com esse nome e telefone: ' + duplicada.name);
      return null;
    }
    const usuario = await usuarioParaSalvar();
    if(!usuario && !modoDemonstracao) return null; // sessão caiu: não cria só na tela
    if(usuario){
      const { data, error } = await supabaseClient.from('pacientes')
        .insert({ profissional_id: usuario.id, nome: nome.trim(), status: 'Ativo', telefone_codigo: codigo, telefone_numero: numero.trim(),
                  pais: pais || null, data_nascimento: nascimento || null })
        .select().single();
      if(error){ showToast('Erro ao criar paciente: ' + error.message); return null; }
      await loadPacientesFromSupabase();
      return patients.find(p => String(p.id) === String(data.id)) || null;
    }
    const pal = avatarPalette[patients.length % avatarPalette.length];
    const novo = {
      id: 'demo-p-' + Date.now(), initials: initialsFromName(nome), color: pal.color, bg: pal.bg,
      name: nome.trim(), age: calcularIdade(nascimento), gender: '', phone: [codigo, numero.trim()].join(' '), phoneCode: codigo,
      phoneNumber: numero.trim(), pais: pais || '', dataNascimento: nascimento || '', email: '',
      rotina: null, acomp: { type: 'dash' }, status: 'Ativo',
    };
    patients.push(novo);
    renderPacientesTable();
    return novo;
  }


  function renderizarResultadosBuscaPaciente(){
    const termoRaw = apptPatientSearch.value.trim();
    const termo = termoRaw.toLowerCase();
    if(!termo){ apptPatientResults.classList.remove('open'); return; }

    const filtrados = patients.filter(p => (p.name || '').toLowerCase().includes(termo)).slice(0, 8);
    const nomeExato = patients.some(p => (p.name || '').toLowerCase() === termo);

    let html = filtrados.length > 0
      ? filtrados.map(p => `<div class="appt-patient-result-item" data-id="${p.id}">${p.name}</div>`).join('')
      : `<div class="appt-patient-result-empty">Nenhuma paciente encontrada.</div>`;
    if(!nomeExato){
      html += `<div class="appt-patient-result-add" data-novo="1">+ Adicionar nova paciente "${termoRaw}"</div>`;
    }

    apptPatientResults.innerHTML = html;
    apptPatientResults.classList.add('open');
  }

  apptPatientSearch.addEventListener('input', () => {
    limparSelecaoPaciente();
    renderizarResultadosBuscaPaciente();
  });
  apptPatientSearch.addEventListener('focus', () => {
    if(apptPatientSearch.value.trim()) renderizarResultadosBuscaPaciente();
  });
  document.addEventListener('click', (e) => {
    if(!apptPatientSearchWrap.contains(e.target)) apptPatientResults.classList.remove('open');
  });
  apptPatientResults.addEventListener('click', async (e) => {
    const itemEl = e.target.closest('.appt-patient-result-item');
    const addEl = e.target.closest('.appt-patient-result-add');
    if(itemEl){
      const paciente = patients.find(p => String(p.id) === String(itemEl.dataset.id));
      if(paciente) selecionarPacienteNoModal(paciente);
    } else if(addEl){
      const nome = apptPatientSearch.value.trim();
      if(!nome) return;
      apptPatientResults.classList.remove('open');
      const criada = await abrirNovaPaciente(nome);
      if(criada){
        selecionarPacienteNoModal(criada);
        showToast('Paciente "' + criada.name + '" adicionada com sucesso!');
      }
    }
  });

  // Permite marcar mais de um serviço para o mesmo atendimento (ex: Limpeza de Pele + Drenagem).
  function popularServicosCheckboxes(){
    apptServicosContainer.innerHTML = servicosData.length
      ? servicosData.map(s => `
          <label style="display:flex; align-items:center; gap:8px; font-size:13.5px; color:var(--text-dark); cursor:pointer; margin:0;">
            <input type="checkbox" class="appt-servico-check" value="${s.nome}" data-duracao="${s.duracao}" style="width:15px; height:15px; accent-color:var(--sidebar-bg); cursor:pointer; flex-shrink:0; margin:0;">
            ${s.nome} <span style="color:var(--text-muted); font-size:12px;">(${s.duracao})</span>
          </label>
        `).join('')
      : '<span style="font-size:13px; color:var(--text-muted);">Nenhum serviço cadastrado</span>';
  }

  /* ---------- Busca digitada de serviços (igual à busca de paciente) ---------- */
  const apptServicoSearch = document.getElementById('apptServicoSearch');
  const apptServicoResults = document.getElementById('apptServicoResults');
  const apptServicoSearchWrap = document.getElementById('apptServicoSearchWrap');
  const apptServicosChips = document.getElementById('apptServicosChips');
  let servicoResultadoAtivo = 0;

  function checkboxesServicos(){ return Array.from(apptServicosContainer.querySelectorAll('.appt-servico-check')); }
  function semAcento(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function escHTML(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function marcarServico(nome, marcado){
    const cb = checkboxesServicos().find(c => c.value === nome);
    if(!cb) return;
    cb.checked = marcado;
    apptServicosContainer.dispatchEvent(new Event('change', { bubbles:true })); // recalcula a duração
    renderChipsServicos();
  }

  function renderChipsServicos(){
    apptServicosChips.innerHTML = '';
    checkboxesServicos().filter(c => c.checked).forEach(cb => {
      const chip = document.createElement('span');
      chip.className = 'serv-chip';
      chip.innerHTML = `${escHTML(cb.value)} <small>${escHTML(cb.dataset.duracao || '')}</small><button type="button" aria-label="Remover ${escHTML(cb.value)}">&times;</button>`;
      chip.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); marcarServico(cb.value, false); });
      apptServicosChips.appendChild(chip);
    });
    apptServicoSearch.placeholder = getServicosSelecionados().length ? 'Adicionar outro serviço...' : 'Buscar serviço por nome...';
  }

  function servicosFiltrados(){
    const termo = semAcento(apptServicoSearch.value.trim());
    return checkboxesServicos().filter(cb => !cb.checked && (!termo || semAcento(cb.value).includes(termo)));
  }

  function renderResultadosServico(){
    const lista = servicosFiltrados();
    if(!checkboxesServicos().length){
      apptServicoResults.innerHTML = '<div class="appt-patient-result-empty">Nenhum serviço cadastrado. Cadastre em Meu Negócio › Serviços.</div>';
    } else if(!lista.length){
      apptServicoResults.innerHTML = '<div class="appt-patient-result-empty">Nenhum serviço encontrado.</div>';
    } else {
      servicoResultadoAtivo = Math.min(servicoResultadoAtivo, lista.length - 1);
      apptServicoResults.innerHTML = lista.map((cb, i) =>
        `<div class="appt-patient-result-item${i === servicoResultadoAtivo ? ' ativo' : ''}" data-nome="${escHTML(cb.value)}">${escHTML(cb.value)}<span class="serv-dur">${escHTML(cb.dataset.duracao || '')}</span></div>`
      ).join('');
    }
    apptServicoResults.classList.add('open');
  }

  function escolherServico(nome){
    marcarServico(nome, true);
    apptServicoSearch.value = '';
    servicoResultadoAtivo = 0;
    apptServicoResults.classList.remove('open');
    apptServicoSearch.focus();
  }

  apptServicoSearch.addEventListener('input', () => { servicoResultadoAtivo = 0; renderResultadosServico(); });
  apptServicoSearch.addEventListener('focus', renderResultadosServico);
  apptServicoSearch.addEventListener('keydown', (e) => {
    const lista = servicosFiltrados();
    if(e.key === 'ArrowDown'){ e.preventDefault(); servicoResultadoAtivo = Math.min(servicoResultadoAtivo + 1, Math.max(lista.length - 1, 0)); renderResultadosServico(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); servicoResultadoAtivo = Math.max(servicoResultadoAtivo - 1, 0); renderResultadosServico(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(lista[servicoResultadoAtivo]) escolherServico(lista[servicoResultadoAtivo].value); }
    else if(e.key === 'Escape'){ apptServicoResults.classList.remove('open'); }
    else if(e.key === 'Backspace' && !apptServicoSearch.value){
      const marcados = getServicosSelecionados();
      if(marcados.length) marcarServico(marcados[marcados.length - 1], false);
    }
  });
  apptServicoResults.addEventListener('mousedown', (e) => e.preventDefault()); // não perde o foco ao clicar
  apptServicoResults.addEventListener('click', (e) => {
    const item = e.target.closest('.appt-patient-result-item');
    if(item) escolherServico(item.dataset.nome);
  });
  document.addEventListener('click', (e) => {
    if(!apptServicoSearchWrap.contains(e.target)) apptServicoResults.classList.remove('open');
  });

  function getServicosSelecionados(){
    return Array.from(apptServicosContainer.querySelectorAll('.appt-servico-check:checked')).map(cb => cb.value);
  }

  // Converte algo como "1h", "45 min" ou "1h30" em minutos, para sugerir a duração do atendimento.
  function duracaoServicoParaMinutos(str){
    if(!str) return null;
    const texto = String(str).toLowerCase();
    const hMatch = texto.match(/(\d+)\s*h(?:oras?)?\s*(\d+)?/);
    const mMatch = texto.match(/(\d+)\s*min/);
    let minutos = 0, encontrou = false;
    if(hMatch){
      minutos += parseInt(hMatch[1], 10) * 60; encontrou = true;
      if(hMatch[2]) minutos += parseInt(hMatch[2], 10); // "1h30"
    } else if(mMatch){ minutos += parseInt(mMatch[1], 10); encontrou = true; }
    if(!encontrou){
      const n = parseInt(texto, 10);
      if(!isNaN(n)){ minutos = n; encontrou = true; }
    }
    return encontrou ? minutos : null;
  }

  // Ao marcar/desmarcar serviços, soma a duração de todos os selecionados e sugere a mais próxima disponível.
  apptServicosContainer.addEventListener('change', () => {
    const selecionados = apptServicosContainer.querySelectorAll('.appt-servico-check:checked');
    if(selecionados.length === 0) return;
    let totalMinutos = 0;
    selecionados.forEach(cb => {
      const minutos = duracaoServicoParaMinutos(cb.dataset.duracao);
      if(minutos) totalMinutos += minutos;
    });
    if(totalMinutos) seletorDuracaoAtendimento.definir(totalMinutos);
  });

  const apptDate = document.getElementById('apptDate');
  let edicaoAtual = null; // { key, item } quando o modal está editando um atendimento existente

  function openModal(mode, prefillTime){
    modalMode = mode;
    edicaoAtual = null;
    apptDate.value = dateKey(selectedDate);
    apptPatient.value = '';
    apptPatientSearch.value = '';
    apptPatientResults.classList.remove('open');
    limparSelecaoPaciente();
    apptTime.value = prefillTime || '09:00';
    seletorDuracaoAtendimento.definir(60);
    document.getElementById('apptObs').value = '';
    document.getElementById('modalObsField').style.display = mode === 'appt' ? 'block' : 'none';
    if(mode === 'appt'){
      modalTitle.textContent = 'Novo Atendimento';
      modalPatientLabel.textContent = 'Paciente';
      apptPatient.style.display = 'none';
      apptPatientSearchWrap.style.display = 'block';
      modalServiceField.style.display = 'block';
      popularServicosCheckboxes();
      apptServicoSearch.value = '';
      apptServicoResults.classList.remove('open');
      renderChipsServicos();
      modalConfirm.textContent = 'Agendar';
      modalWhatsappField.style.display = 'block';
    } else {
      modalTitle.textContent = 'Bloquear Horário';
      modalPatientLabel.textContent = 'Motivo (opcional)';
      apptPatient.placeholder = 'Ex: Almoço, Reunião';
      apptPatient.style.display = 'block';
      apptPatientSearchWrap.style.display = 'none';
      modalServiceField.style.display = 'none';
      modalConfirm.textContent = 'Bloquear';
      modalWhatsappField.style.display = 'none';
    }
    modalOverlay.classList.add('open');
  }
  function closeModal(){ modalOverlay.classList.remove('open'); edicaoAtual = null; }

  // Abre o mesmo formulário do "Novo Atendimento", já preenchido, para editar.
  function abrirEdicaoAtendimento(key, item){
    const isBlock = item.type === 'block';
    openModal(isBlock ? 'block' : 'appt', item.time);
    edicaoAtual = { key, item };
    apptDate.value = key;
    if(isBlock){
      apptPatient.value = item.label && item.label !== 'Horário bloqueado' ? item.label : '';
      modalTitle.textContent = 'Editar Bloqueio';
    } else {
      const paciente = pacienteDoItem(item);
      if(paciente) selecionarPacienteNoModal(paciente);
      else apptPatientSearch.value = item.label || '';
      // Serviços: marca os que já estavam no atendimento (mesmo que tenham saído do cadastro)
      (item.servico || '').split(',').map(s => s.trim()).filter(Boolean).forEach(nome => {
        let cb = checkboxesServicos().find(c => c.value === nome);
        if(!cb){
          const lbl = document.createElement('label');
          cb = document.createElement('input');
          cb.type = 'checkbox'; cb.className = 'appt-servico-check'; cb.value = nome; cb.dataset.duracao = '';
          lbl.appendChild(cb);
          apptServicosContainer.appendChild(lbl);
        }
        cb.checked = true;
      });
      renderChipsServicos();
      document.getElementById('apptObs').value = item.observacoes || '';
      modalTitle.textContent = 'Editar Atendimento';
    }
    seletorDuracaoAtendimento.definir(parseInt(item.duration, 10) || 60);
    modalConfirm.textContent = 'Salvar alterações';
    modalWhatsappField.style.display = 'none'; // confirmação é só para agendamento novo
  }

  async function salvarEdicaoAtendimento(){
    const { key: keyAntiga, item } = edicaoAtual;
    const isBlock = item.type === 'block';
    const novaKey = apptDate.value || keyAntiga;
    const hora = apptTime.value || item.time;
    const duracao = parseInt(apptDuration.value, 10) || item.duration || 60;
    const conflito = conflitoDeHorario(novaKey, hora, duracao, item);
    if(conflito){ showToast(mensagemConflito(novaKey, conflito)); return; }

    let pacienteId = item.pacienteId, label = item.label, servicoNome = item.servico || null, observacoes = item.observacoes || '';
    if(isBlock){
      label = apptPatient.value.trim() || 'Horário bloqueado';
    } else {
      const sel = patients.find(p => String(p.id) === String(apptPatientSelect.value));
      if(sel){ pacienteId = sel.id; label = sel.name; }
      else if(apptPatientSearch.value.trim() !== (item.label || '')){ showToast('Selecione uma paciente da lista.'); return; }
      const servicos = getServicosSelecionados();
      servicoNome = servicos.length ? servicos.join(', ') : null;
      observacoes = document.getElementById('apptObs').value.trim();
    }

    if(isAgendamentoReal(item)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const alteracoes = { data: novaKey, hora, duracao_min: duracao, duracao_minutos: duracao };
      if(isBlock) alteracoes.motivo = label;
      else { alteracoes.paciente_id = pacienteId; alteracoes.servico_nome = servicoNome; alteracoes.observacoes = observacoes || null; }
      modalConfirm.disabled = true;
      let { error } = await supabaseClient.from('agendamentos').update(alteracoes).eq('id', item.id);
      if(error && 'observacoes' in alteracoes && /observacoes/i.test(error.message || '')){
        delete alteracoes.observacoes;
        ({ error } = await supabaseClient.from('agendamentos').update(alteracoes).eq('id', item.id));
      }
      modalConfirm.disabled = false;
      if(error){ showToast(mensagemErroAgenda(error, 'Não foi possível salvar as alterações: ')); return; }
    } else if(!modoDemonstracao){
      showToast('Este atendimento não está salvo no banco. Recarregue a página.'); return;
    }

    Object.assign(item, { time: hora, duration: duracao, label, servico: servicoNome, pacienteId, observacoes });
    if(novaKey !== keyAntiga){
      const antiga = appointments[keyAntiga] || [];
      const i = antiga.indexOf(item);
      if(i !== -1) antiga.splice(i, 1);
      (appointments[novaKey] = appointments[novaKey] || []).push(item);
    }
    closeModal();
    renderCalendar();
    renderCurrentView();
    if(isAgendamentoReal(item)) sincronizarComGoogleAgenda(item.id);
    if(!isBlock){
      atualizarComandaDoAgendamento(item.id, { key: novaKey, pacienteId, cliente: label, servicoNome })
        .catch(e => console.warn('Comanda:', e));
    }
    showToast(isBlock ? 'Bloqueio atualizado!' : 'Atendimento atualizado!');
  }

  document.getElementById('apptDetEditar').addEventListener('click', () => {
    if(!apptDetAtual) return;
    const { key, item } = apptDetAtual;
    fecharDetalhesAtendimento();
    abrirEdicaoAtendimento(key, item);
  });

  document.getElementById('btnNovoAtendimento').addEventListener('click', () => openModal('appt'));
  document.getElementById('btnBloquearHorarios').addEventListener('click', () => openModal('block'));
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });

  async function sincronizarComGoogleAgenda(agendamentoId){
    if(!googleAgendaConectado) return;
    try{
      await supabaseClient.functions.invoke('sincronizar-google-agenda', { body: { agendamentoId } });
    } catch(e){
      console.warn('Não foi possível sincronizar com a Google Agenda.', e);
    }
  }

  async function dispararConfirmacaoWhatsapp(agendamentoId){
    try{
      const { error } = await supabaseClient.functions.invoke('enviar-confirmacao-whatsapp', {
        body: { agendamentoId },
      });
      if(error){
        showToast('Atendimento salvo, mas houve um erro ao enviar o WhatsApp.');
      } else {
        showToast('Atendimento agendado e confirmação enviada por WhatsApp!');
      }
    } catch(e){
      showToast('Atendimento salvo, mas não foi possível enviar o WhatsApp agora.');
    }
  }

  /* ---------- Confirmação por WhatsApp ----------
     Sem configurar nada: abre o WhatsApp da paciente com a mensagem pronta (você só aperta enviar).
     Com a API da Meta conectada em Configurações: envia sozinho pela função do servidor. */
  function numeroWhatsappDaPaciente(p){
    if(!p) return '';
    let codigo = String(p.phoneCode || '').replace(/\D/g, '');
    let numero = String(p.phoneNumber || '').replace(/\D/g, '');
    if(!numero && p.phone) numero = String(p.phone).replace(/\D/g, '');
    if(!numero) return '';
    if(!codigo){
      const pais = semAcento(p.pais || '');
      codigo = pais.includes('portugal') ? '351' : (pais.includes('brasil') || pais.includes('brazil')) ? '55' : '';
    }
    numero = numero.replace(/^0+/, '');
    const completo = (codigo && numero.startsWith(codigo) && numero.length >= codigo.length + 8) ? numero : codigo + numero;
    return completo.length >= 10 ? completo : '';
  }
  function mensagemConfirmacaoWhatsapp(pacienteNome, key, hora, servicos){
    const d = keyParaData(key);
    const primeiro = primeiroNomeDe(pacienteNome) || 'tudo bem';
    const dia = `${weekdayFull[d.getDay()].toLowerCase()}, ${formatarDataBR(key).slice(0, 5)}`;
    const assinatura = perfilProfissional && perfilProfissional.nome ? `\n\n${perfilProfissional.nome}` : '';
    return `Olá, ${primeiro}! 😊\nSeu atendimento${servicos ? ' de ' + servicos : ''} está confirmado para ${dia}, às ${hora}.\nSe precisar remarcar, é só me avisar por aqui.${assinatura}`;
  }
  function linkWhatsapp(paciente, texto){
    const numero = numeroWhatsappDaPaciente(paciente);
    return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : '';
  }
  // lembra a escolha da caixinha
  try{ apptEnviarWhatsapp.checked = localStorage.getItem('skinExpertConfirmarWhats') !== 'nao'; }catch(e){}
  apptEnviarWhatsapp.addEventListener('change', () => { try{ localStorage.setItem('skinExpertConfirmarWhats', apptEnviarWhatsapp.checked ? 'sim' : 'nao'); }catch(e){} });

  modalConfirm.addEventListener('click', async () => {
    if(edicaoAtual) return salvarEdicaoAtendimento();
    const viaApi = !!(integracaoWhatsapp && integracaoWhatsapp.ativo);
    const querWhats = modalMode === 'appt' && apptEnviarWhatsapp.checked;
    // A janela do WhatsApp tem que abrir já no clique (senão o navegador bloqueia como pop-up).
    let janela = null;
    if(querWhats && !viaApi){
      const keyPrev = apptDate.value || dateKey(selectedDate);
      const pacPrev = patients.find(p => String(p.id) === String(apptPatientSelect.value));
      if(pacPrev && numeroWhatsappDaPaciente(pacPrev) && !conflitoDeHorario(keyPrev, apptTime.value || '09:00', parseInt(apptDuration.value, 10), null)){
        janela = window.open('', '_blank');
        if(janela){ try{ janela.opener = null; janela.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Abrindo o WhatsApp…</p>'); }catch(e){} }
      }
    }
    let r = null;
    try{ r = await criarAtendimentoDoModal(); }
    finally{ if(!r && janela){ try{ janela.close(); }catch(e){} } }
    if(!r || r.tipo !== 'appt') return;

    if(!querWhats){ showToast('Atendimento agendado!'); return; }
    if(viaApi && isAgendamentoReal({ id: r.id })){
      showToast('Atendimento agendado! Enviando confirmação por WhatsApp...');
      dispararConfirmacaoWhatsapp(r.id);
      return;
    }
    const textoConf = msgDoModelo('confirmacao', { paciente: r.paciente, key: r.key, hora: r.hora, servico: r.servicos }) || mensagemConfirmacaoWhatsapp(r.paciente.name, r.key, r.hora, r.servicos);
    const url = linkWhatsapp(r.paciente, textoConf);
    if(!url){ showToast('Atendimento agendado! Esta paciente não tem telefone cadastrado para o WhatsApp.'); return; }
    if(janela){ janela.location.href = url; try{ registrarEnvio(r.paciente, 'confirmacao', textoConf); }catch(e){} showToast('Atendimento agendado! Confira e envie a mensagem no WhatsApp.'); }
    else showToast('Atendimento agendado! Para enviar a confirmação, abra o atendimento e toque em "WhatsApp".');
  });

  async function criarAtendimentoDoModal(){
    const key = apptDate.value || dateKey(selectedDate);
    if(!appointments[key]) appointments[key] = [];
    const hora = apptTime.value || '09:00';
    const duracao = parseInt(apptDuration.value, 10);

    const conflito = conflitoDeHorario(key, hora, duracao, null);
    if(conflito){ showToast(mensagemConflito(key, conflito)); return; }

    const usuarioLogado = await usuarioParaSalvar();
    if(!usuarioLogado && !modoDemonstracao) return; // sessão caiu: não salva só na tela

    if(usuarioLogado && modalMode === 'appt'){
      const pacienteId = apptPatientSelect.value;
      const pacienteSelecionado = patients.find(p => String(p.id) === String(pacienteId));
      if(!pacienteSelecionado){ showToast('Selecione uma paciente.'); return; }
      const servicosSelecionados = getServicosSelecionados();
      const servicoNome = servicosSelecionados.length ? servicosSelecionados.join(', ') : null;
      const observacoes = document.getElementById('apptObs').value.trim() || null;

      const registro = {
        profissional_id: usuarioLogado.id,
        paciente_id: pacienteSelecionado.id,
        data: key,
        hora: hora,
        duracao_min: duracao,
        duracao_minutos: duracao,
        tipo: 'appt',
        servico_nome: servicoNome,
      };
      if(observacoes) registro.observacoes = observacoes;
      let { data: inserted, error } = await supabaseClient.from('agendamentos').insert(registro).select().single();
      let obsNaoSalva = false;
      // Se a coluna "observacoes" ainda não existir no banco, salva o atendimento mesmo assim.
      if(error && observacoes && /observacoes/i.test(error.message || '')){
        delete registro.observacoes;
        ({ data: inserted, error } = await supabaseClient.from('agendamentos').insert(registro).select().single());
        obsNaoSalva = true;
      }

      if(error){ showToast(mensagemErroAgenda(error, 'Erro ao salvar atendimento: ')); return; }

      appointments[key].push({
        id: inserted.id, time: hora, duration: duracao,
        label: pacienteSelecionado.name, servico: servicoNome, type: 'appt',
        pacienteId: pacienteSelecionado.id, observacoes: observacoes || '',
      });
      if(obsNaoSalva) console.warn('Coluna "observacoes" não existe na tabela agendamentos — observação mantida só nesta sessão.');
      closeModal();
      renderCalendar();
      renderCurrentView();

      criarComandaDoAgendamento({ agendamentoId: inserted.id, key, pacienteId: pacienteSelecionado.id, cliente: pacienteSelecionado.name, servicoNome })
        .catch(e => console.warn('Comanda:', e));

      sincronizarComGoogleAgenda(inserted.id);

      return { tipo: 'appt', id: inserted.id, paciente: pacienteSelecionado, key, hora, servicos: servicoNome };
    }

    if(usuarioLogado && modalMode === 'block'){
      const motivo = apptPatient.value.trim() || 'Horário bloqueado';
      const { data: inserted, error } = await supabaseClient.from('agendamentos').insert({
        profissional_id: usuarioLogado.id,
        data: key,
        hora: hora,
        duracao_min: duracao,
        duracao_minutos: duracao,
        tipo: 'block',
        motivo: motivo,
      }).select().single();

      if(error){ showToast(mensagemErroAgenda(error, 'Erro ao bloquear horário: ')); return; }

      appointments[key].push({ id: inserted.id, time: hora, duration: duracao, label: motivo, type: 'block' });
      closeModal();
      renderCalendar();
      renderCurrentView();
      sincronizarComGoogleAgenda(inserted.id);
      showToast('Horário bloqueado!');
      return { tipo: 'block' };
    }

    // Modo demonstração (sem sessão real): mantém o comportamento local, sem Supabase
    if(modalMode === 'appt' && !patients.find(p => String(p.id) === String(apptPatientSelect.value))){
      showToast('Selecione uma paciente.');
      return;
    }
    const pacienteDemoObj = modalMode === 'appt' ? patients.find(p => String(p.id) === String(apptPatientSelect.value)) : null;
    const pacienteDemo = modalMode === 'appt'
      ? (pacienteDemoObj?.name || 'Paciente sem nome')
      : (apptPatient.value.trim() || 'Horário bloqueado');
    const idDemo = Date.now();
    if(modalMode === 'appt'){
      criarComandaDoAgendamento({ agendamentoId: idDemo, key, pacienteId: pacienteDemoObj ? pacienteDemoObj.id : null,
        cliente: pacienteDemo, servicoNome: getServicosSelecionados().join(', ') || null });
    }
    appointments[key].push({
      id: idDemo,
      pacienteId: pacienteDemoObj ? pacienteDemoObj.id : null,
      observacoes: modalMode === 'appt' ? document.getElementById('apptObs').value.trim() : '',
      time: hora,
      duration: duracao,
      label: pacienteDemo,
      servico: modalMode === 'appt' ? (getServicosSelecionados().join(', ') || null) : null,
      type: modalMode
    });
    const tipoCriado = modalMode;
    closeModal();
    renderCalendar();
    renderCurrentView();
    if(tipoCriado !== 'appt'){ showToast('Horário bloqueado!'); return { tipo: 'block' }; }
    return { tipo: 'appt', id: idDemo, paciente: pacienteDemoObj, key, hora, servicos: getServicosSelecionados().join(', ') || null };
  }

  // Carrega a agenda do Supabase.
  // - Só um carregamento por vez: se a página e o login pedirem ao mesmo tempo, os dois usam o mesmo.
  // - Se der erro (ex.: a sessão estava sendo renovada naquele instante), tenta de novo até 3 vezes.
  // - O aviso só aparece se todas as tentativas falharem, e mostra o motivo.
  let carregamentoAgendaEmAndamento = null;
  function loadAgendamentosFromSupabase(){
    if(carregamentoAgendaEmAndamento) return carregamentoAgendaEmAndamento;
    carregamentoAgendaEmAndamento = carregarAgendaComTentativas().finally(() => { carregamentoAgendaEmAndamento = null; });
    return carregamentoAgendaEmAndamento;
  }

  // Tenta do pedido mais completo ao mais simples. Se o banco não tiver alguma coluna
  // (ex.: google_event_id, observacoes) ou a ligação agendamentos → pacientes, o pedido
  // completo é recusado inteiro; antes isso fazia a agenda aparecer vazia ao recarregar.
  async function buscarAgendamentosUmaVez(){
    const consultas = [
      'id, data, hora, duracao_min, duracao_minutos, tipo, motivo, servico_nome, paciente_id, google_event_id, observacoes, status, pacientes ( nome )',
      '*, pacientes ( nome )',
      '*',
    ];
    let data = null, error = null;
    for(const campos of consultas){
      ({ data, error } = await supabaseClient.from('agendamentos').select(campos));
      if(!error && data) return { data, error: null };
      console.warn('Agenda: consulta "' + campos + '" falhou:', error && error.message);
      // Erro de sessão/rede: não adianta simplificar a consulta, volta para tentar de novo.
      if(error && /jwt|token|fetch|network|timeout|failed/i.test(error.message || '')) break;
    }
    return { data, error };
  }

  // Preenche o nome da paciente a partir da lista de pacientes quando a agenda veio sem ele.
  function completarNomesAgenda(){
    let mudou = false;
    Object.keys(appointments).forEach(k => (appointments[k] || []).forEach(a => {
      if(a.type === 'appt' && a.pacienteId != null && (!a.label || a.label === 'Paciente sem nome')){
        const p = patients.find(pp => String(pp.id) === String(a.pacienteId));
        if(p && p.name){ a.label = p.name; mudou = true; }
      }
    }));
    if(mudou){ renderCalendar(); renderCurrentView(); }
  }

  async function carregarAgendaComTentativas(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém os dados de exemplo locais

      let data = null, error = null;
      for(let tentativa = 1; tentativa <= 3; tentativa++){
        try{
          ({ data, error } = await buscarAgendamentosUmaVez());
        } catch(e){
          data = null; error = e;
        }
        if(!error && data) break;
        console.warn(`Agenda: tentativa ${tentativa} de 3 falhou.`, error);
        if(tentativa < 3) await new Promise(r => setTimeout(r, 900 * tentativa));
      }

      if(error || !data){
        // Conta real: nunca deixar os atendimentos de exemplo (modo demonstração) na tela.
        Object.keys(appointments).forEach(k => delete appointments[k]);
        renderCalendar();
        renderCurrentView();
        const motivo = (error && (error.message || error.error_description || String(error))) || 'sem resposta do servidor';
        showToast('Não foi possível carregar sua agenda (' + motivo.slice(0, 90) + '). Recarregue a página antes de fazer alterações.');
        agendaCarregadaOk = false;
        return;
      }
      agendaCarregadaOk = true;

      Object.keys(appointments).forEach(k => delete appointments[k]);
      data.forEach(row => {
        if(row.status === 'cancelado') return; // cancelados ficam no banco (histórico), fora da agenda
        let chaveData = String(row.data || '');
        if(chaveData.includes('T')){ const d = new Date(chaveData); if(!isNaN(d)) chaveData = dateKey(d); }
        chaveData = chaveData.slice(0, 10);
        row.data = chaveData;
        if(!appointments[row.data]) appointments[row.data] = [];
        appointments[row.data].push({
          id: row.id,
          time: (row.hora || '00:00:00').slice(0,5),
          duration: parseInt(row.duracao_min || row.duracao_minutos, 10) || 60,
          label: row.tipo === 'block' ? (row.motivo || 'Horário bloqueado')
            : (row.pacientes?.nome || (patients.find(pp => String(pp.id) === String(row.paciente_id)) || {}).name || 'Paciente sem nome'),
          servico: row.servico_nome || null,
          type: row.tipo === 'block' ? 'block' : 'appt',
          pacienteId: row.paciente_id || null,
          observacoes: row.observacoes || '',
          googleEventId: row.google_event_id || null,
        });
      });
      renderCalendar();
      renderCurrentView();
    } catch(e){
      console.warn('Agenda: erro inesperado ao montar a agenda.', e);
      showToast('Não foi possível montar sua agenda (' + String(e && e.message || e).slice(0, 90) + '). Recarregue a página.');
    }
  }

  /* ================= LEMBRETES ================= */
  // Prazos dos lembretes automáticos (em dias)
  const LEMB_POS_DIAS = 2;        // pós-atendimento: perguntar como a pele reagiu
  const LEMB_POS_VALIDADE = 7;    // depois disso o pós-atendimento some sozinho
  const LEMB_SUMIDA_DIAS = 60;    // sem vir há X dias e nada marcado = paciente sumida
  const LEMB_SUMIDA_LIMITE = 365; // não lembrar de quem não vem há mais de 1 ano

  // manuais: [{ id, texto, pacienteId, pacienteNome, data }]
  // dispensados: { idAutomatico: 'feito' | 'AAAA-MM-DD' (adiado até) }
  var lembretesEstado = { manuais: [], dispensados: {} };
  var lembretesMostrarFuturos = false;

  function addDiasKey(key, dias){ const d = keyParaData(key); d.setDate(d.getDate() + dias); return dateKey(d); }
  function primeiroNomeDe(nome){ return (nome || '').trim().split(/\s+/)[0] || ''; }

  function salvarLembretes(){ salvarConfig('lembretes', lembretesEstado); }
  // Texto de um modelo do Centro de Mensagens já preenchido (vazio se ainda não carregou)
  function msgDoModelo(id, ctx){ try{ return preencherModelo(modeloPorId(id).texto, ctx); }catch(e){ return ''; } }

  // Gera os lembretes automáticos a partir dos atendimentos da agenda.
  function lembretesAutomaticos(){
    const hojeKey = dateKey(today);
    const porPaciente = {};
    Object.keys(appointments).forEach(k => {
      (appointments[k] || []).forEach(a => {
        if(a.type !== 'appt') return;
        const chave = a.pacienteId != null ? 'id:' + a.pacienteId : 'nome:' + (a.label || '').trim().toLowerCase();
        (porPaciente[chave] = porPaciente[chave] || []).push({ key:k, item:a });
      });
    });

    const lista = [];
    Object.keys(porPaciente).forEach(chave => {
      const hist = porPaciente[chave].sort((x, y) => (x.key + x.item.time).localeCompare(y.key + y.item.time));
      const passados = hist.filter(h => h.key < hojeKey);
      const temFuturo = hist.some(h => h.key >= hojeKey);
      if(!passados.length) return;
      const ultimo = passados[passados.length - 1];
      const nome = ultimo.item.label || 'Paciente';
      const paciente = pacienteDoItem(ultimo.item);
      const servico = ultimo.item.servico || '';
      const diasDesde = diasEntre(ultimo.key, hojeKey);

      // 1) Pós-atendimento
      const posKey = addDiasKey(ultimo.key, LEMB_POS_DIAS);
      if(diasDesde >= LEMB_POS_DIAS && diasDesde <= LEMB_POS_VALIDADE){
        lista.push({
          id: 'pos:' + ultimo.item.id, tipo:'pos', tipoLabel:'Pós-atendimento', data: posKey,
          paciente, pacienteNome: nome,
          texto: `Perguntar como a pele reagiu ${servico ? 'à ' + servico : 'ao atendimento'} de ${formatarDataBR(ultimo.key).slice(0,5)}.`,
          ctx: { key: ultimo.key, hora: ultimo.item.time, servico },
          msg: msgDoModelo('pos', { paciente: paciente || { name: nome }, key: ultimo.key, hora: ultimo.item.time, servico }),
        });
      }
      if(temFuturo) return; // já tem retorno marcado: nada de retorno/sumida

      // 3) Paciente sumida
      if(diasDesde >= LEMB_SUMIDA_DIAS && diasDesde <= LEMB_SUMIDA_LIMITE){
        lista.push({
          id: 'sumida:' + chave + ':' + ultimo.key, tipo:'sumida', tipoLabel:'Paciente sumida', data: addDiasKey(ultimo.key, LEMB_SUMIDA_DIAS),
          paciente, pacienteNome: nome,
          texto: `Não vem há ${descreverIntervalo(diasDesde).replace('há ', '')} (última visita em ${formatarDataBR(ultimo.key)}) e não tem nada marcado.`,
          ctx: { key: ultimo.key, servico },
          msg: msgDoModelo('sumida', { paciente: paciente || { name: nome }, key: ultimo.key, servico }),
        });
        return;
      }

      // 2) Retorno em dia, pela frequência média da paciente
      if(passados.length >= 2){
        const media = Math.round(diasEntre(passados[0].key, ultimo.key) / (passados.length - 1));
        if(media >= 7 && diasDesde >= media){
          lista.push({
            id: 'retorno:' + chave + ':' + ultimo.key, tipo:'retorno', tipoLabel:'Hora do retorno', data: addDiasKey(ultimo.key, media),
            paciente, pacienteNome: nome,
            texto: `Costuma vir ${descreverFrequencia(media)}; a última visita foi ${descreverIntervalo(diasDesde)}. Nada marcado ainda.`,
            ctx: { key: ultimo.key, servico },
            msg: msgDoModelo('retorno', { paciente: paciente || { name: nome }, key: ultimo.key, servico }),
          });
        }
      }
    });
    return lista;
  }

  // Lembretes do dia que não dependem do histórico: véspera de atendimento e aniversário.
  function lembretesDoDia(){
    const hojeKey = dateKey(today);
    const amanhaKey = addDiasKey(hojeKey, 1);
    const lista = [];
    (appointments[amanhaKey] || []).filter(a => a.type === 'appt').sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach(a => {
      const paciente = pacienteDoItem(a);
      const ctx = { key: amanhaKey, hora: a.time, servico: a.servico };
      lista.push({
        id: 'vespera:' + a.id + ':' + amanhaKey, tipo: 'vespera', tipoLabel: 'Confirmar amanhã', data: hojeKey,
        paciente, pacienteNome: a.label || (paciente && paciente.name) || 'Paciente', ctx, modelo: 'lembrete',
        texto: `Atendimento amanhã às ${a.time}${a.servico ? ' · ' + a.servico : ''}. Confirmar a presença.`,
        msg: msgDoModelo('lembrete', { paciente: paciente || { name: a.label }, ...ctx }),
      });
    });
    try{
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      patients.forEach(p => {
        const n = partesDataNascimento(p.dataNascimento);
        if(!n) return;
        const aniv = aniversarioNoAno(n, hoje.getFullYear());
        if(aniv.getMonth() !== hoje.getMonth() || aniv.getDate() !== hoje.getDate()) return;
        lista.push({
          id: 'aniv:' + p.id + ':' + hoje.getFullYear(), tipo: 'aniversario', tipoLabel: 'Aniversário', data: hojeKey,
          paciente: p, pacienteNome: p.name, ctx: {}, modelo: 'aniversario',
          texto: `Faz ${hoje.getFullYear() - n.ano} anos hoje 🎉`,
          msg: msgDoModelo('aniversario', { paciente: p }),
        });
      });
    }catch(e){}
    return lista;
  }

  function todosLembretes(){
    const hojeKey = dateKey(today);
    const auto = lembretesAutomaticos().concat(lembretesDoDia()).filter(l => {
      const d = lembretesEstado.dispensados[l.id];
      if(d === 'feito') return false;
      if(d) l.data = d; // adiado: volta a aparecer nessa data (até lá fica em "próximos dias")
      return true;
    });
    const manuais = lembretesEstado.manuais.map(m => {
      const paciente = m.pacienteId != null ? patients.find(p => String(p.id) === String(m.pacienteId)) : null;
      return {
        id: m.id, manual: true, tipo:'manual', tipoLabel:'Lembrete', data: m.data, texto: m.texto,
        paciente, pacienteNome: paciente ? paciente.name : (m.pacienteNome || ''),
        msg: paciente ? `Oi, ${primeiroNomeDe(paciente.name)}! ` : '',
      };
    });
    return auto.concat(manuais).sort((a, b) => a.data.localeCompare(b.data));
  }

  function descreverQuando(dataKey){
    const dias = diasEntre(dateKey(today), dataKey);
    if(dias === 0) return { txt:'Hoje', atrasado:false };
    if(dias === 1) return { txt:'Amanhã', atrasado:false };
    if(dias > 1) return { txt: formatarDataBR(dataKey).slice(0,5), atrasado:false };
    return { txt: dias === -1 ? 'Desde ontem' : `Há ${-dias} dias`, atrasado:true };
  }

  function concluirLembrete(l){
    if(l.manual) lembretesEstado.manuais = lembretesEstado.manuais.filter(m => m.id !== l.id);
    else lembretesEstado.dispensados[l.id] = 'feito';
    salvarLembretes();
    renderLembretes();
    showUndoToast('Lembrete concluído', () => {
      if(l.manual) lembretesEstado.manuais.push({ id:l.id, texto:l.texto, pacienteId: l.paciente ? l.paciente.id : null, pacienteNome: l.pacienteNome, data:l.data });
      else delete lembretesEstado.dispensados[l.id];
      salvarLembretes();
      renderLembretes();
    });
  }

  function adiarLembrete(l, dias){
    const novaData = addDiasKey(dateKey(today), dias);
    if(l.manual){
      const m = lembretesEstado.manuais.find(x => x.id === l.id);
      if(m) m.data = novaData;
    } else {
      lembretesEstado.dispensados[l.id] = novaData;
    }
    salvarLembretes();
    renderLembretes();
    showToast(`Lembrete adiado para ${formatarDataBR(novaData).slice(0,5)}`);
  }

  /* ================= CENTRO DE MENSAGENS (Configurações) =================
     Modelos editáveis + "Enviar hoje" + histórico. O envio abre o WhatsApp da paciente com o
     texto pronto (wa.me): seguro para o número e sem configuração. */
  const MODELOS_PADRAO = [
    { id: 'confirmacao', titulo: 'Confirmação de agendamento', texto: 'Olá, {nome}! 😊\nSeu horário de {servico} está confirmado para {dia}, às {hora}.\nSe precisar remarcar, é só me avisar por aqui.\n\n{profissional}' },
    { id: 'lembrete',    titulo: 'Lembrete (véspera)',         texto: 'Oi, {nome}! Passando para lembrar do seu horário de {servico} amanhã, {dia}, às {hora}. Posso confirmar sua presença? 💕\n\n{profissional}' },
    { id: 'pos',         titulo: 'Pós-atendimento',            texto: 'Oi, {nome}! Tudo bem? Passando para saber como a sua pele reagiu à sessão de {servico} do dia {data}. Se notar qualquer vermelhidão ou tiver alguma dúvida, é só me chamar por aqui 💕' },
    { id: 'retorno',     titulo: 'Hora do retorno',            texto: 'Oi, {nome}! Já está na época do seu retorno de {servico}. Quer que eu reserve um horário para você esta semana?' },
    { id: 'sumida',      titulo: 'Paciente sumida',            texto: 'Oi, {nome}! Senti sua falta por aqui 💕 Que tal agendarmos um cuidado para a sua pele? Tenho horários disponíveis esta semana.' },
    { id: 'aniversario', titulo: 'Aniversário',                texto: 'Feliz aniversário, {nome}! 🎉 Desejo um novo ciclo cheio de saúde, alegria e muito autocuidado. Obrigada por confiar no meu trabalho!\n\nCom carinho, {profissional}' },
    { id: 'confirmar_anamnese', titulo: 'Confirmar anamnese', texto: 'Olá, {nome}! 😊 Preenchemos juntas a sua ficha de anamnese. Por favor, confira as informações e confirme neste link:\n{link}\n\nSe algo estiver errado, é só me avisar por aqui.\n\n{profissional}' },
    { id: 'boasvindas',  titulo: 'Boas-vindas',                texto: 'Olá, {nome}! Seja muito bem-vinda 💕 Fico feliz em cuidar da sua pele. Qualquer dúvida antes do seu atendimento, é só me chamar por aqui.\n\n{profissional}' },
  ];
  // { textos: { idPadrao: textoEditado }, titulos: {idPadrao: tituloEditado}, extras: [{id, titulo, texto}] }
  var mensagensModelos = { textos: {}, titulos: {}, extras: [] };
  var mensagensHistorico = []; // [{ em: ISO, pacienteId, paciente, modelo, texto }]

  function listaModelos(){
    return MODELOS_PADRAO.map(m => ({
      id: m.id, padrao: true,
      titulo: (mensagensModelos.titulos || {})[m.id] || m.titulo,
      texto: (mensagensModelos.textos || {})[m.id] != null ? mensagensModelos.textos[m.id] : m.texto,
    })).concat((mensagensModelos.extras || []).map(m => ({ ...m, padrao: false })));
  }
  function modeloPorId(id){ return listaModelos().find(m => m.id === id) || listaModelos()[0]; }

  // Troca as variáveis. ctx: { paciente, key, hora, servico }
  function preencherModelo(texto, ctx){
    ctx = ctx || {};
    const p = ctx.paciente || {};
    const d = ctx.key ? keyParaData(ctx.key) : null;
    const prof = (perfilProfissional && perfilProfissional.nome) || '';
    const vars = {
      nome: primeiroNomeDe(p.name) || '',
      nome_completo: (p.name || '').trim(),
      servico: (ctx.servico || '').trim() || 'atendimento',
      data: ctx.key ? formatarDataBR(ctx.key).slice(0, 5) : '',
      dia: d ? `${weekdayFull[d.getDay()].toLowerCase()}, ${formatarDataBR(ctx.key).slice(0, 5)}` : '',
      hora: ctx.hora || '',
      profissional: prof,
      link: ctx.link || '',
    };
    let out = String(texto || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    // limpezas quando faltou alguma informação
    out = out.replace(/^[ \t]*(Com carinho|Abraços|Beijos|Att)[,.]?[ \t]*$/gmi, '')  // assinatura sem nome
             .replace(/, às \./g, '.').replace(/ às \./g, '.').replace(/ ,/g, ',')
             .replace(/\n{3,}/g, '\n\n').trim();
    return out;
  }
  function salvarModelos(){ salvarConfig('mensagens_modelos', mensagensModelos); }
  function registrarEnvio(paciente, modeloId, texto){
    mensagensHistorico.unshift({ em: new Date().toISOString(), pacienteId: paciente && paciente.id != null ? String(paciente.id) : null,
      paciente: (paciente && paciente.name) || '', modelo: modeloId, texto: String(texto || '').slice(0, 400) });
    if(mensagensHistorico.length > 300) mensagensHistorico.length = 300;
    salvarConfig('mensagens_historico', mensagensHistorico);
    try{ renderCentroMensagens(); }catch(e){}
    try{ renderLembretes(); }catch(e){}
  }
  function jaEnviadoHoje(paciente, modeloId){
    const hoje = dateKey(new Date());
    return mensagensHistorico.some(h => h.modelo === modeloId && h.em && dateKey(new Date(h.em)) === hoje &&
      (paciente && paciente.id != null ? String(h.pacienteId) === String(paciente.id) : h.paciente === (paciente && paciente.name)));
  }

  /* ---------- Janela "Enviar mensagem" ---------- */
  const modalMsgOverlay = document.getElementById('modalMsgOverlay');
  let msgCtx = null;
  function preencherSelectModelos(sel, escolhido){
    sel.innerHTML = listaModelos().map(m => `<option value="${escHTML(m.id)}">${escHTML(m.titulo)}</option>`).join('');
    if(escolhido && listaModelos().some(m => m.id === escolhido)) sel.value = escolhido;
  }
  function atualizarPreviaMsg(){
    const m = modeloPorId(document.getElementById('msgModelo').value);
    document.getElementById('msgTexto').value = preencherModelo(m.texto, msgCtx || {});
    const p = msgCtx && msgCtx.paciente;
    const num = p ? numeroWhatsappDaPaciente(p) : '';
    document.getElementById('msgPara').textContent = p ? (num ? `Para ${p.name} · +${num}` : `${p.name} não tem telefone cadastrado — ajuste na aba Dados da paciente.`) : '';
  }
  // ctx: { paciente?, key?, hora?, servico?, modelo? }
  function abrirEnvioMensagem(ctx){
    msgCtx = Object.assign({}, ctx || {});
    atualizarSugestoesFin();
    const escolherPaciente = !msgCtx.paciente;
    document.getElementById('msgCampoPaciente').style.display = escolherPaciente ? '' : 'none';
    document.getElementById('msgPaciente').value = '';
    document.getElementById('msgTitulo').textContent = msgCtx.paciente ? `Mensagem para ${primeiroNomeDe(msgCtx.paciente.name)}` : 'Enviar mensagem';
    preencherSelectModelos(document.getElementById('msgModelo'), msgCtx.modelo || (escolherPaciente ? 'boasvindas' : 'confirmacao'));
    atualizarPreviaMsg();
    if(msgCtx.textoInicial) document.getElementById('msgTexto').value = msgCtx.textoInicial;
    modalMsgOverlay.classList.add('open');
    setTimeout(() => { if(!modalMsgOverlay.contains(document.activeElement)) document.getElementById(escolherPaciente ? 'msgPaciente' : 'msgTexto').focus(); }, 50);
  }
  function fecharEnvioMensagem(){ modalMsgOverlay.classList.remove('open'); msgCtx = null; }
  document.getElementById('msgModelo').addEventListener('change', atualizarPreviaMsg);
  document.getElementById('msgPaciente').addEventListener('input', (e) => {
    const p = patients.find(x => semAcento(x.name) === semAcento(e.target.value.trim()));
    if(msgCtx){ msgCtx.paciente = p || null; atualizarPreviaMsg(); }
  });
  document.getElementById('msgCancelar').addEventListener('click', fecharEnvioMensagem);
  modalMsgOverlay.addEventListener('click', (e) => { if(e.target === modalMsgOverlay) fecharEnvioMensagem(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalMsgOverlay.classList.contains('open')) fecharEnvioMensagem(); });
  document.getElementById('msgEnviar').addEventListener('click', () => {
    const p = msgCtx && msgCtx.paciente;
    if(!p){ showToast('Escolha a paciente.'); document.getElementById('msgPaciente').focus(); return; }
    const texto = document.getElementById('msgTexto').value.trim();
    if(!texto){ showToast('A mensagem está vazia.'); return; }
    const url = linkWhatsapp(p, texto);
    if(!url){ showToast('Esta paciente não tem telefone cadastrado para o WhatsApp.'); return; }
    window.open(url, '_blank', 'noopener');
    registrarEnvio(p, document.getElementById('msgModelo').value, texto);
    fecharEnvioMensagem();
    showToast('WhatsApp aberto — é só enviar. Registrado no histórico.');
  });
  document.getElementById('btnMsgNova').addEventListener('click', () => abrirEnvioMensagem({}));

  /* ---------- Abas ---------- */
  document.querySelectorAll('#msgAbas .fin-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('#msgAbas .fin-tab').forEach(x => x.classList.toggle('active', x === t));
    document.querySelectorAll('#centroMensagensCard .msg-painel').forEach(pn => pn.classList.toggle('ativo', pn.id === 'msgPainel-' + t.dataset.msgaba));
    renderCentroMensagens();
  }));

  /* ---------- "Enviar hoje": o que vale mandar hoje ---------- */
  function itensParaEnviarHoje(){
    // Mesma lista do painel (Dashboard): o que vence até hoje e não foi concluído
    const hojeKey = dateKey(today);
    const grupos = { vespera: 'Lembretes de amanhã', aniversario: 'Aniversariantes de hoje', pos: 'Pós-atendimento', retorno: 'Hora do retorno', sumida: 'Pacientes sumidas' };
    const ordem = ['vespera', 'aniversario', 'pos', 'retorno', 'sumida'];
    return todosLembretes()
      .filter(l => l.data <= hojeKey && l.paciente && grupos[l.tipo])
      .sort((x, y) => ordem.indexOf(x.tipo) - ordem.indexOf(y.tipo))
      .map(l => ({ grupo: grupos[l.tipo], modelo: l.modelo || l.tipo, paciente: l.paciente, ctx: l.ctx || {}, det: l.texto }));
  }

  function renderCentroMensagens(){
    const card = document.getElementById('centroMensagensCard');
    if(!card) return;
    // Enviar hoje
    const itens = itensParaEnviarHoje();
    const pendentes = itens.filter(i => !jaEnviadoHoje(i.paciente, i.modelo)).length;
    document.getElementById('msgContadorHoje').textContent = pendentes ? String(pendentes) : '';
    const lista = document.getElementById('msgHojeLista');
    lista.innerHTML = itens.length ? '' : '<div class="msg-vazio">Nada para enviar hoje. Lembretes de amanhã, aniversariantes, pós-atendimento e pacientes sumidas aparecem aqui sozinhos.</div>';
    let grupoAtual = '';
    itens.forEach(i => {
      if(i.grupo !== grupoAtual){ grupoAtual = i.grupo; const g = document.createElement('div'); g.className = 'msg-grupo'; g.textContent = i.grupo; lista.appendChild(g); }
      const row = document.createElement('div');
      row.className = 'msg-item';
      const enviado = jaEnviadoHoje(i.paciente, i.modelo);
      const temNumero = !!numeroWhatsappDaPaciente(i.paciente);
      row.innerHTML = `<div class="info"><div class="nome">${escHTML(i.paciente.name)}</div><div class="det">${escHTML(i.det || '')}${temNumero ? '' : ' · <strong>sem telefone</strong>'}</div></div>
        ${enviado ? '<span class="msg-enviado">Enviado hoje</span>' : ''}
        <button type="button" class="fin-btn-mini ok">${enviado ? 'Enviar de novo' : 'Enviar'}</button>`;
      row.querySelector('button').addEventListener('click', () => abrirEnvioMensagem({ paciente: i.paciente, modelo: i.modelo, ...i.ctx }));
      lista.appendChild(row);
    });

    // Modelos
    const box = document.getElementById('msgModelosLista');
    if(!box.contains(document.activeElement)){ // não redesenha enquanto você digita
      box.innerHTML = '';
      listaModelos().forEach(m => {
        const el = document.createElement('div');
        el.className = 'msg-modelo';
        const original = MODELOS_PADRAO.find(x => x.id === m.id);
        const editado = m.padrao && original && (m.texto !== original.texto || m.titulo !== original.titulo);
        el.innerHTML = `<div class="msg-modelo-topo"><input type="text" value="${escHTML(m.titulo)}" maxlength="50" aria-label="Nome do modelo">${m.padrao ? '<span class="tag">padrão</span>' : ''}</div>
          <textarea aria-label="Texto do modelo ${escHTML(m.titulo)}">${escHTML(m.texto)}</textarea>
          <div class="msg-modelo-acoes">
            <button type="button" class="fin-btn-mini" data-acao="previa">Ver exemplo</button>
            ${editado ? '<button type="button" class="fin-btn-mini" data-acao="restaurar">Restaurar texto original</button>' : ''}
            ${m.padrao ? '' : '<button type="button" class="fin-btn-mini" data-acao="apagar">Apagar</button>'}
          </div>`;
        const [titulo, area] = [el.querySelector('input'), el.querySelector('textarea')];
        const salvarEste = () => {
          if(m.padrao){
            mensagensModelos.titulos = mensagensModelos.titulos || {}; mensagensModelos.textos = mensagensModelos.textos || {};
            mensagensModelos.titulos[m.id] = titulo.value.trim() || original.titulo;
            mensagensModelos.textos[m.id] = area.value;
          } else {
            const x = mensagensModelos.extras.find(e => e.id === m.id);
            if(x){ x.titulo = titulo.value.trim() || 'Modelo sem nome'; x.texto = area.value; }
          }
          salvarModelos();
          showToast('Modelo salvo.');
        };
        titulo.addEventListener('change', salvarEste);
        area.addEventListener('change', salvarEste);
        el.querySelectorAll('[data-acao]').forEach(b => b.addEventListener('click', () => {
          if(b.dataset.acao === 'previa'){
            const exemplo = { paciente: { name: 'Ana Souza' }, key: dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)), hora: '10:00', servico: 'Limpeza de Pele' };
            alert('Exemplo de como a paciente recebe:\n\n' + preencherModelo(area.value, exemplo));
          } else if(b.dataset.acao === 'restaurar'){
            delete mensagensModelos.textos[m.id]; delete mensagensModelos.titulos[m.id];
            salvarModelos(); document.activeElement && document.activeElement.blur(); renderCentroMensagens();
          } else if(b.dataset.acao === 'apagar'){
            if(!confirm(`Apagar o modelo "${m.titulo}"?`)) return;
            mensagensModelos.extras = mensagensModelos.extras.filter(e => e.id !== m.id);
            salvarModelos(); document.activeElement && document.activeElement.blur(); renderCentroMensagens();
          }
        }));
        box.appendChild(el);
      });
    }

    // Histórico
    const busca = semAcento((document.getElementById('msgHistoricoBusca') || {}).value || '').trim();
    const hist = document.getElementById('msgHistoricoLista');
    const nomes = Object.fromEntries(listaModelos().map(m => [m.id, m.titulo]));
    const filtrados = mensagensHistorico.filter(h => !busca || semAcento(h.paciente + ' ' + (nomes[h.modelo] || h.modelo)).includes(busca));
    hist.innerHTML = filtrados.length ? '' : `<div class="msg-vazio">${mensagensHistorico.length ? 'Nada encontrado.' : 'Nenhuma mensagem enviada ainda.'}</div>`;
    filtrados.slice(0, 100).forEach(h => {
      const dt = new Date(h.em);
      const row = document.createElement('div');
      row.className = 'msg-hist-item';
      row.innerHTML = `<div class="quando">${isNaN(dt) ? '' : dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="min-width:0;"><strong>${escHTML(h.paciente || 'Paciente')}</strong> · ${escHTML(nomes[h.modelo] || h.modelo || '')}<div class="txt">${escHTML(h.texto || '')}</div></div>`;
      hist.appendChild(row);
    });
  }
  document.getElementById('msgHistoricoBusca').addEventListener('input', renderCentroMensagens);
  document.getElementById('btnMsgNovoModelo').addEventListener('click', () => {
    mensagensModelos.extras = mensagensModelos.extras || [];
    mensagensModelos.extras.push({ id: 'm' + Date.now(), titulo: 'Novo modelo', texto: 'Oi, {nome}! ' });
    salvarModelos();
    renderCentroMensagens();
    const areas = document.querySelectorAll('#msgModelosLista textarea');
    if(areas.length){ areas[areas.length - 1].focus(); }
  });
  // Atualiza ao abrir Configurações
  document.querySelectorAll('.nav-item[data-view="configuracoes"]').forEach(n => n.addEventListener('click', () => { try{ renderCentroMensagens(); }catch(e){} }));
  try{ renderCentroMensagens(); }catch(e){ console.warn('Centro de Mensagens:', e); }

  function renderLembretes(){
    const container = document.getElementById('lembretesContainer');
    if(!container) return;
    const hojeKey = dateKey(today);
    const todos = todosLembretes();
    const pendentes = todos.filter(l => l.data <= hojeKey);
    const futuros = todos.filter(l => l.data > hojeKey);
    const visiveis = lembretesMostrarFuturos ? todos : pendentes;

    container.innerHTML = '';
    if(visiveis.length === 0){
      container.innerHTML = `<div class="empty-state">${futuros.length ? 'Nenhum lembrete para hoje. 🎉' : 'Nenhum lembrete no momento.'}</div>`;
    }

    const iconeWhats = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.7.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';

    visiveis.forEach(l => {
      const quando = descreverQuando(l.data);
      const link = l.paciente ? linkWhatsapp(l.paciente, l.msg) : null;
      const el = document.createElement('div');
      el.className = 'lemb-item' + (quando.atrasado ? ' atrasado' : '');
      el.innerHTML = `
        <div class="lemb-topo">
          <span class="lemb-tipo ${l.tipo}">${l.tipoLabel}</span>
          <span class="lemb-quando ${quando.atrasado ? 'atrasado' : ''}">${quando.txt}</span>
          ${(() => { try{ const mod = l.modelo || ({ pos:'pos', retorno:'retorno', sumida:'sumida' })[l.tipo]; return mod && l.paciente && jaEnviadoHoje(l.paciente, mod) ? '<span class="msg-enviado" style="margin-left:auto;">✓ enviado</span>' : ''; }catch(e){ return ''; } })()}
        </div>
        ${l.pacienteNome ? `<div class="lemb-paciente">${l.pacienteNome}</div>` : ''}
        <div class="lemb-texto"></div>
        <div class="lemb-acoes">
          ${link ? `<button class="lemb-btn whats" data-a="whats">${iconeWhats} WhatsApp</button>` : ''}
          <button class="lemb-btn" data-a="ok">✓ Concluir</button>
          <button class="lemb-btn" data-a="adiar">Adiar ▾</button>
        </div>
      `;
      el.querySelector('.lemb-texto').textContent = l.texto; // texto livre: evita injetar HTML
      const nomeEl = el.querySelector('.lemb-paciente');
      if(nomeEl && l.paciente) nomeEl.addEventListener('click', () => openPatientRegistro(l.paciente.id, 'dados'));
      else if(nomeEl) nomeEl.style.cursor = 'default';
      const w = el.querySelector('[data-a="whats"]');
      if(w) w.addEventListener('click', () => {
        const modelo = l.modelo || ({ pos: 'pos', retorno: 'retorno', sumida: 'sumida' })[l.tipo];
        try{ abrirEnvioMensagem({ paciente: l.paciente, modelo, ...(l.ctx || {}), textoInicial: modelo ? null : l.msg }); }
        catch(e){ window.open(link, '_blank', 'noopener'); }
      });
      el.querySelector('[data-a="ok"]').addEventListener('click', () => concluirLembrete(l));
      el.querySelector('[data-a="adiar"]').addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.lemb-adiar-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'lemb-adiar-menu';
        menu.style.left = e.currentTarget.offsetLeft + 'px';
        [['Amanhã', 1], ['Em 3 dias', 3], ['Semana que vem', 7], ['Daqui a 1 mês', 30]].forEach(([rotulo, dias]) => {
          const b = document.createElement('button');
          b.textContent = rotulo;
          b.addEventListener('click', () => { menu.remove(); adiarLembrete(l, dias); });
          menu.appendChild(b);
        });
        el.querySelector('.lemb-acoes').appendChild(menu);
      });
      container.appendChild(el);
    });

    if(futuros.length){
      const rod = document.createElement('div');
      rod.className = 'lemb-rodape';
      rod.innerHTML = lembretesMostrarFuturos
        ? `<span></span><a>Mostrar só os de hoje</a>`
        : `<span>${futuros.length} agendado${futuros.length === 1 ? '' : 's'} para os próximos dias</span><a>Ver todos</a>`;
      rod.querySelector('a').addEventListener('click', () => { lembretesMostrarFuturos = !lembretesMostrarFuturos; renderLembretes(); });
      container.appendChild(rod);
    }
  }
  document.addEventListener('click', (e) => {
    if(!e.target.closest('.lemb-adiar-menu')) document.querySelectorAll('.lemb-adiar-menu').forEach(m => m.remove());
  });

  /* ---------- Novo lembrete ---------- */
  const modalLembreteOverlay = document.getElementById('modalLembreteOverlay');
  document.getElementById('btnLembrete').addEventListener('click', () => {
    const sel = document.getElementById('lembretePaciente');
    const ordenadas = patients.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
    sel.innerHTML = '<option value="">— Sem paciente —</option>' +
      ordenadas.map(p => `<option value="${p.id}">${(p.name || '').replace(/</g, '&lt;')}</option>`).join('');
    document.getElementById('lembreteTexto').value = '';
    document.getElementById('lembreteData').value = dateKey(today);
    modalLembreteOverlay.classList.add('open');
    setTimeout(() => document.getElementById('lembreteTexto').focus(), 50);
  });
  document.getElementById('modalLembreteCancelar').addEventListener('click', () => modalLembreteOverlay.classList.remove('open'));
  modalLembreteOverlay.addEventListener('click', (e) => { if(e.target === modalLembreteOverlay) modalLembreteOverlay.classList.remove('open'); });
  document.getElementById('modalLembreteSalvar').addEventListener('click', () => {
    const texto = document.getElementById('lembreteTexto').value.trim();
    if(!texto){ showToast('Escreva o lembrete.'); return; }
    const pacienteId = document.getElementById('lembretePaciente').value || null;
    const paciente = pacienteId ? patients.find(p => String(p.id) === String(pacienteId)) : null;
    const data = document.getElementById('lembreteData').value || dateKey(today);
    lembretesEstado.manuais.push({
      id: 'm-' + Date.now(), texto, data,
      pacienteId: paciente ? paciente.id : null, pacienteNome: paciente ? paciente.name : '',
    });
    salvarLembretes();
    modalLembreteOverlay.classList.remove('open');
    if(data > dateKey(today)) lembretesMostrarFuturos = true;
    renderLembretes();
    showToast('Lembrete salvo!');
  });

  /* init */
  renderCalendar();
  renderCurrentView();
  // (loadAgendamentosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)

  /* ================= FINANCEIRO MODULE ================= */
  // Abas do Financeiro (só as desta tela — antes o clique em abas de outras telas bagunçava estas)
  document.querySelectorAll('#view-financeiro .fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-financeiro .fin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('#view-financeiro .fin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('finpanel-' + tab.dataset.fintab);
      if(panel) panel.classList.add('active');
      renderFinanceiro();
    });
  });

  /* ---------- Moeda (a escolhida em Configurações › Preferências) ---------- */
  function simboloMoeda(moeda){ return { BRL: 'R$', USD: '$', EUR: '€' }[moeda || moedaPreferidaAtual()] || 'R$'; }
  function fmtMoeda(v){
    const n = Math.round((Number(v) || 0) * 100) / 100;
    const [inteiro, dec] = Math.abs(n).toFixed(2).split('.');
    return (n < 0 ? '– ' : '') + simboloMoeda() + ' ' + inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
  }
  // Lê "1.234,56", "1234,5", "12.50" ou "€ 30" como número.
  function lerValor(txt){
    let t = String(txt == null ? '' : txt).trim().replace(/[^\d,.\-]/g, '');
    if(t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function valorParaCampo(v){ return (Math.round((Number(v) || 0) * 100) / 100).toFixed(2).replace('.', ','); }
  function arred(v){ return Math.round((Number(v) || 0) * 100) / 100; }
  function hojeISO(){ return dateKey(new Date()); }
  function isoParaBR(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; }
  function brParaISO(br){ const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; }
  function addMesISO(iso){
    const [a, m, d] = iso.split('-').map(Number);
    const ultimo = new Date(a, m + 1, 0).getDate();
    const alvo = new Date(a, m, Math.min(d, ultimo));
    return dateKey(alvo);
  }

  /* ---------- Camada de dados do Financeiro (banco na conta real, memória no modo demonstração) ---------- */
  function idLocal(){ return 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
  function ehIdDoBanco(id){ return typeof id === 'string' && id.includes('-') && !id.startsWith('demo-'); }
  let avisoFinSql = false;
  function avisarErroFin(acao, error){
    const msg = (error && error.message) || String(error || '');
    console.warn('Financeiro:', acao, msg);
    if(/column|relation|does not exist|schema cache|violates check/i.test(msg)){
      if(!avisoFinSql){ avisoFinSql = true; showToast('Falta atualizar o banco: rode no Supabase os arquivos SQL do Financeiro (financeiro.sql e descontos.sql). (' + msg.slice(0, 60) + ')'); }
    } else {
      showToast(acao + ': ' + msg.slice(0, 90));
    }
  }
  async function finInserir(tabela, registro){
    if(modoDemonstracao) return { ...registro, id: idLocal() };
    const user = await usuarioParaSalvar();
    if(!user) return null;
    const { data, error } = await supabaseClient.from(tabela).insert({ ...registro, profissional_id: user.id }).select().single();
    if(error){ avisarErroFin('Não foi possível salvar', error); return null; }
    return data;
  }
  async function finAtualizar(tabela, id, campos){
    if(modoDemonstracao || !ehIdDoBanco(id)) return true;
    const user = await usuarioParaSalvar();
    if(!user) return false;
    const { error } = await supabaseClient.from(tabela).update(campos).eq('id', id);
    if(error){ avisarErroFin('Não foi possível salvar', error); return false; }
    return true;
  }
  async function finApagar(tabela, id){
    if(modoDemonstracao || !ehIdDoBanco(id)) return true;
    const user = await usuarioParaSalvar();
    if(!user) return false;
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    if(error){ avisarErroFin('Não foi possível apagar', error); return false; }
    return true;
  }

  /* ---------- Formas de pagamento (aba própria, salvas nas configurações) ---------- */
  const FORMAS_PADRAO = {
    BRL: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],
    EUR: ['MB Way', 'Multibanco', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'],
    USD: ['Cash', 'Credit Card', 'Debit Card', 'Zelle', 'Bank Transfer'],
  };
  var formasPagamento = null; // null = padrão da moeda; senão [{ nome, ativa }]
  function listaFormas(){
    return formasPagamento || (FORMAS_PADRAO[moedaPreferidaAtual()] || FORMAS_PADRAO.BRL).map(nome => ({ nome, ativa: true }));
  }
  function formasAtivas(){ return listaFormas().filter(f => f.ativa).map(f => f.nome); }
  function preencherSelectFormas(sel, atual, textoVazio){
    const nomes = formasAtivas().slice();
    if(atual && atual !== '—' && !nomes.includes(atual)) nomes.push(atual);
    sel.innerHTML = (textoVazio ? `<option value="">${escHTML(textoVazio)}</option>` : '') +
      nomes.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('');
    if(atual && atual !== '—') sel.value = atual;
  }
  function renderFormas(){
    const el = document.getElementById('formasLista');
    if(!el) return;
    const lista = listaFormas();
    const padrao = FORMAS_PADRAO[moedaPreferidaAtual()] || [];
    el.innerHTML = lista.length ? '' : '<div class="comanda-vazio">Nenhuma forma cadastrada.</div>';
    lista.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'forma-item';
      row.innerHTML = `<label><input type="checkbox" ${f.ativa ? 'checked' : ''}> ${escHTML(f.nome)}</label>` +
        (padrao.includes(f.nome) ? '' : '<button type="button">Remover</button>');
      row.querySelector('input').addEventListener('change', (e) => {
        formasPagamento = listaFormas().map(x => ({ ...x }));
        formasPagamento[i].ativa = e.target.checked;
        salvarConfig('formas_pagamento', formasPagamento);
      });
      const rem = row.querySelector('button');
      if(rem) rem.addEventListener('click', () => {
        formasPagamento = listaFormas().filter((x, j) => j !== i);
        salvarConfig('formas_pagamento', formasPagamento);
        renderFormas();
      });
      el.appendChild(row);
    });
  }
  document.getElementById('btnAddForma').addEventListener('click', () => {
    const inp = document.getElementById('formaNovaNome');
    const nome = inp.value.trim();
    if(!nome) return;
    if(listaFormas().some(f => semAcento(f.nome) === semAcento(nome))){ showToast('Essa forma já existe.'); return; }
    formasPagamento = listaFormas().map(x => ({ ...x })).concat([{ nome, ativa: true }]);
    salvarConfig('formas_pagamento', formasPagamento);
    inp.value = '';
    renderFormas();
    showToast('Forma de pagamento adicionada!');
  });
  document.getElementById('formaNovaNome').addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('btnAddForma').click(); });
  document.getElementById('btnFormasPadrao').addEventListener('click', () => {
    if(!confirm('Voltar para as formas de pagamento padrão da sua moeda? As que você adicionou serão removidas.')) return;
    formasPagamento = null;
    salvarConfig('formas_pagamento', []);
    renderFormas();
  });

  /* ---------- Listas de sugestão (categorias, serviços, clientes) ---------- */
  const CATEGORIAS_PADRAO = ['Atendimento', 'Produtos', 'Estoque / Insumos', 'Aluguel', 'Contas de consumo', 'Marketing', 'Assinaturas', 'Impostos', 'Equipamentos', 'Cursos', 'Outros'];
  function atualizarSugestoesFin(){
    const cats = new Set(CATEGORIAS_PADRAO);
    try{ controleData.forEach(m => m.categoria && cats.add(m.categoria)); contasData.forEach(c => c.categoria && cats.add(c.categoria)); }catch(e){}
    document.getElementById('finCategoriasLista').innerHTML = [...cats].map(c => `<option value="${escHTML(c)}"></option>`).join('');
    let servs = [];
    try{ servs = servicosData.map(s => s.nome); }catch(e){}
    let pacs = [];
    try{ pacs = pacotesData.map(p => 'Pacote: ' + p.nome); }catch(e){}
    document.getElementById('finServicosLista').innerHTML = servs.concat(pacs).map(n => `<option value="${escHTML(n)}"></option>`).join('');
    let nomes = [];
    try{ nomes = patients.map(p => p.name).filter(Boolean); }catch(e){}
    document.getElementById('finPacientesLista').innerHTML = [...new Set(nomes)].map(n => `<option value="${escHTML(n)}"></option>`).join('');
  }
  function precoDoServico(nome){
    const pac = pacoteDoNomeItem(nome);
    if(pac) return pac.valor;
    try{ const s = servicosData.find(x => semAcento(x.nome) === semAcento(nome)); return s ? (Number(s.preco) || 0) : null; }catch(e){ return null; }
  }
  // "Pacote: Nome" na comanda → o pacote (preço já com o desconto do pacote)
  function pacoteDoNomeItem(nome){
    const m = String(nome || '').match(/^Pacote:\s*(.+)$/i);
    if(!m) return null;
    try{ return pacotesData.find(p => semAcento(p.nome) === semAcento(m[1].trim())) || null; }catch(e){ return null; }
  }

  /* ================= COMANDAS ================= */
  // Formato: { id, codigo, dataISO, data, cliente, itens:[{nome, preco, origem}], pagamentos:[{id, data, forma, valor, movimentoId}],
  //            valor, saldo, servicos, pagamento, status, agendamentoId, pacienteId, moeda }
  function comandaExemplo(codigo, dataISO, cliente, itens, pagamentos){
    const c = { id: idLocal(), codigo, dataISO, data: isoParaBR(dataISO), cliente, itens, pagamentos, status: 'Em Aberto', moeda: null };
    recalcularComanda(c);
    return c;
  }
  let comandasData = [
    comandaExemplo('#0001', '2026-08-13', 'Paciente Teste 1', [{ nome: 'Limpeza de Pele Profunda', preco: 150, origem: 'servico' }, { nome: 'Peeling de Diamante', preco: 130, origem: 'servico' }], [{ id: 'p1', data: '2026-08-13', forma: 'Cartão de Crédito', valor: 280 }]),
    comandaExemplo('#0002', '2026-08-13', 'Paciente Teste 4', [{ nome: 'Limpeza de Pele Profunda', preco: 150, origem: 'servico' }], []),
    comandaExemplo('#0003', '2026-08-12', 'Paciente Teste 3', [{ nome: 'Drenagem Linfática', preco: 120, origem: 'servico' }, { nome: 'Protetor solar', preco: 300, origem: 'extra' }], [{ id: 'p2', data: '2026-08-12', forma: 'Pix', valor: 420 }]),
    comandaExemplo('#0004', '2026-08-11', 'Paciente Teste 5', [{ nome: 'Massagem Relaxante', preco: 99.9, origem: 'servico' }], [{ id: 'p3', data: '2026-08-11', forma: 'Dinheiro', valor: 99.9 }]),
  ];

  // Desconto { tipo: 'percent' | 'valor', valor } sobre um subtotal. Nunca passa do subtotal.
  function calcularDesconto(subtotal, desconto){
    if(!desconto || !(Number(desconto.valor) > 0) || !(subtotal > 0)) return 0;
    const v = Number(desconto.valor);
    return arred(desconto.tipo === 'percent' ? subtotal * Math.min(v, 100) / 100 : Math.min(v, subtotal));
  }
  function textoDesconto(desconto){
    if(!desconto || !(Number(desconto.valor) > 0)) return '';
    return desconto.tipo === 'percent' ? `${String(desconto.valor).replace('.', ',')}%` : fmtMoeda(desconto.valor);
  }

  function recalcularComanda(c){
    c.itens = Array.isArray(c.itens) ? c.itens : [];
    c.pagamentos = Array.isArray(c.pagamentos) ? c.pagamentos : [];
    c.subtotal = arred(c.itens.reduce((s, i) => s + (Number(i.preco) || 0), 0));
    c.descontoAplicado = calcularDesconto(c.subtotal, c.desconto);
    c.valor = arred(c.subtotal - c.descontoAplicado); // total a pagar (já com desconto) — é o que entra no financeiro
    const pago = arred(c.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0));
    c.pago = pago;
    c.saldo = Math.max(0, arred(c.valor - pago));
    c.servicos = c.itens.map(i => i.nome).join(', ');
    c.pagamento = [...new Set(c.pagamentos.map(p => p.forma).filter(Boolean))].join(' + ') || '—';
    if(c.status !== 'Inativa') c.status = (c.valor > 0 && c.saldo <= 0) ? 'Fechada' : 'Em Aberto';
    c.data = isoParaBR(c.dataISO);
    return c;
  }
  function comandaParaBanco(c){
    return {
      codigo: c.codigo, data: c.dataISO || null, cliente: c.cliente, servicos: c.servicos || null,
      itens: c.itens, pagamentos: c.pagamentos, valor: c.valor, saldo: c.saldo,
      pagamento: c.pagamento === '—' ? null : c.pagamento, status: c.status,
      moeda: c.moeda || moedaPreferidaAtual(),
      agendamento_id: c.agendamentoId || null, paciente_id: c.pacienteId != null ? String(c.pacienteId) : null,
      ...(c.desconto !== undefined ? { desconto: c.desconto, subtotal: c.subtotal } : {}),
    };
  }
  function comandaDoBanco(r){
    let itens = Array.isArray(r.itens) ? r.itens.map(i => ({ nome: i.nome, preco: Number(i.preco) || 0, origem: i.origem || 'servico' })) : null;
    if(!itens){ // comandas antigas (sem itens): um item com o valor total
      itens = (r.servicos || Number(r.valor)) ? [{ nome: r.servicos || 'Atendimento', preco: Number(r.valor) || 0, origem: 'servico' }] : [];
    }
    let pagamentos = Array.isArray(r.pagamentos) ? r.pagamentos : null;
    if(!pagamentos){ // antigas: deduz o que já foi pago
      const pago = arred((Number(r.valor) || 0) - (Number(r.saldo) || 0));
      pagamentos = pago > 0 ? [{ id: idLocal(), data: r.data, forma: r.pagamento || '—', valor: pago }] : [];
    }
    const c = {
      id: r.id, codigo: r.codigo, dataISO: r.data ? String(r.data).slice(0, 10) : '', cliente: r.cliente || 'Sem nome',
      itens, pagamentos, status: r.status || 'Em Aberto', agendamentoId: r.agendamento_id || null,
      pacienteId: r.paciente_id || null, moeda: r.moeda || null,
    };
    if('desconto' in r) c.desconto = (r.desconto && Number(r.desconto.valor) > 0) ? { tipo: r.desconto.tipo === 'percent' ? 'percent' : 'valor', valor: Number(r.desconto.valor) } : null;
    return recalcularComanda(c);
  }

  function statusPillHTML(status){
    if(status === 'Fechada') return `<span class="status-active">Fechada</span>`;
    if(status === 'Inativa') return `<span class="pill pill-inativa" title="Atendimento cancelado">Inativa</span>`;
    return `<span class="pill pill-gray">Em Aberto</span>`;
  }

  function comandasFiltradas(){
    const busca = semAcento((document.getElementById('comandasBusca') || {}).value || '').trim();
    const de = (document.getElementById('comandasDateFrom') || {}).value || '';
    const ate = (document.getElementById('comandasDateTo') || {}).value || '';
    const status = (document.getElementById('comandasFiltroStatus') || {}).value || 'ativas';
    return comandasData.filter(c => {
      if(status === 'ativas' && c.status === 'Inativa') return false;
      if(status !== 'ativas' && status !== 'todas' && c.status !== status) return false;
      if(de && c.dataISO && c.dataISO < de) return false;
      if(ate && c.dataISO && c.dataISO > ate) return false;
      if(busca && !semAcento((c.cliente || '') + ' ' + (c.codigo || '') + ' ' + (c.servicos || '')).includes(busca)) return false;
      return true;
    }).sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || '') || String(b.codigo || '').localeCompare(String(a.codigo || '')));
  }

  const ICONE_LIXEIRA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';

  function renderComandas(){
    const body = document.getElementById('comandasBody');
    if(!body) return;
    body.innerHTML = '';
    const lista = comandasFiltradas();

    // Resumo do período filtrado (inativas não contam)
    const validas = lista.filter(c => c.status !== 'Inativa');
    const abertas = validas.filter(c => c.saldo > 0);
    const total = validas.reduce((s, c) => s + c.valor, 0);
    const recebido = validas.reduce((s, c) => s + (c.pago || 0), 0);
    const setTxt = (id, t) => { const el = document.getElementById(id); if(el) el.textContent = t; };
    setTxt('sumComandasAberto', fmtMoeda(abertas.reduce((s, c) => s + c.saldo, 0)));
    setTxt('sumComandasAbertoN', `${abertas.length} comanda${abertas.length === 1 ? '' : 's'} com saldo`);
    setTxt('sumComandasRecebido', fmtMoeda(recebido));
    setTxt('sumComandasRecebidoN', 'pagamentos registrados');
    setTxt('sumComandasTotal', fmtMoeda(total));
    setTxt('sumComandasTotalN', `${validas.length} comanda${validas.length === 1 ? '' : 's'}`);
    setTxt('sumComandasDescontos', fmtMoeda(validas.reduce((s, c) => s + (c.descontoAplicado || 0), 0)));
    setTxt('sumComandasTicket', validas.length ? `ticket médio ${fmtMoeda(total / validas.length)}` : '');

    if(!lista.length){
      body.innerHTML = `<tr><td colspan="9" class="fin-vazio">${comandasData.length ? 'Nenhuma comanda com esses filtros.' : 'Nenhuma comanda ainda. Elas são criadas sozinhas quando você agenda um atendimento — ou use "Nova Comanda".'}</td></tr>`;
      return;
    }
    lista.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.innerHTML = `
        <td>${escHTML(c.codigo)}</td>
        <td>${escHTML(c.data)}</td>
        <td>${escHTML(c.cliente)}</td>
        <td class="comanda-servicos">${escHTML(c.servicos || '—')}</td>
        <td class="num">${c.descontoAplicado > 0 ? `<span class="desconto-tag" title="Desconto de ${textoDesconto(c.desconto)} (${fmtMoeda(c.descontoAplicado)})">–${textoDesconto(c.desconto)}</span> ` : ''}${fmtMoeda(c.valor)}</td>
        <td class="num">${fmtMoeda(c.saldo)}</td>
        <td>${escHTML(c.pagamento || '—')}</td>
        <td>${statusPillHTML(c.status)}</td>
        <td style="text-align:right;"><button type="button" class="comanda-apagar" title="Apagar comanda" aria-label="Apagar comanda ${escHTML(c.codigo)}">${ICONE_LIXEIRA}</button></td>
      `;
      tr.addEventListener('click', () => abrirComanda(c));
      tr.querySelector('.comanda-apagar').addEventListener('click', (e) => { e.stopPropagation(); apagarComanda(c); });
      body.appendChild(tr);
    });
  }
  ['comandasBusca', 'comandasDateFrom', 'comandasDateTo', 'comandasFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderComandas);
  });

  // Apaga a comanda e os lançamentos dos pagamentos dela.
  async function apagarComanda(c, semPerguntar){
    if(!semPerguntar){
      const extra = c.pagamentos.length ? `\n\nOs ${c.pagamentos.length} pagamento(s) dela também saem do Controle Financeiro.` : '';
      if(!confirm(`Apagar a comanda ${c.codigo} (${c.cliente})?${extra}\n\nIsso não pode ser desfeito.`)) return false;
    }
    for(const p of c.pagamentos){ if(p.movimentoId) await finApagar('movimentos_financeiros', p.movimentoId); }
    if(!await finApagar('comandas', c.id)) return false;
    const movIds = new Set(c.pagamentos.map(p => p.movimentoId).filter(Boolean));
    controleData = controleData.filter(m => !movIds.has(m.id) && !(m.comandaId && m.comandaId === c.id));
    comandasData = comandasData.filter(x => x !== c);
    renderFinanceiro();
    if(!semPerguntar) showToast(`Comanda ${c.codigo} apagada.`);
    return true;
  }

  /* ---------- Janela da comanda: itens, pagamentos, nova comanda ---------- */
  const modalComandaOverlay = document.getElementById('modalComandaOverlay');
  let comandaAtual = null;   // comanda aberta (já salva) ou rascunho (nova)
  let comandaNova = false;

  function abrirComanda(c){
    comandaAtual = c; comandaNova = false;
    montarJanelaComanda();
    modalComandaOverlay.classList.add('open');
  }
  function novaComanda(){
    comandaAtual = recalcularComanda({ id: null, codigo: proximoCodigoComanda(), dataISO: hojeISO(), cliente: '', itens: [], pagamentos: [], status: 'Em Aberto', moeda: moedaPreferidaAtual() });
    comandaNova = true;
    montarJanelaComanda();
    modalComandaOverlay.classList.add('open');
    setTimeout(() => { if(!modalComandaOverlay.contains(document.activeElement)) document.getElementById('comandaCliente').focus(); }, 50);
  }
  function fecharComanda(){ modalComandaOverlay.classList.remove('open'); comandaAtual = null; }
  document.getElementById('btnNovaComanda').addEventListener('click', novaComanda);
  document.getElementById('btnComandaFechar').addEventListener('click', fecharComanda);
  modalComandaOverlay.addEventListener('click', (e) => { if(e.target === modalComandaOverlay) fecharComanda(); });

  function montarJanelaComanda(){
    const c = comandaAtual;
    atualizarSugestoesFin();
    const inativa = c.status === 'Inativa';
    document.getElementById('comandaTitulo').textContent = comandaNova ? 'Nova Comanda' : `Comanda ${c.codigo}`;
    document.getElementById('comandaStatusPill').innerHTML = comandaNova ? '' : statusPillHTML(c.status);
    const aviso = document.getElementById('comandaAviso');
    let textoAviso = '';
    if(inativa) textoAviso = 'O atendimento desta comanda foi cancelado, por isso ela está inativa.';
    else if(c.agendamentoId){
      let ag = null, agKey = null;
      Object.keys(appointments).some(k => (appointments[k] || []).some(a => { if(String(a.id) === String(c.agendamentoId)){ ag = a; agKey = k; return true; } return false; }));
      textoAviso = ag ? `Gerada pelo atendimento de ${formatarDataBR(agKey)} às ${ag.time}. Serviços alterados no agendamento atualizam esta comanda enquanto ela estiver em aberto.` : 'Gerada por um atendimento da agenda.';
    }
    aviso.textContent = textoAviso;
    aviso.style.display = textoAviso ? 'block' : 'none';

    const cli = document.getElementById('comandaCliente'), dt = document.getElementById('comandaData');
    cli.value = c.cliente || ''; dt.value = c.dataISO || hojeISO();
    cli.disabled = dt.disabled = inativa;
    document.getElementById('comandaAddItem').style.display = inativa ? 'none' : 'flex';
    document.getElementById('comandaItemNome').value = '';
    document.getElementById('comandaItemValor').value = '';

    renderItensComanda();
    document.getElementById('comandaPagamentosWrap').style.display = comandaNova ? 'none' : 'block';
    document.getElementById('btnComandaSalvar').style.display = comandaNova ? '' : 'none';
    document.getElementById('btnComandaSalvar').textContent = 'Criar comanda';
    document.getElementById('btnComandaExcluir').style.display = comandaNova ? 'none' : '';
    document.getElementById('btnComandaFechar').textContent = comandaNova ? 'Cancelar' : 'Fechar';
  }

  function renderItensComanda(){
    const c = comandaAtual;
    recalcularComanda(c);
    const inativa = c.status === 'Inativa';
    const box = document.getElementById('comandaItens');
    box.innerHTML = c.itens.length ? '' : '<div class="comanda-vazio">Nenhum item. Adicione um serviço ou produto abaixo.</div>';
    c.itens.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'comanda-linha';
      row.innerHTML = `<div class="nome">${escHTML(it.nome)}${it.origem === 'servico' && c.agendamentoId ? '<small>agenda</small>' : ''}</div>
        <div class="val">${inativa ? fmtMoeda(it.preco) : `<input type="text" inputmode="decimal" value="${valorParaCampo(it.preco)}" aria-label="Valor de ${escHTML(it.nome)}">`}</div>
        ${inativa ? '' : `<button type="button" title="Remover item" aria-label="Remover ${escHTML(it.nome)}">&times;</button>`}`;
      if(!inativa){
        row.querySelector('input').addEventListener('change', async (e) => {
          it.preco = lerValor(e.target.value);
          await salvarComandaAtual();
        });
        row.querySelector('button').addEventListener('click', async () => {
          c.itens.splice(i, 1);
          await salvarComandaAtual();
        });
      }
      box.appendChild(row);
    });
    // Desconto
    const selDesc = document.getElementById('comandaDescontoTipo'), inpDesc = document.getElementById('comandaDescontoValor');
    document.getElementById('comandaDescontoRow').style.display = inativa ? 'none' : 'flex';
    if(document.activeElement !== inpDesc && document.activeElement !== selDesc){
      selDesc.value = c.desconto && c.desconto.valor > 0 ? c.desconto.tipo : '';
      inpDesc.value = c.desconto && c.desconto.valor > 0 ? String(c.desconto.valor).replace('.', ',') : '';
      inpDesc.disabled = !selDesc.value;
    }
    document.getElementById('comandaResumoDesconto').innerHTML = c.descontoAplicado > 0
      ? `Subtotal ${fmtMoeda(c.subtotal)} · Desconto <strong>– ${fmtMoeda(c.descontoAplicado)}</strong>${c.desconto.tipo === 'percent' ? ` (${textoDesconto(c.desconto)})` : ''}`
      : '';
    document.getElementById('comandaTotal').textContent = fmtMoeda(c.valor);
    document.getElementById('comandaPago').textContent = fmtMoeda(c.pago || 0);
    document.getElementById('comandaSaldo').textContent = fmtMoeda(c.saldo);
    document.getElementById('comandaStatusPill').innerHTML = comandaNova ? '' : statusPillHTML(c.status);

    // Pagamentos
    const pags = document.getElementById('comandaPagamentos');
    pags.innerHTML = c.pagamentos.length ? '' : '<div class="comanda-vazio">Nenhum pagamento registrado.</div>';
    c.pagamentos.forEach(p => {
      const row = document.createElement('div');
      row.className = 'comanda-linha';
      row.innerHTML = `<div class="nome">${escHTML(isoParaBR(p.data))} · ${escHTML(p.forma || '—')}</div><div class="val">${fmtMoeda(p.valor)}</div>
        <button type="button" title="Desfazer este pagamento" aria-label="Desfazer pagamento">&times;</button>`;
      row.querySelector('button').addEventListener('click', () => desfazerPagamento(p));
      pags.appendChild(row);
    });
    const podePagar = !comandaNova && !inativa && c.saldo > 0;
    document.getElementById('comandaPagar').style.display = podePagar ? 'flex' : 'none';
    if(podePagar){
      preencherSelectFormas(document.getElementById('comandaPagForma'), document.getElementById('comandaPagForma').value || formasAtivas()[0]);
      document.getElementById('comandaPagValor').value = valorParaCampo(c.saldo);
      if(!document.getElementById('comandaPagData').value) document.getElementById('comandaPagData').value = hojeISO();
    }
  }

  // Persiste a comanda aberta (itens, cliente, data) e atualiza a lista.
  async function salvarComandaAtual(){
    const c = comandaAtual;
    if(!c) return false;
    recalcularComanda(c);
    if(!comandaNova){
      const ok = await finAtualizar('comandas', c.id, comandaParaBanco(c));
      if(!ok) return false;
    }
    renderItensComanda();
    renderComandas();
    return true;
  }

  document.getElementById('comandaDescontoTipo').addEventListener('change', (e) => {
    const inp = document.getElementById('comandaDescontoValor');
    inp.disabled = !e.target.value;
    if(!e.target.value){ aplicarDescontoComanda(); } else { inp.focus(); inp.select(); }
  });
  async function aplicarDescontoComanda(){
    const c = comandaAtual;
    if(!c) return;
    const tipo = document.getElementById('comandaDescontoTipo').value;
    const valor = lerValor(document.getElementById('comandaDescontoValor').value);
    const novo = tipo && valor > 0 ? { tipo, valor } : null;
    if(novo && tipo === 'percent' && valor > 100){ showToast('O desconto em porcentagem vai até 100%.'); return; }
    if(novo && tipo === 'valor' && valor > c.subtotal){ showToast(`O desconto passa do subtotal (${fmtMoeda(c.subtotal)}).`); return; }
    const novoTotal = arred(c.subtotal - calcularDesconto(c.subtotal, novo));
    if(novoTotal < (c.pago || 0) - 0.001){
      showToast(`Com esse desconto o total (${fmtMoeda(novoTotal)}) fica menor que o que já foi pago (${fmtMoeda(c.pago)}). Desfaça um pagamento antes.`);
      return;
    }
    const anterior = c.desconto;
    c.desconto = novo;
    document.getElementById('comandaDescontoValor').blur();
    if(!await salvarComandaAtual()){ c.desconto = anterior; recalcularComanda(c); renderItensComanda(); return; }
    renderFinanceiro();
    if(!comandaNova) showToast(novo ? `Desconto de ${textoDesconto(novo)} aplicado. Total: ${fmtMoeda(c.valor)}.` : 'Desconto removido.');
  }
  document.getElementById('btnComandaAplicarDesconto').addEventListener('click', aplicarDescontoComanda);
  document.getElementById('comandaDescontoValor').addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); aplicarDescontoComanda(); } });

  document.getElementById('comandaCliente').addEventListener('change', async (e) => {
    if(!comandaAtual) return;
    comandaAtual.cliente = e.target.value.trim() || comandaAtual.cliente;
    const p = (patients || []).find(x => semAcento(x.name) === semAcento(comandaAtual.cliente));
    if(p) comandaAtual.pacienteId = p.id;
    await salvarComandaAtual();
  });
  document.getElementById('comandaData').addEventListener('change', async (e) => {
    if(!comandaAtual || !e.target.value) return;
    comandaAtual.dataISO = e.target.value;
    await salvarComandaAtual();
  });
  document.getElementById('comandaItemNome').addEventListener('input', (e) => {
    const preco = precoDoServico(e.target.value);
    if(preco != null) document.getElementById('comandaItemValor').value = valorParaCampo(preco);
  });
  async function adicionarItemComanda(){
    const nomeEl = document.getElementById('comandaItemNome'), valEl = document.getElementById('comandaItemValor');
    const nome = nomeEl.value.trim();
    if(!nome){ nomeEl.focus(); return; }
    const preco = valEl.value.trim() ? lerValor(valEl.value) : (precoDoServico(nome) || 0);
    const ehServico = !pacoteDoNomeItem(nome) && precoDoServico(nome) != null; // pacote entra como item extra
    comandaAtual.itens.push({ nome, preco, origem: ehServico ? 'servico' : 'extra' });
    nomeEl.value = ''; valEl.value = '';
    await salvarComandaAtual();
    nomeEl.focus();
  }
  document.getElementById('btnComandaAddItem').addEventListener('click', adicionarItemComanda);
  ['comandaItemNome', 'comandaItemValor'].forEach(id => document.getElementById(id).addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); adicionarItemComanda(); }
  }));

  // Nova comanda: cria no banco e passa para o modo "ver/pagar".
  document.getElementById('btnComandaSalvar').addEventListener('click', async () => {
    const c = comandaAtual;
    if(!c || !comandaNova) return;
    c.cliente = document.getElementById('comandaCliente').value.trim();
    c.dataISO = document.getElementById('comandaData').value || hojeISO();
    if(!c.cliente){ showToast('Informe a cliente.'); document.getElementById('comandaCliente').focus(); return; }
    if(!c.itens.length){ showToast('Adicione pelo menos um item.'); document.getElementById('comandaItemNome').focus(); return; }
    const p = (patients || []).find(x => semAcento(x.name) === semAcento(c.cliente));
    if(p) c.pacienteId = p.id;
    c.codigo = proximoCodigoComanda();
    recalcularComanda(c);
    const btn = document.getElementById('btnComandaSalvar');
    btn.disabled = true;
    const salvo = await finInserir('comandas', comandaParaBanco(c));
    btn.disabled = false;
    if(!salvo) return;
    c.id = salvo.id;
    comandasData.unshift(c);
    comandaNova = false;
    montarJanelaComanda();
    renderComandas();
    showToast(`Comanda ${c.codigo} criada. Registre o pagamento quando receber.`);
  });

  // Registrar pagamento: vira uma receita no Controle Financeiro.
  document.getElementById('btnComandaPagar').addEventListener('click', async () => {
    const c = comandaAtual;
    if(!c) return;
    const valor = lerValor(document.getElementById('comandaPagValor').value);
    const forma = document.getElementById('comandaPagForma').value;
    const data = document.getElementById('comandaPagData').value || hojeISO();
    if(valor <= 0){ showToast('Informe o valor recebido.'); return; }
    if(valor > c.saldo + 0.001){ showToast(`O valor passa do saldo da comanda (${fmtMoeda(c.saldo)}).`); return; }
    if(!forma){ showToast('Escolha a forma de pagamento (cadastre em Formas de Pagamento).'); return; }
    const btn = document.getElementById('btnComandaPagar');
    btn.disabled = true;
    try{
      const mov = await finInserir('movimentos_financeiros', {
        data, descricao: `Comanda ${c.codigo} — ${c.cliente}`, categoria: 'Atendimento', valor, tipo: 'receita',
        pago: true, forma, comanda_id: ehIdDoBanco(c.id) ? c.id : null, moeda: moedaPreferidaAtual(),
      });
      if(!mov) return;
      const pag = { id: idLocal(), data, forma, valor, movimentoId: mov.id };
      c.pagamentos.push(pag);
      recalcularComanda(c);
      const ok = await finAtualizar('comandas', c.id, comandaParaBanco(c));
      if(!ok){ // desfaz para não ficar receita sem comanda
        c.pagamentos.pop(); recalcularComanda(c);
        await finApagar('movimentos_financeiros', mov.id);
        return;
      }
      controleData.unshift(movimentoDoBanco(mov));
      document.getElementById('comandaPagData').value = '';
      renderItensComanda();
      renderFinanceiro();
      showToast(c.status === 'Fechada' ? `Pagamento registrado — comanda ${c.codigo} fechada!` : `Pagamento registrado. Falta ${fmtMoeda(c.saldo)}.`);
    } finally { btn.disabled = false; }
  });

  async function desfazerPagamento(p){
    const c = comandaAtual;
    if(!c) return;
    if(!confirm(`Desfazer o pagamento de ${fmtMoeda(p.valor)} (${p.forma}, ${isoParaBR(p.data)})?\n\nEle também sai do Controle Financeiro.`)) return;
    if(p.movimentoId && !await finApagar('movimentos_financeiros', p.movimentoId)) return;
    c.pagamentos = c.pagamentos.filter(x => x !== p);
    recalcularComanda(c);
    await finAtualizar('comandas', c.id, comandaParaBanco(c));
    controleData = controleData.filter(m => m.id !== p.movimentoId);
    renderItensComanda();
    renderFinanceiro();
    showToast('Pagamento desfeito.');
  }

  document.getElementById('btnComandaExcluir').addEventListener('click', async () => {
    if(!comandaAtual || comandaNova) return;
    if(await apagarComanda(comandaAtual)) fecharComanda();
  });

  /* ---------- Comandas geradas automaticamente pela agenda ----------
     Agendou → cria comanda "Em Aberto" · editou → atualiza os serviços (se ainda em aberto)
     cancelou → comanda "Inativa" · excluiu/desmarcou → comanda apagada. */
  let avisoComandaSemTabela = false;
  function avisarComandaNaoSalva(error){
    console.warn('Comanda não salva:', error && error.message);
    if(avisoComandaSemTabela) return;
    avisoComandaSemTabela = true;
    showToast('Atendimento salvo, mas a comanda não foi criada (' + String(error && error.message || '').slice(0, 70) + '). Rode os arquivos SQL do Financeiro no Supabase.');
  }
  function itensDaComanda(servicoNome){
    return String(servicoNome || '').split(',').map(t => t.trim()).filter(Boolean).map(nome => ({ nome, preco: precoDoServico(nome) || 0, origem: 'servico' }));
  }
  function moedaDaComanda(){ return moedaPreferidaAtual(); }
  function proximoCodigoComanda(){
    const max = comandasData.reduce((m, c) => Math.max(m, parseInt(String(c.codigo || '').replace(/\D/g, ''), 10) || 0), 0);
    return '#' + String(max + 1).padStart(4, '0');
  }
  function comandaDoAgendamento(agendamentoId){
    return comandasData.find(c => c.agendamentoId != null && String(c.agendamentoId) === String(agendamentoId));
  }

  async function criarComandaDoAgendamento({ agendamentoId, key, pacienteId, cliente, servicoNome }){
    const nova = recalcularComanda({
      id: null, codigo: proximoCodigoComanda(), dataISO: key, cliente: cliente || 'Paciente sem nome',
      itens: itensDaComanda(servicoNome), pagamentos: [], status: 'Em Aberto',
      agendamentoId, pacienteId, moeda: moedaPreferidaAtual(),
    });
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const user = await getUsuarioLogado().catch(() => null);
      if(!user) return null;
      const { data, error } = await supabaseClient.from('comandas').insert({ ...comandaParaBanco(nova), profissional_id: user.id }).select().single();
      if(error){ avisarComandaNaoSalva(error); return null; }
      nova.id = data.id;
    } else {
      nova.id = idLocal();
    }
    comandasData.unshift(nova);
    renderComandas();
    return nova;
  }

  // Cria as comandas que faltam para os atendimentos que já estão na agenda
  // (marcados antes das comandas existirem, ou pelo link de agendamento).
  var comandasCarregadasOk = false, agendaCarregadaOk = false, garantindoComandas = null;
  function garantirComandasDaAgenda(){
    if(garantindoComandas) return garantindoComandas;
    garantindoComandas = (async () => {
      if(modoDemonstracao || !comandasCarregadasOk || !agendaCarregadaOk) return 0;
      const user = await getUsuarioLogado().catch(() => null);
      if(!user) return 0;
      const faltando = [];
      Object.keys(appointments).forEach(k => (appointments[k] || []).forEach(a => {
        if(a.type === 'appt' && isAgendamentoReal(a) && !comandaDoAgendamento(a.id)) faltando.push({ key: k, a });
      }));
      if(!faltando.length) return 0;
      faltando.sort((x, y) => (x.key + x.a.time).localeCompare(y.key + y.a.time));
      let proximo = parseInt(proximoCodigoComanda().replace(/\D/g, ''), 10);
      const novas = faltando.map(({ key, a }) => recalcularComanda({
        id: null, codigo: '#' + String(proximo++).padStart(4, '0'), dataISO: key, cliente: a.label || 'Paciente sem nome',
        itens: itensDaComanda(a.servico), pagamentos: [], status: 'Em Aberto', agendamentoId: a.id,
        pacienteId: a.pacienteId, moeda: moedaPreferidaAtual(),
      }));
      const { data, error } = await supabaseClient.from('comandas').insert(novas.map(c => ({ ...comandaParaBanco(c), profissional_id: user.id }))).select();
      if(error){
        console.warn('Comandas da agenda não criadas:', error.message);
        if(/duplicate|unique/i.test(error.message || '')) await loadComandasFromSupabase(); // outra aba já criou
        else avisarComandaNaoSalva(error);
        return 0;
      }
      (data || []).forEach(r => comandasData.push(comandaDoBanco(r)));
      renderComandas();
      showToast(`${novas.length} comanda${novas.length > 1 ? 's criadas' : ' criada'} para atendimentos que já estavam na agenda.`);
      return novas.length;
    })().catch(e => { console.warn('Comandas da agenda:', e); return 0; })
       .finally(() => { garantindoComandas = null; });
    return garantindoComandas;
  }

  // Atendimento editado: troca os serviços (mantém produtos/itens extras e pagamentos).
  async function atualizarComandaDoAgendamento(agendamentoId, { key, pacienteId, cliente, servicoNome }){
    const c = comandaDoAgendamento(agendamentoId);
    if(!c || c.status === 'Inativa') return;
    if(c.status === 'Fechada' && c.saldo <= 0){
      // comanda já paga: só acompanha data e cliente
      Object.assign(c, { dataISO: key, cliente, pacienteId });
    } else {
      const extras = c.itens.filter(i => i.origem === 'extra');
      Object.assign(c, { dataISO: key, cliente, pacienteId, itens: itensDaComanda(servicoNome).concat(extras) });
    }
    recalcularComanda(c);
    if(!modoDemonstracao && ehIdDoBanco(c.id)){
      const { error } = await supabaseClient.from('comandas').update(comandaParaBanco(c)).eq('id', c.id);
      if(error){ console.warn('Comanda não atualizada:', error.message); return; }
    }
    renderComandas();
  }

  async function inativarComandaDoAgendamento(agendamentoId){
    const c = comandaDoAgendamento(agendamentoId);
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const { error } = await supabaseClient.from('comandas').update({ status: 'Inativa' }).eq('agendamento_id', agendamentoId);
      if(error) console.warn('Comanda não inativada:', error.message);
    }
    if(c){ c.status = 'Inativa'; renderComandas(); }
  }

  async function apagarComandaDoAgendamento(agendamentoId){
    const c = comandaDoAgendamento(agendamentoId);
    if(c) return apagarComanda(c, true);
    if(!modoDemonstracao && isAgendamentoReal({ id: agendamentoId })){
      const { error } = await supabaseClient.from('comandas').delete().eq('agendamento_id', agendamentoId);
      if(error) console.warn('Comanda não apagada:', error.message);
    }
  }

  /* ---------- Helpers de data (Supabase 'YYYY-MM-DD' <-> exibição 'DD/MM/YYYY') ---------- */
  function dataDbParaExibicao(iso){
    if(!iso) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  async function getUsuarioLogado(){
    const { data: userData } = await supabaseClient.auth.getUser();
    return (userData && userData.user) ? userData.user : null;
  }

  /* ---------- Modo demonstração x conta real ----------
     Antes, se a checagem de login falhasse (sessão expirada ou internet oscilando), o app
     achava que estava no modo demonstração e salvava só na memória da tela — e o dado sumia
     ao recarregar. Agora o modo demonstração só existe quando a pessoa escolhe entrar nele. */
  var modoDemonstracao = false;

  // Devolve o usuário logado; se a sessão caiu numa conta real, avisa e devolve null.
  async function usuarioParaSalvar(){
    if(modoDemonstracao) return null;
    let user = null;
    try{ user = await getUsuarioLogado(); }catch(e){}
    if(!user){
      // sem resposta do servidor: tenta a sessão guardada no navegador
      try{
        const { data } = await supabaseClient.auth.getSession();
        if(data && data.session && data.session.user) user = data.session.user;
      }catch(e){}
    }
    if(!user) avisarSessaoExpirada();
    return user;
  }

  function avisarSessaoExpirada(){
    showToast('Sua sessão expirou e NADA foi salvo. Entre de novo na sua conta e repita a ação.');
    setTimeout(() => {
      if(confirm('Sua sessão expirou. Para não perder nada, é preciso entrar de novo. Ir para a tela de login agora?')){
        supabaseClient.auth.signOut().finally(() => {
          document.getElementById('appRoot').style.display = 'none';
          document.getElementById('authScreen').style.display = 'flex';
        });
      }
    }, 300);
  }

  /* ---------- Configurações que precisam sobreviver a recarregar a página ----------
     Expedientes, profissionais, categorias, pacotes e anotações/favoritos de ativos
     antes ficavam só na memória do navegador e sumiam ao recarregar ou trocar de versão.
     Agora são salvos na tabela "configuracoes_profissional" do Supabase (uma linha por
     tipo de configuração), com uma cópia de segurança no próprio navegador. */
  var avisoConfigSemTabela = false;
  function chaveLocalConfig(userId, chave){ return 'skinExpertCfg:' + userId + ':' + chave; }

  async function salvarConfig(chave, valor){
    if(modoDemonstracao) return true; // modo demonstração: não salva nada
    const user = await usuarioParaSalvar();
    if(!user) return false;
    try{ localStorage.setItem(chaveLocalConfig(user.id, chave), JSON.stringify(valor)); }catch(e){}
    const { error } = await supabaseClient.from('configuracoes_profissional').upsert({
      profissional_id: user.id, chave, valor, updated_at: new Date().toISOString(),
    }, { onConflict: 'profissional_id,chave' });
    if(error){
      console.warn('Não foi possível salvar "' + chave + '" no Supabase:', error.message);
      if(!avisoConfigSemTabela){
        avisoConfigSemTabela = true;
        showToast('Salvo só neste navegador. Crie a tabela configuracoes_profissional no Supabase para salvar na nuvem.');
      }
      return false;
    }
    return true;
  }

  async function lerConfig(chave){
    const user = await getUsuarioLogado();
    if(!user) return null;
    try{
      const { data, error } = await supabaseClient.from('configuracoes_profissional')
        .select('valor').eq('profissional_id', user.id).eq('chave', chave).maybeSingle();
      if(!error && data && data.valor != null) return data.valor;
    }catch(e){}
    try{
      const local = localStorage.getItem(chaveLocalConfig(user.id, chave));
      if(local) return JSON.parse(local);
    }catch(e){}
    return null;
  }

  function substituirConteudo(lista, novos){
    if(Array.isArray(novos)) lista.splice(0, lista.length, ...novos);
  }

  function anotacoesAtivosParaSalvar(){
    const mapa = {};
    ativosData.forEach(a => {
      if(a.favorito || (a.anotacao && a.anotacao.trim())) mapa[a.id] = { favorito: !!a.favorito, anotacao: a.anotacao || '' };
    });
    return mapa;
  }

  async function carregarConfiguracoesSalvas(){
    const user = await getUsuarioLogado();
    if(!user) return;
    const [exp, profs, cats, pacs, ativosNotas, lembs] = await Promise.all([
      lerConfig('expedientes'), lerConfig('profissionais'), lerConfig('categorias'),
      lerConfig('pacotes'), lerConfig('ativos_anotacoes'), lerConfig('lembretes'),
    ]);
    const tema = await lerConfig('tema');
    if(typeof tema === 'string' && tema) aplicarTema(tema);
    try{ await carregarAreasAtuacao(); }catch(e){ console.warn('Áreas de atuação:', e); }
    const [moedaSalva, formasSalvas, modelosSalvos, historicoSalvo] = await Promise.all([lerConfig('moeda'), lerConfig('formas_pagamento'), lerConfig('mensagens_modelos'), lerConfig('mensagens_historico')]);
    if(modelosSalvos && typeof modelosSalvos === 'object'){
      mensagensModelos = { textos: modelosSalvos.textos || {}, titulos: modelosSalvos.titulos || {}, extras: Array.isArray(modelosSalvos.extras) ? modelosSalvos.extras : [] };
    }
    if(Array.isArray(historicoSalvo)) mensagensHistorico = historicoSalvo;
    try{ renderCentroMensagens(); renderLembretes(); renderAniversariantes(); }catch(e){}
    if(typeof moedaSalva === 'string'){
      try{ localStorage.setItem('skinExpertMoeda', moedaSalva); }catch(e){}
      const selM = document.getElementById('cfgMoeda'); if(selM) selM.value = moedaSalva;
    }
    if(Array.isArray(formasSalvas) && formasSalvas.length) formasPagamento = formasSalvas.filter(f => f && f.nome).map(f => ({ nome: String(f.nome), ativa: f.ativa !== false }));
    const pais = await lerConfig('pais_atuacao');
    if(typeof pais === 'string' && pais){
      try{ localStorage.setItem('skinExpertPaisAtuacao', pais); }catch(e){}
      const sel = document.getElementById('cfgPaisAtuacao');
      if(sel) sel.value = pais;
      try{ renderCatalogo(); }catch(e){}
    }
    if(lembs && typeof lembs === 'object'){
      lembretesEstado.manuais = Array.isArray(lembs.manuais) ? lembs.manuais : [];
      lembretesEstado.dispensados = (lembs.dispensados && typeof lembs.dispensados === 'object') ? lembs.dispensados : {};
      try{ renderLembretes(); }catch(e){}
    }
    if(exp && exp.length){ substituirConteudo(expedientesData, exp); renderExpedientes(); }
    if(profs && profs.length){ substituirConteudo(profissionaisData, profs); atualizarProfissionalPrincipal(); renderProfissionais(); }
    if(cats && cats.length){ substituirConteudo(categoriasData, cats); renderCategorias(); renderServicos(); }
    if(pacs){ substituirConteudo(pacotesData, pacs); renderPacotes(); }
    if(ativosNotas && typeof ativosNotas === 'object'){
      ativosData.forEach(a => {
        const n = ativosNotas[a.id];
        if(n){ a.favorito = !!n.favorito; a.anotacao = n.anotacao || ''; }
      });
      try{ renderAll(); }catch(e){}
    }
    aplicarMoedaNoApp();
  }

  // Redesenha o que mostra dinheiro depois que a moeda muda (Financeiro, pacotes).
  function aplicarMoedaNoApp(){
    try{ renderFinanceiro(); }catch(e){ console.warn(e); }
    try{ renderPacotes(); }catch(e){}
  }

  /* ---------- Carrega Comandas do Supabase ---------- */
  async function loadComandasFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('comandas').select('*').eq('profissional_id', user.id).order('data', { ascending:false });
      // Conta real: nunca mostrar as comandas de exemplo ("Paciente Teste"), mesmo sem nenhuma comanda ainda.
      if(error){ console.warn('Comandas:', error.message); comandasData = []; renderComandas(); return; }
      comandasData = (data || []).map(comandaDoBanco);
      comandasCarregadasOk = true;
      renderComandas();
    } catch(e){ console.warn('Comandas:', e); }
  }

  /* ================= CONTROLE FINANCEIRO (livro-caixa) ================= */
  // Formato: { id, dataISO, descricao, categoria, valor (sempre positivo), tipo:'receita'|'despesa', pago, forma, comandaId, contaId }
  function movimentoDoBanco(m){
    return {
      id: m.id, dataISO: m.data ? String(m.data).slice(0, 10) : '', descricao: m.descricao || '—',
      categoria: m.categoria || 'Outros', valor: Math.abs(parseFloat(m.valor) || 0),
      tipo: m.tipo === 'despesa' ? 'despesa' : 'receita', pago: !!m.pago, forma: m.forma || '',
      comandaId: m.comanda_id || null, contaId: m.conta_id || null,
    };
  }
  function movimentoParaBanco(m){
    return { data: m.dataISO, descricao: m.descricao, categoria: m.categoria, valor: m.valor, tipo: m.tipo,
             pago: m.pago, forma: m.forma || null, moeda: moedaPreferidaAtual() };
  }
  let controleData = [
    { id: idLocal(), dataISO: '2026-08-13', descricao: 'Comanda #0001 — Paciente Teste 1', categoria: 'Atendimento', valor: 280, tipo: 'receita', pago: true, forma: 'Cartão de Crédito' },
    { id: idLocal(), dataISO: '2026-08-12', descricao: 'Comanda #0003 — Paciente Teste 3', categoria: 'Atendimento', valor: 420, tipo: 'receita', pago: true, forma: 'Pix' },
    { id: idLocal(), dataISO: '2026-08-11', descricao: 'Comanda #0004 — Paciente Teste 5', categoria: 'Atendimento', valor: 99.9, tipo: 'receita', pago: true, forma: 'Dinheiro' },
    { id: idLocal(), dataISO: '2026-08-10', descricao: 'Compra de insumos', categoria: 'Estoque / Insumos', valor: 320, tipo: 'despesa', pago: true, forma: 'Pix' },
    { id: idLocal(), dataISO: '2026-08-08', descricao: 'Assinatura Skin Expert Pro', categoria: 'Assinaturas', valor: 97, tipo: 'despesa', pago: true, forma: 'Cartão de Crédito' },
  ];

  function controleFiltrado(){
    const de = document.getElementById('controleDateFrom').value;
    const ate = document.getElementById('controleDateTo').value;
    const tipo = document.getElementById('controleFiltroTipo').value;
    const cat = document.getElementById('controleFiltroCategoria').value;
    const st = document.getElementById('controleFiltroStatus').value;
    return controleData.filter(m => {
      if(de && m.dataISO < de) return false;
      if(ate && m.dataISO > ate) return false;
      if(tipo && m.tipo !== tipo) return false;
      if(cat && m.categoria !== cat) return false;
      if(st === 'pago' && !m.pago) return false;
      if(st === 'pendente' && m.pago) return false;
      return true;
    }).sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
  }

  function renderControleFinanceiro(){
    const body = document.getElementById('controleBody');
    if(!body) return;
    // categorias do filtro (mantém a escolhida)
    const selCat = document.getElementById('controleFiltroCategoria');
    const escolhida = selCat.value;
    const cats = [...new Set(controleData.map(m => m.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    selCat.innerHTML = '<option value="">Categoria: Todas</option>' + cats.map(c => `<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    selCat.value = cats.includes(escolhida) ? escolhida : '';

    const lista = controleFiltrado();
    let receitas = 0, despesas = 0, pendentes = 0;
    lista.forEach(m => {
      if(!m.pago){ pendentes++; return; }
      if(m.tipo === 'receita') receitas += m.valor; else despesas += m.valor;
    });
    document.getElementById('sumReceitas').textContent = fmtMoeda(receitas);
    document.getElementById('sumDespesas').textContent = fmtMoeda(despesas);
    document.getElementById('sumSaldo').textContent = fmtMoeda(receitas - despesas);
    document.getElementById('sumPendentes').textContent = String(pendentes);
    document.getElementById('sumTransacoes').textContent = `de ${lista.length} lançamento${lista.length === 1 ? '' : 's'} no período`;

    body.innerHTML = '';
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="7" class="fin-vazio">${controleData.length ? 'Nenhum lançamento com esses filtros.' : 'Nenhum lançamento ainda. Pagamentos de comandas e contas pagas aparecem aqui — ou use "Novo Lançamento".'}</td></tr>`;
      return;
    }
    lista.forEach(m => {
      const tr = document.createElement('tr');
      const deComanda = !!m.comandaId, deConta = !!m.contaId;
      if(!deComanda && !deConta) tr.className = 'clicavel';
      tr.innerHTML = `
        <td>${isoParaBR(m.dataISO)}</td>
        <td>${escHTML(m.descricao)}${deComanda ? '<span class="fin-origem">comanda</span>' : deConta ? '<span class="fin-origem">conta</span>' : ''}</td>
        <td><span class="category-chip">${escHTML(m.categoria)}</span></td>
        <td>${escHTML(m.forma || '—')}</td>
        <td class="num"><span class="${m.tipo === 'receita' ? 'fin-valor-in' : 'fin-valor-out'}">${m.tipo === 'receita' ? '+ ' : '– '}${fmtMoeda(m.valor)}</span></td>
        <td>${m.pago ? '<span class="status-active">Pago</span>' : '<span class="pill pill-gray">Pendente</span>'}</td>
        <td><div class="fin-acoes"></div></td>`;
      const acoes = tr.querySelector('.fin-acoes');
      if(deComanda){
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fin-btn-mini'; b.textContent = 'Abrir comanda';
        b.addEventListener('click', (e) => { e.stopPropagation(); const c = comandasData.find(x => x.id === m.comandaId); if(c) abrirComanda(c); else showToast('Comanda não encontrada (pode ter sido apagada).'); });
        acoes.appendChild(b);
      } else if(deConta){
        acoes.innerHTML = '<span class="fin-dica" title="Altere na aba Contas a Pagar/Receber">pela aba Contas</span>';
      } else {
        const bPago = document.createElement('button'); bPago.type = 'button'; bPago.className = 'fin-btn-mini' + (m.pago ? '' : ' ok');
        bPago.textContent = m.pago ? 'Marcar pendente' : 'Marcar pago';
        bPago.addEventListener('click', async (e) => {
          e.stopPropagation();
          if(await finAtualizar('movimentos_financeiros', m.id, { pago: !m.pago })){ m.pago = !m.pago; renderControleFinanceiro(); }
        });
        const bDel = document.createElement('button'); bDel.type = 'button'; bDel.className = 'comanda-apagar'; bDel.title = 'Apagar lançamento';
        bDel.setAttribute('aria-label', 'Apagar lançamento'); bDel.innerHTML = ICONE_LIXEIRA;
        bDel.addEventListener('click', async (e) => {
          e.stopPropagation();
          if(!confirm(`Apagar o lançamento "${m.descricao}" (${fmtMoeda(m.valor)})?`)) return;
          if(await finApagar('movimentos_financeiros', m.id)){ controleData = controleData.filter(x => x !== m); renderControleFinanceiro(); showToast('Lançamento apagado.'); }
        });
        acoes.append(bPago, bDel);
        tr.addEventListener('click', () => abrirLancamento(m));
      }
      body.appendChild(tr);
    });
  }
  ['controleDateFrom', 'controleDateTo', 'controleFiltroTipo', 'controleFiltroCategoria', 'controleFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderControleFinanceiro);
  });

  /* ---------- Carrega Controle Financeiro do Supabase ---------- */
  async function loadMovimentosFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('movimentos_financeiros').select('*').eq('profissional_id', user.id).order('data', { ascending:false });
      // Conta real: nunca mostrar os lançamentos de exemplo.
      if(error){ console.warn('Controle financeiro:', error.message); controleData = []; renderControleFinanceiro(); return; }
      controleData = (data || []).map(movimentoDoBanco);
      renderControleFinanceiro();
    } catch(e){ console.warn('Controle financeiro:', e); }
  }

  document.getElementById('btnSalvarCsv').addEventListener('click', () => {
    const lista = controleFiltrado();
    if(!lista.length){ showToast('Nada para exportar com esses filtros.'); return; }
    const header = ['Data', 'Descrição', 'Categoria', 'Forma de pagamento', 'Tipo', `Valor (${simboloMoeda()})`, 'Situação'];
    const rows = lista.map(t => [
      isoParaBR(t.dataISO), t.descricao, t.categoria, t.forma || '', t.tipo === 'receita' ? 'Receita' : 'Despesa',
      (t.tipo === 'receita' ? '' : '-') + t.valor.toFixed(2).replace('.', ','), t.pago ? 'Pago' : 'Pendente',
    ]);
    const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'extrato-financeiro.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Extrato exportado em CSV!');
  });

  /* ---------- Novo lançamento / editar lançamento ---------- */
  const modalLancOverlay = document.getElementById('modalLancOverlay');
  let lancTipo = 'receita', lancEditando = null;
  function definirTipoLanc(tipo){
    lancTipo = tipo;
    document.querySelectorAll('#modalLancOverlay .fin-tipo-btn').forEach(b => {
      b.classList.toggle('ativo', b.dataset.tipo === tipo);
      b.setAttribute('aria-checked', b.dataset.tipo === tipo ? 'true' : 'false');
    });
  }
  document.querySelectorAll('#modalLancOverlay .fin-tipo-btn').forEach(b => b.addEventListener('click', () => definirTipoLanc(b.dataset.tipo)));
  function abrirLancamento(m){
    lancEditando = m || null;
    atualizarSugestoesFin();
    document.getElementById('modalLancTitle').textContent = m ? 'Editar Lançamento' : 'Novo Lançamento';
    definirTipoLanc(m ? m.tipo : 'receita');
    document.getElementById('lancDescricao').value = m ? m.descricao : '';
    document.getElementById('lancData').value = m ? m.dataISO : hojeISO();
    document.getElementById('lancValor').value = m ? valorParaCampo(m.valor) : '';
    document.getElementById('lancCategoria').value = m ? m.categoria : '';
    preencherSelectFormas(document.getElementById('lancForma'), m ? m.forma : '', 'Selecione');
    document.getElementById('lancPago').checked = m ? m.pago : true;
    modalLancOverlay.classList.add('open');
    setTimeout(() => { if(!modalLancOverlay.contains(document.activeElement)) document.getElementById('lancDescricao').focus(); }, 50);
  }
  function fecharLancamento(){ modalLancOverlay.classList.remove('open'); lancEditando = null; }
  document.getElementById('btnNovoLancamento').addEventListener('click', () => abrirLancamento(null));
  document.getElementById('modalLancCancel').addEventListener('click', fecharLancamento);
  modalLancOverlay.addEventListener('click', (e) => { if(e.target === modalLancOverlay) fecharLancamento(); });
  document.getElementById('modalLancConfirm').addEventListener('click', async () => {
    const m = {
      dataISO: document.getElementById('lancData').value || hojeISO(),
      descricao: document.getElementById('lancDescricao').value.trim(),
      categoria: document.getElementById('lancCategoria').value.trim() || 'Outros',
      valor: lerValor(document.getElementById('lancValor').value),
      tipo: lancTipo, pago: document.getElementById('lancPago').checked,
      forma: document.getElementById('lancForma').value,
    };
    if(!m.descricao){ showToast('Escreva uma descrição.'); document.getElementById('lancDescricao').focus(); return; }
    if(m.valor <= 0){ showToast('Informe o valor.'); document.getElementById('lancValor').focus(); return; }
    const btn = document.getElementById('modalLancConfirm');
    btn.disabled = true;
    try{
      if(lancEditando){
        if(!await finAtualizar('movimentos_financeiros', lancEditando.id, movimentoParaBanco(m))) return;
        Object.assign(lancEditando, m);
      } else {
        const salvo = await finInserir('movimentos_financeiros', movimentoParaBanco(m));
        if(!salvo) return;
        controleData.unshift(movimentoDoBanco({ ...salvo, data: m.dataISO }));
      }
    } finally { btn.disabled = false; }
    const editou = !!lancEditando;
    fecharLancamento();
    renderControleFinanceiro();
    showToast(editou ? 'Lançamento atualizado!' : (m.tipo === 'receita' ? 'Receita lançada!' : 'Despesa lançada!'));
  });

  /* ================= CONTAS A PAGAR / RECEBER ================= */
  // Formato: { id, vencISO, categoria, descricao, valor, tipo:'pagar'|'receber', forma, recorrencia:'Não'|'Mensal', pago, pagoEm }
  function contaDoBanco(c){
    return {
      id: c.id, vencISO: c.vencimento ? String(c.vencimento).slice(0, 10) : '', categoria: c.categoria || 'Outros',
      descricao: c.descricao || '—', valor: Math.abs(parseFloat(c.valor) || 0), tipo: c.tipo === 'receber' ? 'receber' : 'pagar',
      forma: c.forma && c.forma !== '—' ? c.forma : '', recorrencia: c.recorrencia === 'Mensal' ? 'Mensal' : 'Não',
      pago: !!c.pago, pagoEm: c.pago_em || null,
    };
  }
  function contaParaBanco(c){
    return { vencimento: c.vencISO, categoria: c.categoria, descricao: c.descricao, valor: c.valor, tipo: c.tipo,
             forma: c.forma || null, recorrencia: c.recorrencia, pago: c.pago, pago_em: c.pagoEm || null, moeda: moedaPreferidaAtual() };
  }
  let contasData = [
    { id: idLocal(), vencISO: '2026-08-15', categoria: 'Aluguel', descricao: 'Aluguel da sala', valor: 1200, tipo: 'pagar', forma: '', recorrencia: 'Mensal', pago: false },
    { id: idLocal(), vencISO: '2026-08-10', categoria: 'Estoque / Insumos', descricao: 'Compra de insumos', valor: 680, tipo: 'pagar', forma: 'Pix', recorrencia: 'Não', pago: true, pagoEm: '2026-08-10' },
    { id: idLocal(), vencISO: '2026-08-20', categoria: 'Atendimento', descricao: 'Pacote de 5 sessões — Paciente Teste 2 (2ª parcela)', valor: 250, tipo: 'receber', forma: 'Pix', recorrencia: 'Não', pago: false },
  ];

  function contasFiltradas(){
    const de = document.getElementById('contasDateFrom').value;
    const ate = document.getElementById('contasDateTo').value;
    const tipo = document.getElementById('contasFiltroTipo').value;
    const st = document.getElementById('contasFiltroStatus').value;
    return contasData.filter(c => {
      if(de && c.vencISO < de) return false;
      if(ate && c.vencISO > ate) return false;
      if(tipo && c.tipo !== tipo) return false;
      if(st === 'pago' && !c.pago) return false;
      if(st === 'pendente' && c.pago) return false;
      return true;
    }).sort((a, b) => {
      if(a.pago !== b.pago) return a.pago ? 1 : -1;                    // pendentes primeiro
      return a.pago ? (b.vencISO || '').localeCompare(a.vencISO || '')   // pagas: mais recentes
                    : (a.vencISO || '').localeCompare(b.vencISO || ''); // pendentes: vencimento mais próximo
    });
  }

  function renderContas(){
    const body = document.getElementById('contasBody');
    if(!body) return;
    const lista = contasFiltradas();
    let aPagar = 0, pagas = 0, aReceber = 0, recebidas = 0;
    lista.forEach(c => {
      if(c.tipo === 'pagar'){ if(c.pago) pagas += c.valor; else aPagar += c.valor; }
      else { if(c.pago) recebidas += c.valor; else aReceber += c.valor; }
    });
    document.getElementById('sumContasPagar').textContent = fmtMoeda(aPagar);
    document.getElementById('sumContasPagas').textContent = fmtMoeda(pagas);
    document.getElementById('sumContasReceber').textContent = fmtMoeda(aReceber);
    document.getElementById('sumContasRecebidas').textContent = fmtMoeda(recebidas);

    body.innerHTML = '';
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="9" class="fin-vazio">${contasData.length ? 'Nenhuma conta com esses filtros.' : 'Nenhuma conta ainda. Use os botões acima para adicionar contas a pagar ou a receber.'}</td></tr>`;
      return;
    }
    const hoje = hojeISO();
    lista.forEach(c => {
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      const vencida = !c.pago && c.vencISO && c.vencISO < hoje;
      const situacao = c.pago
        ? `<span class="status-active">${c.tipo === 'pagar' ? 'Paga' : 'Recebida'}</span>`
        : vencida ? '<span class="pill" style="background:#fbe9e4;color:var(--block-red);">Vencida</span>' : '<span class="pill pill-gray">Pendente</span>';
      tr.innerHTML = `
        <td>${isoParaBR(c.vencISO)}</td>
        <td>${c.tipo === 'pagar' ? 'A pagar' : 'A receber'}</td>
        <td><span class="category-chip">${escHTML(c.categoria)}</span></td>
        <td>${escHTML(c.descricao)}</td>
        <td class="num"><span class="${c.tipo === 'receber' ? 'fin-valor-in' : 'fin-valor-out'}">${c.tipo === 'receber' ? '+ ' : '– '}${fmtMoeda(c.valor)}</span></td>
        <td>${escHTML(c.forma || '—')}</td>
        <td>${c.recorrencia === 'Mensal' ? 'Mensal' : 'Não'}</td>
        <td>${situacao}</td>
        <td><div class="fin-acoes"></div></td>`;
      const acoes = tr.querySelector('.fin-acoes');
      const bPago = document.createElement('button'); bPago.type = 'button'; bPago.className = 'fin-btn-mini' + (c.pago ? '' : ' ok');
      bPago.textContent = c.pago ? 'Desfazer' : (c.tipo === 'pagar' ? 'Marcar paga' : 'Marcar recebida');
      bPago.addEventListener('click', (e) => { e.stopPropagation(); c.pago ? desmarcarContaPaga(c) : marcarContaPaga(c); });
      const bDel = document.createElement('button'); bDel.type = 'button'; bDel.className = 'comanda-apagar'; bDel.title = 'Apagar conta';
      bDel.setAttribute('aria-label', 'Apagar conta'); bDel.innerHTML = ICONE_LIXEIRA;
      bDel.addEventListener('click', (e) => { e.stopPropagation(); apagarConta(c); });
      acoes.append(bPago, bDel);
      tr.addEventListener('click', () => openContaModal(c.tipo, c));
      body.appendChild(tr);
    });
  }
  ['contasDateFrom', 'contasDateTo', 'contasFiltroTipo', 'contasFiltroStatus'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderContas);
  });

  /* ---------- Carrega Contas a Pagar/Receber do Supabase ---------- */
  async function loadContasFromSupabase(){
    try{
      const user = await getUsuarioLogado();
      if(!user) return;
      const { data, error } = await supabaseClient.from('contas_financeiras').select('*').eq('profissional_id', user.id).order('vencimento', { ascending:false });
      // Conta real: nunca mostrar as contas de exemplo.
      if(error){ console.warn('Contas:', error.message); contasData = []; renderContas(); return; }
      contasData = (data || []).map(contaDoBanco);
      renderContas();
    } catch(e){ console.warn('Contas:', e); }
  }

  // Conta paga/recebida: vira lançamento no Controle Financeiro; se for mensal, cria a do mês seguinte.
  async function marcarContaPaga(c, jaSalva){
    const forma = c.forma || formasAtivas()[0] || '';
    const hoje = hojeISO();
    const mov = await finInserir('movimentos_financeiros', {
      data: hoje, descricao: c.descricao, categoria: c.categoria, valor: c.valor,
      tipo: c.tipo === 'receber' ? 'receita' : 'despesa', pago: true, forma: forma || null,
      conta_id: ehIdDoBanco(c.id) ? c.id : null, moeda: moedaPreferidaAtual(),
    });
    if(!mov) return false;
    const antes = { pago: c.pago, pagoEm: c.pagoEm, forma: c.forma };
    Object.assign(c, { pago: true, pagoEm: hoje, forma });
    if(!await finAtualizar('contas_financeiras', c.id, { pago: true, pago_em: hoje, forma: forma || null })){
      Object.assign(c, antes);
      await finApagar('movimentos_financeiros', mov.id);
      return false;
    }
    controleData.unshift(movimentoDoBanco({ ...mov, conta_id: mov.conta_id || c.id }));
    let proxima = null;
    if(c.recorrencia === 'Mensal' && c.vencISO){
      const venc = addMesISO(c.vencISO);
      const existe = contasData.some(x => x !== c && x.descricao === c.descricao && x.tipo === c.tipo && x.vencISO === venc);
      if(!existe){
        const nova = { ...c, id: null, vencISO: venc, pago: false, pagoEm: null };
        const salvo = await finInserir('contas_financeiras', contaParaBanco(nova));
        if(salvo){ nova.id = salvo.id; contasData.push(nova); proxima = nova; }
      }
    }
    renderFinanceiro();
    if(!jaSalva) showToast((c.tipo === 'pagar' ? 'Conta paga' : 'Conta recebida') + ' e lançada no Controle Financeiro.' + (proxima ? ` Próxima: ${isoParaBR(proxima.vencISO)}.` : ''));
    return true;
  }
  async function desmarcarContaPaga(c){
    const movs = controleData.filter(m => m.contaId && m.contaId === c.id);
    for(const m of movs){ if(!await finApagar('movimentos_financeiros', m.id)) return; }
    if(!await finAtualizar('contas_financeiras', c.id, { pago: false, pago_em: null })) return;
    c.pago = false; c.pagoEm = null;
    controleData = controleData.filter(m => !movs.includes(m));
    renderFinanceiro();
    showToast('Conta voltou para pendente (saiu do Controle Financeiro).');
  }
  async function apagarConta(c){
    if(!confirm(`Apagar a conta "${c.descricao}" (${fmtMoeda(c.valor)}, vence ${isoParaBR(c.vencISO)})?` + (c.pago ? '\n\nO lançamento dela no Controle Financeiro também será apagado.' : ''))) return;
    const movs = controleData.filter(m => m.contaId && m.contaId === c.id);
    for(const m of movs){ if(!await finApagar('movimentos_financeiros', m.id)) return; }
    if(!await finApagar('contas_financeiras', c.id)) return;
    contasData = contasData.filter(x => x !== c);
    controleData = controleData.filter(m => !movs.includes(m));
    renderFinanceiro();
    showToast('Conta apagada.');
  }

  const modalContaOverlay = document.getElementById('modalContaOverlay');
  const modalContaTitle = document.getElementById('modalContaTitle');
  let contaTipoAtual = 'receber', contaEditando = null;

  function openContaModal(tipo, conta){
    contaTipoAtual = tipo; contaEditando = conta || null;
    atualizarSugestoesFin();
    modalContaTitle.textContent = conta ? (tipo === 'receber' ? 'Editar Conta a Receber' : 'Editar Conta a Pagar')
                                        : (tipo === 'receber' ? 'Adicionar Conta a Receber' : 'Adicionar Conta a Pagar');
    document.getElementById('contaData').value = conta ? conta.vencISO : hojeISO();
    document.getElementById('contaDescricao').value = conta ? conta.descricao : '';
    preencherSelectFormas(document.getElementById('contaFormaPagamento'), conta ? conta.forma : '', 'Selecione');
    document.getElementById('contaCategoria').value = conta ? conta.categoria : '';
    document.getElementById('contaValor').value = conta ? valorParaCampo(conta.valor) : '';
    document.getElementById('contaRecorrencia').value = conta ? conta.recorrencia : 'Não';
    const jaPago = document.getElementById('contaJaPago');
    jaPago.checked = conta ? conta.pago : false;
    jaPago.disabled = !!conta; // em contas já salvas, use "Marcar paga"/"Desfazer" na lista
    document.getElementById('contaJaPagoLabel').textContent = tipo === 'receber' ? 'Já foi recebida' : 'Já está paga';
    modalContaOverlay.classList.add('open');
    setTimeout(() => { if(!modalContaOverlay.contains(document.activeElement)) document.getElementById('contaDescricao').focus(); }, 50);
  }
  function closeContaModal(){ modalContaOverlay.classList.remove('open'); contaEditando = null; }

  document.getElementById('btnAddContaReceber').addEventListener('click', () => openContaModal('receber'));
  document.getElementById('btnAddContaPagar').addEventListener('click', () => openContaModal('pagar'));
  ['btnAddContaReceber', 'btnAddContaPagar'].forEach(id => document.getElementById(id).addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.currentTarget.click(); }
  }));
  document.getElementById('modalContaCancel').addEventListener('click', closeContaModal);
  modalContaOverlay.addEventListener('click', (e) => { if(e.target === modalContaOverlay) closeContaModal(); });

  document.getElementById('modalContaConfirm').addEventListener('click', async () => {
    const dados = {
      vencISO: document.getElementById('contaData').value,
      descricao: document.getElementById('contaDescricao').value.trim(),
      valor: lerValor(document.getElementById('contaValor').value),
      categoria: document.getElementById('contaCategoria').value.trim() || 'Outros',
      forma: document.getElementById('contaFormaPagamento').value,
      recorrencia: document.getElementById('contaRecorrencia').value,
      tipo: contaTipoAtual,
    };
    const jaPago = document.getElementById('contaJaPago').checked;
    if(!dados.descricao){ showToast('Escreva uma descrição.'); document.getElementById('contaDescricao').focus(); return; }
    if(!dados.vencISO){ showToast('Informe o vencimento.'); return; }
    if(dados.valor <= 0){ showToast('Informe o valor.'); document.getElementById('contaValor').focus(); return; }
    const btn = document.getElementById('modalContaConfirm');
    btn.disabled = true;
    try{
      if(contaEditando){
        const c = contaEditando;
        const novo = { ...c, ...dados };
        if(!await finAtualizar('contas_financeiras', c.id, contaParaBanco(novo))) return;
        Object.assign(c, dados);
        // conta já paga: o lançamento acompanha a edição
        for(const m of controleData.filter(x => x.contaId && x.contaId === c.id)){
          const alt = { descricao: c.descricao, categoria: c.categoria, valor: c.valor, forma: c.forma || null, tipo: c.tipo === 'receber' ? 'receita' : 'despesa' };
          if(await finAtualizar('movimentos_financeiros', m.id, alt)) Object.assign(m, alt, { forma: c.forma || '' });
        }
        closeContaModal();
        renderFinanceiro();
        showToast('Conta atualizada!');
        return;
      }
      const nova = { ...dados, id: null, pago: false, pagoEm: null };
      const salvo = await finInserir('contas_financeiras', contaParaBanco(nova));
      if(!salvo) return;
      nova.id = salvo.id;
      contasData.push(nova);
      closeContaModal();
      if(jaPago) await marcarContaPaga(nova, true);
      renderFinanceiro();
      showToast((contaTipoAtual === 'receber' ? 'Conta a receber adicionada' : 'Conta a pagar adicionada') + (jaPago ? ' e lançada no Controle Financeiro.' : '!'));
    } finally { btn.disabled = false; }
  });

  /* ---------- Redesenha tudo do Financeiro (ex.: quando a moeda muda) ---------- */
  function renderFinanceiro(){
    document.querySelectorAll('.fin-moeda-simbolo').forEach(el => { el.textContent = simboloMoeda(); });
    renderComandas();
    renderControleFinanceiro();
    renderContas();
    renderFormas();
  }
  renderFinanceiro();

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(modalComandaOverlay.classList.contains('open')) fecharComanda();
    else if(modalLancOverlay.classList.contains('open')) fecharLancamento();
    else if(modalContaOverlay.classList.contains('open')) closeContaModal();
  });

  /* ================= EQUIPE MODULE ================= */
  document.querySelectorAll('#view-equipe .fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if(tab.dataset.eqsoon){ showToast('Esta funcionalidade estará disponível em breve'); return; }
      document.querySelectorAll('#view-equipe .fin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('#view-equipe .fin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('eqpanel-' + tab.dataset.eqtab);
      if(panel) panel.classList.add('active');
      else document.getElementById('eqpanel-placeholder').classList.add('active');
    });
  });

  /* ---------- Profissionais ---------- */
  const profissionaisData = [
    { nome:'—', perfil:'Administrador', categoria:'Estética', descricao:'—', ativado:true, principal:true },
  ];

  function renderProfissionais(){
    const body = document.getElementById('profissionaisBody');
    body.innerHTML = '';
    profissionaisData.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${p.nome}</td>
        <td><span class="access-profile-chip">${p.perfil}</span></td>
        <td>${p.categoria || '—'}</td>
        <td>${p.descricao || '—'}</td>
        <td>${p.ativado ? '<span class="status-active">Ativo</span>' : '<span class="pill pill-gray">Inativo</span>'}</td>
      `;
      body.appendChild(tr);
    });
  }
  renderProfissionais();

  // A primeira linha da lista de Profissionais representa quem está logada — atualiza
  // com o nome/título reais assim que Meus Dados Profissionais é carregado (real ou demo).
  function atualizarProfissionalPrincipal(){
    const principal = profissionaisData.find(p => p.principal);
    if(!principal) return;
    principal.nome = perfilProfissional.nome || '—';
    principal.descricao = perfilProfissional.titulo || '—';
    renderProfissionais();
  }

  const modalProfissionalOverlay = document.getElementById('modalProfissionalOverlay');
  document.getElementById('btnNovoProfissional').addEventListener('click', () => {
    document.getElementById('profNome').value = '';
    document.getElementById('profCelular').value = '';
    document.getElementById('profEmail').value = '';
    document.getElementById('profPerfil').value = 'Administrador';
    document.getElementById('profCategoria').value = '';
    document.getElementById('profAtivado').checked = true;
    modalProfissionalOverlay.classList.add('open');
  });
  document.getElementById('modalProfissionalCancel').addEventListener('click', () => modalProfissionalOverlay.classList.remove('open'));
  modalProfissionalOverlay.addEventListener('click', (e) => { if(e.target === modalProfissionalOverlay) modalProfissionalOverlay.classList.remove('open'); });
  document.getElementById('modalProfissionalConfirm').addEventListener('click', () => {
    const nome = document.getElementById('profNome').value.trim();
    if(!nome){ showToast('Informe o nome do profissional'); return; }
    profissionaisData.push({
      nome,
      perfil: document.getElementById('profPerfil').value,
      categoria: document.getElementById('profCategoria').value.trim(),
      descricao: '—',
      ativado: document.getElementById('profAtivado').checked,
    });
    renderProfissionais();
    modalProfissionalOverlay.classList.remove('open');
    showToast('Profissional adicionado com sucesso!');
    salvarConfig('profissionais', profissionaisData);
  });

  /* ---------- Serviços ---------- */
  const moedaSimbolos = { BRL: 'R$', USD: '$', EUR: '€' };
  function formatServicoPreco(preco, moeda){
    return `${moedaSimbolos[moeda] || 'R$'} ${Number(preco).toFixed(2).replace('.', ',')}`;
  }

  let servicosData = [
    { nome:'Limpeza de Pele Profunda', categoria:'Estética', preco:150.00, moeda:'BRL', duracao:'1h' },
    { nome:'Drenagem Linfática', categoria:'Estética', preco:120.00, moeda:'BRL', duracao:'45 min' },
    { nome:'Massagem Relaxante', categoria:'Estética', preco:130.00, moeda:'BRL', duracao:'1h' },
    { nome:'Peeling de Diamante', categoria:'Estética', preco:180.00, moeda:'BRL', duracao:'45 min' },
  ];
  let editingServicoIndex = -1;

  async function loadServicos(){
    const { data: userData } = await supabaseClient.auth.getUser();
    if(!userData || !userData.user) return; // segue com o seed local (modo demonstração)
    const { data, error } = await supabaseClient
      .from('servicos')
      .select('*')
      .eq('profissional_id', userData.user.id)
      .order('created_at', { ascending: true });
    if(error) return;
    if(data && data.length > 0){
      servicosData = data.map(s => ({ id: s.id, nome: s.nome, categoria: s.categoria, moeda: s.moeda, preco: parseFloat(s.preco), duracao: s.duracao }));
      renderServicos();
    }
  }

  function renderServicos(){
    const body = document.getElementById('servicosBody');
    body.innerHTML = '';
    garantirCategoriasDosServicos();
    atualizarFiltroCategoriaServicos();
    const busca = semAcento(document.getElementById('servicosBusca').value.trim());
    const cat = document.getElementById('servicosFiltroCategoria').value;
    const lista = servicosData.filter(s =>
      (!busca || semAcento(s.nome).includes(busca)) &&
      (!cat || semAcento(s.categoria) === semAcento(cat)));
    try{ renderPacotes(); }catch(e){} // preço dos pacotes acompanha o dos serviços
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="5" class="fin-vazio">${servicosData.length ? 'Nenhum serviço com esses filtros.' : 'Nenhum serviço cadastrado. Use "Novo Serviço".'}</td></tr>`;
      return;
    }
    lista.forEach(s => {
      const idx = servicosData.indexOf(s);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(s.nome)}</td>
        <td><span class="category-chip">${escHTML(s.categoria || 'Geral')}</span></td>
        <td>${formatServicoPreco(s.preco, s.moeda)}</td>
        <td>${escHTML(s.duracao || '—')}</td>
        <td>
          <button class="icon-btn" title="Editar" data-edit-servico="${idx}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
          </button>
        </td>
      `;
      tr.querySelector('[data-edit-servico]').addEventListener('click', () => openServicoModal(idx));
      body.appendChild(tr);
    });
  }
  document.getElementById('servicosBusca').addEventListener('input', renderServicos);
  document.getElementById('servicosFiltroCategoria').addEventListener('change', renderServicos);
  // (renderServicos inicial roda depois que as categorias existem — ver abaixo)
  // (loadServicos roda no enterApp, depois do login — aqui só duplicava o carregamento)

  const modalServicoOverlay = document.getElementById('modalServicoOverlay');
  const modalServicoTitleEl = document.getElementById('modalServicoTitle');

  const seletorDuracaoServico = criarSeletorDuracao('servDurPicker', 'servDuracao', 'texto');
  seletorDuracaoServico.definir(60);

  function openServicoModal(idx){
    editingServicoIndex = idx;
    if(idx >= 0){
      const s = servicosData[idx];
      modalServicoTitleEl.textContent = 'Editar Serviço';
      document.getElementById('servNome').value = s.nome;
      preencherSelectCategoriaServico(s.categoria);
      // A moeda segue o país de atuação definido em Configurações.
      const moedaPadrao = moedaPreferidaAtual();
      document.getElementById('servMoeda').value = moedaPadrao;
      const avisoMoeda = document.getElementById('servMoedaAviso');
      if(s.moeda && s.moeda !== moedaPadrao){
        avisoMoeda.textContent = `Este serviço estava em ${moedaSimbolos[s.moeda] || s.moeda}. Ao salvar, ele passa para ${moedaSimbolos[moedaPadrao]} (a moeda das suas Configurações) — confira o preço.`;
        avisoMoeda.style.display = 'block';
      } else {
        avisoMoeda.style.display = 'none';
      }
      document.getElementById('servPreco').value = String(s.preco).replace('.', ',');
      seletorDuracaoServico.definir(duracaoServicoParaMinutos(s.duracao) || 60);
    } else {
      modalServicoTitleEl.textContent = 'Novo Serviço';
      document.getElementById('servNome').value = '';
      preencherSelectCategoriaServico(document.getElementById('servicosFiltroCategoria').value || '');
      document.getElementById('servMoeda').value = moedaPreferidaAtual();
      document.getElementById('servMoedaAviso').style.display = 'none';
      document.getElementById('servPreco').value = '';
      seletorDuracaoServico.definir(60);
    }
    modalServicoOverlay.classList.add('open');
  }

  document.getElementById('btnNovoServico').addEventListener('click', () => openServicoModal(-1));
  document.getElementById('modalServicoCancel').addEventListener('click', () => modalServicoOverlay.classList.remove('open'));
  modalServicoOverlay.addEventListener('click', (e) => { if(e.target === modalServicoOverlay) modalServicoOverlay.classList.remove('open'); });
  document.getElementById('modalServicoConfirm').addEventListener('click', async () => {
    const nome = document.getElementById('servNome').value.trim();
    if(!nome){ showToast('Informe o nome do serviço'); return; }
    const precoRaw = document.getElementById('servPreco').value.replace(/[^\d,]/g,'').replace(',','.');
    const dadosServico = {
      nome,
      categoria: (document.getElementById('servCategoria').value || '').trim() || 'Geral',
      moeda: document.getElementById('servMoeda').value,
      preco: parseFloat(precoRaw) || 0,
      duracao: document.getElementById('servDuracao').value,
    };

    const usuarioReal = await usuarioParaSalvar();
    if(!usuarioReal && !modoDemonstracao) return; // sessão caiu: não salva só na tela

    if(editingServicoIndex >= 0){
      const existente = servicosData[editingServicoIndex];
      if(usuarioReal && existente.id){
        const { error } = await supabaseClient.from('servicos').update(dadosServico).eq('id', existente.id);
        if(error){ showToast('Erro ao salvar: ' + error.message); return; }
        dadosServico.id = existente.id;
      }
      servicosData[editingServicoIndex] = dadosServico;
      showToast('Serviço atualizado com sucesso!');
    } else {
      if(usuarioReal){
        const payload = { ...dadosServico, profissional_id: usuarioReal.id };
        const { data, error } = await supabaseClient.from('servicos').insert(payload).select().single();
        if(error){ showToast('Erro ao salvar: ' + error.message); return; }
        dadosServico.id = data.id;
      }
      servicosData.push(dadosServico);
      showToast('Serviço adicionado com sucesso!');
    }
    renderServicos();
    renderCategorias(); // atualiza a contagem de serviços por categoria
    modalServicoOverlay.classList.remove('open');
  });

  /* ---------- Categorias ---------- */
  const categoriasData = [
    { nome:'Estética', tipo:'Serviço', profissionais:'', ativado:true },
    { nome:'Produtos de Revenda', tipo:'Produto', profissionais:'', ativado:true },
  ];
  const mesmaCategoria = (a, b) => semAcento(String(a || '').trim()) === semAcento(String(b || '').trim());
  function servicosDaCategoria(nome){ return servicosData.filter(s => mesmaCategoria(s.categoria, nome)); }

  // Categoria usada por algum serviço mas que não está na lista (ex.: criada antes) entra sozinha.
  function garantirCategoriasDosServicos(){
    servicosData.forEach(s => {
      const nome = String(s.categoria || '').trim();
      if(nome && !categoriasData.some(c => mesmaCategoria(c.nome, nome))){
        categoriasData.push({ nome, tipo: 'Serviço', profissionais: '', ativado: true });
      }
    });
  }
  function atualizarFiltroCategoriaServicos(){
    const sel = document.getElementById('servicosFiltroCategoria');
    const atual = sel.value;
    const nomes = categoriasData.filter(c => c.tipo !== 'Produto').map(c => c.nome).sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Categoria: Todas</option>' + nomes.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('');
    sel.value = nomes.some(n => n === atual) ? atual : '';
  }
  function preencherSelectCategoriaServico(atual){
    garantirCategoriasDosServicos();
    const sel = document.getElementById('servCategoria');
    const ativas = categoriasData.filter(c => c.tipo !== 'Produto' && (c.ativado || mesmaCategoria(c.nome, atual))).map(c => c.nome);
    if(atual && !ativas.some(n => mesmaCategoria(n, atual))) ativas.push(atual);
    ativas.sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Selecione a categoria</option>' +
      ativas.map(n => `<option value="${escHTML(n)}">${escHTML(n)}</option>`).join('') +
      '<option value="__nova__">+ Nova categoria…</option>';
    const achada = ativas.find(n => mesmaCategoria(n, atual));
    sel.value = achada || '';
    sel.dataset.anterior = sel.value;
  }
  document.getElementById('servCategoria').addEventListener('change', (e) => {
    const sel = e.target;
    if(sel.value !== '__nova__'){ sel.dataset.anterior = sel.value; return; }
    const nome = (prompt('Nome da nova categoria:') || '').trim();
    if(!nome){ sel.value = sel.dataset.anterior || ''; return; }
    const existente = categoriasData.find(c => mesmaCategoria(c.nome, nome));
    if(existente){ existente.ativado = true; }
    else { categoriasData.push({ nome, tipo: 'Serviço', profissionais: '', ativado: true }); }
    salvarConfig('categorias', categoriasData);
    renderCategorias();
    preencherSelectCategoriaServico(existente ? existente.nome : nome);
    showToast(existente ? `A categoria "${existente.nome}" já existia e foi selecionada.` : `Categoria "${nome}" criada.`);
  });

  function renderCategorias(){
    const body = document.getElementById('categoriasBody');
    body.innerHTML = '';
    garantirCategoriasDosServicos();
    const busca = semAcento(document.getElementById('categoriasBusca').value.trim());
    const lista = categoriasData.filter(c => !busca || semAcento(c.nome).includes(busca));
    if(!lista.length){
      body.innerHTML = `<tr><td colspan="5" class="fin-vazio">${categoriasData.length ? 'Nenhuma categoria com esse nome.' : 'Nenhuma categoria. Use "Nova Categoria".'}</td></tr>`;
      return;
    }
    lista.forEach(c => {
      const qtd = c.tipo === 'Produto' ? null : servicosDaCategoria(c.nome).length;
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(c.nome)}</td>
        <td><span class="category-chip">${escHTML(c.tipo)}</span></td>
        <td>${qtd == null ? '—' : qtd + (qtd === 1 ? ' serviço' : ' serviços')}</td>
        <td>${c.ativado ? '<span class="status-active">Ativa</span>' : '<span class="pill pill-gray">Inativa</span>'}</td>
        <td><div class="fin-acoes">
          <button type="button" class="fin-btn-mini">${c.ativado ? 'Desativar' : 'Ativar'}</button>
          <button type="button" class="comanda-apagar" title="Apagar categoria" aria-label="Apagar categoria ${escHTML(c.nome)}">${ICONE_LIXEIRA}</button>
        </div></td>
      `;
      const [bAtivar, bApagar] = tr.querySelectorAll('button');
      bAtivar.addEventListener('click', (e) => {
        e.stopPropagation();
        c.ativado = !c.ativado;
        salvarConfig('categorias', categoriasData);
        renderCategorias();
        showToast(c.ativado ? `Categoria "${c.nome}" ativada.` : `Categoria "${c.nome}" desativada — ela some do cadastro de serviços, mas os serviços dela continuam.`);
      });
      bApagar.addEventListener('click', (e) => { e.stopPropagation(); apagarCategoria(c); });
      tr.addEventListener('click', () => abrirCategoria(c));
      body.appendChild(tr);
    });
  }
  document.getElementById('categoriasBusca').addEventListener('input', renderCategorias);

  // Troca a categoria de vários serviços de uma vez (no banco e na tela).
  async function trocarCategoriaDosServicos(de, para){
    const afetados = servicosDaCategoria(de);
    if(!afetados.length) return true;
    if(!modoDemonstracao){
      const user = await usuarioParaSalvar();
      if(!user) return false;
      for(const sv of afetados){
        if(!sv.id) continue;
        const { error } = await supabaseClient.from('servicos').update({ categoria: para }).eq('id', sv.id);
        if(error){ showToast('Não foi possível atualizar o serviço "' + sv.nome + '": ' + error.message); return false; }
      }
    }
    afetados.forEach(sv => { sv.categoria = para; });
    return true;
  }

  async function apagarCategoria(c){
    const usados = c.tipo === 'Produto' ? [] : servicosDaCategoria(c.nome);
    const msg = usados.length
      ? `Apagar a categoria "${c.nome}"?\n\n${usados.length} serviço(s) usam esta categoria e vão para "Geral".`
      : `Apagar a categoria "${c.nome}"?`;
    if(!confirm(msg)) return;
    if(usados.length && !await trocarCategoriaDosServicos(c.nome, 'Geral')) return;
    const i = categoriasData.indexOf(c);
    if(i !== -1) categoriasData.splice(i, 1);
    salvarConfig('categorias', categoriasData);
    renderCategorias();
    renderServicos();
    showToast(`Categoria "${c.nome}" apagada.`);
  }

  const modalCategoriaOverlay = document.getElementById('modalCategoriaOverlay');
  let categoriaEditando = null;
  function abrirCategoria(c){
    categoriaEditando = c || null;
    document.getElementById('modalCategoriaTitle').textContent = c ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('catNome').value = c ? c.nome : '';
    document.getElementById('catTipo').value = c ? c.tipo : 'Serviço';
    document.getElementById('catProfissionais').value = c ? (c.profissionais || '') : '';
    document.getElementById('catAtivado').checked = c ? !!c.ativado : true;
    modalCategoriaOverlay.classList.add('open');
    setTimeout(() => { if(!modalCategoriaOverlay.contains(document.activeElement)) document.getElementById('catNome').focus(); }, 50);
  }
  function fecharCategoria(){ modalCategoriaOverlay.classList.remove('open'); categoriaEditando = null; }
  document.getElementById('btnNovaCategoria').addEventListener('click', () => abrirCategoria(null));
  document.getElementById('modalCategoriaCancel').addEventListener('click', fecharCategoria);
  modalCategoriaOverlay.addEventListener('click', (e) => { if(e.target === modalCategoriaOverlay) fecharCategoria(); });
  document.getElementById('catNome').addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('modalCategoriaConfirm').click(); });
  document.getElementById('modalCategoriaConfirm').addEventListener('click', async () => {
    const nome = document.getElementById('catNome').value.trim();
    if(!nome){ showToast('Informe o nome da categoria'); return; }
    const duplicada = categoriasData.find(c => c !== categoriaEditando && mesmaCategoria(c.nome, nome));
    if(duplicada){ showToast(`Já existe a categoria "${duplicada.nome}".`); return; }
    const dados = {
      nome,
      tipo: document.getElementById('catTipo').value,
      profissionais: document.getElementById('catProfissionais').value.trim(),
      ativado: document.getElementById('catAtivado').checked,
    };
    const btn = document.getElementById('modalCategoriaConfirm');
    btn.disabled = true;
    try{
      if(categoriaEditando){
        const antigo = categoriaEditando.nome;
        // renomeou: os serviços desta categoria acompanham
        if(!mesmaCategoria(antigo, nome) || antigo !== nome){
          if(!await trocarCategoriaDosServicos(antigo, nome)) return;
        }
        Object.assign(categoriaEditando, dados);
        showToast('Categoria atualizada!');
      } else {
        categoriasData.push(dados);
        showToast('Categoria criada com sucesso!');
      }
    } finally { btn.disabled = false; }
    salvarConfig('categorias', categoriasData);
    fecharCategoria();
    renderCategorias();
    renderServicos();
  });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalCategoriaOverlay.classList.contains('open')) fecharCategoria(); });

  renderCategorias();
  renderServicos();

  /* ---------- Pacotes ---------- */
  // { nome, servicos:[{nome, qtd}], subtotal, desconto:{tipo:'percent'|'valor', valor}|null, valor (preço final) }
  const pacotesData = [];

  function precoServicoPorNome(nome){
    const sv = servicosData.find(x => x.nome === nome);
    return sv ? (Number(sv.preco) || 0) : 0;
  }
  // Recalcula a partir dos serviços (se o preço de um serviço mudar, o pacote acompanha)
  function recalcularPacote(p){
    const temPrecos = (p.servicos || []).some(sv => servicosData.some(x => x.nome === sv.nome));
    if(temPrecos) p.subtotal = arred((p.servicos || []).reduce((t, sv) => t + precoServicoPorNome(sv.nome) * (parseInt(sv.qtd, 10) || 1), 0));
    else if(p.subtotal == null) p.subtotal = Number(p.valor) || 0; // pacote antigo sem os serviços cadastrados
    p.descontoAplicado = calcularDesconto(p.subtotal, p.desconto);
    p.valor = arred(p.subtotal - p.descontoAplicado);
    return p;
  }

  function renderPacotes(){
    const body = document.getElementById('pacotesBody');
    body.innerHTML = '';
    if(pacotesData.length === 0){
      body.innerHTML = `<tr><td colspan="4"><div class="empty-state">Nenhum pacote criado ainda.</div></td></tr>`;
      return;
    }
    const busca = semAcento((document.getElementById('pacotesBusca') || {}).value || '').trim();
    let mostrados = 0;
    pacotesData.forEach((p, idx) => {
      recalcularPacote(p);
      if(busca && !semAcento(p.nome + ' ' + (p.servicos || []).map(sv => sv.nome).join(' ')).includes(busca)) return;
      mostrados++;
      const tr = document.createElement('tr');
      tr.className = 'clicavel';
      tr.style.cursor = 'pointer';
      const servs = (p.servicos || []).map(sv => `${(parseInt(sv.qtd, 10) || 1) > 1 ? sv.qtd + '× ' : ''}${escHTML(sv.nome)}`).join(', ');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${escHTML(p.nome)}</td>
        <td>${servs || '—'}</td>
        <td style="white-space:nowrap;">${p.descontoAplicado > 0 ? `<span class="valor-riscado">${formatPrice(p.subtotal)}</span>` : ''}<strong>${formatPrice(p.valor)}</strong>${p.descontoAplicado > 0 ? `<span class="desconto-tag">–${textoDesconto(p.desconto)}</span>` : ''}</td>
        <td><div class="fin-acoes">
          <button class="icon-btn" type="button" title="Editar" aria-label="Editar pacote ${escHTML(p.nome)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="comanda-apagar" type="button" title="Apagar pacote" aria-label="Apagar pacote ${escHTML(p.nome)}">${ICONE_LIXEIRA}</button>
        </div></td>
      `;
      const [bEditar, bApagar] = tr.querySelectorAll('button');
      bEditar.addEventListener('click', (e) => { e.stopPropagation(); abrirPacote(idx); });
      bApagar.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!confirm(`Apagar o pacote "${p.nome}"?`)) return;
        pacotesData.splice(idx, 1);
        salvarConfig('pacotes', pacotesData);
        renderPacotes();
        showToast('Pacote apagado.');
      });
      tr.addEventListener('click', () => abrirPacote(idx));
      body.appendChild(tr);
    });
    if(!mostrados) body.innerHTML = `<tr><td colspan="4" class="fin-vazio">Nenhum pacote com esse nome.</td></tr>`;
  }
  document.getElementById('pacotesBusca').addEventListener('input', renderPacotes);

  const modalPacoteOverlay = document.getElementById('modalPacoteOverlay');
  const pacoteServicosContainer = document.getElementById('pacoteServicosContainer');
  let editingPacoteIndex = -1;

  function addPacoteServicoRow(nomeInicial, qtdInicial){
    const row = document.createElement('div');
    row.className = 'pacote-row';
    const nomes = servicosData.map(x => x.nome);
    if(nomeInicial && !nomes.includes(nomeInicial)) nomes.push(nomeInicial); // serviço que saiu do cadastro
    const options = nomes.map(n => `<option value="${escHTML(n)}" data-preco="${precoServicoPorNome(n)}">${escHTML(n)}</option>`).join('');
    row.innerHTML = `
      <select class="ps-servico"><option value="">Selecione o Serviço</option>${options}</select>
      <input type="text" class="ps-valor" placeholder="0,00" readonly aria-label="Preço unitário">
      <input type="number" class="ps-qtd" value="1" min="1" aria-label="Quantidade">
      <input type="text" class="ps-total" placeholder="0,00" readonly aria-label="Total do serviço">
      <button class="icon-btn trash" type="button" title="Remover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    function recalcRow(){
      const sel = row.querySelector('.ps-servico');
      const preco = parseFloat(sel.selectedOptions[0]?.dataset.preco || 0);
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      row.querySelector('.ps-valor').value = formatPrice(preco);
      row.querySelector('.ps-total').value = formatPrice(preco * qtd);
      recalcPacoteTotal();
    }
    row.querySelector('.ps-servico').addEventListener('change', recalcRow);
    row.querySelector('.ps-qtd').addEventListener('input', recalcRow);
    row.querySelector('.icon-btn.trash').addEventListener('click', () => { row.remove(); recalcPacoteTotal(); });
    pacoteServicosContainer.appendChild(row);
    if(nomeInicial){ row.querySelector('.ps-servico').value = nomeInicial; row.querySelector('.ps-qtd').value = qtdInicial || 1; }
    recalcRow();
  }

  function descontoDoFormularioPacote(){
    const tipo = document.getElementById('pacoteDescontoTipo').value;
    const valor = lerValor(document.getElementById('pacoteDescontoValor').value);
    return tipo && valor > 0 ? { tipo, valor } : null;
  }
  function subtotalDoFormularioPacote(){
    let total = 0;
    pacoteServicosContainer.querySelectorAll('.pacote-row').forEach(row => {
      const sel = row.querySelector('.ps-servico');
      const preco = parseFloat(sel.selectedOptions[0]?.dataset.preco || 0);
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      if(sel.value) total += preco * qtd;
    });
    return arred(total);
  }
  function recalcPacoteTotal(){
    const subtotal = subtotalDoFormularioPacote();
    const desc = descontoDoFormularioPacote();
    const aplicado = calcularDesconto(subtotal, desc);
    document.getElementById('pacoteResumo').innerHTML = aplicado > 0
      ? `Subtotal ${formatPrice(subtotal)} · Desconto <strong>– ${formatPrice(aplicado)}</strong>${desc.tipo === 'percent' ? ` (${textoDesconto(desc)})` : ''}` : '';
    document.getElementById('pacoteTotalValue').textContent = formatPrice(subtotal - aplicado);
  }
  document.getElementById('pacoteDescontoTipo').addEventListener('change', (e) => {
    const inp = document.getElementById('pacoteDescontoValor');
    inp.disabled = !e.target.value;
    if(!e.target.value) inp.value = ''; else inp.focus();
    recalcPacoteTotal();
  });
  document.getElementById('pacoteDescontoValor').addEventListener('input', recalcPacoteTotal);

  function abrirPacote(idx){
    editingPacoteIndex = idx;
    const p = idx >= 0 ? pacotesData[idx] : null;
    document.getElementById('modalPacoteTitle').textContent = p ? 'Editar Pacote' : 'Criar Novo Pacote';
    document.getElementById('pacoteNome').value = p ? p.nome : '';
    pacoteServicosContainer.innerHTML = '';
    if(p && (p.servicos || []).length) p.servicos.forEach(sv => addPacoteServicoRow(sv.nome, sv.qtd));
    else addPacoteServicoRow();
    const d = p && p.desconto && p.desconto.valor > 0 ? p.desconto : null;
    document.getElementById('pacoteDescontoTipo').value = d ? d.tipo : '';
    document.getElementById('pacoteDescontoValor').value = d ? String(d.valor).replace('.', ',') : '';
    document.getElementById('pacoteDescontoValor').disabled = !d;
    recalcPacoteTotal();
    modalPacoteOverlay.classList.add('open');
  }
  function fecharPacote(){ modalPacoteOverlay.classList.remove('open'); editingPacoteIndex = -1; }

  document.getElementById('btnAddPacoteServico').addEventListener('click', () => addPacoteServicoRow());
  document.getElementById('btnNovoPacote').addEventListener('click', () => abrirPacote(-1));
  document.getElementById('modalPacoteCancel').addEventListener('click', fecharPacote);
  modalPacoteOverlay.addEventListener('click', (e) => { if(e.target === modalPacoteOverlay) fecharPacote(); });
  document.getElementById('modalPacoteConfirm').addEventListener('click', () => {
    const nome = document.getElementById('pacoteNome').value.trim();
    if(!nome){ showToast('Informe o nome do pacote'); return; }
    const duplicado = pacotesData.find((x, i) => i !== editingPacoteIndex && semAcento(x.nome) === semAcento(nome));
    if(duplicado){ showToast(`Já existe um pacote chamado "${duplicado.nome}".`); return; }
    const servicosEscolhidos = [];
    pacoteServicosContainer.querySelectorAll('.pacote-row').forEach(row => {
      const sel = row.querySelector('.ps-servico');
      if(!sel.value) return;
      const qtd = parseInt(row.querySelector('.ps-qtd').value, 10) || 1;
      const ja = servicosEscolhidos.find(x => x.nome === sel.value);
      if(ja) ja.qtd += qtd; else servicosEscolhidos.push({ nome: sel.value, qtd });
    });
    if(servicosEscolhidos.length === 0){ showToast('Adicione pelo menos um serviço ao pacote'); return; }
    const desconto = descontoDoFormularioPacote();
    const subtotal = subtotalDoFormularioPacote();
    if(desconto && desconto.tipo === 'percent' && desconto.valor > 100){ showToast('O desconto em porcentagem vai até 100%.'); return; }
    if(desconto && desconto.tipo === 'valor' && desconto.valor > subtotal){ showToast(`O desconto passa do valor dos serviços (${formatPrice(subtotal)}).`); return; }
    const pacote = recalcularPacote({ nome, servicos: servicosEscolhidos, subtotal, desconto });
    const editando = editingPacoteIndex >= 0;
    if(editando) pacotesData[editingPacoteIndex] = pacote; else pacotesData.push(pacote);
    salvarConfig('pacotes', pacotesData);
    renderPacotes();
    fecharPacote();
    showToast(editando ? 'Pacote atualizado!' : 'Pacote criado com sucesso!');
  });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modalPacoteOverlay.classList.contains('open')) fecharPacote(); });

  renderPacotes();

  /* ---------- Expedientes ---------- */
  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const expedientesData = [
    { nome:'Horário Geral', entradas:['09:00','09:00','09:00','09:00','09:00','09:00','09:00'], intervalos:[false,false,false,false,false,false,false], saidas:['18:00','18:00','18:00','18:00','18:00','18:00','18:00'], fechados:[true,false,false,false,false,false,false] },
  ];
  let editingExpedienteIndex = -1;

  function resumoDiasExpediente(e){
    const fechados = e.fechados || [];
    if(fechados.every(f => !f)) return 'Dom-Sáb';
    if(fechados.every(f => f)) return 'Fechado todos os dias';
    return diasCurtos.filter((_, i) => !fechados[i]).join(', ');
  }

  function renderExpedientes(){
    const body = document.getElementById('expedientesBody');
    body.innerHTML = '';
    expedientesData.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--text-dark);">${e.nome}</td>
        <td>${resumoDiasExpediente(e)}</td>
        <td>${e.entradas[1] || '09:00'} – ${e.saidas[1] || '18:00'}</td>
        <td>
          <button class="icon-btn" title="Editar" data-edit-idx="${idx}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
          </button>
        </td>
      `;
      tr.querySelector('[data-edit-idx]').addEventListener('click', () => openExpedienteModal(idx));
      body.appendChild(tr);
    });
  }
  renderExpedientes();

  const modalExpedienteOverlay = document.getElementById('modalExpedienteOverlay');
  const modalExpedienteTitleEl = document.querySelector('#modalExpedienteOverlay h3');

  function setDiaFechado(i, fechado){
    const entradaEls = document.querySelectorAll('.eg-entrada');
    const saidaEls = document.querySelectorAll('.eg-saida');
    const intervaloEls = document.querySelectorAll('.eg-intervalo');
    entradaEls[i].disabled = fechado;
    saidaEls[i].disabled = fechado;
    intervaloEls[i].disabled = fechado;
  }

  function openExpedienteModal(idx){
    editingExpedienteIndex = idx;
    const entradaEls = document.querySelectorAll('.eg-entrada');
    const saidaEls = document.querySelectorAll('.eg-saida');
    const intervaloEls = document.querySelectorAll('.eg-intervalo');
    const fechadoEls = document.querySelectorAll('.eg-fechado');

    if(idx >= 0){
      const e = expedientesData[idx];
      modalExpedienteTitleEl.textContent = 'Editar Horário de Atendimento';
      document.getElementById('expedienteNome').value = e.nome;
      entradaEls.forEach((el, i) => el.value = e.entradas[i] || '09:00');
      saidaEls.forEach((el, i) => el.value = e.saidas[i] || '18:00');
      intervaloEls.forEach((el, i) => el.checked = !!e.intervalos[i]);
      fechadoEls.forEach((el, i) => { el.checked = !!(e.fechados && e.fechados[i]); setDiaFechado(i, el.checked); });
    } else {
      modalExpedienteTitleEl.textContent = 'Novo Horário de Atendimento';
      document.getElementById('expedienteNome').value = '';
      entradaEls.forEach(el => el.value = '09:00');
      saidaEls.forEach(el => el.value = '18:00');
      intervaloEls.forEach(el => el.checked = false);
      fechadoEls.forEach((el, i) => { el.checked = false; setDiaFechado(i, false); });
    }
    modalExpedienteOverlay.classList.add('open');
  }

  document.querySelectorAll('.eg-fechado').forEach((el, i) => {
    el.addEventListener('change', () => setDiaFechado(i, el.checked));
  });

  document.getElementById('btnNovoExpediente').addEventListener('click', () => openExpedienteModal(-1));
  document.getElementById('modalExpedienteCancel').addEventListener('click', () => modalExpedienteOverlay.classList.remove('open'));
  modalExpedienteOverlay.addEventListener('click', (e) => { if(e.target === modalExpedienteOverlay) modalExpedienteOverlay.classList.remove('open'); });
  document.getElementById('modalExpedienteConfirm').addEventListener('click', () => {
    const nome = document.getElementById('expedienteNome').value.trim();
    if(nome.length < 3 || nome.length > 20){ showToast('O nome deve ter entre 3 e 20 caracteres.'); return; }
    const entradas = Array.from(document.querySelectorAll('.eg-entrada')).map(el => el.value);
    const saidas = Array.from(document.querySelectorAll('.eg-saida')).map(el => el.value);
    const intervalos = Array.from(document.querySelectorAll('.eg-intervalo')).map(el => el.checked);
    const fechados = Array.from(document.querySelectorAll('.eg-fechado')).map(el => el.checked);

    if(editingExpedienteIndex >= 0){
      expedientesData[editingExpedienteIndex] = { nome, entradas, intervalos, saidas, fechados };
      showToast('Horário de atendimento atualizado!');
    } else {
      expedientesData.push({ nome, entradas, intervalos, saidas, fechados });
      showToast('Horário de atendimento criado!');
    }
    renderExpedientes();
    modalExpedienteOverlay.classList.remove('open');
    salvarConfig('expedientes', expedientesData);
  });

  /* ================= FORMULAÇÕES COSMÉTICAS MODULE ================= */
  /* INCI_GRUPOS_CENTELLA: em js/dados.js */
  /* ativosData: em js/dados.js */
  /* ===== Dicionário de ativos: conteúdo revisado (lotes) ===== */
  /* ATIVOS_REVISADOS: em js/dados.js */
  ativosData.forEach(a => { if(ATIVOS_REVISADOS[a.id]) Object.assign(a, ATIVOS_REVISADOS[a.id]); });
  /* ===== fim lotes ===== */

  function classeTagsHTML(classes){
    return classes.map(c => `<span class="category-chip">${c}</span>`).join(' ');
  }

  /* ---------- Assistente de Busca Guiada (fábrica reutilizável) ---------- */
  const classesDisponiveis = ['Antiacneicos', 'Antiglicantes', 'Anti-inflamatórios', 'Antimicrobianos', 'Antioxidantes', 'Antipoluição', 'Antipruriginosos', 'Calmantes', 'Cicatrizantes', 'Clareadores', 'Despigmentantes', 'Detoxificantes', 'Emolientes', 'Enzimáticos', 'Esfoliantes', 'Filmógenos', 'Firmadores', 'Fotoprotetores', 'Oclusivos', 'Peptídeos', 'Prebióticos', 'Probióticos', 'Queratolíticos', 'Regeneradores', 'Reparadores de barreira', 'Retinoides', 'Seborreguladores', 'Tensoativos', 'Tensores', 'Umectantes', 'Vasoprotetores'];
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let renderAll;

  function letraInicial(nome){
    return nome.charAt(0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function createAtivosBrowser(cfg){
    const classesContainer = cfg.classesContainer ? document.getElementById(cfg.classesContainer) : null;
    const temAssistente = !!(cfg.toggleBtn && document.getElementById(cfg.toggleBtn));

    if(classesContainer){
      classesDisponiveis.forEach(c => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.dataset.classe = c;
        chip.textContent = c;
        chip.addEventListener('click', () => { chip.classList.toggle('selected'); render(); });
        classesContainer.appendChild(chip);
      });
    }

    if(temAssistente){
      document.getElementById(cfg.toggleBtn).addEventListener('click', () => {
        const panel = document.getElementById(cfg.panel);
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      [cfg.gestante, cfg.vegano, cfg.organico].forEach(id => {
        document.getElementById(id).addEventListener('change', render);
      });
      document.getElementById(cfg.periodo).addEventListener('change', render);

      document.getElementById(cfg.limpar).addEventListener('click', () => {
        document.getElementById(cfg.gestante).checked = false;
        document.getElementById(cfg.vegano).checked = false;
        document.getElementById(cfg.organico).checked = false;
        document.getElementById(cfg.periodo).value = '';
        classesContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        render();
        showToast('Filtros limpos');
      });
      document.getElementById(cfg.aplicar).addEventListener('click', () => {
        render();
        document.getElementById(cfg.panel).style.display = 'none';
        showToast('Filtros aplicados!');
      });
    }

    let viewMode = 'todos';
    // Letra exibida no dicionário: mostra um grupo por vez para a página não ficar enorme.
    // null = escolhe automaticamente a primeira letra com ativos; 'TODAS' = lista completa.
    let letraSelecionada = null;
    document.querySelectorAll(cfg.tabSelector).forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll(cfg.tabSelector).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        viewMode = tab.dataset[cfg.tabDataKey];
        render();
      });
    });

    function render(){
      const term = document.getElementById(cfg.search).value.trim().toLowerCase();
      const gestante = temAssistente && document.getElementById(cfg.gestante).checked;
      const vegano = temAssistente && document.getElementById(cfg.vegano).checked;
      const organico = temAssistente && document.getElementById(cfg.organico).checked;
      const periodo = temAssistente ? document.getElementById(cfg.periodo).value : '';
      const classesAtivas = classesContainer ? Array.from(classesContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.classe) : [];

      const container = document.getElementById(cfg.cardsContainer);
      const azNavEl = document.getElementById(cfg.azNav);
      container.innerHTML = '';

      let filtered = ativosData.filter(a => {
        if(term && !a.nome.toLowerCase().includes(term)) return false;
        if(gestante && !a.gestantes) return false;
        if(vegano && !a.vegano) return false;
        if(organico && !a.organico) return false;
        if(periodo && a.periodo !== periodo && a.periodo !== 'Ambos') return false;
        if(classesAtivas.length > 0 && !classesAtivas.some(c => a.classe.includes(c))) return false;
        if(viewMode === 'favoritos' && !a.favorito) return false;
        return true;
      });

      if(filtered.length === 0){
        container.innerHTML = '<div class="registro-card empty-state">Nenhum ativo encontrado com esses critérios.</div>';
        azNavEl.innerHTML = '';
        return;
      }

      filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const grupos = {};
      filtered.forEach(a => {
        const letra = letraInicial(a.nome);
        if(!grupos[letra]) grupos[letra] = [];
        grupos[letra].push(a);
      });

      const letrasComAtivos = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const buscando = !!term;
      // Se a letra escolhida ficou sem resultados (por causa de filtros), vai para a primeira disponível.
      if(!buscando && letraSelecionada !== 'TODAS' && !grupos[letraSelecionada]) letraSelecionada = letrasComAtivos[0];
      const letrasVisiveis = (buscando || letraSelecionada === 'TODAS') ? letrasComAtivos : [letraSelecionada];

      azNavEl.innerHTML = alfabeto.map(letra => {
        const temAtivo = !!grupos[letra];
        const ativa = !buscando && letraSelecionada === letra;
        return `<button type="button" class="az-nav-letter ${temAtivo ? '' : 'disabled'} ${ativa ? 'active' : ''}" data-letra="${letra}" ${temAtivo ? '' : 'disabled'} aria-pressed="${ativa}" title="${temAtivo ? grupos[letra].length + ' ativo(s) com a letra ' + letra : 'Nenhum ativo com a letra ' + letra}">${letra}</button>`;
      }).join('') + `<button type="button" class="az-nav-letter todas ${!buscando && letraSelecionada === 'TODAS' ? 'active' : ''}" data-letra="TODAS" aria-pressed="${!buscando && letraSelecionada === 'TODAS'}">Todas</button>`;
      azNavEl.querySelectorAll('.az-nav-letter:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          letraSelecionada = btn.dataset.letra;
          const busca = document.getElementById(cfg.search);
          if(busca.value){ busca.value = ''; }
          render();
        });
      });

      if(buscando){
        const info = document.createElement('div');
        info.className = 'ativo-busca-info';
        info.textContent = `${filtered.length} ativo(s) encontrado(s) para "${document.getElementById(cfg.search).value.trim()}" em todas as letras`;
        container.appendChild(info);
      }

      letrasVisiveis.forEach(letra => {
        const grupoDiv = document.createElement('div');
        grupoDiv.className = 'ativo-letter-group';
        grupoDiv.id = cfg.cardsContainer + '-' + letra;
        grupoDiv.innerHTML = `<div class="ativo-letter-heading">Ativos com letra ${letra} (${grupos[letra].length})</div>`;

        const grid = document.createElement('div');
        grid.className = 'ativo-card-grid';

        grupos[letra].forEach(a => {
          const realIdx = ativosData.indexOf(a);
          const card = document.createElement('div');
          card.className = 'ativo-card';
          card.innerHTML = `
            <div class="ativo-card-head">
              <div class="ativo-card-name">${a.nome}</div>
              <button class="fav-star-btn ${a.favorito ? 'active' : ''}" title="Favoritar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${a.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            </div>
            <div class="ativo-card-desc">${a.mecanismo}</div>
            <div class="ativo-card-footer">
              <div class="ativo-classe-tags">${classeTagsHTML(a.classe.slice(0,1))}</div>
              <button class="ativo-card-ler-mais">Ler mais ›</button>
            </div>
          `;
          card.querySelector('.ativo-card-ler-mais').addEventListener('click', () => openAtivoDetail(realIdx));
          card.querySelector('.fav-star-btn').addEventListener('click', () => {
            a.favorito = !a.favorito;
            renderAll();
            salvarConfig('ativos_anotacoes', anotacoesAtivosParaSalvar());
          });
          grid.appendChild(card);
        });

        grupoDiv.appendChild(grid);
        container.appendChild(grupoDiv);
      });
    }

    return render;
  }

  const renderAtivosFormulacoes = createAtivosBrowser({
    search:'ativosSearch', cardsContainer:'ativosCardsContainer', azNav:'azNav', classesContainer:'assistClasses', toggleBtn:'btnToggleAssistente',
    panel:'assistentePanel', gestante:'assistGestante', vegano:'assistVegano', organico:'assistOrganico', periodo:'assistPeriodo',
    limpar:'btnLimparFiltros', aplicar:'btnAplicarFiltros', tabSelector:'#catalogo-subpanel-ativos .fin-tab[data-ativoview]',
    tabDataKey:'ativoview'
  });

  renderAll = () => { renderAtivosFormulacoes(); };
  renderAll();

  /* ---------- Carrega Dicionário de Ativos do Supabase (com fallback ao mock) ---------- */
  async function loadAtivosFromSupabase(){
    try{
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return; // não logado: mantém o mock local

      const { data, error } = await supabaseClient.from('ativos').select('*');
      if(error || !data || data.length === 0) return; // erro ou tabela vazia: mantém o mock

      ativosData = data.map(a => ({
        id: a.id,
        nome: a.nome,
        classe: a.classe || [],
        mecanismo: a.mecanismo,
        ph: a.ph,
        incompatibilidade: a.incompatibilidade,
        dosagem: a.dosagem,
        fonte: a.fonte,
        periodo: a.periodo,
        vegano: !!a.vegano,
        organico: !!a.organico,
        gestantes: !!a.gestantes,
        favorito: !!a.favorito,
        anotacao: a.anotacao || '',
        inci: a.inci || '',
        inciNota: a.inci_nota || '',
        compostos: Array.isArray(a.compostos) ? a.compostos : [],
        veganoTexto: a.vegano_texto || '',
        organicoTexto: a.organico_texto || '',
        gestantesTexto: a.gestantes_texto || '',
        nota: a.nota || '',
        inciGrupos: Array.isArray(a.inci_grupos) ? a.inci_grupos : [],
        buscaInci: a.busca_inci !== false,
      }));

      renderAll();
    } catch(e){
      // qualquer falha de rede/consulta: segue com o mock local, sem travar o app
    }
  }
  // (loadAtivosFromSupabase roda no enterApp, depois do login — aqui só duplicava o carregamento)

  document.getElementById('ativosSearch').addEventListener('input', renderAtivosFormulacoes);

  /* ---------- Assistente de Busca Guiada por Ativos (Plano de SkinCare) ---------- */
  const skcAtivosDesejados = new Set();

  document.getElementById('skcBtnToggleAssistente').addEventListener('click', () => {
    const panel = document.getElementById('skcAssistentePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  const skcClassesContainer = document.getElementById('skcAssistClasses');
  classesDisponiveis.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.classe = c;
    chip.textContent = c;
    chip.addEventListener('click', () => { chip.classList.toggle('selected'); renderSkcAtivosDesejadosChips(); });
    skcClassesContainer.appendChild(chip);
  });

  const skcFuncaoContainer = document.getElementById('skcFuncaoExterno');

  skincareCategories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.funcao = cat;
    chip.textContent = cat;
    chip.addEventListener('click', () => { chip.classList.toggle('selected'); renderSkcProdutosEncontrados(); });
    skcFuncaoContainer.appendChild(chip);
  });

  document.getElementById('skcAssistGestante').addEventListener('change', renderSkcAtivosDesejadosChips);

  document.getElementById('skcBtnLimparFiltros').addEventListener('click', () => {
    document.getElementById('skcAssistGestante').checked = false;
    skcClassesContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    renderSkcAtivosDesejadosChips();
    showToast('Filtros limpos');
  });
  document.getElementById('skcBtnAplicarFiltros').addEventListener('click', () => {
    renderSkcAtivosDesejadosChips();
    document.getElementById('skcAssistentePanel').style.display = 'none';
    showToast('Filtros aplicados!');
  });

  function renderSkcAtivosDesejadosChips(){
    const gestante = document.getElementById('skcAssistGestante').checked;
    const classesAtivas = Array.from(skcClassesContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.classe);

    const filtered = ativosData.filter(a => {
      if(gestante && !a.gestantes) return false;
      if(classesAtivas.length > 0 && !classesAtivas.some(c => a.classe.includes(c))) return false;
      return true;
    }).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const wrap = document.getElementById('skcAtivosDesejadosChips');
    wrap.innerHTML = '';
    if(filtered.length === 0){
      wrap.innerHTML = '<div style="font-size:13px; color:var(--text-muted);">Nenhum ativo encontrado com esses critérios.</div>';
    }
    filtered.forEach(a => {
      const chip = document.createElement('div');
      chip.className = 'chip' + (skcAtivosDesejados.has(a.id) ? ' selected' : '');
      chip.textContent = a.nome;
      chip.addEventListener('click', () => {
        if(skcAtivosDesejados.has(a.id)) skcAtivosDesejados.delete(a.id);
        else skcAtivosDesejados.add(a.id);
        chip.classList.toggle('selected');
        renderSkcProdutosEncontrados();
      });
      wrap.appendChild(chip);
    });
    renderSkcProdutosEncontrados();
  }

  /* ---------- Alerta de contraindicações (medicamentos/suplementos e outras doenças) ---------- */
  const mapaContraindicacoes = [
    { termos:['isotretinoina','roacutan','accutane','isotretinoína'], aviso:'Uso de isotretinoína (Roacutan): contraindica peeling/limpeza de pele por até 6 meses.' },
    { termos:['corticoide','corticosteroide','corticóide'], aviso:'Uso de corticoide: pode afetar a drenagem linfática e procedimentos com agulha/extração.' },
    { termos:['anticoagulante','warfarina','marevan','xarelto','eliquis','aas ', 'aspirina'], aviso:'Uso de anticoagulante: risco de sangramento/hematoma em procedimentos com agulha/extração.' },
    { termos:['marca-passo','marcapasso','implante metalico','protese metalica','pino metalico'], aviso:'Marca-passo ou implante metálico: contraindica alguns aparelhos de eletroterapia usados na drenagem.' },
    { termos:['cancer','tumor','linfedema','linfonodo','quimioterapia','oncologico'], aviso:'Histórico de câncer/linfedema ou remoção de linfonodos: contraindicação forte para drenagem linfática.' },
    { termos:['acido','retinoide','tretinoina','adapaleno','acido salicilico','acido glicolico'], aviso:'Uso atual de ácidos/retinoides tópicos: pode causar reação em limpeza de pele.' },
  ];

  function checarContraindicacoes(texto){
    const t = normalizarTexto(texto || '');
    if(!t.trim()) return [];
    const avisos = new Set();
    mapaContraindicacoes.forEach(regra => {
      if(regra.termos.some(termo => t.includes(normalizarTexto(termo)))){
        avisos.add(regra.aviso);
      }
    });
    return Array.from(avisos);
  }

  function bindContraindicacaoCheck(inputId, alertId){
    const input = document.getElementById(inputId);
    const alertBox = document.getElementById(alertId);
    if(!input || !alertBox) return;
    const verificar = () => {
      const avisos = checarContraindicacoes(input.value);
      if(avisos.length === 0){
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
        return;
      }
      alertBox.style.display = 'block';
      alertBox.innerHTML = '<strong>⚠ Possível contraindicação identificada:</strong><ul>' +
        avisos.map(a => `<li>${a}</li>`).join('') + '</ul>';
    };
    input.addEventListener('input', verificar);
    input.addEventListener('blur', verificar);
  }

  bindContraindicacaoCheck('paMedicamentos', 'paMedicamentosAlert');
  bindContraindicacaoCheck('paOutrasDoencas', 'paOutrasDoencasAlert');
  bindContraindicacaoCheck('pubMedicamentos', 'pubMedicamentosAlert');
  bindContraindicacaoCheck('pubOutrasDoencas', 'pubOutrasDoencasAlert');

  /* ---------- Mostra o campo "Qual tipo de alergia?" só quando Alergias = Sim ---------- */
  function bindAlergiaTipoToggle(selectId, wrapId){
    const select = document.getElementById(selectId);
    const wrap = document.getElementById(wrapId);
    if(!select || !wrap) return;
    const atualizar = () => {
      wrap.style.display = select.value === 'Sim' ? 'block' : 'none';
      if(select.value !== 'Sim'){
        const input = wrap.querySelector('input');
        if(input) input.value = '';
        const innerSelect = wrap.querySelector('select');
        if(innerSelect) innerSelect.value = 'Selecionar';
      }
    };
    select.addEventListener('change', atualizar);
    atualizar();
  }

  bindAlergiaTipoToggle('paAlergias', 'paAlergiaTipoWrap');
  bindAlergiaTipoToggle('pubAlergias', 'pubAlergiaTipoWrap');
  bindAlergiaTipoToggle('paDermatite', 'paDermatiteFrequenciaWrap');
  bindAlergiaTipoToggle('pubDermatite', 'pubDermatiteFrequenciaWrap');
  bindAlergiaTipoToggle('paAsma', 'paAsmaFrequenciaWrap');
  bindAlergiaTipoToggle('pubAsma', 'pubAsmaFrequenciaWrap');
  bindAlergiaTipoToggle('paDiabetico', 'paDiabeticoTipoWrap');
  bindAlergiaTipoToggle('pubDiabetico', 'pubDiabeticoTipoWrap');
  bindAlergiaTipoToggle('paTireoide', 'paTireoideTipoWrap');
  bindAlergiaTipoToggle('pubTireoide', 'pubTireoideTipoWrap');

  /* ---------- Sugestão automática de ativos a partir do texto do Objetivo ---------- */
  function normalizarTexto(s){
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const skcMapaObjetivoClasse = [
    { termos:['limpeza profunda','higienizar','higienizacao','sujeira','impureza','impurezas','poros sujos'], classes:['Higienizantes'] },
    { termos:['oleosidade','oleosa','oleoso','brilho excessivo','pele mista','pele oleosa'], classes:['Seborreguladores'] },
    { termos:['acne','cravo','cravos','espinha','espinhas','cisto','comedao','comedoes','poros obstruidos','foliculite'], classes:['Antiacneicos'] },
    { termos:['mancha','manchas','hiperpigmentacao','melasma','melanose','uniformizar o tom','tom desigual','manchas de sol','manchas solares'], classes:['Despigmentantes','Clareadores'] },
    { termos:['ruga','rugas','linha fina','linhas finas','antienvelhecimento','anti-idade','sinais de idade','pele madura'], classes:['Retinoides','Regeneradores'] },
    { termos:['flacidez','firmeza','sustentacao','lifting','perda de firmeza','flacida'], classes:['Firmadores','Tensores','Peptídeos'] },
    { termos:['sensivel','sensibilidade','vermelhidao','rosacea','irritacao','irritada','alergia','reativa'], classes:['Calmantes','Anti-inflamatórios'] },
    { termos:['ressecamento','seca','desidratada','desidratacao','falta de hidratacao','pele repuxando'], classes:['Umectantes','Emolientes'] },
    { termos:['hidratacao','hidratar','sede da pele','hidratada'], classes:['Umectantes'] },
    { termos:['aspereza','pele aspera','maciez','suavizar','textura aspera'], classes:['Emolientes'] },
    { termos:['perda de agua','tewl','protecao da barreira','pele rachada','descamacao severa'], classes:['Oclusivos'] },
    { termos:['poro','poros','textura irregular','celulas mortas','renovacao celular','opacidade da pele'], classes:['Esfoliantes','Queratolíticos'] },
    { termos:['peeling suave','esfoliacao suave','renovacao gentil'], classes:['Enzimáticos','Esfoliantes'] },
    { termos:['barreira','barreira cutanea','barreira da pele','protecao cutanea'], classes:['Reparadores de barreira'] },
    { termos:['cicatriz','cicatrizes','marca de acne','pos-procedimento','pos procedimento','ferida'], classes:['Cicatrizantes','Regeneradores'] },
    { termos:['coceira','prurido','coca','pele que coca'], classes:['Antipruriginosos'] },
    { termos:['poluicao','cidade grande','smog','residuos ambientais'], classes:['Antipoluição'] },
    { termos:['toxinas','desintoxicar','detox','pele cansada'], classes:['Detoxificantes'] },
    { termos:['protecao solar','fotoenvelhecimento','sol','fps','queimadura solar'], classes:['Fotoprotetores'] },
    { termos:['glicacao','acucar','envelhecimento por acucar'], classes:['Antiglicantes'] },
    { termos:['vaso','vasos','capilar','capilares','couperose','olheiras','circulacao','vasinhos'], classes:['Vasoprotetores'] },
    { termos:['bacteria','fungo','fungos','microbiana','infeccao de pele'], classes:['Antimicrobianos'] },
    { termos:['luminosidade','vico','opacidade','radicais livres','antioxidante','pele cansada e opaca'], classes:['Antioxidantes'] },
    { termos:['microbioma','flora cutanea','equilibrio da pele','ph da pele'], classes:['Prebióticos','Probióticos'] },
    { termos:['pelicula protetora','filme protetor'], classes:['Filmógenos'] },
  ];

  function sugerirClassesPorObjetivo(texto){
    const t = normalizarTexto(texto);
    const classes = new Set();
    skcMapaObjetivoClasse.forEach(regra => {
      if(regra.termos.some(termo => t.includes(normalizarTexto(termo)))){
        regra.classes.forEach(c => classes.add(c));
      }
    });
    return classes;
  }

  document.getElementById('btnSugerirAtivosObjetivo').addEventListener('click', () => {
    const texto = document.getElementById('skincareObjetivo').value.trim();
    if(!texto){ showToast('Descreva o objetivo do plano primeiro.'); return; }

    const classesSugeridas = sugerirClassesPorObjetivo(texto);
    if(classesSugeridas.size === 0){
      showToast('Não encontrei ativos relacionados a esse objetivo. Tente descrever com outras palavras (ex: oleosidade, manchas, rugas).');
      return;
    }

    skcClassesContainer.querySelectorAll('.chip').forEach(chip => {
      chip.classList.toggle('selected', classesSugeridas.has(chip.dataset.classe));
    });

    document.getElementById('skcAssistentePanel').style.display = 'block';
    renderSkcAtivosDesejadosChips();

    // pré-seleciona automaticamente todos os ativos que caíram no filtro sugerido
    ativosData.filter(a => a.classe && a.classe.some(c => classesSugeridas.has(c)))
      .forEach(a => skcAtivosDesejados.add(a.id));
    renderSkcAtivosDesejadosChips();

    showToast('Sugestões aplicadas com base no objetivo!');
  });

  function renderSkcProdutosEncontrados(){
    const container = document.getElementById('skcProdutosEncontrados');
    container.innerHTML = '';

    const funcoesAtivas = Array.from(skcFuncaoContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.funcao);

    if(skcAtivosDesejados.size === 0 && funcoesAtivas.length === 0){
      container.innerHTML = '<div class="registro-card empty-state">Escolha uma função de produto ou selecione ativos acima para ver as opções do Catálogo.</div>';
      return;
    }

    const qtdAtivosDoProduto = p => (p.ativos || []).filter(aid => skcAtivosDesejados.has(aid)).length;
    let encontrados;
    if(funcoesAtivas.length > 0){
      // Tipo de produto escolhido: mostra TODOS desse tipo (ex.: os 14 protetores solares).
      // Os ativos escolhidos não escondem nada: só colocam primeiro quem os contém.
      encontrados = products.filter(p => funcoesAtivas.includes(p.category))
        .sort((a, b) => qtdAtivosDoProduto(b) - qtdAtivosDoProduto(a));
    } else {
      // Só ativos escolhidos: mostra os produtos que contêm algum deles.
      encontrados = products.filter(p => qtdAtivosDoProduto(p) > 0)
        .sort((a, b) => qtdAtivosDoProduto(b) - qtdAtivosDoProduto(a));
    }

    if(encontrados.length === 0){
      container.innerHTML = '<div class="registro-card empty-state">Nenhum produto do Catálogo corresponde a esses critérios ainda.</div>';
      return;
    }

    if(funcoesAtivas.length > 0){
      const comAtivos = skcAtivosDesejados.size ? encontrados.filter(p => qtdAtivosDoProduto(p) > 0).length : 0;
      const resumo = document.createElement('div');
      resumo.style.cssText = 'font-size:12.5px; color:var(--text-muted); margin:0 0 10px 2px;';
      resumo.textContent = `${encontrados.length} produto(s) de ${funcoesAtivas.join(', ')}` +
        (skcAtivosDesejados.size ? ` · ${comAtivos} com os ativos escolhidos (aparecem primeiro)` : '');
      container.appendChild(resumo);
    }

    encontrados.forEach(prod => {
      const ativosMatch = (prod.ativos || []).filter(aid => skcAtivosDesejados.has(aid))
        .map(aid => ativosData.find(x => x.id === aid))
        .filter(Boolean);
      const onManha = routineEntries.some(e => e.product.id === prod.id && e.period === 'manha');
      const onNoite = routineEntries.some(e => e.product.id === prod.id && e.period === 'noite');

      const card = document.createElement('div');
      card.className = 'product-detail-card';
      const imgSrc = prod.image || 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2216%22%20fill%3D%22%23f4ede8%22/%3E%3Cpath%20d%3D%22M40%2028h20v9l7%207v42a5%205%200%2001-5%205H38a5%205%200%2001-5-5V44l7-7z%22%20fill%3D%22none%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22%20stroke-linejoin%3D%22round%22/%3E%3Cline%20x1%3D%2240%22%20y1%3D%2250%22%20x2%3D%2260%22%20y2%3D%2250%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22/%3E%3C/svg%3E';

      const whyItems = ativosMatch.map(a => `<div class="product-detail-why-item"><b>${a.nome}:</b> ${a.mecanismo || 'Ativo relacionado ao objetivo informado.'}</div>`).join('');

      card.innerHTML = `
        <img class="product-detail-thumb" src="${imgSrc}" alt="${prod.name}">
        <div class="product-detail-info">
          <div class="product-detail-top">
            <div class="product-detail-name">${prod.name}</div>
            <div class="product-detail-brand">${prod.brand}${prod.price ? ' · ' + faixaDePrecoUnica(prod.price, prod.apenasBrasil) : ''}</div>
            ${prod.category ? `<span class="category-chip" style="margin-top:4px;">${prod.category}</span>` : ''}
          </div>
          ${prod.func ? `<div class="product-detail-func">${prod.func}</div>` : ''}
          ${ativosMatch.length > 0 ? `
          <div class="product-detail-why">
            <div class="product-detail-why-title">Por que foi sugerido</div>
            ${whyItems}
          </div>` : ''}
          <div class="product-detail-actions">
            <button class="period-btn manha-btn ${onManha ? 'on' : ''}">☀ Manhã</button>
            <button class="period-btn noite-btn ${onNoite ? 'on' : ''}">🌙 Noite</button>
          </div>
        </div>
      `;
      card.querySelector('.manha-btn').addEventListener('click', () => { toggleRoutineEntry(prod, 'manha', ativosMatch.map(a => ({ nome:a.nome, mecanismo:a.mecanismo || '' }))); renderSkcProdutosEncontrados(); });
      card.querySelector('.noite-btn').addEventListener('click', () => { toggleRoutineEntry(prod, 'noite', ativosMatch.map(a => ({ nome:a.nome, mecanismo:a.mecanismo || '' }))); renderSkcProdutosEncontrados(); });
      container.appendChild(card);
    });
  }

  renderSkcAtivosDesejadosChips();

  const modalAtivoOverlay = document.getElementById('modalAtivoOverlay');
  let currentAtivoIdx = -1;

  // Produtos com o ativo: os marcados no cadastro + os que têm algum dos INCI dele na lista de ingredientes.
  function termosInciDoAtivo(a){
    if(a.buscaInci === false) return []; // ex.: glicerina, presente em quase todos os produtos
    const termos = [];
    if(a.inci) termos.push(a.inci);
    // grupos marcados com detectar:false (ex.: "Não confundir") não entram na busca
    (Array.isArray(a.inciGrupos) ? a.inciGrupos : []).filter(g => g.detectar !== false)
      .forEach(g => (g.itens || []).forEach(it => it.inci && termos.push(it.inci)));
    return [...new Set(termos.map(t => t.toLowerCase().trim()).filter(t => t.length >= 6 && !t.startsWith('(')))];
  }
  function produtosQueContemAtivo(a){
    const termos = termosInciDoAtivo(a);
    const lista = [];
    products.forEach(p => {
      const marcado = (p.ativos || []).includes(a.id);
      let pelaInci = false, baixaConc = false;
      if(!marcado && termos.length){
        const ingredientes = String(p.outrosIngredientes || '').toLowerCase();
        const lista = ingredientes.split(',').map(x => x.trim().replace(/^[^a-z0-9]+|[^a-z0-9)]+$/g, '')).filter(Boolean);
        // Compara o ingrediente inteiro (ou o início dele, ex.: "niacinamide (5%)"), e não um pedaço do texto:
        // assim "betaine" não casa com "cocamidopropyl betaine", nem "retinol" com outro nome que só contenha a palavra.
        const casa = (item, t) => item === t || (item.startsWith(t) && /^\s*[(\/*]/.test(item.slice(t.length)));
        // posição do ativo na lista (a lista vai da maior para a menor quantidade)
        const idx = lista.findIndex(item => termos.some(t => casa(item, t)));
        if(idx >= 0){
          pelaInci = true;
          baixaConc = lista.length >= 6 && (idx + 1) / lista.length > 2/3; // último terço da lista
        }
      }
      if(marcado || pelaInci) lista.push(Object.assign(Object.create(p), { __pelaInci: pelaInci, __baixaConc: baixaConc }));
    });
    // marcados primeiro, depois os encontrados pelo INCI e, por último, os de baixa concentração
    const peso = x => !x.__pelaInci ? 0 : (x.__baixaConc ? 2 : 1);
    return lista.sort((x, y) => peso(x) - peso(y));
  }

  function simNaoHTML(val){
    return val ? '<span class="ativo-badge-sim">Sim</span>' : '<span class="ativo-badge-nao">Não</span>';
  }
  // Mostra a resposta completa quando existe um texto (ex.: "Sim, em uso cosmético habitual*",
  // "Depende da matéria-prima*"); a cor segue o início do texto. Sem texto, usa o Sim/Não simples.
  function preencherSimNao(el, valorBool, texto){
    if(!texto){ el.innerHTML = simNaoHTML(valorBool); return; }
    const t = String(texto).trim();
    const cls = /^sim\b/i.test(t) ? 'ativo-badge-sim' : (/^n[ãa]o\b/i.test(t) ? 'ativo-badge-nao' : 'ativo-badge-neutro');
    el.innerHTML = `<span class="${cls}"></span>`;
    el.firstChild.textContent = t;
  }

  function openAtivoDetail(idx){
    currentAtivoIdx = idx;
    const a = ativosData[idx];
    document.getElementById('ativoDetailNome').textContent = a.nome;
    document.getElementById('ativoDetailMecanismo').textContent = a.mecanismo;
    document.getElementById('ativoDetailPh').textContent = a.ph;
    document.getElementById('ativoDetailDosagem').textContent = a.dosagem;
    document.getElementById('ativoDetailFonte').textContent = a.fonte;
    document.getElementById('ativoDetailPeriodo').textContent = a.periodo;
    preencherSimNao(document.getElementById('ativoDetailVegano'), a.vegano, a.veganoTexto);
    preencherSimNao(document.getElementById('ativoDetailOrganico'), a.organico, a.organicoTexto);
    preencherSimNao(document.getElementById('ativoDetailGestantes'), a.gestantes, a.gestantesTexto);

    // INCI, principais ativos e nota de variação (aparecem só quando cadastrados)
    document.getElementById('ativoDetailInciBloco').style.display = a.inci ? 'block' : 'none';
    document.getElementById('ativoDetailInci').textContent = a.inci || '';
    document.getElementById('ativoDetailInci').style.fontStyle = String(a.inci || '').startsWith('(') ? 'normal' : '';
    document.getElementById('ativoDetailInciNota').textContent = a.inciNota || '';
    const compostos = Array.isArray(a.compostos) ? a.compostos : [];
    document.getElementById('ativoDetailCompostosBloco').style.display = compostos.length ? 'block' : 'none';
    const compWrap = document.getElementById('ativoDetailCompostos');
    compWrap.innerHTML = '';
    compostos.forEach(c => {
      // aceita "Madecassoside (Madecassosídeo)" → nome INCI + tradução
      const m = String(c).match(/^(.*?)\s*\((.*)\)\s*$/);
      const chip = document.createElement('span');
      chip.className = 'ativo-composto';
      chip.textContent = m ? m[1] : c;
      if(m){ const sm = document.createElement('small'); sm.textContent = ' · ' + m[2]; chip.appendChild(sm); }
      compWrap.appendChild(chip);
    });
    // INCI encontrados em formulações, separados por grupo (extratos x matérias-primas x constituintes)
    const grupos = Array.isArray(a.inciGrupos) ? a.inciGrupos : [];
    const gruposEl = document.getElementById('ativoDetailInciGrupos');
    const corpoGrupos = document.getElementById('ativoDetailInciGruposCorpo');
    corpoGrupos.innerHTML = '';
    let totalInci = 0;
    grupos.forEach(g => {
      const itens = Array.isArray(g.itens) ? g.itens : [];
      if(!itens.length) return;
      totalInci += itens.length;
      const t = document.createElement('div'); t.className = 'inci-grupo-titulo' + (g.detectar === false && g.alerta !== false ? ' alerta' : ''); t.textContent = g.titulo || '';
      corpoGrupos.appendChild(t);
      if(g.descricao){ const d = document.createElement('div'); d.className = 'inci-grupo-desc'; d.textContent = g.descricao; corpoGrupos.appendChild(d); }
      const tab = document.createElement('table'); tab.className = 'inci-tabela';
      itens.forEach(it => {
        const tr = document.createElement('tr');
        const c1 = document.createElement('td'); c1.textContent = it.inci || '';
        const c2 = document.createElement('td'); c2.textContent = it.significado || '';
        tr.appendChild(c1); tr.appendChild(c2); tab.appendChild(tr);
      });
      corpoGrupos.appendChild(tab);
    });
    gruposEl.style.display = totalInci ? 'block' : 'none';
    gruposEl.open = false;
    document.getElementById('ativoDetailInciGruposQtd').textContent = totalInci ? `(${totalInci})` : '';

    const notaEl = document.getElementById('ativoDetailNota');
    notaEl.style.display = a.nota ? 'block' : 'none';
    notaEl.textContent = a.nota || '';
    document.getElementById('ativoDetailClasse').innerHTML = classeTagsHTML(a.classe);
    document.getElementById('ativoDetailIncompatibilidade').textContent = a.incompatibilidade;
    document.getElementById('ativoDetailAnotacao').value = a.anotacao || '';

    const produtosContainer = document.getElementById('ativoProdutosContainer');
    produtosContainer.innerHTML = '';
    const produtosComEsteAtivo = produtosQueContemAtivo(a);
    document.getElementById('ativoProdutosQtd').textContent = produtosComEsteAtivo.length ? `(${produtosComEsteAtivo.length})` : '';
    if(produtosComEsteAtivo.length === 0){
      produtosContainer.innerHTML = '<div class="routine-empty" style="padding:14px 0;">Nenhum produto do catálogo cadastrado com este ativo ainda.</div>';
    } else {
      // Faixa horizontal de cartões com foto, nome e marca (em vez de uma lista vertical longa)
      const wrap = document.createElement('div');
      wrap.className = 'pca-carrossel-wrap';
      const faixa = document.createElement('div');
      faixa.className = 'pca-carrossel';
      const iconeFrasco = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2h6v3.5l2 2V20a2 2 0 01-2 2H9a2 2 0 01-2-2V7.5l2-2z"/></svg>';
      produtosComEsteAtivo.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pca-card';
        card.title = `${p.name} — ${p.brand || ''}`;
        card.innerHTML = `
          <div class="pca-card-foto">${p.image ? '<img alt="" loading="lazy">' : iconeFrasco}</div>
          <div class="pca-card-nome"></div>
          <div class="pca-card-marca"></div>`;
        if(p.image){ const img = card.querySelector('img'); img.src = p.image; img.alt = p.name; }
        card.querySelector('.pca-card-nome').textContent = p.name;
        if(p.__pelaInci){
          const origem = document.createElement('span');
          origem.className = 'pca-card-origem';
          origem.textContent = p.__baixaConc ? 'No INCI · baixa concentração' : 'Encontrado pelo INCI';
          origem.title = p.__baixaConc
            ? 'O ativo aparece no último terço da lista de ingredientes, o que indica uma quantidade pequena no produto.'
            : 'Este produto não estava marcado com o ativo, mas a lista de ingredientes contém um dos INCI dele.';
          if(p.__baixaConc){ origem.style.background = 'var(--gray-pill-bg)'; origem.style.color = 'var(--gray-pill-text)'; }
          card.insertBefore(origem, card.querySelector('.pca-card-nome'));
        }
        card.querySelector('.pca-card-marca').textContent = p.brand || '';
        card.addEventListener('click', () => {
          modalAtivoOverlay.classList.remove('open');
          openProduto(p.id);
        });
        faixa.appendChild(card);
      });
      const setaEsq = document.createElement('button');
      setaEsq.type = 'button'; setaEsq.className = 'pca-seta esq'; setaEsq.setAttribute('aria-label', 'Ver produtos anteriores');
      setaEsq.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg>';
      const setaDir = document.createElement('button');
      setaDir.type = 'button'; setaDir.className = 'pca-seta dir'; setaDir.setAttribute('aria-label', 'Ver mais produtos');
      setaDir.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg>';
      const passo = () => Math.max(faixa.clientWidth * 0.8, 160);
      setaEsq.addEventListener('click', () => faixa.scrollBy({ left: -passo() }));
      setaDir.addEventListener('click', () => faixa.scrollBy({ left: passo() }));
      const atualizarSetas = () => {
        setaEsq.hidden = faixa.scrollLeft <= 4;
        setaDir.hidden = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 4;
      };
      faixa.addEventListener('scroll', atualizarSetas, { passive:true });
      // rolar com a roda do mouse também anda para os lados
      faixa.addEventListener('wheel', (e) => {
        if(Math.abs(e.deltaY) > Math.abs(e.deltaX) && faixa.scrollWidth > faixa.clientWidth){
          const noInicio = faixa.scrollLeft <= 0 && e.deltaY < 0;
          const noFim = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 1 && e.deltaY > 0;
          if(!noInicio && !noFim){ e.preventDefault(); faixa.scrollLeft += e.deltaY; }
        }
      }, { passive:false });
      wrap.appendChild(setaEsq); wrap.appendChild(faixa); wrap.appendChild(setaDir);
      produtosContainer.appendChild(wrap);
      requestAnimationFrame(atualizarSetas);
    }

    modalAtivoOverlay.classList.add('open');
  }

  document.getElementById('modalAtivoClose').addEventListener('click', () => modalAtivoOverlay.classList.remove('open'));
  modalAtivoOverlay.addEventListener('click', (e) => { if(e.target === modalAtivoOverlay) modalAtivoOverlay.classList.remove('open'); });
  document.getElementById('modalAtivoSalvarAnotacao').addEventListener('click', async () => {
    if(currentAtivoIdx >= 0){
      const ativo = ativosData[currentAtivoIdx];
      ativo.anotacao = document.getElementById('ativoDetailAnotacao').value;
      // Fica nas configurações DA SUA conta (tabela configuracoes_profissional, protegida por RLS):
      // nunca no ativo, que é compartilhado com todas as profissionais.
      const ok = await salvarConfig('ativos_anotacoes', anotacoesAtivosParaSalvar());
      if(ok) showToast(modoDemonstracao ? 'Anotação guardada só nesta tela (modo demonstração).' : 'Anotação salva — só você vê.');
      else return; // salvarConfig já avisou o motivo (sessão expirada ou banco)
    }
    modalAtivoOverlay.classList.remove('open');
  });

  /* ================= ANAMNESES RESPONDIDAS PELA PACIENTE ================= */
  async function renderAnamnesesRespondidas(){
    const container = document.getElementById('anamnesesRespondidasContainer');
    container.innerHTML = '';
    if(!currentPatient) return;

    let data;
    if(isPacienteReal(currentPatient)){
      const { data: rows, error } = await supabaseClient
        .from('anamneses')
        .select('*')
        .eq('paciente_id', currentPatient.id)
        .order('respondida_em', { ascending: false });
      if(error || !rows) return;
      data = semAnamnesesRepetidas(rows);
    } else {
      data = demoAnamnesesPorPaciente[currentPatient.id] || [];
    }

    if(!data || data.length === 0) return;

    data.forEach(a => {
      const dt = new Date(a.respondida_em);
      const pad2 = n => String(n).padStart(2, '0');
      const horario = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      const dataFormatada = `${dt.getDate()} de ${monthNames[dt.getMonth()]}, ${dt.getFullYear()} às ${horario}`;
      const sist = a.sistemica || {};
      const ev = a.estilo_vida || {};
      const sk = a.skincare || {};
      const autoList = (a.autopercepcao || []).map(t => `<div class="rotina-summary-item">${t}</div>`).join('')
        || '<div class="rotina-summary-item" style="color:var(--text-muted);">Nenhum item marcado.</div>';

      const details = document.createElement('details');
      details.className = 'historico-entry';
      details.innerHTML = `
        <summary>
          <div class="historico-entry-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 3v2h6V3"/></svg>
          </div>
          <div>
            <div class="historico-entry-title">${a.token ? 'Anamnese respondida pela paciente' : 'Anamnese preenchida pela profissional'}</div>
            <div class="historico-entry-date">${dataFormatada}</div>
          </div>
          <div class="historico-entry-spacer"></div>
          <button class="historico-pdf-btn" data-pdf-anamnese="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar PDF
          </button>
          <svg class="historico-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="historico-entry-body">
          ${a.confirmada_em
            ? `<div class="consentimento-registro">✓ Conferida e confirmada pela paciente em ${new Date(a.confirmada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · consentimento ${escHTML(a.consentimento_versao || '')}</div>`
            : a.consentimento_em
            ? `<div class="consentimento-registro">✓ Consentimento aceito pela paciente em ${new Date(a.consentimento_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${escHTML(a.consentimento_versao || '')}</div>`
            : a.confirmacao_token
            ? `<div class="consentimento-registro falta">Aguardando a paciente conferir e confirmar. <button type="button" class="fin-btn-mini" data-reenviar-conf="${escHTML(a.confirmacao_token)}" style="margin-left:6px;">Enviar link pelo WhatsApp</button></div>`
            : '<div class="consentimento-registro falta">Sem consentimento registrado (anamnese anterior a esta função).</div>'}
          <div class="toggle-subtitle">Anamnese Sistêmica</div>
          <div class="rotina-summary-item">Medicamentos: ${sist.medicamentos || '—'}</div>
          <div class="rotina-summary-item">Alergias: ${sist.alergias || '—'}${sist.alergia_tipo ? ' — Tipo: ' + sist.alergia_tipo : ''}</div>
          <div class="rotina-summary-item">Gestante: ${sist.gestante || '—'} · Lactante: ${sist.lactante || '—'}</div>
          <div class="rotina-summary-item">Diabética: ${sist.diabetica || '—'}${sist.diabetica_tipo ? ' (' + sist.diabetica_tipo + ')' : ''} · Tireoide: ${sist.tireoide || '—'}${sist.tireoide_tipo ? ' (' + sist.tireoide_tipo + ')' : ''}</div>
          <div class="rotina-summary-item">Hipertensão: ${sist.hipertensao || '—'} · Hipotensão: ${sist.hipotensao || '—'}</div>
          <div class="rotina-summary-item">Cardiopatologia: ${sist.cardiopatologia || '—'} · Epilepsia: ${sist.epilepsia || '—'}</div>
          <div class="rotina-summary-item">Trombose: ${sist.trombose || '—'} · Insuficiência renal: ${sist.insuficiencia_renal || '—'} · Hepatite: ${sist.hepatite || '—'}</div>
          <div class="rotina-summary-item">SOP: ${sist.sop || '—'} · Antecedentes oncológicos: ${sist.oncologicos || '—'} · Cirurgia bariátrica: ${sist.bariatrico || '—'}</div>
          <div class="rotina-summary-item">Ansiedade: ${sist.ansiedade || '—'} · Depressão: ${sist.depressao || '—'}</div>
          <div class="rotina-summary-item">Dermatite: ${sist.dermatite || '—'}${sist.dermatite_frequencia ? ' (freq: ' + sist.dermatite_frequencia + ')' : ''} · Asma: ${sist.asma || '—'}${sist.asma_frequencia ? ' (freq: ' + sist.asma_frequencia + ')' : ''}</div>
          ${sist.outras_doencas ? `<div class="rotina-summary-item">Outras doenças: ${sist.outras_doencas}</div>` : ''}
          <div class="toggle-subtitle">Estilo de Vida</div>
          <div class="rotina-summary-item">Atividade física: ${ev.atividade_fisica || '—'} · Alimentação: ${ev.alimentacao || '—'}</div>
          <div class="rotina-summary-item">Água: ${ev.agua || '—'} · Sono: ${ev.sono || '—'}</div>
          <div class="rotina-summary-item">Exposição ao sol: ${ev.sol || '—'} · Tabagista: ${ev.tabagista || '—'}</div>
          <div class="rotina-summary-item">Bebida alcoólica: ${ev.alcool || '—'}${ev.alcool_frequencia ? ' (freq: ' + ev.alcool_frequencia + ')' : ''}</div>
          <div class="rotina-summary-item">Evacuação: ${ev.evacuacao || '—'} · Hábito urinário: ${ev.habito_urinario || '—'}</div>
          <div class="rotina-summary-item">Frequência menstrual: ${ev.frequencia_menstrual || '—'}</div>
          ${a.integrativa ? `<div class="toggle-subtitle">Anamnese Integrativa</div><div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${a.integrativa}</div>` : ''}
          <div class="toggle-subtitle">Descobrindo a Sua Pele</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Principal Queixa: ${a.principal_queixa || '—'}</div>
          ${a.tratamentos_anteriores ? `<div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">Tratamentos Anteriores: ${a.tratamentos_anteriores}</div>` : ''}
          ${autoList}
          <div class="toggle-subtitle">Skincare</div>
          <div class="rotina-summary-item">Rotina atual: ${sk.atual || '—'}</div>
          ${sk.parado ? `<div class="rotina-summary-item">Produtos parados: ${sk.parado}</div>` : ''}
          <div class="rotina-summary-item">Regularidade: ${sk.regularidade || '—'} · Como gostaria: ${sk.como_gostaria || '—'}</div>
          <div class="toggle-subtitle">Investimento Confortável</div>
          <div class="rotina-summary-item" style="border:none; padding:0 0 10px 0;">${a.investimento || '—'}</div>
          ${a.observacoes ? `<div class="toggle-subtitle">Observações Adicionais</div><div class="rotina-summary-item" style="border:none;">${a.observacoes}</div>` : ''}
        </div>
      `;
      const btnReenviar = details.querySelector('[data-reenviar-conf]');
      if(btnReenviar) btnReenviar.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        abrirEnvioMensagem({ paciente: currentPatient, modelo: 'confirmar_anamnese', link: linkConfirmacaoAnamnese(btnReenviar.dataset.reenviarConf) });
      });
      details.querySelector('[data-pdf-anamnese]').addEventListener('click', (e) => {
        e.preventDefault();
        openAnamnesePdf(a, dataFormatada);
      });
      container.appendChild(details);
    });
  }

  function openAnamnesePdf(a, dataFormatada){
    pushNavHistory();
    setLandscapePrintMode(false);
    const sist = a.sistemica || {};
    const ev = a.estilo_vida || {};
    const sk = a.skincare || {};

    document.getElementById('pdfAnamneseBrand').textContent = perfilProfissional.nome || '—';
    document.getElementById('pdfAnamneseRole').textContent = perfilProfissional.titulo || '';
    document.getElementById('pdfAnamneseContact').textContent = [perfilProfissional.email, perfilProfissional.telefone].filter(Boolean).join(' · ') || '—';
    document.getElementById('pdfAnamnesePaciente').textContent = currentPatient ? currentPatient.name : '—';
    document.getElementById('pdfAnamneseData').textContent = dataFormatada;
    document.getElementById('pdfPrincipalQueixa').textContent = a.principal_queixa || '—';
    document.getElementById('pdfTratamentosAnteriores').textContent = a.tratamentos_anteriores || '—';
    document.getElementById('pdfAutopercepcao').textContent = (a.autopercepcao || []).join('; ') || 'Nenhum item marcado.';
    document.getElementById('pdfIntegrativa').textContent = a.integrativa || '—';
    document.getElementById('pdfSistemica').textContent =
      `Medicamentos: ${sist.medicamentos || '—'} · Alergias: ${sist.alergias || '—'}${sist.alergia_tipo ? ' (' + sist.alergia_tipo + ')' : ''} · Gestante: ${sist.gestante || '—'} · Lactante: ${sist.lactante || '—'} · Diabética: ${sist.diabetica || '—'}${sist.diabetica_tipo ? ' (' + sist.diabetica_tipo + ')' : ''} · Tireoide: ${sist.tireoide || '—'}${sist.tireoide_tipo ? ' (' + sist.tireoide_tipo + ')' : ''} · Hipertensão: ${sist.hipertensao || '—'} · Hipotensão: ${sist.hipotensao || '—'} · Cardiopatologia: ${sist.cardiopatologia || '—'} · Epilepsia: ${sist.epilepsia || '—'} · Trombose: ${sist.trombose || '—'} · Insuficiência renal: ${sist.insuficiencia_renal || '—'} · Hepatite: ${sist.hepatite || '—'} · SOP: ${sist.sop || '—'} · Antecedentes oncológicos: ${sist.oncologicos || '—'} · Cirurgia bariátrica: ${sist.bariatrico || '—'} · Ansiedade: ${sist.ansiedade || '—'} · Depressão: ${sist.depressao || '—'} · Dermatite: ${sist.dermatite || '—'}${sist.dermatite_frequencia ? ' (freq: ' + sist.dermatite_frequencia + ')' : ''} · Asma: ${sist.asma || '—'}${sist.asma_frequencia ? ' (freq: ' + sist.asma_frequencia + ')' : ''}${sist.outras_doencas ? ' · Outras doenças: ' + sist.outras_doencas : ''}`;

    const explicacoesTireoide = {
      'Hipotireoidismo': 'Hipotireoidismo: A tireoide produz poucos hormônios, deixando o metabolismo lento. Os sinais comuns são cansaço extremo, ganho de peso, pele seca, prisão de ventre e intolerância ao frio.',
      'Hipertireoidismo': 'Hipertireoidismo: A tireoide produz hormônios em excesso, acelerando o organismo. Os sinais comuns são perda de peso rápida, coração acelerado (taquicardia), ansiedade, tremores e intolerância ao calor.'
    };
    const pdfTireoideExplicacao = document.getElementById('pdfTireoideExplicacao');
    if(sist.tireoide_tipo && explicacoesTireoide[sist.tireoide_tipo]){
      pdfTireoideExplicacao.textContent = explicacoesTireoide[sist.tireoide_tipo];
      pdfTireoideExplicacao.style.display = 'block';
    } else {
      pdfTireoideExplicacao.textContent = '';
      pdfTireoideExplicacao.style.display = 'none';
    }
    document.getElementById('pdfEstiloVida').textContent =
      `Atividade física: ${ev.atividade_fisica || '—'} · Alimentação: ${ev.alimentacao || '—'} · Água: ${ev.agua || '—'} · Sono: ${ev.sono || '—'} · Exposição ao sol: ${ev.sol || '—'} · Tabagista: ${ev.tabagista || '—'} · Bebida alcoólica: ${ev.alcool || '—'}${ev.alcool_frequencia ? ' (freq: ' + ev.alcool_frequencia + ')' : ''} · Evacuação: ${ev.evacuacao || '—'} · Hábito urinário: ${ev.habito_urinario || '—'} · Frequência menstrual: ${ev.frequencia_menstrual || '—'}`;
    document.getElementById('pdfSkincare').textContent =
      `Rotina atual: ${sk.atual || '—'}${sk.parado ? ' · Produtos parados: ' + sk.parado : ''} · Regularidade: ${sk.regularidade || '—'} · Como gostaria: ${sk.como_gostaria || '—'}`;
    document.getElementById('pdfInvestimento').textContent = a.investimento || '—';
    document.getElementById('pdfObservacoes').textContent = a.observacoes || '—';

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForPdf = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForPdf) pacientesNavForPdf.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-skincare-pdf').classList.add('active');
    pageTitle.textContent = 'Ficha de Anamnese — ' + (currentPatient ? currentPatient.name : '');
    pageSubtitle.style.display = 'none';
  }

  function setLandscapePrintMode(on){
    let styleEl = document.getElementById('landscapePrintStyle');
    if(on){
      if(!styleEl){
        styleEl = document.createElement('style');
        styleEl.id = 'landscapePrintStyle';
        styleEl.textContent = '@page{ size: landscape; margin: 12mm; }';
        document.head.appendChild(styleEl);
      }
    } else if(styleEl){
      styleEl.remove();
    }
  }

  function openPlanoPdf(plano){
    pushNavHistory();
    setLandscapePrintMode(true);
    document.getElementById('pdfPlanoBrand').textContent = perfilProfissional.nome || '—';
    document.getElementById('pdfPlanoRole').textContent = perfilProfissional.titulo || '';
    document.getElementById('pdfPlanoContact').textContent = [perfilProfissional.email, perfilProfissional.telefone].filter(Boolean).join(' · ') || '—';
    document.getElementById('pdfPlanoPaciente').textContent = currentPatient ? currentPatient.name : '—';
    document.getElementById('pdfPlanoData').textContent = plano.dataGerada || '—';
    document.getElementById('pdfPlanoObjetivo').textContent = plano.objetivo || '—';
    document.getElementById('pdfPlanoDuracao').textContent = plano.duracao ? plano.duracao + ' dias' : '—';

    const pdfPlaceholderImg = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2216%22%20fill%3D%22%23f4ede8%22/%3E%3Cpath%20d%3D%22M40%2028h20v9l7%207v42a5%205%200%2001-5%205H38a5%205%200%2001-5-5V44l7-7z%22%20fill%3D%22none%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22%20stroke-linejoin%3D%22round%22/%3E%3Cline%20x1%3D%2240%22%20y1%3D%2250%22%20x2%3D%2260%22%20y2%3D%2250%22%20stroke%3D%22%238a7060%22%20stroke-width%3D%224%22/%3E%3C/svg%3E';
    function renderPdfProdutoCard(p){
      const whyHtml = (p.why && p.why.length)
        ? `<div class="pdf-product-why"><div class="pdf-product-why-title">Por que foi sugerido</div><div class="pdf-product-why-item"><b>Contém:</b> ${p.why.map(w => w.nome).join(', ')}</div>${p.func ? `<div class="pdf-product-why-item">${p.func}</div>` : ''}</div>`
        : (p.func
          ? `<div class="pdf-product-why"><div class="pdf-product-why-title">Por que foi indicado</div><div class="pdf-product-why-item">${p.func}</div></div>`
          : '');
      const etapaHtml = p.categoria ? `<div class="pdf-product-etapa">${p.categoria}</div>` : '';
      const usageHtml = p.usage
        ? `<div class="pdf-product-usage-title">Modo de uso</div><div class="pdf-product-usage">${p.usage}</div>`
        : '';
      return `<div class="pdf-product"><img class="pdf-product-thumb" src="${p.image || pdfPlaceholderImg}" alt="${p.name}"><div class="pdf-product-info">${etapaHtml}<div class="pdf-product-name">${p.name}</div><div class="pdf-product-brand">${p.brand}</div>${usageHtml}${whyHtml}</div></div>`;
    }

    function ordenarPorEtapa(lista){
      return [...lista].sort((a, b) => {
        let ia = skincareCategories.indexOf(categoriaCanonica(a.categoria));
        let ib = skincareCategories.indexOf(categoriaCanonica(b.categoria));
        if(ia === -1) ia = skincareCategories.length;
        if(ib === -1) ib = skincareCategories.length;
        return ia - ib;
      });
    }

    const manhaOrdenada = ordenarPorEtapa(plano.manha);
    const noiteOrdenada = ordenarPorEtapa(plano.noite);

    const manhaEl = document.getElementById('pdfPlanoManha');
    manhaEl.innerHTML = manhaOrdenada.length
      ? manhaOrdenada.map(renderPdfProdutoCard).join('')
      : '<p style="color:var(--text-muted);">Nenhum produto adicionado.</p>';

    const noiteEl = document.getElementById('pdfPlanoNoite');
    noiteEl.innerHTML = noiteOrdenada.length
      ? noiteOrdenada.map(renderPdfProdutoCard).join('')
      : '<p style="color:var(--text-muted);">Nenhum produto adicionado.</p>';

    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavForPdf = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavForPdf) pacientesNavForPdf.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-plano-pdf').classList.add('active');
    pageTitle.textContent = 'Plano de SkinCare — ' + (currentPatient ? currentPatient.name : '');
    pageSubtitle.style.display = 'none';
  }

  /* ---------- Cor do tema ---------- */
  const TEMAS = [
    { id:'bordo', nome:'Bordô com Dourado', cor1:'#4a1524', cor2:'#a9762f', cor3:'#f2e2e6' },
    { id:'azul',  nome:'Azul com Dourado',  cor1:'#14284a', cor2:'#a9762f', cor3:'#e2e8f2' },
    { id:'verde', nome:'Verde com Dourado', cor1:'#1d3a2b', cor2:'#a9762f', cor3:'#e1ede5' },
    { id:'terracota', nome:'Terracota com Dourado', cor1:'#5a3326', cor2:'#a9762f', cor3:'#f4e5dc' },
    { id:'grafite',   nome:'Grafite com Dourado',   cor1:'#232428', cor2:'#a9762f', cor3:'#e9e8e4' },
  ];
  function temaAtual(){
    const t = document.documentElement.getAttribute('data-tema') || 'bordo';
    return TEMAS.some(x => x.id === t) ? t : 'bordo';
  }
  function aplicarTema(id){
    if(!TEMAS.some(t => t.id === id)) id = 'bordo';
    if(id === 'bordo') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', id);
    try{ localStorage.setItem('skinExpertTema', id); }catch(e){}
    renderSeletorTema();
  }
  function renderSeletorTema(){
    const wrap = document.getElementById('temaOpcoes');
    if(!wrap) return;
    const atual = temaAtual();
    wrap.innerHTML = '';
    TEMAS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tema-opcao' + (t.id === atual ? ' ativo' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', t.id === atual ? 'true' : 'false');
      b.innerHTML = `
        <div class="tema-bola-wrap">
          <div class="tema-bola"><span style="background:${t.cor1}"></span><span style="background:${t.cor2}"></span><span style="background:${t.cor3}"></span></div>
          <span class="tema-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg></span>
        </div>
        <span class="tema-nome">${t.nome}</span>`;
      b.addEventListener('click', () => {
        if(t.id === temaAtual()) return;
        aplicarTema(t.id);
        salvarConfig('tema', t.id);
        showToast('Tema "' + t.nome + '" aplicado!');
      });
      wrap.appendChild(b);
    });
  }
  // Quem tinha escolhido um tema que saiu da lista (ex.: Rosa, Prata) volta para o padrão.
  if(document.documentElement.getAttribute('data-tema') && temaAtual() === 'bordo') aplicarTema('bordo');
  renderSeletorTema();

  /* ---------- Configurações (preferências de moeda/idioma) ---------- */
  (function initConfiguracoes(){
    const paisSelect = document.getElementById('cfgPaisAtuacao');
    paisSelect.value = localStorage.getItem('skinExpertPaisAtuacao') || 'BR';
    document.getElementById('cfgMoeda').value = localStorage.getItem('skinExpertMoeda') || '';

    document.getElementById('btnSalvarConfiguracoes').addEventListener('click', () => {
      localStorage.setItem('skinExpertPaisAtuacao', paisSelect.value);
      salvarConfig('pais_atuacao', paisSelect.value);
      const moedaSel = document.getElementById('cfgMoeda').value;
      try{ localStorage.setItem('skinExpertMoeda', moedaSel); }catch(e){}
      salvarConfig('moeda', moedaSel);
      renderCatalogo();
      aplicarMoedaNoApp();
      showToast('Preferências salvas! Moeda do sistema: ' + simboloMoeda());
    });

    document.getElementById('btnSalvarDadosProfissionais').addEventListener('click', async () => {
      const nome = document.getElementById('cfgNomeProfissional').value.trim();
      const titulo = document.getElementById('cfgTituloProfissional').value.trim();
      const telefone = document.getElementById('cfgTelefoneProfissional').value.trim();

      if(!nome){ showToast('Informe seu nome.'); return; }

      perfilProfissional.nome = nome;
      perfilProfissional.titulo = titulo || 'Esteticista e Cosmetóloga';
      perfilProfissional.telefone = telefone;

      const usuarioPerfil = await usuarioParaSalvar();
      if(!usuarioPerfil && !modoDemonstracao) return; // sessão caiu: não finge que salvou
      if(usuarioPerfil){
        try {
          const { error: erroPerfil } = await supabaseClient.from('perfis').upsert({ id: usuarioPerfil.id, nome: perfilProfissional.nome, titulo: perfilProfissional.titulo, telefone: perfilProfissional.telefone });
          if(erroPerfil){ showToast('Não foi possível salvar seus dados: ' + erroPerfil.message); return; }
        } catch(err){
          console.warn('Não foi possível salvar Meus Dados Profissionais no Supabase.', err);
          showToast('Não foi possível salvar seus dados. Verifique a internet e tente de novo.');
          return;
        }
      } else {
        localStorage.setItem('skinExpertDemoNome', perfilProfissional.nome);
        localStorage.setItem('skinExpertDemoTitulo', perfilProfissional.titulo);
        localStorage.setItem('skinExpertDemoTelefone', perfilProfissional.telefone);
      }

      atualizarSidebarPerfil();
      showToast('Seus dados foram salvos com sucesso!');
    });

    document.getElementById('btnSalvarWhatsapp').addEventListener('click', async () => {
      const numero = document.getElementById('cfgWhatsappNumero').value.trim();
      const phoneId = document.getElementById('cfgWhatsappPhoneId').value.trim();
      const token = document.getElementById('cfgWhatsappToken').value.trim();

      if(!phoneId || !token){ showToast('Preencha o Phone Number ID e o Access Token.'); return; }

      integracaoWhatsapp = { provider: 'meta_cloud_api', phone_number_id: phoneId, access_token: token, numero_whatsapp: numero, ativo: true };

      const usuarioWhats = await usuarioParaSalvar();
      if(!usuarioWhats && !modoDemonstracao) return;
      if(usuarioWhats){
        try {
          const { error: erroWhats } = await supabaseClient.from('integracoes_whatsapp').upsert({
            profissional_id: usuarioWhats.id,
            provider: integracaoWhatsapp.provider,
            phone_number_id: integracaoWhatsapp.phone_number_id,
            access_token: integracaoWhatsapp.access_token,
            numero_whatsapp: integracaoWhatsapp.numero_whatsapp,
            ativo: true,
            atualizado_em: new Date().toISOString()
          });
          if(erroWhats) throw erroWhats;
        } catch(err){
          console.warn('Não foi possível salvar a integração de WhatsApp no Supabase.', err);
          showToast('Erro ao salvar a integração. Tente novamente.');
          return;
        }
      } else {
        localStorage.setItem('skinExpertWhatsappPhoneId', phoneId);
        localStorage.setItem('skinExpertWhatsappToken', token);
        localStorage.setItem('skinExpertWhatsappNumero', numero);
        localStorage.setItem('skinExpertWhatsappAtivo', 'true');
      }

      preencherCamposWhatsapp();
      showToast('Integração com WhatsApp salva com sucesso!');
    });

    document.getElementById('btnTestarWhatsapp').addEventListener('click', async () => {
      if(!integracaoWhatsapp.phone_number_id || !integracaoWhatsapp.access_token){
        showToast('Salve sua integração antes de testar.');
        return;
      }
      showToast('Enviando mensagem de teste...');
      try{
        const { data, error } = await supabaseClient.functions.invoke('testar-whatsapp', { body: {} });
        if(error){
          showToast('Não foi possível confirmar o envio. Verifique seu Phone Number ID e Token.');
        } else {
          showToast('Mensagem de teste enviada! Verifique o WhatsApp do número cadastrado.');
        }
      } catch(e){
        showToast('Não foi possível conectar para testar agora.');
      }
    });

    document.getElementById('btnConectarGoogleAgenda').addEventListener('click', async () => {
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user){
        showToast('Conecte-se com uma conta real (fora do modo demonstração) para usar a Google Agenda.');
        return;
      }
      iniciarConexaoGoogleAgenda(userData.user.id);
    });

    document.getElementById('btnDesconectarGoogleAgenda').addEventListener('click', async () => {
      const { data: userData } = await supabaseClient.auth.getUser();
      if(!userData || !userData.user) return;
      try{
        await supabaseClient.from('integracoes_google_agenda').update({ ativo: false }).eq('profissional_id', userData.user.id);
      } catch(err){
        console.warn('Não foi possível desconectar a Google Agenda.', err);
      }
      googleAgendaConectado = false;
      preencherStatusGoogleAgenda();
      showToast('Google Agenda desconectada.');
    });
  })();

  document.getElementById('backFromPlanoPdf').addEventListener('click', () => {
    setLandscapePrintMode(false);
    navItems.forEach(i => i.classList.remove('active'));
    const pacientesNavBack = document.querySelector('.nav-item[data-view="pacientes"]');
    if(pacientesNavBack) pacientesNavBack.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-registro-paciente').classList.add('active');
    pageTitle.textContent = 'Registro de Paciente';
    pageSubtitle.style.display = 'none';
    switchRegistroTab('recomendacoes');
  });
  document.getElementById('btnBaixarPdfPlano').addEventListener('click', () => window.print());

  // Assinatura do conteúdo de uma anamnese: duas com a mesma assinatura (mesma paciente) são repetição.
  function assinaturaAnamnese(a){
    const campos = ['paciente_id', 'principal_queixa', 'tratamentos_anteriores', 'autopercepcao', 'integrativa',
                    'sistemica', 'estilo_vida', 'skincare', 'investimento', 'observacoes'];
    return JSON.stringify(campos.map(c => a[c] == null ? null : a[c]));
  }
  // Remove repetições: mesmo link (token) ou mesmo conteúdo da mesma paciente em até 24h.
  // Fica a primeira enviada. A lista deve vir da mais recente para a mais antiga.
  function semAnamnesesRepetidas(lista){
    const porToken = new Set(), porConteudo = new Map(), saida = [];
    lista.slice().reverse().forEach(a => { // da mais antiga para a mais recente
      if(a.token){
        const t = String(a.token);
        if(porToken.has(t)) return;
        porToken.add(t);
      }
      const sig = assinaturaAnamnese(a);
      const quando = new Date(a.respondida_em || 0).getTime();
      const anterior = porConteudo.get(sig);
      if(anterior != null && Math.abs(quando - anterior) < 24 * 3600 * 1000) return;
      porConteudo.set(sig, quando);
      saida.push(a);
    });
    return saida.reverse();
  }

  let renderPreFichasEmAndamento = null;
  function renderPreFichasDashboard(){
    if(renderPreFichasEmAndamento) return renderPreFichasEmAndamento; // evita montar a lista duas vezes ao mesmo tempo
    renderPreFichasEmAndamento = (async () => {
      const container = document.getElementById('preFichasContainer');
      const { data, error } = await supabaseClient
        .from('anamneses')
        .select('*, pacientes(nome)')
        .not('token', 'is', null)             // só as respondidas pela paciente pelo link
        .order('respondida_em', { ascending: false })
        .limit(60);
      if(error || !data) return;

      const lista = semAnamnesesRepetidas(data.filter(a => a.token)).slice(0, 5);
      container.innerHTML = '';
      if(!lista.length){
        container.innerHTML = '<div class="empty-state">Nenhuma pré-ficha respondida.</div>';
        return;
      }
      lista.forEach(a => {
        const dt = new Date(a.respondida_em);
        const dataFormatada = `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}`;
        const nome = a.pacientes ? a.pacientes.nome : ((patients.find(x => String(x.id) === String(a.paciente_id)) || {}).name || 'Paciente');
        const item = document.createElement('div');
        item.className = 'produtos-com-ativo-item';
        item.innerHTML = `
          <div><div class="pca-name">${escHTML(nome)}</div><div class="pca-brand">Respondida em ${dataFormatada}</div></div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        `;
        item.addEventListener('click', () => {
          const p = patients.find(x => String(x.id) === String(a.paciente_id));
          if(p) openPatientRegistro(p.id, 'historico');
        });
        container.appendChild(item);
      });
    })().catch(e => console.warn('Pré-fichas:', e)).finally(() => { renderPreFichasEmAndamento = null; });
    return renderPreFichasEmAndamento;
  }

  /* ================= AUTENTICAÇÃO (LOGIN / CADASTRO) ================= */
  const authScreenEl = document.getElementById('authScreen');
  const appRootEl = document.getElementById('appRoot');
  const authTitleEl = document.getElementById('authTitle');
  const authSubEl = document.getElementById('authSub');
  const authNomeFieldEl = document.getElementById('authNomeField');
  const authSwitchEl = document.getElementById('authSwitch');
  const authErrorEl = document.getElementById('authError');
  const authSubmitBtnEl = document.getElementById('authSubmitBtn');
  let authMode = 'login';

  function showAuthError(msg){
    authErrorEl.textContent = msg;
    authErrorEl.classList.add('show');
  }
  function hideAuthError(){ authErrorEl.classList.remove('show'); }

  function setAuthMode(mode){
    authMode = mode;
    hideAuthError();
    if(mode === 'signup'){
      authTitleEl.textContent = 'Criar sua conta';
      authSubEl.textContent = 'Comece a organizar sua clínica em minutos';
      authNomeFieldEl.style.display = 'block';
      authSubmitBtnEl.textContent = 'Criar conta';
      authSwitchEl.innerHTML = 'Já tem conta? <a id="authSwitchLink">Entrar</a>';
      document.getElementById('authForgotWrap').style.display = 'none';
    } else {
      authTitleEl.textContent = 'Entrar na sua conta';
      authSubEl.textContent = 'Acesse seu painel profissional';
      authNomeFieldEl.style.display = 'none';
      authSubmitBtnEl.textContent = 'Entrar';
      authSwitchEl.innerHTML = 'Ainda não tem conta? <a id="authSwitchLink">Criar conta</a>';
      document.getElementById('authForgotWrap').style.display = 'block';
    }
    document.getElementById('authSwitchLink').addEventListener('click', () => setAuthMode(mode === 'signup' ? 'login' : 'signup'));
  }
  setAuthMode('login');

  /* ---------- Mostrar/ocultar senha ---------- */
  document.getElementById('authToggleSenha').addEventListener('click', () => {
    const input = document.getElementById('authSenha');
    const btn = document.getElementById('authToggleSenha');
    if(input.type === 'password'){
      input.type = 'text';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-7-11-7a20.4 20.4 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a20.4 20.4 0 01-3.22 4.35M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  });

  /* ---------- Esqueci minha senha ---------- */
  document.getElementById('authForgotLink').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    if(!email){ showAuthError('Digite seu e-mail no campo acima primeiro, depois clique em "Esqueci minha senha".'); return; }
    hideAuthError();
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if(error) throw error;
      showAuthError('Te enviamos um e-mail com o link para redefinir sua senha. Confira sua caixa de entrada.');
    } catch(err){
      showAuthError(err.message || 'Não foi possível enviar o e-mail de redefinição.');
    }
  });

  async function enterApp(){
    modoDemonstracao = false;
    document.body.classList.remove('modo-demo');
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'flex';
    // Velocidade: tudo que não depende de outra coisa carrega AO MESMO TEMPO
    // (antes era um depois do outro, e cada espera somava).
    const semTravar = pr => Promise.resolve().then(pr).catch(e => console.warn('Carregamento:', e));
    await Promise.all([
      carregarPerfilProfissionalReal, carregarIntegracaoWhatsappReal, carregarIntegracaoGoogleAgendaReal,
      loadPacientesFromSupabase, loadAgendamentosFromSupabase, loadServicos, loadProdutosFromSupabase,
      loadComandasFromSupabase, loadMovimentosFromSupabase, loadContasFromSupabase, loadAtivosFromSupabase,
    ].map(semTravar));
    completarNomesAgenda(); // nomes das pacientes na agenda (a lista de pacientes chegou junto)
    let comandasCriadas = 0;
    await Promise.all([
      semTravar(renderPreFichasDashboard),
      semTravar(async () => { comandasCriadas = await garantirComandasDaAgenda(); }),
      semTravar(carregarConfiguracoesSalvas),
    ]);
    setTimeout(avisarHorariosDuplicados, comandasCriadas ? 5000 : 0); // não cobre o aviso das comandas
  }

  document.getElementById('authDemoLink').addEventListener('click', () => {
    modoDemonstracao = true;
    document.body.classList.add('modo-demo');
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'flex';
    carregarPerfilProfissionalDemo();
    carregarIntegracaoWhatsappDemo();
    showToast('Modo demonstração — os dados aqui não são salvos.');
  });

  authSubmitBtnEl.addEventListener('click', async () => {
    hideAuthError();
    const email = document.getElementById('authEmail').value.trim();
    const senha = document.getElementById('authSenha').value;
    if(!email || !senha){ showAuthError('Preencha e-mail e senha.'); return; }

    authSubmitBtnEl.disabled = true;
    try {
      if(authMode === 'signup'){
        const nome = document.getElementById('authNome').value.trim();
        if(!nome){ showAuthError('Informe seu nome.'); authSubmitBtnEl.disabled = false; return; }

        const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
        if(error) throw error;

        if(data.user){
          await supabaseClient.from('perfis').insert({ id: data.user.id, nome });
        }

        if(data.session){
          await enterApp();
        } else {
          showAuthError('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
        if(error) throw error;
        await enterApp();
      }
    } catch(err){
      showAuthError(err.message || 'Ocorreu um erro. Tente novamente.');
    }
    authSubmitBtnEl.disabled = false;
  });

  /* ---------- Menu do perfil (sidebar) ---------- */
  const profileRowEl = document.getElementById('profileRow');
  const profileDropdownEl = document.getElementById('profileDropdown');

  profileRowEl.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownEl.classList.toggle('open');
  });
  document.addEventListener('click', () => profileDropdownEl.classList.remove('open'));
  profileDropdownEl.addEventListener('click', (e) => e.stopPropagation());

  document.getElementById('profileDropdownSair').addEventListener('click', () => {
    profileDropdownEl.classList.remove('open');
    supabaseClient.auth.signOut().then(() => {
      appRootEl.style.display = 'none';
      authScreenEl.style.display = 'flex';
    });
  });

  /* ================= FORMULÁRIO PÚBLICO DE ANAMNESE (link da paciente) ================= */
  const anamneseToken = new URLSearchParams(window.location.search).get('anamnese');
  const confirmarToken = new URLSearchParams(window.location.search).get('confirmar');

  /* ---------- Página da paciente: conferir e confirmar a anamnese ---------- */
  const ROTULOS_ANAMNESE = {
    medicamentos: 'Medicamentos em uso', alergias: 'Alergias', alergia_tipo: 'Quais alergias', gestante: 'Gestante', lactante: 'Lactante',
    diabetica: 'Diabetes', diabetica_tipo: 'Tipo de diabetes', tireoide: 'Tireoide', tireoide_tipo: 'Tipo (tireoide)', hipertensao: 'Hipertensão',
    hipotensao: 'Hipotensão', cardiopatologia: 'Problema cardíaco', epilepsia: 'Epilepsia', trombose: 'Trombose', insuficiencia_renal: 'Insuficiência renal',
    hepatite: 'Hepatite', sop: 'SOP', oncologicos: 'Histórico oncológico', bariatrico: 'Bariátrica', ansiedade: 'Ansiedade', depressao: 'Depressão',
    dermatite: 'Dermatite', dermatite_frequencia: 'Frequência (dermatite)', asma: 'Asma', asma_frequencia: 'Frequência (asma)', outras_doencas: 'Outras doenças',
    atividade_fisica: 'Atividade física', alimentacao: 'Alimentação', agua: 'Água por dia', sono: 'Sono', sol: 'Exposição ao sol', tabagista: 'Fumante',
    alcool: 'Álcool', alcool_frequencia: 'Frequência (álcool)', evacuacao: 'Intestino', habito_urinario: 'Hábito urinário', frequencia_menstrual: 'Ciclo menstrual',
    atual: 'Skincare atual', parado: 'Produtos que parou de usar', regularidade: 'Regularidade', como_gostaria: 'Como gostaria a rotina',
  };
  function valorVisivel(v){
    if(v == null) return '';
    if(Array.isArray(v)) return v.filter(Boolean).join(', ');
    const t = String(v).trim();
    return /^(selecionar|selecione|selecionar\.\.\.)$/i.test(t) ? '' : t;
  }
  function secaoConfHTML(titulo, linhas){
    const ok = linhas.filter(([, v]) => valorVisivel(v));
    if(!ok.length) return '';
    return `<div class="anamnese-card conf-secao"><div class="anamnese-title" style="margin-bottom:10px;">${escHTML(titulo)}</div>${ok.map(([k, v]) => `<div class="conf-linha"><div class="k">${escHTML(k)}</div><div class="v">${escHTML(valorVisivel(v))}</div></div>`).join('')}</div>`;
  }
  function linhasDeObjeto(obj){ return Object.keys(obj || {}).map(k => [ROTULOS_ANAMNESE[k] || k, obj[k]]); }

  /* ================= LGPD — DIREITOS DA PACIENTE (exportar e apagar os dados) ================= */
  const LGPD_OCULTOS = new Set(['id', 'profissional_id', 'paciente_id', 'pacienteId', 'token', 'confirmacao_token', 'foto_path', 'foto_base64',
    'foto_url', 'agendamento_id', 'agendamentoId', 'google_event_id', 'comanda_id', 'conta_id', 'movimentoId', 'origem', 'duracao_minutos', 'tipo']);
  const LGPD_ROTULOS = {
    nome: 'Nome', email: 'E-mail', telefone_codigo: 'Código do país', telefone_numero: 'Telefone', data_nascimento: 'Data de nascimento',
    pais: 'País', status: 'Status', genero: 'Gênero', created_at: 'Registrado em', updated_at: 'Atualizado em',
    principal_queixa: 'Queixa principal', tratamentos_anteriores: 'Tratamentos anteriores', autopercepcao: 'Autopercepção da pele',
    integrativa: 'Avaliação integrativa', sistemica: 'Saúde', estilo_vida: 'Estilo de vida', skincare: 'Skincare', investimento: 'Investimento',
    observacoes: 'Observações', respondida_em: 'Respondida em', consentimento_em: 'Autorização dada em', consentimento_versao: 'Versão da autorização',
    consentimento_texto: 'Texto autorizado', confirmada_em: 'Conferida pela paciente em', fitzpatrick: 'Fototipo (Fitzpatrick)', baumann: 'Baumann',
    glogau: 'Glogau', hidratacao: 'Hidratação', integridade: 'Integridade', textura: 'Textura', poros: 'Poros', oleosidade: 'Oleosidade', acne: 'Acne',
    rosacea: 'Rosácea', discromias: 'Discromias', olheiras: 'Olheiras', data_avaliacao: 'Data da avaliação', objetivo: 'Objetivo',
    duracao_dias: 'Duração (dias)', rotina_manha: 'Rotina da manhã', rotina_noite: 'Rotina da noite', data_foto: 'Data da foto', etiqueta: 'Etiqueta',
    data: 'Data', hora: 'Hora', duracao_min: 'Duração (min)', servico_nome: 'Serviço', motivo: 'Motivo', codigo: 'Código', cliente: 'Cliente',
    servicos: 'Serviços', valor: 'Valor', saldo: 'Saldo', pagamento: 'Forma de pagamento', itens: 'Itens', pagamentos: 'Pagamentos',
    desconto: 'Desconto', subtotal: 'Subtotal', moeda: 'Moeda', presente: 'Presente', areas: 'Áreas', intensidade: 'Intensidade', grau: 'Grau',
    licoes: 'Lesões', subtipo: 'Subtipo', tipos: 'Tipos', preco: 'Preço', forma: 'Forma', em: 'Em', texto: 'Texto', modelo: 'Mensagem',
    paciente: 'Paciente', paciente_nome: 'Paciente', respondida: 'Respondida', manha: 'Manhã', noite: 'Noite', produto: 'Produto', passo: 'Passo',
  };
  function lgpdRotulo(k){
    if(LGPD_ROTULOS[k]) return LGPD_ROTULOS[k];
    if(typeof ROTULOS_ANAMNESE !== 'undefined' && ROTULOS_ANAMNESE[k]) return ROTULOS_ANAMNESE[k];
    const t = String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function lgpdData(v){
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if(!m) return null;
    if(!m[4]) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(v);
    if(isNaN(d)) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function lgpdVazio(v){
    if(v == null || v === '') return true;
    if(Array.isArray(v)) return v.every(lgpdVazio);
    if(typeof v === 'object') return Object.keys(v).filter(k => !LGPD_OCULTOS.has(k)).every(k => lgpdVazio(v[k]));
    return /^(selecionar|selecione|—)$/i.test(String(v).trim());
  }
  // Valor → HTML legível (listas, sub-campos, datas, Sim/Não)
  function lgpdValorHTML(v){
    if(typeof v === 'boolean') return v ? 'Sim' : 'Não';
    if(Array.isArray(v)){
      const itens = v.filter(x => !lgpdVazio(x));
      if(itens.every(x => typeof x !== 'object')) return escHTML(itens.join(', '));
      return '<ul>' + itens.map(x => '<li>' + lgpdValorHTML(x) + '</li>').join('') + '</ul>';
    }
    if(v && typeof v === 'object'){
      const ks = Object.keys(v).filter(k => !LGPD_OCULTOS.has(k) && !lgpdVazio(v[k]));
      return ks.map(k => `<span class="sub"><b>${escHTML(lgpdRotulo(k))}:</b> ${lgpdValorHTML(v[k])}</span>`).join(' ');
    }
    if(typeof v === 'string' && /^\s*[\[{]/.test(v)){ try{ return lgpdValorHTML(JSON.parse(v)); }catch(e){} }
    const d = typeof v === 'string' ? lgpdData(v) : null;
    return escHTML(d || String(v)).replace(/\n/g, '<br>');
  }
  function lgpdCamposHTML(obj, pular){
    const ks = Object.keys(obj || {}).filter(k => !LGPD_OCULTOS.has(k) && !(pular || []).includes(k) && !lgpdVazio(obj[k]));
    if(!ks.length) return '<p class="vazio">Sem informações preenchidas.</p>';
    return '<table>' + ks.map(k => `<tr><th>${escHTML(lgpdRotulo(k))}</th><td>${lgpdValorHTML(obj[k])}</td></tr>`).join('') + '</table>';
  }
  function lgpdSlug(t){ return String(t || 'paciente').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'paciente'; }
  function lgpdBaixar(nomeArquivo, conteudo, tipo){
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function lgpdBlobParaDataUrl(blob){
    return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(''); r.readAsDataURL(blob); });
  }

  // Junta TUDO o que existe sobre a paciente. avisos = partes que não puderam ser lidas.
  async function coletarDadosPaciente(p, opcoes){
    opcoes = opcoes || {};
    const out = { geradoEm: new Date().toISOString(), paciente: null, anamneses: [], avaliacoes: [], planos: [], fotos: [],
                  atendimentos: [], comandas: [], mensagens: [], lembretes: [], especificas: [], avisos: [] };
    const pid = String(p.id);
    out.mensagens = (mensagensHistorico || []).filter(h => h.pacienteId != null ? String(h.pacienteId) === pid : h.paciente === p.name)
      .map(h => ({ em: h.em, modelo: (() => { try{ return modeloPorId(h.modelo).titulo; }catch(e){ return h.modelo; } })(), texto: h.texto }));
    out.lembretes = ((lembretesEstado && lembretesEstado.manuais) || []).filter(l => String(l.pacienteId) === pid)
      .map(l => ({ data: l.data, texto: l.texto }));

    if(isPacienteReal(p)){
      const ler = async (rotulo, tabela, filtro) => {
        try{
          const { data, error } = await filtro(supabaseClient.from(tabela).select('*'));
          if(error){ out.avisos.push(rotulo + ' (' + error.message + ')'); return []; }
          return data || [];
        }catch(e){ out.avisos.push(rotulo); return []; }
      };
      const [cad, an, av, pl, fo, ag, co, esp] = await Promise.all([
        ler('cadastro', 'pacientes', q => q.eq('id', p.id)),
        ler('fichas de anamnese', 'anamneses', q => q.eq('paciente_id', p.id)),
        ler('avaliações', 'avaliacoes_cutaneas', q => q.eq('paciente_id', p.id)),
        ler('planos de skincare', 'planos_skincare', q => q.eq('paciente_id', p.id)),
        ler('fotos', 'fotos_evolucao', q => q.eq('paciente_id', p.id)),
        ler('atendimentos', 'agendamentos', q => q.eq('paciente_id', p.id)),
        ler('comandas', 'comandas', q => q.eq('paciente_id', pid)),
        ler('anamneses específicas', 'anamneses_especificas', q => q.eq('paciente_id', p.id)),
      ]);
      out.paciente = cad[0] || null;
      out.anamneses = an; out.avaliacoes = av; out.planos = pl; out.fotos = fo; out.atendimentos = ag;
      // tabela nova: se ainda não existir no banco, não conta como falha
      out.especificas = esp; out.avisos = out.avisos.filter(a => !/^anamneses específicas \(.*(does not exist|schema cache|anamneses_especificas)/i.test(a));
      const idsAg = ag.map(a => a.id).filter(Boolean);
      let co2 = [];
      if(idsAg.length) co2 = await ler('comandas da agenda', 'comandas', q => q.in('agendamento_id', idsAg));
      const vistas = new Set();
      out.comandas = co.concat(co2).filter(c => !vistas.has(c.id) && vistas.add(c.id));
      if(!out.paciente && !out.avisos.length) out.avisos.push('cadastro não encontrado');

      if(opcoes.comFotos){
        await Promise.all(out.fotos.map(async f => {
          try{
            if(f.foto_path){
              const { data: blob, error } = await supabaseClient.storage.from('fotos-evolucao').download(f.foto_path);
              if(error || !blob) throw error || new Error('sem arquivo');
              f._img = await lgpdBlobParaDataUrl(blob);
            } else if(f.foto_base64){ f._img = f.foto_base64; }
          }catch(e){ out.avisos.push('foto de ' + (lgpdData(f.data_foto) || 'data desconhecida')); }
        }));
      }
    } else {
      // Paciente de demonstração: só o que está na memória
      out.paciente = { nome: p.name, email: p.email, telefone_codigo: p.phoneCode, telefone_numero: p.phoneNumber,
                       data_nascimento: p.dataNascimento, pais: p.pais, status: p.status, foto_url: p.foto_url };
      out.anamneses = (demoAnamnesesPorPaciente[p.id] || []).slice();
      Object.keys(demoEspecificas[p.id] || {}).forEach(t => (demoEspecificas[p.id][t] || []).forEach(r => out.especificas.push({ ...r, tipo: t })));
      Object.keys(appointments || {}).forEach(key => (appointments[key] || []).forEach(a => {
        if(a.type !== 'block' && (String(a.pacienteId) === pid || (!a.pacienteId && a.label === p.name)))
          out.atendimentos.push({ id: a.id, data: key, hora: a.time, duracao_min: a.duration, servico_nome: a.servico, observacoes: a.observacoes, status: a.status });
      }));
      out.comandas = (comandasData || []).filter(c => String(c.pacienteId) === pid || (!c.pacienteId && c.cliente === p.name))
        .map(c => ({ id: c.id, codigo: c.codigo, data: c.dataISO, cliente: c.cliente, itens: c.itens, pagamentos: c.pagamentos,
                     valor: c.valor, saldo: c.saldo, status: c.status, agendamento_id: c.agendamentoId }));
    }
    out.atendimentos.sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.hora || '').localeCompare(String(b.hora || '')));
    return out;
  }
  function comandaTemPagamento(c){
    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
    return pags.some(x => Number(x && x.valor) > 0) || (Number(c.valor) || 0) - (Number(c.saldo) || 0) > 0.004;
  }

  /* ---------- Relatório legível (HTML) ---------- */
  function relatorioPacienteHTML(d, p){
    const prof = (perfilProfissional && perfilProfissional.nome) || '';
    const nome = (d.paciente && d.paciente.nome) || p.name || 'Paciente';
    const agora = new Date();
    const sec = (titulo, n, corpo) => `<section><h2>${escHTML(titulo)}${n != null ? ` <small>(${n})</small>` : ''}</h2>${corpo}</section>`;
    const nada = '<p class="vazio">Nenhum registro.</p>';
    const fotoPerfil = d.paciente && /^data:image\//.test(d.paciente.foto_url || '') ? `<img class="perfil" src="${escHTML(d.paciente.foto_url)}" alt="">` : '';
    const lista = (arr, titulo, campoData, pular) => arr.length ? arr.map((x, i) =>
      `<div class="bloco"><h3>${escHTML(titulo)} ${arr.length > 1 ? i + 1 : ''}${x[campoData] || x.created_at ? ' — ' + escHTML(lgpdData(x[campoData] || x.created_at) || '') : ''}</h3>${lgpdCamposHTML(x, pular)}</div>`).join('') : nada;
    const fotos = d.fotos.length ? '<div class="fotos">' + d.fotos.map(f =>
      `<figure>${f._img ? `<img src="${escHTML(f._img)}" alt="">` : '<div class="semfoto">foto não disponível</div>'}<figcaption>${escHTML(lgpdData(f.data_foto) || '')}${f.etiqueta ? ' · ' + escHTML(f.etiqueta) : ''}${f.observacoes ? '<br>' + escHTML(f.observacoes) : ''}</figcaption></figure>`).join('') + '</div>' : nada;
    const tabela = (cab, linhas) => linhas.length ? `<table class="grade"><tr>${cab.map(c => `<th>${escHTML(c)}</th>`).join('')}</tr>${linhas.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` : nada;
    const atend = tabela(['Data', 'Hora', 'Serviço', 'Situação', 'Observações'], d.atendimentos.map(a => [
      escHTML(lgpdData(a.data) || ''), escHTML(String(a.hora || '').slice(0, 5)), escHTML(a.servico_nome || '—'),
      escHTML(a.status === 'cancelado' ? 'Cancelado' : (a.status || 'Agendado')), escHTML(a.observacoes || '')]));
    const fmt = (v, m) => { try{ return escHTML(fmtMoeda(Number(v) || 0, m)); }catch(e){ return escHTML(String(v)); } };
    const comandas = tabela(['Data', 'Código', 'Itens', 'Valor', 'Pago', 'Situação'], d.comandas.map(c => {
      const itens = Array.isArray(c.itens) ? c.itens.map(i => i.nome).join(', ') : (c.servicos || '');
      return [escHTML(lgpdData(c.data) || ''), escHTML(c.codigo || ''), escHTML(itens), fmt(c.valor, c.moeda),
              fmt((Number(c.valor) || 0) - (Number(c.saldo) || 0), c.moeda), escHTML(c.status || '')];
    }));
    const msgs = tabela(['Enviada em', 'Mensagem', 'Texto'], d.mensagens.map(m => [escHTML(lgpdData(m.em) || ''), escHTML(m.modelo || ''), escHTML(m.texto || '').replace(/\n/g, '<br>')]));
    const lemb = tabela(['Data', 'Lembrete'], d.lembretes.map(l => [escHTML(lgpdData(l.data) || ''), escHTML(l.texto || '')]));
    return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dados de ${escHTML(nome)}</title>
<style>
  body{ font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:#1f2a30; background:#fff; max-width:860px; margin:0 auto; padding:28px 18px 60px; line-height:1.45; }
  header{ display:flex; gap:16px; align-items:center; border-bottom:2px solid #c9a46a; padding-bottom:14px; margin-bottom:8px; }
  h1{ font-size:22px; margin:0 0 4px; } h2{ font-size:17px; margin:28px 0 10px; color:#3a2f1e; } h2 small{ color:#888; font-weight:400; }
  h3{ font-size:14px; margin:14px 0 6px; } .meta{ font-size:13px; color:#555; margin:0; }
  .perfil{ width:64px; height:64px; border-radius:50%; object-fit:cover; }
  table{ width:100%; border-collapse:collapse; font-size:13px; } th, td{ text-align:left; vertical-align:top; padding:6px 8px; border-bottom:1px solid #eee; }
  table:not(.grade) th{ width:34%; color:#555; font-weight:600; } .grade th{ background:#f6f3ee; }
  td ul{ margin:0; padding-left:18px; } .sub{ display:inline-block; margin-right:10px; }
  .bloco{ border:1px solid #eee; border-radius:10px; padding:4px 12px 10px; margin-bottom:12px; break-inside:avoid; }
  .fotos{ display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:12px; }
  figure{ margin:0; break-inside:avoid; } figure img{ width:100%; border-radius:8px; display:block; } figcaption{ font-size:12px; color:#555; margin-top:4px; }
  .semfoto{ height:120px; background:#f3f3f3; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#888; }
  .vazio{ color:#888; font-size:13px; margin:4px 0; } .aviso{ background:#fff7e6; border:1px solid #f0d9a8; border-radius:8px; padding:8px 12px; font-size:13px; }
  .rodape{ margin-top:36px; font-size:12px; color:#666; border-top:1px solid #eee; padding-top:12px; }
  .imprimir{ position:fixed; right:16px; bottom:16px; background:#1f2a30; color:#fff; border:none; border-radius:10px; padding:11px 16px; font-weight:700; cursor:pointer; }
  @media print{ .imprimir{ display:none; } body{ padding:0; } }
</style></head><body>
<header>${fotoPerfil}<div><h1>Dados pessoais de ${escHTML(nome)}</h1>
<p class="meta">Gerado em ${escHTML(agora.toLocaleDateString('pt-BR'))} às ${escHTML(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}${prof ? ' por ' + escHTML(prof) : ''} · Skin Expert Pro</p></div></header>
<p class="meta">Este documento reúne todos os dados desta paciente guardados no sistema, em atendimento ao direito de acesso aos próprios dados (LGPD, art. 18; RGPD, art. 15).</p>
${d.avisos.length ? `<p class="aviso">Atenção: algumas partes não puderam ser lidas e podem estar incompletas: ${escHTML(d.avisos.join('; '))}.</p>` : ''}
${sec('Cadastro', null, d.paciente ? lgpdCamposHTML(d.paciente) : nada)}
${sec('Fichas de anamnese', d.anamneses.length, lista(d.anamneses, 'Ficha', 'respondida_em'))}
${sec('Avaliações cutâneas', d.avaliacoes.length, lista(d.avaliacoes, 'Avaliação', 'data_avaliacao'))}
${sec('Planos de skincare', d.planos.length, lista(d.planos, 'Plano', 'created_at'))}
${d.especificas.length ? sec('Anamneses específicas', d.especificas.length, d.especificas.map(r => `<div class="bloco"><h3>${escHTML((ESPECIALIDADES[r.tipo] || {}).titulo || r.tipo)} — ${escHTML(lgpdData(r.created_at) || '')}</h3><table>${espLinhas(r.tipo, r.dados || {}).map(([k, v]) => `<tr><th>${escHTML(k)}</th><td>${escHTML(v)}</td></tr>`).join('')}</table></div>`).join('')) : ''}
${sec('Fotos de evolução', d.fotos.length, fotos)}
${sec('Atendimentos', d.atendimentos.length, atend)}
${sec('Comandas', d.comandas.length, comandas)}
${sec('Mensagens enviadas pelo app', d.mensagens.length, msgs)}
${d.lembretes.length ? sec('Lembretes', d.lembretes.length, lemb) : ''}
<p class="rodape">Contém dados pessoais e de saúde. Guarde em local seguro e compartilhe somente com a própria paciente.</p>
<button class="imprimir" onclick="window.print()">Imprimir / salvar em PDF</button>
</body></html>`;
  }
  function jsonPacienteLimpo(d){
    const limpo = JSON.parse(JSON.stringify(d, (k, v) => (k === '_img' || k === 'token' || k === 'confirmacao_token' || k === 'foto_base64') ? undefined : v));
    return JSON.stringify({ formato: 'Skin Expert Pro — dados da paciente', versao: 1, ...limpo }, null, 2);
  }

  /* ---------- Janela "Exportar dados" ---------- */
  const modalExportarOverlay = document.getElementById('modalExportarOverlay');
  let exportarPaciente = null;
  function abrirExportarDados(p){
    p = p || currentPatient;
    if(!p){ showToast('Nenhuma paciente selecionada.'); return; }
    exportarPaciente = p;
    document.getElementById('expTitulo').textContent = 'Exportar dados de ' + (p.name || 'paciente');
    document.getElementById('expStatus').textContent = '';
    modalExportarOverlay.classList.add('open');
  }
  function fecharExportar(){ modalExportarOverlay.classList.remove('open'); }
  async function exportarDadosPaciente(formato){
    const p = exportarPaciente;
    if(!p) return;
    const botoes = [document.getElementById('expRelatorio'), document.getElementById('expJson')];
    const status = document.getElementById('expStatus');
    botoes.forEach(b => b.disabled = true);
    status.textContent = formato === 'html' ? 'Juntando os dados e as fotos…' : 'Juntando os dados…';
    try{
      const d = await coletarDadosPaciente(p, { comFotos: formato === 'html' });
      const base = 'dados-' + lgpdSlug(p.name) + '-' + dateKey(new Date());
      if(formato === 'html') lgpdBaixar(base + '.html', relatorioPacienteHTML(d, p), 'text/html;charset=utf-8');
      else lgpdBaixar(base + '.json', jsonPacienteLimpo(d), 'application/json;charset=utf-8');
      status.textContent = d.avisos.length
        ? 'Baixado, mas incompleto. Não foi possível ler: ' + d.avisos.join('; ') + '.'
        : 'Pronto! O arquivo foi baixado.';
    }catch(e){
      console.warn('Exportar:', e);
      status.textContent = 'Não foi possível gerar o arquivo: ' + (e && e.message || e);
    } finally {
      botoes.forEach(b => b.disabled = false);
    }
  }
  document.getElementById('btnExportarDadosPaciente').addEventListener('click', () => abrirExportarDados());
  document.getElementById('expRelatorio').addEventListener('click', () => exportarDadosPaciente('html'));
  document.getElementById('expJson').addEventListener('click', () => exportarDadosPaciente('json'));
  document.getElementById('expFechar').addEventListener('click', fecharExportar);
  modalExportarOverlay.addEventListener('click', (e) => { if(e.target === modalExportarOverlay) fecharExportar(); });

  /* ---------- Janela "Excluir cadastro e dados" ---------- */
  const modalApagarPacOverlay = document.getElementById('modalApagarPacOverlay');
  let apagarCtx = null; // { p, dados }
  const apgConfirma = document.getElementById('apgConfirma');
  const apgConfirmar = document.getElementById('apgConfirmar');
  function fecharApagarPac(){ modalApagarPacOverlay.classList.remove('open'); apagarCtx = null; }
  function plural(n, um, varios){ return n + ' ' + (n === 1 ? um : varios); }
  async function abrirApagarPaciente(){
    const p = currentPatient;
    if(!p){ showToast('Nenhuma paciente selecionada.'); return; }
    apagarCtx = { p, dados: null };
    document.getElementById('apgTitulo').textContent = 'Excluir ' + (p.name || 'paciente');
    document.getElementById('apgCorpo').innerHTML = '<p class="lgpd-texto">Verificando os dados da paciente…</p>';
    document.getElementById('apgConfirmaWrap').style.display = 'none';
    apgConfirma.value = ''; apgConfirmar.disabled = true; apgConfirmar.textContent = 'Apagar definitivamente';
    modalApagarPacOverlay.classList.add('open');

    const d = await coletarDadosPaciente(p);
    if(!apagarCtx || apagarCtx.p !== p) return; // fechou enquanto carregava
    apagarCtx.dados = d;
    const hoje = dateKey(new Date());
    const futuros = d.atendimentos.filter(a => String(a.data || '') >= hoje).length;
    const pagas = d.comandas.filter(comandaTemPagamento).length;
    const semPag = d.comandas.length - pagas;
    const apaga = [
      'Cadastro e foto de perfil',
      d.anamneses.length && plural(d.anamneses.length, 'ficha de anamnese', 'fichas de anamnese'),
      d.avaliacoes.length && plural(d.avaliacoes.length, 'avaliação cutânea', 'avaliações cutâneas'),
      d.especificas.length && plural(d.especificas.length, 'anamnese específica (harmonização, tricologia ou corporal)', 'anamneses específicas (harmonização, tricologia ou corporal)'),
      d.planos.length && plural(d.planos.length, 'plano de skincare', 'planos de skincare'),
      d.fotos.length && plural(d.fotos.length, 'foto de evolução', 'fotos de evolução'),
      d.atendimentos.length && (plural(d.atendimentos.length, 'atendimento da agenda', 'atendimentos da agenda') +
        (futuros ? ` (${futuros} ainda por vir — saem também do Google Agenda)` : '')),
      semPag && plural(semPag, 'comanda sem pagamento', 'comandas sem pagamento'),
      (d.mensagens.length || d.lembretes.length) && 'Histórico de mensagens e lembretes dela',
    ].filter(Boolean);
    document.getElementById('apgCorpo').innerHTML = `
      ${d.avisos.length ? `<p class="lgpd-texto" style="color:#a1561b;">Não consegui conferir tudo (${escHTML(d.avisos.join('; '))}). Mesmo assim, tudo o que for dela será apagado.</p>` : ''}
      <div class="lgpd-sub">Será apagado para sempre:</div>
      <ul class="lgpd-lista apaga">${apaga.map(t => `<li>${escHTML(t)}</li>`).join('')}</ul>
      ${pagas ? `<div class="lgpd-sub">Fica no Financeiro, sem o nome dela:</div>
      <ul class="lgpd-lista mantem"><li>${escHTML(plural(pagas, 'comanda com pagamento', 'comandas com pagamento'))} e os lançamentos do Controle Financeiro. Os valores continuam nos relatórios, mas aparecem como “Paciente removida”. A lei permite e exige guardar os registros financeiros.</li></ul>` : ''}
      <p class="lgpd-texto">Se a paciente pediu uma cópia dos dados, <a href="#" id="apgExportar">exporte antes de apagar</a>. Depois de apagar não tem como recuperar.</p>`;
    const linkExp = document.getElementById('apgExportar');
    if(linkExp) linkExp.addEventListener('click', (e) => { e.preventDefault(); abrirExportarDados(p); });
    document.getElementById('apgConfirmaWrap').style.display = 'block';
    try{ apgConfirma.focus(); }catch(e){}
  }
  apgConfirma.addEventListener('input', () => { apgConfirmar.disabled = !(apagarCtx && apagarCtx.dados) || apgConfirma.value.trim().toUpperCase() !== 'APAGAR'; });
  apgConfirma.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !apgConfirmar.disabled) apgConfirmar.click(); });

  async function apagarDadosPaciente(){
    if(!apagarCtx || !apagarCtx.dados) return;
    const { p, dados } = apagarCtx;
    const pid = String(p.id);
    apgConfirmar.disabled = true; apgConfirmar.textContent = 'Apagando…';
    let avisoFinal = '';

    if(isPacienteReal(p)){
      const usuario = await usuarioParaSalvar();
      if(!usuario){ apgConfirmar.textContent = 'Apagar definitivamente'; apgConfirmar.disabled = false; return; }
      const { data: res, error } = await supabaseClient.rpc('apagar_dados_paciente', { p_paciente: pid });
      if(error){
        const falta = /apagar_dados_paciente|function|schema cache|PGRST202/i.test((error.message || '') + ' ' + (error.code || ''));
        showToast(falta ? 'Falta rodar o arquivo lgpd-apagar-paciente.sql no Supabase. Nada foi apagado.' : 'Nada foi apagado: ' + error.message);
        apgConfirmar.textContent = 'Apagar definitivamente'; apgConfirmar.disabled = false;
        return;
      }
      // Arquivos das fotos (Storage): os registrados + qualquer um que tenha ficado na pasta dela
      const caminhos = new Set(dados.fotos.map(f => f.foto_path).filter(Boolean));
      try{
        const pasta = `${usuario.id}/${pid}`;
        const { data: lista } = await supabaseClient.storage.from('fotos-evolucao').list(pasta, { limit: 1000 });
        (lista || []).forEach(o => { if(o && o.name) caminhos.add(`${pasta}/${o.name}`); });
      }catch(e){}
      if(caminhos.size){
        try{
          const { error: e2 } = await supabaseClient.storage.from('fotos-evolucao').remove([...caminhos]);
          if(e2) avisoFinal = ' Atenção: as fotos não puderam ser apagadas (' + e2.message + ').';
        }catch(e){ avisoFinal = ' Atenção: as fotos não puderam ser apagadas.'; }
      }
      ((res && res.google_event_ids) || []).forEach(gid => {
        supabaseClient.functions.invoke('cancelar-google-agenda', { body: { googleEventId: gid } }).catch(() => {});
      });
    } else {
      // Demonstração: só na memória
      const idx = patients.findIndex(x => String(x.id) === pid);
      if(idx !== -1) patients.splice(idx, 1);
      delete demoAnamnesesPorPaciente[p.id];
      delete demoEspecificas[p.id];
      Object.keys(appointments || {}).forEach(key => {
        appointments[key] = (appointments[key] || []).filter(a => !(a.type !== 'block' && (String(a.pacienteId) === pid || (!a.pacienteId && a.label === p.name))));
      });
      comandasData = (comandasData || []).filter(c => {
        const dela = String(c.pacienteId) === pid || (!c.pacienteId && c.cliente === p.name);
        if(!dela) return true;
        if(!comandaTemPagamento(c)) return false;
        c.cliente = 'Paciente removida'; c.pacienteId = null; c.agendamentoId = null;
        return true;
      });
    }

    // Histórico de mensagens e lembretes dela (ficam nas configurações da profissional)
    const antesMsg = mensagensHistorico.length;
    mensagensHistorico = mensagensHistorico.filter(h => !(h.pacienteId != null ? String(h.pacienteId) === pid : h.paciente === p.name));
    if(mensagensHistorico.length !== antesMsg) salvarConfig('mensagens_historico', mensagensHistorico);
    if(lembretesEstado && Array.isArray(lembretesEstado.manuais)){
      const antesL = lembretesEstado.manuais.length;
      lembretesEstado.manuais = lembretesEstado.manuais.filter(l => String(l.pacienteId) !== pid);
      if(lembretesEstado.manuais.length !== antesL) salvarLembretes();
    }

    fecharApagarPac();
    currentPatient = null;
    if(isPacienteReal(p)){
      await Promise.all([loadPacientesFromSupabase(), loadAgendamentosFromSupabase(), loadComandasFromSupabase(),
        loadMovimentosFromSupabase(), loadContasFromSupabase()].map(x => Promise.resolve(x).catch(e => console.warn(e))));
    } else {
      renderPacientesTable();
      try{ renderCurrentView(); }catch(e){}
      try{ renderComandas(); }catch(e){}
    }
    try{ renderLembretes(); }catch(e){}
    try{ renderCentroMensagens(); }catch(e){}
    showToast('Cadastro e dados de ' + (p.name || 'paciente') + ' apagados.' + avisoFinal);
    document.getElementById('breadcrumbPacientes').click();
  }

  document.getElementById('btnExcluirCadastro').addEventListener('click', abrirApagarPaciente);
  apgConfirmar.addEventListener('click', apagarDadosPaciente);
  document.getElementById('apgCancelar').addEventListener('click', fecharApagarPac);
  modalApagarPacOverlay.addEventListener('click', (e) => { if(e.target === modalApagarPacOverlay) fecharApagarPac(); });
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(modalExportarOverlay.classList.contains('open')) fecharExportar();
    else if(modalApagarPacOverlay.classList.contains('open')) fecharApagarPac();
  });

  /* ================= ANAMNESES ESPECÍFICAS (Harmonização Facial, Tricologia, Corporal) =================
     Só aparecem na ficha se a área estiver ligada em Configurações → Áreas de Atuação.
     Cada "Salvar" registra uma ficha nova (o histórico fica guardado). Tabela: anamneses_especificas. */
  const SN = ['Não', 'Sim'];
  const ESPECIALIDADES = {
    hof: { nome: 'Harmonização Facial', titulo: 'Anamnese de Harmonização Facial', campos: [
      { s: 'Queixa e objetivos' },
      { id: 'queixa', l: 'Queixa principal / o que deseja melhorar', t: 'area' },
      { id: 'areas', l: 'Áreas de interesse', t: 'chips', o: ['Testa', 'Glabela (entre as sobrancelhas)', 'Pés de galinha', 'Olheiras', 'Malar (maçãs do rosto)', 'Sulco nasogeniano', 'Linhas de marionete', 'Lábios', 'Código de barras', 'Mento (queixo)', 'Mandíbula', 'Nariz', 'Papada', 'Pescoço e colo'] },
      { id: 'procedimentos', l: 'Procedimentos de interesse', t: 'chips', o: ['Toxina botulínica', 'Preenchimento com ácido hialurônico', 'Bioestimulador de colágeno', 'Fios de PDO', 'Skinbooster', 'Enzimas / papada', 'Microagulhamento', 'Peeling', 'Ainda não sei'] },
      { id: 'naturalidade', l: 'Resultado que espera', t: 'sel', o: ['Bem natural', 'Moderado', 'Mais evidente'] },
      { id: 'evento', l: 'Tem algum evento importante em breve? Quando?', t: 'txt' },
      { s: 'Procedimentos anteriores' },
      { id: 'toxina', l: 'Já aplicou toxina botulínica', t: 'sn', det: 'Quando foi a última e em quais áreas?' },
      { id: 'preenchimento', l: 'Já fez preenchimento com ácido hialurônico', t: 'sn', det: 'Produto, áreas e data' },
      { id: 'bioestimulador', l: 'Já fez bioestimulador de colágeno', t: 'sn', det: 'Produto, áreas e data' },
      { id: 'fios', l: 'Já colocou fios de PDO', t: 'sn', det: 'Onde e quando?' },
      { id: 'definitivo', l: 'Preenchimento definitivo (PMMA, silicone) ou implante facial', t: 'sn', det: 'Onde?' },
      { id: 'cirurgia', l: 'Cirurgia plástica no rosto', t: 'sn', det: 'Qual e quando?' },
      { id: 'intercorrencia', l: 'Já teve reação ou intercorrência em procedimento estético', t: 'sn', det: 'O que aconteceu?' },
      { id: 'satisfacao', l: 'Como se sentiu com os resultados anteriores', t: 'area' },
      { s: 'Saúde e contraindicações' },
      { id: 'gestante', l: 'Gestante ou amamentando', t: 'sn' },
      { id: 'autoimune', l: 'Doença autoimune (lúpus, artrite reumatoide, vitiligo…)', t: 'sn', det: 'Qual?' },
      { id: 'neuromuscular', l: 'Doença neuromuscular (miastenia gravis, ELA…)', t: 'sn', det: 'Qual?' },
      { id: 'coagulacao', l: 'Distúrbio de coagulação ou sangra com facilidade', t: 'sn' },
      { id: 'anticoagulante', l: 'Usa anticoagulante, AAS, anti-inflamatório, ômega 3, vitamina E ou ginkgo biloba', t: 'sn', det: 'Qual?' },
      { id: 'isotretinoina', l: 'Usou isotretinoína (Roacutan) nos últimos 6 meses', t: 'sn' },
      { id: 'antibiotico', l: 'Está tomando antibiótico', t: 'sn', det: 'Qual?' },
      { id: 'alergia', l: 'Alergia a anestésico (lidocaína), ovo/albumina ou ácido hialurônico', t: 'sn', det: 'Qual?' },
      { id: 'herpes', l: 'Herpes labial recorrente', t: 'sn' },
      { id: 'queloide', l: 'Tendência a queloide ou cicatriz alta', t: 'sn' },
      { id: 'infeccao', l: 'Infecção, acne inflamada ou ferida na área a tratar', t: 'sn' },
      { id: 'dentista', l: 'Tratamento dentário recente ou marcado para as próximas semanas', t: 'sn' },
      { id: 'vacina', l: 'Tomou vacina nas últimas 2 semanas', t: 'sn' },
      { s: 'Avaliação da profissional' },
      { id: 'assimetrias', l: 'Assimetrias e observações da face', t: 'area' },
      { id: 'plano', l: 'Plano proposto (produtos, áreas, quantidade ou unidades)', t: 'area' },
      { id: 'retorno', l: 'Data do retorno / revisão', t: 'date' },
      { id: 'observacoes', l: 'Observações', t: 'area' },
    ]},
    tricologia: { nome: 'Tricologia', titulo: 'Anamnese Tricológica', campos: [
      { s: 'Queixa' },
      { id: 'queixas', l: 'O que incomoda', t: 'chips', o: ['Queda de cabelo', 'Afinamento dos fios', 'Falhas / entradas', 'Caspa / descamação', 'Oleosidade', 'Coceira', 'Couro cabeludo sensível ou ardendo', 'Ressecamento', 'Quebra dos fios', 'Crescimento lento'] },
      { id: 'tempo', l: 'Há quanto tempo', t: 'sel', o: ['Menos de 3 meses', '3 a 6 meses', '6 meses a 1 ano', 'Mais de 1 ano'] },
      { id: 'inicio', l: 'Como começou', t: 'sel', o: ['De repente', 'Aos poucos'] },
      { id: 'quantidade', l: 'Quanto cabelo cai (na percepção dela)', t: 'sel', o: ['Pouco', 'Moderado', 'Muito (tufos)'] },
      { id: 'familia', l: 'Calvície ou queda de cabelo na família', t: 'sn', det: 'Quem?' },
      { id: 'queixa_texto', l: 'Descrição da queixa', t: 'area' },
      { s: 'Possíveis gatilhos' },
      { id: 'estresse', l: 'Estresse intenso nos últimos meses', t: 'sn' },
      { id: 'febre', l: 'Febre alta, COVID, cirurgia ou internação nos últimos 6 meses', t: 'sn', det: 'O quê e quando?' },
      { id: 'parto', l: 'Parto ou fim da amamentação no último ano', t: 'sn' },
      { id: 'dieta', l: 'Dieta restritiva ou perda de peso rápida', t: 'sn' },
      { id: 'anemia', l: 'Anemia ou ferritina baixa', t: 'sn' },
      { id: 'tireoide', l: 'Alteração na tireoide', t: 'sn', det: 'Qual?' },
      { id: 'hormonal', l: 'SOP ou outra alteração hormonal', t: 'sn', det: 'Qual?' },
      { id: 'anticoncepcional', l: 'Anticoncepcional', t: 'sel', o: ['Não usa', 'Usa', 'Parou recentemente', 'Começou recentemente'] },
      { id: 'medicamentos', l: 'Medicamentos ou suplementos para o cabelo (minoxidil, finasterida, vitaminas…)', t: 'txt' },
      { id: 'exames', l: 'Exames recentes (ferritina, vitamina D, B12, zinco, tireoide…)', t: 'area' },
      { s: 'Hábitos capilares' },
      { id: 'lavagem', l: 'Lava o cabelo', t: 'sel', o: ['Todo dia', 'A cada 2 dias', '2 vezes por semana', '1 vez por semana ou menos'] },
      { id: 'quimica', l: 'Química no cabelo', t: 'chips', o: ['Coloração', 'Descoloração / luzes', 'Progressiva / alisamento', 'Relaxamento', 'Permanente', 'Nenhuma'] },
      { id: 'calor', l: 'Usa calor', t: 'chips', o: ['Secador', 'Chapinha', 'Babyliss', 'Nenhum'] },
      { id: 'tracao', l: 'Usa penteados presos com frequência (rabo, coque, tranças, apliques)', t: 'sn' },
      { id: 'produtos', l: 'Produtos que usa hoje', t: 'area' },
      { s: 'Avaliação da profissional' },
      { id: 'couro', l: 'Couro cabeludo', t: 'sel', o: ['Normal', 'Oleoso', 'Seco', 'Misto', 'Sensível'] },
      { id: 'descamacao', l: 'Descamação', t: 'sel', o: ['Ausente', 'Leve', 'Moderada', 'Intensa'] },
      { id: 'eritema', l: 'Vermelhidão', t: 'sel', o: ['Ausente', 'Leve', 'Moderada', 'Intensa'] },
      { id: 'curvatura', l: 'Curvatura do fio', t: 'sel', o: ['Liso (1)', 'Ondulado (2)', 'Cacheado (3)', 'Crespo (4)'] },
      { id: 'espessura', l: 'Espessura do fio', t: 'sel', o: ['Fino', 'Médio', 'Grosso'] },
      { id: 'densidade', l: 'Densidade', t: 'sel', o: ['Baixa', 'Média', 'Alta'] },
      { id: 'teste_tracao', l: 'Teste de tração', t: 'sel', o: ['Negativo', 'Positivo'] },
      { id: 'padrao', l: 'Padrão / grau da queda (ex.: Ludwig I, Norwood III)', t: 'txt' },
      { id: 'tricoscopia', l: 'Tricoscopia: o que foi observado', t: 'area' },
      { id: 'plano', l: 'Plano de tratamento', t: 'area' },
      { id: 'observacoes', l: 'Observações', t: 'area' },
    ]},
    corporal: { nome: 'Corporal', titulo: 'Anamnese Corporal', campos: [
      { s: 'Queixa e objetivos' },
      { id: 'queixas', l: 'Queixas', t: 'chips', o: ['Gordura localizada', 'Celulite', 'Flacidez', 'Estrias', 'Retenção / inchaço', 'Contorno corporal', 'Pós-operatório', 'Relaxamento / dores'] },
      { id: 'areas', l: 'Áreas', t: 'chips', o: ['Abdômen', 'Flancos', 'Costas', 'Braços', 'Culote', 'Coxas (interna)', 'Coxas (externa)', 'Glúteos', 'Joelhos', 'Panturrilhas'] },
      { id: 'objetivo', l: 'O que espera do tratamento', t: 'area' },
      { s: 'Saúde e contraindicações' },
      { id: 'gestante', l: 'Gestante ou amamentando', t: 'sn' },
      { id: 'cirurgia', l: 'Cirurgia nos últimos 12 meses', t: 'sn', det: 'Qual, data e se o médico liberou drenagem/procedimentos' },
      { id: 'circulacao', l: 'Varizes, trombose ou problema de circulação', t: 'sn', det: 'Qual?' },
      { id: 'linfedema', l: 'Linfedema ou retirada de linfonodos', t: 'sn' },
      { id: 'cardiaco', l: 'Problema cardíaco ou marcapasso', t: 'sn', det: 'Qual?' },
      { id: 'metal', l: 'Implante metálico, prótese ou DIU de cobre', t: 'sn', det: 'Onde?' },
      { id: 'renal', l: 'Problema renal', t: 'sn' },
      { id: 'hernia', l: 'Hérnia (abdominal, umbilical ou de disco)', t: 'sn' },
      { id: 'hematoma', l: 'Faz hematomas com facilidade', t: 'sn' },
      { id: 'sensibilidade', l: 'Sensibilidade alterada ao calor ou ao frio', t: 'sn' },
      { id: 'hormonios', l: 'Anticoncepcional ou hormônios em uso', t: 'txt' },
      { id: 'ciclo', l: 'Fase do ciclo hoje', t: 'sel', o: ['Menstruada', 'Pré-menstrual', 'Outra fase', 'Não menstrua'] },
      { s: 'Medidas' },
      { id: 'peso', l: 'Peso (kg)', t: 'num' },
      { id: 'altura', l: 'Altura (cm)', t: 'num' },
      { id: 'cintura', l: 'Cintura (cm)', t: 'num' },
      { id: 'abdomen', l: 'Abdômen, na altura do umbigo (cm)', t: 'num' },
      { id: 'quadril', l: 'Quadril (cm)', t: 'num' },
      { id: 'coxa_d', l: 'Coxa direita (cm)', t: 'num' },
      { id: 'coxa_e', l: 'Coxa esquerda (cm)', t: 'num' },
      { id: 'braco_d', l: 'Braço direito (cm)', t: 'num' },
      { id: 'braco_e', l: 'Braço esquerdo (cm)', t: 'num' },
      { s: 'Avaliação da profissional' },
      { id: 'celulite', l: 'Celulite', t: 'sel', o: ['Ausente', 'Grau 1', 'Grau 2', 'Grau 3', 'Grau 4'] },
      { id: 'flacidez', l: 'Flacidez', t: 'sel', o: ['Ausente', 'Tissular (pele)', 'Muscular', 'Mista'] },
      { id: 'estrias', l: 'Estrias', t: 'sel', o: ['Ausentes', 'Rubras (recentes)', 'Albas (antigas)', 'Rubras e albas'] },
      { id: 'gordura', l: 'Gordura localizada: onde e quanto', t: 'txt' },
      { id: 'plano', l: 'Plano de tratamento (técnicas e número de sessões)', t: 'area' },
      { id: 'observacoes', l: 'Observações', t: 'area' },
    ]},
  };
  const DECLARACAO_ESPECIFICA = 'A paciente conferiu estas informações e autorizou o registro destes dados para o atendimento.';
  var areasAtuacao = { hof: false, tricologia: false, corporal: false };
  const demoEspecificas = {}; // { pacienteId: { tipo: [registros] } } — só no modo demonstração
  const espEstado = {}; // { tipo: { registros, mostrandoId, seq } }

  function espRotulo(tipo, id){
    if(id === 'consentimento') return 'Autorização da paciente';
    const c = (ESPECIALIDADES[tipo] || { campos: [] }).campos.find(x => x.id === id);
    if(c) return c.l;
    const base = id.replace(/_qual$/, '');
    const cb = (ESPECIALIDADES[tipo] || { campos: [] }).campos.find(x => x.id === base);
    return cb ? (cb.det || 'Detalhes') : id;
  }
  // { campo: valor } → [[rótulo, valor]] na ordem do formulário (para histórico, exportação e impressão)
  function espLinhas(tipo, dados){
    const out = [];
    (ESPECIALIDADES[tipo] || { campos: [] }).campos.forEach(c => {
      if(!c.id) return;
      const v = dados[c.id];
      if(v != null && v !== '' && !(Array.isArray(v) && !v.length)) out.push([c.l, Array.isArray(v) ? v.join(', ') : (c.t === 'date' ? (lgpdData(v) || v) : String(v))]);
      if(c.det && dados[c.id + '_qual']) out.push(['↳ ' + c.det, dados[c.id + '_qual']]);
    });
    if(dados.consentimento) out.push(['Autorização da paciente', 'Sim']);
    return out;
  }

  function montarPainelEspecifico(tipo){
    const esp = ESPECIALIDADES[tipo];
    const painel = document.getElementById('panel-' + tipo);
    if(!painel || !esp) return;
    let html = `<div class="comanda-aviso" id="esp-aviso-${tipo}" style="display:none;"></div>`;
    let aberto = false;
    const fechar = () => aberto ? '</div></div>' : '';
    esp.campos.forEach((c, i) => {
      if(c.s){
        html += fechar();
        html += `<div class="anamnese-card"><div class="anamnese-card-head"><div class="anamnese-title">${escHTML(i === 0 ? esp.titulo + ' — ' + c.s : c.s)}</div></div><div class="form-grid">`;
        aberto = true; return;
      }
      const nome = `esp-${tipo}-${c.id}`;
      const largo = (c.t === 'area' || c.t === 'chips') ? ' esp-full' : '';
      let campo = '';
      if(c.t === 'area') campo = `<textarea class="anamnese-textarea" id="${nome}" rows="3" style="min-height:70px;"></textarea>`;
      else if(c.t === 'txt') campo = `<input type="text" id="${nome}" class="anamnese-select">`;
      else if(c.t === 'num') campo = `<input type="number" step="0.1" min="0" inputmode="decimal" id="${nome}" class="anamnese-select">`;
      else if(c.t === 'date') campo = `<input type="date" id="${nome}" class="anamnese-select">`;
      else if(c.t === 'sel' || c.t === 'sn'){
        const ops = c.t === 'sn' ? SN : c.o;
        campo = `<select class="anamnese-select" id="${nome}"><option value="">Selecionar</option>${ops.map(o => `<option>${escHTML(o)}</option>`).join('')}</select>`;
        if(c.det) campo += `<input type="text" class="anamnese-select esp-qual" id="${nome}_qual" placeholder="${escHTML(c.det)}" style="display:none;">`;
      }
      else if(c.t === 'chips') campo = `<div class="chip-select esp-chips" id="${nome}">${c.o.map(o => `<div class="chip" data-valor="${escHTML(o)}">${escHTML(o)}</div>`).join('')}</div>`;
      html += `<div class="form-field${largo}"><label for="${nome}">${escHTML(c.l)}</label>${campo}${c.id === 'altura' ? `<div class="esp-imc" id="esp-${tipo}-imc"></div>` : ''}</div>`;
    });
    html += fechar();
    html += `<div class="anamnese-card">
      <label class="checkbox-item" style="margin-bottom:14px;"><input type="checkbox" id="esp-${tipo}-consentimento"> ${escHTML(DECLARACAO_ESPECIFICA)}</label>
      <div class="esp-rodape">
        <div class="esp-acoes">
          <button class="btn-outline" type="button" id="esp-${tipo}-limpar">Nova ficha em branco</button>
          <button class="btn-outline" type="button" id="esp-${tipo}-imprimir">Imprimir / PDF</button>
        </div>
        <button class="btn-save" type="button" id="esp-${tipo}-salvar">Salvar ${escHTML(esp.titulo)}</button>
      </div>
      <div class="toggle-subtitle" style="margin-top:22px;">Fichas anteriores</div>
      <div class="esp-hist" id="esp-${tipo}-hist"><p class="lgpd-texto">Nenhuma ficha salva ainda.</p></div>
    </div>`;
    painel.innerHTML = html;

    painel.querySelectorAll('.esp-chips .chip').forEach(ch => ch.addEventListener('click', () => ch.classList.toggle('selected')));
    esp.campos.filter(c => c.det).forEach(c => {
      const sel = document.getElementById(`esp-${tipo}-${c.id}`);
      sel.addEventListener('change', () => { document.getElementById(`esp-${tipo}-${c.id}_qual`).style.display = sel.value === 'Sim' ? 'block' : 'none'; });
    });
    if(tipo === 'corporal'){
      ['peso', 'altura'].forEach(id => document.getElementById('esp-corporal-' + id).addEventListener('input', atualizarImc));
    }
    document.getElementById(`esp-${tipo}-salvar`).addEventListener('click', () => salvarEspecifica(tipo));
    document.getElementById(`esp-${tipo}-limpar`).addEventListener('click', () => { preencherEspecifica(tipo, {}); espEstado[tipo] = { ...(espEstado[tipo] || {}), mostrandoId: null }; mostrarAvisoEspecifica(tipo); renderHistoricoEspecifica(tipo); });
    document.getElementById(`esp-${tipo}-imprimir`).addEventListener('click', () => imprimirEspecifica(tipo));
  }
  function atualizarImc(){
    const peso = parseFloat(String(document.getElementById('esp-corporal-peso').value).replace(',', '.'));
    const alt = parseFloat(String(document.getElementById('esp-corporal-altura').value).replace(',', '.'));
    const el = document.getElementById('esp-corporal-imc');
    if(peso > 0 && alt > 0){ const m = alt > 3 ? alt / 100 : alt; el.textContent = 'IMC: ' + (peso / (m * m)).toFixed(1).replace('.', ','); }
    else el.textContent = '';
  }
  function lerEspecifica(tipo){
    const dados = {};
    ESPECIALIDADES[tipo].campos.forEach(c => {
      if(!c.id) return;
      const el = document.getElementById(`esp-${tipo}-${c.id}`);
      if(!el) return;
      if(c.t === 'chips'){ const v = Array.from(el.querySelectorAll('.chip.selected')).map(x => x.dataset.valor); if(v.length) dados[c.id] = v; return; }
      const v = String(el.value || '').trim();
      if(v) dados[c.id] = c.t === 'num' ? (parseFloat(v.replace(',', '.')) || v) : v;
      if(c.det && v === 'Sim'){ const q = document.getElementById(`esp-${tipo}-${c.id}_qual`).value.trim(); if(q) dados[c.id + '_qual'] = q; }
    });
    if(document.getElementById(`esp-${tipo}-consentimento`).checked) dados.consentimento = true;
    return dados;
  }
  function preencherEspecifica(tipo, dados){
    dados = dados || {};
    ESPECIALIDADES[tipo].campos.forEach(c => {
      if(!c.id) return;
      const el = document.getElementById(`esp-${tipo}-${c.id}`);
      if(!el) return;
      if(c.t === 'chips'){ const lista = Array.isArray(dados[c.id]) ? dados[c.id] : []; el.querySelectorAll('.chip').forEach(x => x.classList.toggle('selected', lista.includes(x.dataset.valor))); return; }
      el.value = dados[c.id] != null ? String(dados[c.id]) : '';
      if(c.det){
        const q = document.getElementById(`esp-${tipo}-${c.id}_qual`);
        q.value = dados[c.id + '_qual'] || '';
        q.style.display = el.value === 'Sim' ? 'block' : 'none';
      }
    });
    document.getElementById(`esp-${tipo}-consentimento`).checked = !!dados.consentimento;
    if(tipo === 'corporal') atualizarImc();
  }
  function limparEspecificas(){
    Object.keys(ESPECIALIDADES).forEach(tipo => {
      if(!document.getElementById(`esp-${tipo}-salvar`)) return;
      espEstado[tipo] = { registros: [], mostrandoId: null, seq: ((espEstado[tipo] || {}).seq || 0) + 1, carregadoDe: null };
      preencherEspecifica(tipo, {});
      mostrarAvisoEspecifica(tipo);
      renderHistoricoEspecifica(tipo);
    });
  }
  function dataDoRegistro(r){ const d = new Date(r.created_at || r.criado_em || Date.now()); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function mostrarAvisoEspecifica(tipo){
    const av = document.getElementById(`esp-aviso-${tipo}`);
    if(!av) return;
    const st = espEstado[tipo] || {};
    const r = (st.registros || []).find(x => x.id === st.mostrandoId);
    if(r){ av.textContent = `Mostrando a ficha de ${dataDoRegistro(r)}. Ao salvar, uma nova ficha é registrada e esta continua no histórico.`; av.style.display = 'block'; }
    else av.style.display = 'none';
  }
  function renderHistoricoEspecifica(tipo){
    const box = document.getElementById(`esp-${tipo}-hist`);
    if(!box) return;
    const st = espEstado[tipo] || { registros: [] };
    if(!st.registros || !st.registros.length){ box.innerHTML = '<p class="lgpd-texto">Nenhuma ficha salva ainda.</p>'; return; }
    box.innerHTML = st.registros.map(r => `<div class="esp-hist-item${r.id === st.mostrandoId ? ' atual' : ''}" data-id="${escHTML(r.id)}">
      <span>Ficha de ${escHTML(dataDoRegistro(r))}${r.dados && r.dados.consentimento ? ' · autorizada' : ''}</span>
      <span style="display:flex; gap:6px;"><button type="button" class="ver">${r.id === st.mostrandoId ? 'Aberta' : 'Abrir'}</button><button type="button" class="apagar">Excluir</button></span></div>`).join('');
    box.querySelectorAll('.esp-hist-item').forEach(item => {
      const r = st.registros.find(x => String(x.id) === item.dataset.id);
      item.querySelector('.ver').addEventListener('click', () => { st.mostrandoId = r.id; preencherEspecifica(tipo, r.dados || {}); mostrarAvisoEspecifica(tipo); renderHistoricoEspecifica(tipo); });
      item.querySelector('.apagar').addEventListener('click', () => excluirEspecifica(tipo, r));
    });
  }
  async function carregarEspecifica(tipo){
    const p = currentPatient;
    if(!p) return;
    const st = espEstado[tipo] = espEstado[tipo] || { registros: [] };
    if(st.carregadoDe === String(p.id)) return; // já carregado para esta paciente
    const minha = st.seq = (st.seq || 0) + 1;
    let regs = [];
    if(isPacienteReal(p)){
      try{
        const { data, error } = await supabaseClient.from('anamneses_especificas').select('*')
          .eq('paciente_id', p.id).eq('tipo', tipo).order('created_at', { ascending: false });
        if(error){
          if(/anamneses_especificas|does not exist|schema cache/i.test(error.message || '')) showToast('Falta rodar o arquivo anamneses-especificas.sql no Supabase.');
          else showToast('Não foi possível carregar as fichas: ' + error.message);
          return;
        }
        regs = data || [];
      }catch(e){ return; }
    } else {
      regs = ((demoEspecificas[p.id] || {})[tipo] || []).slice();
    }
    if(minha !== st.seq || !currentPatient || String(currentPatient.id) !== String(p.id)) return; // trocou de paciente no meio
    regs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    st.registros = regs; st.carregadoDe = String(p.id);
    st.mostrandoId = regs[0] ? regs[0].id : null;
    preencherEspecifica(tipo, regs[0] ? regs[0].dados : {});
    mostrarAvisoEspecifica(tipo);
    renderHistoricoEspecifica(tipo);
  }
  async function salvarEspecifica(tipo){
    const p = currentPatient;
    if(!p){ showToast('Nenhuma paciente selecionada.'); return; }
    const dados = lerEspecifica(tipo);
    if(!Object.keys(dados).filter(k => k !== 'consentimento').length){ showToast('Preencha pelo menos um campo antes de salvar.'); return; }
    const st = espEstado[tipo] = espEstado[tipo] || { registros: [] };
    let novo;
    if(isPacienteReal(p)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const { data, error } = await supabaseClient.from('anamneses_especificas').insert({
        profissional_id: usuario.id, paciente_id: p.id, tipo, dados,
        consentimento_em: dados.consentimento ? new Date().toISOString() : null,
      }).select().single();
      if(error){
        showToast(/anamneses_especificas|does not exist|schema cache/i.test(error.message || '') ? 'Falta rodar o arquivo anamneses-especificas.sql no Supabase. Nada foi salvo.' : 'Erro ao salvar: ' + error.message);
        return;
      }
      novo = data;
    } else {
      novo = { id: 'demo-' + Date.now(), tipo, dados, created_at: new Date().toISOString() };
      demoEspecificas[p.id] = demoEspecificas[p.id] || {};
      (demoEspecificas[p.id][tipo] = demoEspecificas[p.id][tipo] || []).unshift(novo);
    }
    if(!novo.created_at) novo.created_at = new Date().toISOString();
    if(!novo.dados) novo.dados = dados;
    st.registros = [novo].concat((st.registros || []).filter(r => r.id !== novo.id));
    st.mostrandoId = novo.id; st.carregadoDe = String(p.id);
    mostrarAvisoEspecifica(tipo);
    renderHistoricoEspecifica(tipo);
    showToast(ESPECIALIDADES[tipo].titulo + ' salva!');
  }
  async function excluirEspecifica(tipo, r){
    if(!confirm(`Excluir a ficha de ${dataDoRegistro(r)}? Essa ação não pode ser desfeita.`)) return;
    const p = currentPatient;
    if(p && isPacienteReal(p)){
      const usuario = await usuarioParaSalvar();
      if(!usuario) return;
      const { error } = await supabaseClient.from('anamneses_especificas').delete().eq('id', r.id);
      if(error){ showToast('Não foi possível excluir: ' + error.message); return; }
    } else if(p){
      const lista = (demoEspecificas[p.id] || {})[tipo] || [];
      const i = lista.indexOf(r); if(i > -1) lista.splice(i, 1);
    }
    const st = espEstado[tipo];
    st.registros = st.registros.filter(x => x !== r);
    if(st.mostrandoId === r.id){ st.mostrandoId = null; preencherEspecifica(tipo, {}); }
    mostrarAvisoEspecifica(tipo);
    renderHistoricoEspecifica(tipo);
    showToast('Ficha excluída.');
  }
  function imprimirEspecifica(tipo){
    const p = currentPatient;
    if(!p) return;
    const esp = ESPECIALIDADES[tipo];
    const linhas = espLinhas(tipo, lerEspecifica(tipo));
    if(!linhas.length){ showToast('A ficha está em branco.'); return; }
    const prof = (perfilProfissional && perfilProfissional.nome) || '';
    const st = espEstado[tipo] || {};
    const r = (st.registros || []).find(x => x.id === st.mostrandoId);
    const quando = r ? dataDoRegistro(r) : new Date().toLocaleDateString('pt-BR');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHTML(esp.titulo)} — ${escHTML(p.name)}</title>
      <style>body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2a30;max-width:780px;margin:0 auto;padding:28px 18px;line-height:1.45}
      h1{font-size:20px;margin:0 0 4px} .meta{font-size:13px;color:#555;margin:0 0 18px;border-bottom:2px solid #c9a46a;padding-bottom:12px}
      table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee} th{width:42%;color:#444;font-weight:600}
      .ass{margin-top:46px;display:flex;gap:40px} .ass div{flex:1;border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center}
      @media print{button{display:none}}</style></head><body>
      <h1>${escHTML(esp.titulo)}</h1>
      <p class="meta">Paciente: <b>${escHTML(p.name)}</b> · Ficha de ${escHTML(quando)}${prof ? ' · Profissional: ' + escHTML(prof) : ''}</p>
      <table>${linhas.map(([k, v]) => `<tr><th>${escHTML(k)}</th><td>${escHTML(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
      <p style="font-size:12.5px;margin-top:22px;">Declaro que as informações acima são verdadeiras e que informei a profissional sobre minha saúde e procedimentos anteriores.</p>
      <div class="ass"><div>Assinatura da paciente</div><div>Assinatura da profissional</div></div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if(!w){ showToast('Permita pop-ups para imprimir a ficha.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ---------- Áreas de atuação (Configurações) ---------- */
  function aplicarAreasAtuacao(){
    Object.keys(ESPECIALIDADES).forEach(tipo => {
      const on = !!areasAtuacao[tipo];
      const tab = document.querySelector(`.registro-tab[data-tab="${tipo}"]`);
      if(tab) tab.style.display = on ? '' : 'none';
      const cb = document.querySelector(`.cfg-area[value="${tipo}"]`);
      if(cb) cb.checked = on;
      const painel = document.getElementById('panel-' + tipo);
      if(!on && painel && painel.classList.contains('active')) switchRegistroTab('dados');
    });
  }
  document.querySelectorAll('.cfg-area').forEach(cb => cb.addEventListener('change', async () => {
    areasAtuacao[cb.value] = cb.checked;
    aplicarAreasAtuacao();
    const ok = await salvarConfig('areas_atuacao', areasAtuacao);
    showToast(cb.checked ? `${ESPECIALIDADES[cb.value].titulo} ligada: a aba aparece na ficha das pacientes.` : `${ESPECIALIDADES[cb.value].titulo} desligada. As fichas salvas continuam guardadas.`);
    if(ok === false && !modoDemonstracao) console.warn('Áreas de atuação salvas só neste navegador.');
  }));
  async function carregarAreasAtuacao(){
    const v = await lerConfig('areas_atuacao');
    Object.keys(ESPECIALIDADES).forEach(t => { areasAtuacao[t] = !!(v && typeof v === 'object' && v[t]); });
    aplicarAreasAtuacao();
  }
  Object.keys(ESPECIALIDADES).forEach(montarPainelEspecifico);
  aplicarAreasAtuacao();

  if(confirmarToken){
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'none';
    document.getElementById('publicConfirmarScreen').style.display = 'block';
    (async () => {
      const mostrar = (id) => ['confCarregando', 'confConteudoWrap', 'confFeito', 'confInvalido'].forEach(x => { document.getElementById(x).style.display = x === id ? 'block' : 'none'; });
      let dados = null;
      try{
        const { data, error } = await supabaseClient.rpc('anamnese_para_confirmar', { p_token: confirmarToken });
        if(!error) dados = typeof data === 'string' ? JSON.parse(data) : data;
      }catch(e){}
      if(!dados){ mostrar('confInvalido'); return; }
      const primeiro = primeiroNomeDe(dados.paciente_nome || '');
      const prof = dados.profissional_nome ? ` com ${dados.profissional_nome}` : '';
      if(dados.confirmada_em){
        document.getElementById('confFeitoTexto').textContent = `Esta ficha já foi confirmada em ${new Date(dados.confirmada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Obrigada${primeiro ? ', ' + primeiro : ''}!`;
        mostrar('confFeito');
        return;
      }
      document.getElementById('confSaudacao').textContent = `${primeiro ? 'Oi, ' + primeiro + '! ' : ''}Esta é a ficha que preenchemos no seu atendimento${prof}. Confira com calma e confirme no fim da página.`;
      const sk = dados.skincare || {};
      document.getElementById('confConteudo').innerHTML =
        secaoConfHTML('Queixa e histórico', [['Principal queixa', dados.principal_queixa], ['Tratamentos anteriores', dados.tratamentos_anteriores], ['Como vê a própria pele', dados.autopercepcao], ['Anamnese integrativa', dados.integrativa]]) +
        secaoConfHTML('Saúde', linhasDeObjeto(dados.sistemica)) +
        secaoConfHTML('Estilo de vida', linhasDeObjeto(dados.estilo_vida)) +
        secaoConfHTML('Cuidados com a pele', linhasDeObjeto(sk).concat([['Investimento confortável', dados.investimento]])) +
        secaoConfHTML('Observações', [['Observações', dados.observacoes]]);
      document.getElementById('confVeracidadeTexto').innerHTML = escHTML(DECLARACAO_ANAMNESE) + ' <span class="required">*</span>';
      document.getElementById('confConsentTexto').textContent = CONSENTIMENTO_TEXTO;
      mostrar('confConteudoWrap');

      document.getElementById('confImprimir').addEventListener('click', () => window.print());
      document.getElementById('confConfirmar').addEventListener('click', async () => {
        const box = document.getElementById('confDeclaracoes');
        if(!document.getElementById('confVeracidade').checked || !document.getElementById('confConsentimento').checked){
          box.classList.add('consentimento-alerta');
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast('Para confirmar, marque as duas caixas.');
          return;
        }
        const btn = document.getElementById('confConfirmar');
        btn.disabled = true; btn.textContent = 'Confirmando…';
        const textoAceito = DECLARACAO_ANAMNESE + '\n\n' + CONSENTIMENTO_TEXTO;
        const { data: ok, error } = await supabaseClient.rpc('confirmar_anamnese', { p_token: confirmarToken, p_versao: CONSENTIMENTO_VERSAO, p_texto: textoAceito });
        if(error){ showToast('Não foi possível confirmar agora. Tente de novo.'); btn.disabled = false; btn.textContent = 'Confirmar'; return; }
        document.getElementById('confFeitoTexto').textContent = ok
          ? `Obrigada${primeiro ? ', ' + primeiro : ''}! A sua confirmação foi registrada${prof}. Pode fechar esta página.`
          : 'Esta ficha já tinha sido confirmada. Obrigada!';
        try{ document.getElementById('toast').classList.remove('show'); }catch(e){}
        mostrar('confFeito');
        window.scrollTo(0, 0);
      });
      ['confVeracidade', 'confConsentimento'].forEach(id => document.getElementById(id).addEventListener('change', () => document.getElementById('confDeclaracoes').classList.remove('consentimento-alerta')));
    })();
  }

  supabaseClient.auth.getSession().then(({ data }) => {
    if(data.session && !anamneseToken && !confirmarToken) enterApp();
  });

  if(anamneseToken){
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'none';
    const publicScreenEl = document.getElementById('publicAnamneseScreen');
    publicScreenEl.style.display = 'block';

    (async () => {
      // Busca SÓ o link deste código, por uma função segura do banco (a tabela não fica aberta ao público).
      let { data: linkRow, error } = await supabaseClient.rpc('anamnese_link_por_token', { p_token: anamneseToken });
      if(error && /anamnese_link_por_token|function|schema cache/i.test(error.message || '')){
        // compatibilidade: banco ainda sem a função nova
        ({ data: linkRow, error } = await supabaseClient.from('links_anamnese').select('*').eq('token', anamneseToken).single());
      }

      if(error || !linkRow || linkRow.respondida){
        document.getElementById('publicFormContent').style.display = 'none';
        document.getElementById('publicInvalidMsg').style.display = 'block';
        return;
      }

      const primeiroNome = (linkRow.paciente_nome || '').split(' ')[0];
      document.getElementById('publicPacienteSaudacao').textContent = primeiroNome
        ? `Oi, ${primeiroNome}! Preencha com calma — suas respostas vão direto para a sua profissional.`
        : 'Preencha com calma — suas respostas vão direto para a sua profissional.';

      document.getElementById('pubConsentimentoTexto').textContent = CONSENTIMENTO_TEXTO;
      document.getElementById('pubConsentimento').addEventListener('change', () => document.getElementById('pubConsentimentoCard').classList.remove('consentimento-alerta'));

      document.getElementById('btnEnviarAnamnesePublica').addEventListener('click', async () => {
        const container = document.getElementById('publicFormContent');
        let primeiroCampoFaltando = null;

        container.querySelectorAll('select.anamnese-select').forEach(sel => {
          if(!primeiroCampoFaltando && (!sel.value || sel.value === 'Selecionar')) primeiroCampoFaltando = sel;
        });
        const investimentoSel = document.getElementById('pubInvestimento');
        if(!primeiroCampoFaltando && investimentoSel && !investimentoSel.value) primeiroCampoFaltando = investimentoSel;
        container.querySelectorAll('input[type="text"], textarea').forEach(inp => {
          if(!primeiroCampoFaltando && inp.offsetParent !== null && !inp.value.trim()) primeiroCampoFaltando = inp;
        });
        const algumaAutopercepcaoMarcada = container.querySelectorAll('.pub-autopercepcao:checked').length > 0;
        if(!primeiroCampoFaltando && !algumaAutopercepcaoMarcada){
          primeiroCampoFaltando = container.querySelector('.pub-autopercepcao');
        }

        if(!primeiroCampoFaltando && !document.getElementById('pubConsentimento').checked){
          const card = document.getElementById('pubConsentimentoCard');
          card.classList.add('consentimento-alerta');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast('Para enviar, leia e marque a autorização de uso dos seus dados.');
          return;
        }
        if(primeiroCampoFaltando){
          showToast('Todos os campos são obrigatórios — falta preencher algo no formulário.');
          primeiroCampoFaltando.scrollIntoView({ behavior: 'smooth', block: 'center' });
          primeiroCampoFaltando.focus({ preventScroll: true });
          return;
        }

        const principalQueixa = document.getElementById('pubPrincipalQueixa').value.trim();

        const autopercepcao = Array.from(document.querySelectorAll('.pub-autopercepcao:checked'))
          .map(el => el.closest('.checkbox-item').textContent.trim());

        const payload = {
          paciente_id: linkRow.paciente_id,
          profissional_id: linkRow.profissional_id,
          token: anamneseToken,
          ...camposConsentimento(),
          principal_queixa: principalQueixa,
          tratamentos_anteriores: document.getElementById('pubTratamentosAnteriores').value.trim(),
          autopercepcao: autopercepcao,
          integrativa: document.getElementById('pubIntegrativa').value.trim(),
          sistemica: {
            medicamentos: document.getElementById('pubMedicamentos').value.trim(),
            alergias: document.getElementById('pubAlergias').value,
            alergia_tipo: document.getElementById('pubAlergiaTipo').value.trim(),
            gestante: document.getElementById('pubGestante').value,
            lactante: document.getElementById('pubLactante').value,
            diabetica: document.getElementById('pubDiabetico').value,
            diabetica_tipo: document.getElementById('pubDiabeticoTipo').value,
            tireoide: document.getElementById('pubTireoide').value,
            tireoide_tipo: document.getElementById('pubTireoideTipo').value,
            hipertensao: document.getElementById('pubHipertensao').value,
            hipotensao: document.getElementById('pubHipotensao').value,
            cardiopatologia: document.getElementById('pubCardiopatologia').value,
            epilepsia: document.getElementById('pubEpilepsia').value,
            trombose: document.getElementById('pubTrombose').value,
            insuficiencia_renal: document.getElementById('pubInsuficienciaRenal').value,
            hepatite: document.getElementById('pubHepatite').value,
            sop: document.getElementById('pubSOP').value,
            oncologicos: document.getElementById('pubOncologicos').value,
            bariatrico: document.getElementById('pubBariatrico').value,
            ansiedade: document.getElementById('pubAnsiedade').value,
            depressao: document.getElementById('pubDepressao').value,
            dermatite: document.getElementById('pubDermatite').value,
            dermatite_frequencia: document.getElementById('pubDermatiteFrequencia').value.trim(),
            asma: document.getElementById('pubAsma').value,
            asma_frequencia: document.getElementById('pubAsmaFrequencia').value.trim(),
            outras_doencas: document.getElementById('pubOutrasDoencas').value.trim(),
          },
          estilo_vida: {
            atividade_fisica: document.getElementById('pubAtividadeFisica').value,
            alimentacao: document.getElementById('pubAlimentacao').value,
            agua: document.getElementById('pubAgua').value,
            sono: document.getElementById('pubSono').value,
            sol: document.getElementById('pubSol').value,
            tabagista: document.getElementById('pubTabagista').value,
            alcool: document.getElementById('pubAlcool').value,
            alcool_frequencia: document.getElementById('pubAlcoolFrequencia').value.trim(),
            evacuacao: document.getElementById('pubEvacuacao').value,
            habito_urinario: document.getElementById('pubHabitoUrinario').value,
            frequencia_menstrual: document.getElementById('pubFrequenciaMenstrual').value,
          },
          skincare: {
            atual: document.getElementById('pubSkincareAtual').value.trim(),
            parado: document.getElementById('pubSkincareParado').value.trim(),
            regularidade: document.getElementById('pubRegularidade').value,
            como_gostaria: document.getElementById('pubComoGostaria').value,
          },
          investimento: document.getElementById('pubInvestimento').value,
          observacoes: document.getElementById('pubObservacoes').value.trim(),
        };

        const btn = document.getElementById('btnEnviarAnamnesePublica');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const { error: insertError } = await inserirAnamneseComConsentimento(payload);
        // Este link já tinha sido enviado (o banco não aceita duas respostas para o mesmo link):
        // mostra como enviado, sem criar outra pré-ficha.
        const jaEnviada = insertError && (insertError.code === '23505' || /duplicate|unique/i.test(insertError.message || ''));
        if(insertError && !jaEnviada){
          showToast('Erro ao enviar: ' + insertError.message);
          btn.disabled = false;
          btn.textContent = 'Enviar Respostas';
          return;
        }

        const { error: erroMarcar } = await supabaseClient.rpc('marcar_link_respondido', { p_token: anamneseToken });
        if(erroMarcar && /marcar_link_respondido|function|schema cache/i.test(erroMarcar.message || '')){
          await supabaseClient.from('links_anamnese').update({ respondida: true }).eq('token', anamneseToken);
        }

        document.getElementById('publicFormContent').style.display = 'none';
        document.getElementById('publicSubmittedMsg').style.display = 'block';
        window.scrollTo(0, 0);
      });
    })();
  }
