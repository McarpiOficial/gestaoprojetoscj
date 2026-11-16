// Telas "Planejamento" (menu lateral): agrupa os projetos das abas "Projetos Recebidos",
// "CIINTEC" e "Finalizados" pelos vínculos que a própria planilha já guarda — coluna L
// ("Plano Governo") e coluna M ("Planej. Estratégico"), carregadas em cada projeto como
// `planoGovernoLink` / `planejEstrategicoLink` (js/data-fetch.js) — em vez de tentar adivinhar
// o vínculo pelo nome do ticket. O status (Atendido/Andamento/Faltante) é sempre calculado ao
// vivo a partir de quem está vinculado a cada item; nada fica fixado em planejamento-data.js.

// As 3 abas que a planilha usa para vincular projetos a Planejamento — Suspenso (a aba
// separada de projetos antigos parados) fica de fora por não ter essas colunas.
function planejamentoProjectPool() {
    return parsedProjectsList.filter(p => ['ativos', 'parados', 'backlog', 'encerrados', 'ciintec'].includes(p.viewCategory));
}

function isProjectAtendido(p) {
    return p.viewCategory === 'encerrados' || (p.status && p.status.toUpperCase().trim() === 'FINALIZADOS');
}

function classifyPlanejamentoStatus(matched) {
    if (matched.some(isProjectAtendido)) return 'atendido';
    if (matched.length > 0) return 'andamento';
    return 'faltante';
}

// Um projeto pode estar vinculado a mais de um item ao mesmo tempo (interseção entre metas/
// propostas) — nesse caso a célula tem vários valores separados por ";". Quebra em segmentos
// individuais, descartando vazios (inclusive o "resto" depois de um ";" solto no fim do texto,
// que é só pontuação da frase, não um segundo item). Também descarta segmentos sem nenhuma
// letra/número (ex.: "-", que a planilha usa para "sem vínculo"): sem isso, o "-" casava com
// toda meta do Planej. Estratégico, já que o texto "Ação - Meta" sempre contém um hífen.
function splitLinkSegments(rawLinkText) {
    if (!rawLinkText) return [];
    return rawLinkText.split(';').map(s => s.trim()).filter(s => /[\p{L}\p{N}]/u.test(s));
}

// Cada segmento da coluna L ("Plano Governo") normalmente vem como "N – rótulo curto" (o
// número é a posição do item na aba "Plano Governo", 1 a 13). Extrai esse número; se não achar
// (alguns segmentos têm o texto completo colado em vez do rótulo numerado), cai para casar o
// texto contra o item correspondente em PG_PROPOSTAS.
function extractPlanoGovernoNumeroDoSegmento(segmento) {
    const m = segmento.match(/^(\d{1,2})\s*[–—\-−]/);
    if (m) {
        const n = parseInt(m[1], 10);
        if (getPgPropostas().some(item => item.numero === n)) return n;
    }
    const norm = normalizeString(segmento);
    const found = getPgPropostas().find(item => {
        const itemNorm = normalizeString(item.texto);
        return norm === itemNorm || norm.includes(itemNorm) || itemNorm.includes(norm);
    });
    return found ? found.numero : null;
}

// Todos os itens do Plano Governo a que um projeto está vinculado (pode ser mais de um).
function extractPlanoGovernoNumeros(linkText) {
    return splitLinkSegments(linkText)
        .map(extractPlanoGovernoNumeroDoSegmento)
        .filter(n => n !== null);
}

// Projetos com Status SUSPENSO são ignorados no Plano Governo (não contam como vinculados, nem
// aparecem como etiqueta). Só vale aqui — o Planej. Estratégico continua considerando todos.
function isProjectSuspenso(p) {
    return !!p.status && normalizeString(p.status) === 'suspenso';
}

function matchPlanoGovernoProjects(numero) {
    return planejamentoProjectPool().filter(p => !isProjectSuspenso(p) && extractPlanoGovernoNumeros(p.planoGovernoLink).includes(numero));
}

