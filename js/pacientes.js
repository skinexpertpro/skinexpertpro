/* Skin Expert Pro — Pacientes: lista/tabela de pacientes, aniversariantes do dia e janela de nova paciente.
   Arquivo 2 de 17: a ordem dos arquivos no index.html importa. */

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
