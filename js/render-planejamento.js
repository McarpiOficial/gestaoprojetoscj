// Telas "Planejamento" (menu lateral): compara PE_METAS / PG_PROPOSTAS (js/planejamento-data.js,
// texto estático extraído dos PDFs) contra parsedProjectsList (planilha, já carregada por
// data-fetch.js) para decidir ao vivo se cada meta/proposta está Atendida, Em Andamento ou
// Faltante. Nada aqui é fixado: se um projeto mudar de aba/status na planilha, o resultado
// muda sozinho na próxima renderização.

// Só projetos da aba principal (ativos/parados/backlog) e da aba Finalizados (encerrados)
// contam — CIINTEC e a aba separada de Suspensos antigos ficam fora do escopo do PE/PG.
function planejamentoProjectPool() {
    return parsedProjectsList.filter(p => ['ativos', 'parados', 'backlog', 'encerrados'].includes(p.viewCategory));
}

// Casa uma lista de trechos de nome de ticket (de planejamento-data.js) contra a planilha,
// via normalizeString + includes (mesma função usada no resto do projeto, utils.js:3).
function matchPlanejamentoProjects(fragmentos) {
    if (!fragmentos || !fragmentos.length) return [];
    const pool = planejamentoProjectPool();
    const fragsNorm = fragmentos.map(normalizeString);
    return pool.filter(p => {
        const ticketNorm = normalizeString(p.ticket);
        return fragsNorm.some(f => f && ticketNorm.includes(f));
    });
}

function isProjectAtendido(p) {
    return p.viewCategory === 'encerrados' || (p.status && p.status.toUpperCase().trim() === 'FINALIZADOS');
}

function classifyPlanejamentoStatus(matched) {
    if (matched.some(isProjectAtendido)) return 'atendido';
    if (matched.length > 0) return 'andamento';
    return 'faltante';
}

function renderPlanejamento() {
    if (typeof PE_METAS === 'undefined' || typeof PG_PROPOSTAS === 'undefined') return;
    if (!document.getElementById('pe-kpi-atendido')) return; // panes ainda não estão no DOM
    renderPlanejamentoEstrategico();
    renderPlanoGoverno();
}

function planItemHtml({ badgeText, badgeClass, titleHtml, subHtml, matched }) {
    const chips = matched.length
        ? `<div class="plan-item-projects">${matched.map(p => `<span class="plan-project-chip" onclick="openProjectModal(${p.id})" title="${escapeHtml(p.secretaria)} — clique para abrir">${escapeHtml(p.ticket)} <small>(${escapeHtml(p.status)})</small></span>`).join('')}</div>`
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
    const computed = PE_METAS.map(meta => {
        const matched = matchPlanejamentoProjects(meta.projetos);
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
        const badgeText = c.status === 'faltante' && c.futuro ? `${c.meta.ano} · Futuro` : `${c.meta.ano}`;
        const badgeClass = c.status === 'faltante' && c.futuro ? 'futuro' : '';
        groups[c.status].push(planItemHtml({
            badgeText, badgeClass,
            titleHtml: `${escapeHtml(c.meta.acao)}: ${escapeHtml(c.meta.meta)}`,
            subHtml: `${escapeHtml(c.meta.tema)} — ${escapeHtml(c.meta.objetivo)}`,
            matched: c.matched
        }));
    });

    document.getElementById('pe-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma meta atendida ainda.</p>';
    document.getElementById('pe-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma meta em andamento.</p>';
    document.getElementById('pe-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma meta faltante.</p>';
}

function renderPlanoGoverno() {
    const claimedIds = new Set();
    const computed = PG_PROPOSTAS.map(prop => {
        const matched = matchPlanejamentoProjects(prop.projetos);
        matched.forEach(p => claimedIds.add(p.id));
        const status = classifyPlanejamentoStatus(matched);
        return { prop, matched, status };
    });

    const total = computed.length || 1;
    const atendido = computed.filter(c => c.status === 'atendido').length;
    const andamento = computed.filter(c => c.status === 'andamento').length;
    const faltante = computed.filter(c => c.status === 'faltante').length;
    const pct = (n) => Math.round((n / total) * 100);

    document.getElementById('pg-kpi-atendido').textContent = `${pct(atendido)}%`;
    document.getElementById('pg-kpi-restante').textContent = `${pct(andamento + faltante)}%`;
    document.getElementById('pg-kpi-restante-detalhe').textContent = `andamento ${pct(andamento)}% · faltante ${pct(faltante)}%`;

    // Card "outros": projetos com a tag PL.GOV na planilha que não foram reivindicados por
    // nenhuma proposta CIJUN acima — contador simples pedido pelo usuário, sem lista detalhada.
    const outros = planejamentoProjectPool().filter(p => {
        if (claimedIds.has(p.id)) return false;
        const imp = normalizeString(p.importancia || '');
        return imp.includes(normalizeString('PL.GOV'));
    });
    const outrosAtendido = outros.filter(isProjectAtendido).length;
    const outrosAndamento = outros.length - outrosAtendido;
    document.getElementById('pg-kpi-outros').textContent = `${outrosAtendido} atendidos · ${outrosAndamento} em andamento`;

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
            badgeText: '2025-2028', badgeClass: '',
            titleHtml: escapeHtml(c.prop.texto),
            subHtml: `Eixo ${escapeHtml(c.prop.eixo)}`,
            matched: c.matched
        }));
    });

    document.getElementById('pg-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma proposta atendida ainda.</p>';
    document.getElementById('pg-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma proposta em andamento.</p>';
    document.getElementById('pg-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma proposta faltante.</p>';
}