// O texto que a coluna M usa para vincular um projeto a uma meta é sempre "Ação - Meta" —
// calculado aqui, nunca guardado em planejamento-data.js (guardar um texto de busca fixo por
// meta já causou bug: uma meta sem projeto vinculado no momento em que os dados foram escritos
// ficava travada em Faltante para sempre, mesmo depois de alguém vincular um projeto a ela).
function peMetaLinkText(meta) {
    return `${meta.acao} - ${meta.meta}`;
}

// Cada segmento da coluna M ("Planej. Estratégico") vem como "Ação - Meta" (texto livre, às
// vezes com tab solto no início). Compara normalizado contra o texto da meta — em qualquer um
// dos segmentos, não só no primeiro.
function isPlanejEstrategicoMatch(linkText, metaLinkText) {
    if (!linkText || !metaLinkText) return false;
    const b = normalizeString(metaLinkText);
    return splitLinkSegments(linkText).some(segmento => {
        const a = normalizeString(segmento);
        return a === b || a.includes(b) || b.includes(a);
    });
}

function matchPlanejEstrategicoProjects(meta) {
    return planejamentoProjectPool().filter(p => isPlanejEstrategicoMatch(p.planejEstrategicoLink, peMetaLinkText(meta)));
}

// Metas do Planej. Estratégico: lidas ao vivo da aba "Planej. Estrategico" (colunas A=Ação,
// B=Meta, C=Ano) — qualquer meta nova na planilha aparece sozinha. PE_METAS (planejamento-data.js)
// é só reserva, usada enquanto a leitura não chegou ou se ela falhar.
function getPeMetas() {
    return peMetasLive || PE_METAS;
}

function fetchPlanejEstrategicoMetas() {
    const oldScript = document.getElementById('pe-metas-jsonp');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'pe-metas-jsonp';
    const antiCache = new Date().getTime();
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent('Planej. Estrategico')}&headers=0&tq=select *&nocache=${antiCache}&tqx=responseHandler:handlePlanejEstrategicoMetasResponse`;
    document.body.appendChild(script);
}

function handlePlanejEstrategicoMetasResponse(response) {
    if (!response || !response.table) return;

    const text = (cell) => (cell && cell.v !== undefined && cell.v !== null) ? cell.v.toString().trim() : '';
    const metas = response.table.rows
        .map(row => row && row.c ? { acao: text(row.c[0]), meta: text(row.c[1]), ano: parseInt(text(row.c[2]), 10) } : null)
        .filter(m => m && m.acao && m.meta)
        .map((m, i) => ({ id: `pe${i + 1}`, acao: m.acao, meta: m.meta, ano: isNaN(m.ano) ? null : m.ano }));

    if (metas.length === 0) return;
    peMetasLive = metas;
    if (parsedProjectsList.length > 0) renderPlanejamento();
}

// Propostas do Plano Governo: lidas ao vivo da aba "Plano Governo" (A=texto, B=número que a
// coluna L dos projetos usa); se a coluna B não for numérica, vale a posição da linha.
// PG_PROPOSTAS (planejamento-data.js) é só reserva, como PE_METAS.
function getPgPropostas() {
    return pgPropostasLive || PG_PROPOSTAS;
}

function fetchPlanoGovernoPropostas() {
    const oldScript = document.getElementById('pg-propostas-jsonp');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'pg-propostas-jsonp';
    const antiCache = new Date().getTime();
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent('Plano Governo')}&headers=0&tq=select *&nocache=${antiCache}&tqx=responseHandler:handlePlanoGovernoPropostasResponse`;
    document.body.appendChild(script);
}

function handlePlanoGovernoPropostasResponse(response) {
    if (!response || !response.table) return;

    const propostas = response.table.rows
        .map((row, i) => {
            if (!row || !row.c) return null;
            const texto = (row.c[0] && row.c[0].v !== undefined && row.c[0].v !== null) ? row.c[0].v.toString().trim() : '';
            const n = row.c[1] ? parseInt(row.c[1].v, 10) : NaN;
            return { numero: isNaN(n) ? i + 1 : n, texto };
        })
        .filter(p => p && p.texto);

    if (propostas.length === 0) return;
    pgPropostasLive = propostas;
    if (parsedProjectsList.length > 0) renderPlanejamento();
}

