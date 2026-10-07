/* Skin Expert Pro — Planos (assinatura).
   Arquivo 6 de 17: a ordem dos arquivos no index.html importa. */

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
