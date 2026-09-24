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

// A coluna L ("Plano Governo") normalmente vem como "N – rótulo curto" (o número é a posição
// do item na aba "Plano Governo", 1 a 13). Extrai esse número; se não achar (algumas linhas
// têm o texto completo colado em vez do rótulo numerado), cai para casar o texto contra o
// item correspondente em PG_PROPOSTAS.
function extractPlanoGovernoNumero(linkText) {
    if (!linkText) return null;
    const semNumero = linkText.trim();
    const m = semNumero.match(/^(\d{1,2})\s*[–—\-−]/);
    if (m) {
        const n = parseInt(m[1], 10);
        if (PG_PROPOSTAS.some(item => item.numero === n)) return n;
    }
    const norm = normalizeString(semNumero.replace(/;\s*$/, ''));
    const found = PG_PROPOSTAS.find(item => {
        const itemNorm = normalizeString(item.texto);
        return norm === itemNorm || norm.includes(itemNorm) || itemNorm.includes(norm);
    });
    return found ? found.numero : null;
}

function matchPlanoGovernoProjects(numero) {
    return planejamentoProjectPool().filter(p => extractPlanoGovernoNumero(p.planoGovernoLink) === numero);
}

// A coluna M ("Planej. Estratégico") vem como "Ação - Meta" (texto livre, às vezes com tab
// solto no início). Compara normalizado contra o `linkText` de cada meta em PE_METAS.
function isPlanejEstrategicoMatch(linkText, metaLinkText) {
    if (!linkText || !metaLinkText) return false;
    const a = normalizeString(linkText);
    const b = normalizeString(metaLinkText);
    return a === b || a.includes(b) || b.includes(a);
}

function matchPlanejEstrategicoProjects(metaLinkText) {
    if (!metaLinkText) return [];
    return planejamentoProjectPool().filter(p => isPlanejEstrategicoMatch(p.planejEstrategicoLink, metaLinkText));
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
        const matched = matchPlanejEstrategicoProjects(meta.linkText);
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
    const computed = PG_PROPOSTAS.map(prop => {
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
            matched: c.matched
        }));
    });

    document.getElementById('pg-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma proposta atendida ainda.</p>';
    document.getElementById('pg-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma proposta em andamento.</p>';
    document.getElementById('pg-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma proposta faltante.</p>';
}