function renderPlanejamento() {
    if (typeof PE_METAS === 'undefined' || typeof PG_PROPOSTAS === 'undefined') return;
    if (!document.getElementById('pe-kpi-atendido')) return; // panes ainda não estão no DOM
    renderPlanejamentoEstrategico();
    renderPlanoGoverno();
}

// Os grupos Atendido/Em Andamento/Faltante começam fechados (ver .plan-group no CSS); clicar
// no título expande/recolhe. Só mexe na classe do grupo clicado — o conteúdo é recriado a cada
// renderPlanejamento() sem depender do estado aberto/fechado, que fica só no DOM do cabeçalho.
function togglePlanGroup(headerEl) {
    const group = headerEl.closest('.plan-group');
    if (group) group.classList.toggle('expanded');
}

// "DT" = aba "Projetos Recebidos" (viewCategory ativos/parados/backlog); "CIINTEC" = aba
// CIINTEC. Só usado no grupo Em Andamento (showOrigin) — Atendido/Faltante não pedem essa marca.
function projectOriginLabel(p) {
    if (p.viewCategory === 'ciintec') return 'CIINTEC';
    if (['ativos', 'parados', 'backlog'].includes(p.viewCategory)) return 'DT';
    return null;
}

function planItemHtml({ badgeText, badgeClass, titleHtml, subHtml, matched, showOrigin }) {
    const chips = matched.length
        ? `<div class="plan-item-projects">${matched.map(p => {
            const origin = showOrigin ? projectOriginLabel(p) : null;
            const originPrefix = origin ? `(${origin}) ` : '';
            return `<span class="plan-project-chip" onclick="openProjectModal(${p.id})" title="${escapeHtml(p.secretaria)} — clique para abrir">${originPrefix}${escapeHtml(p.ticket)} <small>(${escapeHtml(p.status)})</small></span>`;
        }).join('')}</div>`
        : '';
    return `<div class="plan-item">
        <div class="plan-item-header">
            <span class="plan-item-title">${titleHtml}</span>
            <span class="plan-year-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="plan-item-sub">${subHtml}</div>
        ${chips}
    </div>`;
}

