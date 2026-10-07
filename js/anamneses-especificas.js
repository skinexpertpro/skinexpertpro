/* Skin Expert Pro — Anamneses específicas: Harmonização Facial, Tricologia, Corporal.
   Arquivo 16 de 17: a ordem dos arquivos no index.html importa. */

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

  // (a verificação "já está logada?" fica no fim do celular.js, depois que todos os arquivos carregaram)

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
