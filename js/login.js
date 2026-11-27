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

  /* ---------- Criar a nova senha (quem chegou pelo link do e-mail) ----------
     O link do e-mail já entra na conta; esta janela pede a senha nova e grava. */
  let janelaNovaSenhaAberta = false;
  function mostrarJanelaNovaSenha(){
    if(janelaNovaSenhaAberta) return;
    janelaNovaSenhaAberta = true;
    const fundo = document.createElement('div');
    fundo.id = 'novaSenhaFundo';
    fundo.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(40,20,25,.55); display:flex; align-items:center; justify-content:center; padding:16px;';
    fundo.innerHTML = `
      <div class="auth-box" role="dialog" aria-labelledby="novaSenhaTitulo" style="box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div class="auth-title" id="novaSenhaTitulo">Crie sua nova senha</div>
        <div class="auth-sub">Digite a senha nova duas vezes. Depois é com ela que você entra.</div>
        <div class="auth-error" id="novaSenhaErro"></div>
        <div class="auth-field">
          <label>Nova senha</label>
          <input type="password" id="novaSenha1" placeholder="Pelo menos 6 caracteres" autocomplete="new-password">
        </div>
        <div class="auth-field">
          <label>Repita a nova senha</label>
          <input type="password" id="novaSenha2" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="auth-btn" id="novaSenhaSalvar">Salvar nova senha</button>
      </div>`;
    document.body.appendChild(fundo);
    const erro = fundo.querySelector('#novaSenhaErro');
    const mostrarErro = msg => { erro.textContent = msg; erro.classList.add('show'); };
    const btn = fundo.querySelector('#novaSenhaSalvar');
    setTimeout(() => { try{ fundo.querySelector('#novaSenha1').focus(); }catch(e){} }, 50);
    btn.addEventListener('click', async () => {
      erro.classList.remove('show');
      const s1 = fundo.querySelector('#novaSenha1').value;
      const s2 = fundo.querySelector('#novaSenha2').value;
      if(s1.length < 6){ mostrarErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
      if(s1 !== s2){ mostrarErro('As duas senhas não estão iguais. Digite de novo.'); return; }
      btn.disabled = true; btn.textContent = 'Salvando…';
      try{
        const { error } = await supabaseClient.auth.updateUser({ password: s1 });
        if(error) throw error;
        fundo.remove();
        janelaNovaSenhaAberta = false;
        veioDoLinkDeNovaSenha = false;
        showToast('Senha alterada. Na próxima vez, entre com a senha nova.');
      }catch(err){
        const msg = String((err && err.message) || '');
        if(/different from the old/i.test(msg)) mostrarErro('A senha nova tem que ser diferente da antiga.');
        else if(/session|expired|jwt/i.test(msg)) mostrarErro('O link expirou. Volte à tela de entrada, clique em "Esqueci minha senha" e use o e-mail mais recente.');
        else mostrarErro('Não deu para salvar a senha: ' + (msg || 'tente de novo.'));
        btn.disabled = false; btn.textContent = 'Salvar nova senha';
      }
    });
  }
  supabaseClient.auth.onAuthStateChange(evento => { if(evento === 'PASSWORD_RECOVERY') mostrarJanelaNovaSenha(); });
  if(linkDeEmailExpirado && !veioDoLinkDeNovaSenha){
    showAuthError('Esse link do e-mail expirou ou já foi usado. Para trocar a senha, digite seu e-mail, clique em "Esqueci minha senha" e abra só o e-mail mais recente.');
    try{ history.replaceState(null, '', window.location.pathname); }catch(e){}
  }
  if(veioDoLinkDeNovaSenha){
    supabaseClient.auth.getSession().then(({ data }) => {
      if(data && data.session) mostrarJanelaNovaSenha();
      else showAuthError('Esse link de senha expirou ou já foi usado. Clique em "Esqueci minha senha" de novo e use só o e-mail mais recente.');
    }).catch(() => {});
  }

  /* ---------- Troca de conta no mesmo navegador ----------
     O app guarda os dados na memória da página. Ao sair (ou ao entrar outra conta), a página
     recomeça do zero: assim nada da conta anterior (serviços, pacotes, lembretes...) aparece na próxima. */
  let contaCarregada = null;
  function recomecarDoZero(){ window.location.replace(window.location.pathname); }
  supabaseClient.auth.onAuthStateChange((evento, sessao) => {
    if(!contaCarregada) return;
    if(evento === 'SIGNED_OUT') recomecarDoZero();
    else if(evento === 'SIGNED_IN' && sessao && sessao.user && contaCarregada !== 'demo' && sessao.user.id !== contaCarregada) recomecarDoZero();
  });

  async function enterApp(){
    try{
      const { data: { user } } = await supabaseClient.auth.getUser();
      if(contaCarregada && user && user.id !== contaCarregada){ recomecarDoZero(); return; }
      if(user) contaCarregada = user.id;
    }catch(e){}
    modoDemonstracao = false;
    document.body.classList.remove('modo-demo');
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'flex';
    // Assinatura: sem plano liberado, mostra a tela de escolher o plano (não espera o resto carregar)
    if(typeof verificarAssinatura === 'function') verificarAssinatura();
    // Velocidade: tudo que não depende de outra coisa carrega AO MESMO TEMPO
    // (antes era um depois do outro, e cada espera somava).
    const semTravar = pr => Promise.resolve().then(pr).catch(e => console.warn('Carregamento:', e));
    await Promise.all([
      carregarPerfilProfissionalReal, carregarIntegracaoGoogleAgendaReal,
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
      semTravar(() => typeof carregarTermos === 'function' && carregarTermos()),
    ]);
    setTimeout(avisarHorariosDuplicados, comandasCriadas ? 5000 : 0); // não cobre o aviso das comandas
  }

  /* ---------- Modo demonstração: agora só com login e senha ----------
     Crie no Supabase (Authentication › Users › Add user) um usuário com o e-mail abaixo e a senha que quiser.
     Quem entrar com ele vê o app com dados de exemplo e nada é salvo. A senha é conferida pelo Supabase. */
  const EMAIL_DEMONSTRACAO = 'skinexpertpro.app@gmail.com';
  function entrarModoDemonstracao(){
    if(contaCarregada && contaCarregada !== 'demo'){ recomecarDoZero(); return; }
    contaCarregada = 'demo';
    modoDemonstracao = true;
    document.body.classList.add('modo-demo');
    authScreenEl.style.display = 'none';
    appRootEl.style.display = 'flex';
    carregarPerfilProfissionalDemo();
    try{ carregarAcompanhamentos(); }catch(e){}
    try{ carregarTermos(); }catch(e){}
    // Catálogo de Produtos e Dicionário de Ativos: sempre os de verdade (os mesmos das profissionais).
    // A sessão do login de demonstração fica aberta só para ler esses dados compartilhados;
    // nada é salvo, porque o app bloqueia gravações no modo demonstração.
    try{ loadProdutosFromSupabase(); }catch(e){}
    try{ loadAtivosFromSupabase(); }catch(e){}
    showToast('Modo demonstração — os dados aqui não são salvos.');
  }
  function ehLoginDemonstracao(email){ return String(email || '').trim().toLowerCase() === EMAIL_DEMONSTRACAO; }

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
        if(ehLoginDemonstracao(email)){
          // Login de demonstração: abre com pacientes, agenda e financeiro de exemplo + catálogo real.
          document.getElementById('authSenha').value = '';
          entrarModoDemonstracao();
        } else {
          await enterApp();
        }
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
