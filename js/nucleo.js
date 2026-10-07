/* Skin Expert Pro — Núcleo: conexão com o Supabase, consentimento, dados profissionais, WhatsApp/Google Agenda, avisos (toast) e navegação entre telas.
   Arquivo 1 de 17: a ordem dos arquivos no index.html importa. */

  // Variáveis usadas por vários arquivos (o valor inicial fica no arquivo de cada área)
  var lembretesEstado, lembretesMostrarFuturos, mensagensModelos, mensagensHistorico, formasPagamento, comandasCarregadasOk, agendaCarregadaOk, garantindoComandas, modoDemonstracao, avisoConfigSemTabela, areasAtuacao;

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

  /* ---------- Está no celular? (usada por vários arquivos) ---------- */
  function ehCelular(){ return document.documentElement.classList.contains('celular-ativo') && window.matchMedia('(max-width: 760px)').matches; }

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
