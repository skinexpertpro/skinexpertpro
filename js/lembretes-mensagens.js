/* Skin Expert Pro — Lembretes automáticos e Centro de Mensagens (modelos, envio pelo WhatsApp, histórico).
   Arquivo 8 de 17: a ordem dos arquivos no index.html importa. */

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

    // O histórico de mensagens fica no Histórico de cada paciente (não mais numa lista geral aqui)
    try{ renderMensagensDaPaciente(); }catch(e){}
  }

  /* ---------- Mensagens enviadas: aparecem no Histórico da paciente ---------- */
  // O registro continua o mesmo por trás (é ele que marca "✓ enviado" nos lembretes e entra na exportação LGPD).
  function renderMensagensDaPaciente(){
    const box = document.getElementById('mensagensPacienteContainer');
    if(!box) return;
    box.innerHTML = '';
    const p = currentPatient;
    if(!p) return;
    const pid = String(p.id);
    const nomes = Object.fromEntries(listaModelos().map(m => [m.id, m.titulo]));
    const lista = (mensagensHistorico || []).filter(h => h.pacienteId != null ? String(h.pacienteId) === pid : h.paciente === p.name);
    const card = document.createElement('div');
    card.className = 'registro-card msg-paciente-card';
    card.innerHTML = `
      <div class="msg-paciente-topo">
        <div class="msg-paciente-titulo">Mensagens enviadas pelo WhatsApp</div>
        <div class="historico-count-badge">${lista.length} ${lista.length === 1 ? 'mensagem' : 'mensagens'}</div>
      </div>
      <div class="msg-paciente-lista"></div>
      <div class="msg-paciente-nota">Registradas quando você abre o WhatsApp pelo app.</div>`;
    const alvo = card.querySelector('.msg-paciente-lista');
    if(!lista.length){
      alvo.innerHTML = '<div class="msg-vazio">Nenhuma mensagem enviada para esta paciente ainda.</div>';
    }
    lista.forEach(h => {
      const dt = new Date(h.em);
      const row = document.createElement('div');
      row.className = 'msg-hist-item';
      row.title = 'Clique para ver a mensagem inteira';
      row.innerHTML = `<div class="quando">${isNaN(dt) ? '' : dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="min-width:0;"><strong>${escHTML(nomes[h.modelo] || h.modelo || 'Mensagem')}</strong><div class="txt">${escHTML(h.texto || '')}</div></div>`;
      row.addEventListener('click', () => row.classList.toggle('aberto'));
      alvo.appendChild(row);
    });
    box.appendChild(card);
  }
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