function renderPlanejamentoEstrategico() {
    const anoAtual = PLANEJAMENTO_ANO_ATUAL;
    const computed = getPeMetas().map(meta => {
        const matched = matchPlanejEstrategicoProjects(meta);
        const status = classifyPlanejamentoStatus(matched);
        const futuro = status === 'faltante' && meta.ano > anoAtual;
        return { meta, matched, status, futuro };
    });

    const total = computed.length || 1;
    const atendido = computed.filter(c => c.status === 'atendido').length;
    const andamento = computed.filter(c => c.status === 'andamento').length;
    const faltanteFuturo = computed.filter(c => c.status === 'faltante' && c.futuro).length;
    const faltanteAtual = computed.filter(c => c.status === 'faltante' && !c.futuro).length;
    const faltanteTotal = faltanteFuturo + faltanteAtual;

    const pct = (n) => Math.round((n / total) * 100);

    document.getElementById('pe-kpi-atendido').textContent = `${pct(atendido)}%`;
    document.getElementById('pe-kpi-restante').textContent = `${pct(andamento + faltanteTotal)}%`;
    document.getElementById('pe-kpi-restante-detalhe').textContent = `andamento ${pct(andamento)}% · faltante ${pct(faltanteTotal)}%`;
    document.getElementById('pe-kpi-futuro').textContent = `${pct(faltanteFuturo)}%`;
    document.getElementById('pe-kpi-atual').textContent = `${pct(faltanteAtual)}%`;

    if (chartPlanEstrategicoInstance) chartPlanEstrategicoInstance.destroy();
    const canvas = document.getElementById('chartPlanEstrategico');
    if (canvas) {
        const dataArr = [atendido, andamento, faltanteAtual, faltanteFuturo];
        const labelsArr = ['Atendido', 'Em Andamento', 'Faltante', 'Faltante Futuro (2027-2028)'];
        const bgColors = ['#059669', '#0284c7', '#dc2626', '#94a3b8'];
        chartPlanEstrategicoInstance = new Chart(canvas, {
            type: 'doughnut',
            data: { labels: labelsArr, datasets: [{ data: dataArr, backgroundColor: bgColors, borderWidth: 1, borderColor: '#ffffff' }] },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: 12 }, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 12, weight: '500' }, color: '#334155' } }, datalabels: { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: (val) => { if (!val) return ''; const perc = ((val / (atendido + andamento + faltanteTotal || 1)) * 100).toFixed(0); return [`${val}`, `(${perc}%)`]; } } } }
        });
    }

    const groups = { atendido: [], andamento: [], faltante: [] };
    computed.forEach(c => {
        const badgeText = c.status === 'faltante' && c.futuro ? `${c.meta.ano} · Futuro` : `${c.meta.ano ?? 'Sem ano'}`;
        const badgeClass = c.status === 'faltante' && c.futuro ? 'futuro' : '';
        groups[c.status].push(planItemHtml({
            badgeText, badgeClass,
            titleHtml: `${escapeHtml(c.meta.acao)}: ${escapeHtml(c.meta.meta)}`,
            subHtml: 'Planej. Estratégico — aba "Planej. Estrategico"',
            matched: c.matched,
            showOrigin: c.status === 'andamento'
        }));
    });

    document.getElementById('pe-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma meta atendida ainda.</p>';
    document.getElementById('pe-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma meta em andamento.</p>';
    document.getElementById('pe-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma meta faltante.</p>';

    document.getElementById('pe-count-atendido').textContent = `(${atendido})`;
    document.getElementById('pe-count-andamento').textContent = `(${andamento})`;
    document.getElementById('pe-count-faltante').textContent = `(${faltanteTotal})`;
}

function renderPlanoGoverno() {
    const computed = getPgPropostas().map(prop => {
        const matched = matchPlanoGovernoProjects(prop.numero);
        const status = classifyPlanejamentoStatus(matched);
        return { prop, matched, status };
    });

    const total = computed.length || 1;
    const atendido = computed.filter(c => c.status === 'atendido').length;
    const andamento = computed.filter(c => c.status === 'andamento').length;
    const faltante = computed.filter(c => c.status === 'faltante').length;
    const pct = (n) => Math.round((n / total) * 100);

    document.getElementById('pg-kpi-atendido').textContent = `${pct(atendido)}%`;
    document.getElementById('pg-kpi-andamento').textContent = `${pct(andamento)}%`;
    document.getElementById('pg-kpi-faltante').textContent = `${pct(faltante)}%`;

    if (chartPlanoGovernoInstance) chartPlanoGovernoInstance.destroy();
    const canvas = document.getElementById('chartPlanoGoverno');
    if (canvas) {
        const dataArr = [atendido, andamento, faltante];
        const labelsArr = ['Atendido', 'Em Andamento', 'Faltante'];
        const bgColors = ['#059669', '#0284c7', '#dc2626'];
        chartPlanoGovernoInstance = new Chart(canvas, {
            type: 'doughnut',
            data: { labels: labelsArr, datasets: [{ data: dataArr, backgroundColor: bgColors, borderWidth: 1, borderColor: '#ffffff' }] },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: 12 }, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 12, weight: '500' }, color: '#334155' } }, datalabels: { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: (val) => { if (!val) return ''; const perc = ((val / (atendido + andamento + faltante || 1)) * 100).toFixed(0); return [`${val}`, `(${perc}%)`]; } } } }
        });
    }

    const groups = { atendido: [], andamento: [], faltante: [] };
    computed.forEach(c => {
        groups[c.status].push(planItemHtml({
            badgeText: `Item ${c.prop.numero}`, badgeClass: '',
            titleHtml: escapeHtml(c.prop.texto),
            subHtml: 'Plano de Governo 2025-2028 — Eixo Tecnologia',
            matched: c.matched,
            showOrigin: c.status === 'andamento'
        }));
    });

    document.getElementById('pg-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma proposta atendida ainda.</p>';
    document.getElementById('pg-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma proposta em andamento.</p>';
    document.getElementById('pg-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma proposta faltante.</p>';

    document.getElementById('pg-count-atendido').textContent = `(${atendido})`;
    document.getElementById('pg-count-andamento').textContent = `(${andamento})`;
    document.getElementById('pg-count-faltante').textContent = `(${faltante})`;
}
