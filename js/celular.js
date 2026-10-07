/* Skin Expert Pro — Celular: menu de baixo, conta e áreas só do computador.
   Arquivo 17 de 17: a ordem dos arquivos no index.html importa. */

  /* ================= CELULAR: menu de baixo, conta e áreas só do computador ================= */
  // ehCelular() fica no nucleo.js (é usada por vários arquivos)
  const mobileNavEl = document.getElementById('mobileNav');
  function marcarMenuCelular(){
    const ativa = document.querySelector('.view.active');
    const id = ativa ? ativa.id.replace('view-', '') : '';
    const alvo = id === 'registro-paciente' ? 'pacientes' : id;
    mobileNavEl.querySelectorAll('button').forEach(b => {
      const on = b.dataset.view === alvo;
      b.classList.toggle('active', on);
      if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  mobileNavEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const item = document.querySelector(`.nav-item[data-view="${b.dataset.view}"]`);
    if(item) item.click();
    window.scrollTo(0, 0);
    marcarMenuCelular();
  }));
  new MutationObserver(marcarMenuCelular).observe(document.querySelector('.main'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  marcarMenuCelular();

  // Áreas que ficam só no computador: no celular aparece um aviso no lugar da tela
  const SO_COMPUTADOR = { catalogo: 'O Catálogo de Produtos', produto: 'O Catálogo de Produtos', financeiro: 'O Financeiro', equipe: 'O Meu Negócio', configuracoes: 'As Configurações', planos: 'Os Planos' };
  Object.keys(SO_COMPUTADOR).forEach(v => {
    const view = document.getElementById('view-' + v);
    if(!view) return;
    view.classList.add('so-computador');
    const aviso = document.createElement('div');
    aviso.className = 'aviso-computador';
    aviso.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      <h2>Disponível no computador</h2>
      <p>${SO_COMPUTADOR[v]} fica na versão para computador. No celular você usa o Dashboard, a Agenda e as Pacientes.</p>
      <button type="button">Voltar ao Dashboard</button>`;
    aviso.querySelector('button').addEventListener('click', () => { const d = document.querySelector('.nav-item[data-view="dashboard"]'); if(d) d.click(); });
    view.prepend(aviso);
  });

  // Ao virar celular com uma aba "só computador" aberta na ficha, volta para Dados
  window.matchMedia('(max-width: 760px)').addEventListener('change', (e) => {
    if(!e.matches || !ehCelular()) return;
    const aba = document.querySelector('.registro-tab.active');
    if(aba && ['planoskincare', 'recomendacoes'].includes(aba.dataset.tab)) switchRegistroTab('dados');
  });

  // Menu da conta (avatar no topo): Sair
  const btnConta = document.getElementById('btnConta'), contaMenu = document.getElementById('contaMenu');
  function fecharMenuConta(){ contaMenu.classList.remove('open'); btnConta.setAttribute('aria-expanded', 'false'); }
  btnConta.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = !contaMenu.classList.contains('open');
    if(abrir){
      const nome = (typeof perfilProfissional !== 'undefined' && perfilProfissional && perfilProfissional.nome) || '';
      document.getElementById('contaNome').textContent = nome || 'Minha conta';
    }
    contaMenu.classList.toggle('open', abrir);
    btnConta.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  });
  contaMenu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fecharMenuConta);
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') fecharMenuConta(); });
  document.getElementById('contaSair').addEventListener('click', () => {
    fecharMenuConta();
    const sair = document.querySelector('.nav-item[data-logout]');
    if(sair) sair.click();
  });

  /* ---------- Início: se já está logada, entra direto (precisa ser a última coisa a rodar) ---------- */
  supabaseClient.auth.getSession().then(({ data }) => {
    if(data.session && !anamneseToken && !confirmarToken) enterApp();
  });
