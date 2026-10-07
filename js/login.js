/* Skin Expert Pro — Login/cadastro e formulário público de anamnese (link da paciente).
   Arquivo 14 de 17: a ordem dos arquivos no index.html importa. */

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
      semTravar(carregarAcompanhamentos),
      semTravar(async () => { comandasCriadas = await garantirComandasDaAgenda(); }),
      semTravar(carregarConfiguracoesSalvas),
    ]);
    setTimeout(avisarHorariosDuplicados, comandasCriadas ? 5000 : 0); // não cobre o aviso das comandas
  }

  document.getElementById('authDemoLink').addEventListener('click', () => {
    if(ehCelular()) return; // no celular não existe modo demonstração
    modoDemonstracao = true;
    document.body.classList.add('modo-demo');
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'flex';
    carregarPerfilProfissionalDemo();
    carregarIntegracaoWhatsappDemo();
    try{ carregarAcompanhamentos(); }catch(e){}
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
