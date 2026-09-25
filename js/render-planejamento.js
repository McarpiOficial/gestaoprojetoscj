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

// Diferente de classifyPlanejamentoStatus (usado nos %/gráfico, onde 1 projeto encerrado já
// basta para contar o item como atendido): aqui, um item só sai da lista "Em Andamento" quando
// TODOS os projetos vinculados já encerraram. Um item com projetos misturados (1 encerrado + 1
// ainda em andamento) continua em Em Andamento — mas com um contador vermelho (ver
// planItemHtml/closedCount) avisando que já tem projeto encerrado atendendo, mesmo sem estar
// 100% concluído.
function classifyPlanejamentoDisplayStatus(matched) {
    if (matched.length === 0) return 'faltante';
    if (matched.every(isProjectAtendido)) return 'atendido';
    return 'andamento';
}

// Um projeto pode estar vinculado a mais de um item ao mesmo tempo (interseção entre metas/
// propostas) — nesse caso a célula tem vários valores separados por ";". Quebra em segmentos
// individuais, descartando vazios (inclusive o "resto" depois de um ";" solto no fim do texto,
// que é só pontuação da frase, não um segundo item).
function splitLinkSegments(rawLinkText) {
    if (!rawLinkText) return [];
    return rawLinkText.split(';').map(s => s.trim()).filter(Boolean);
}

// Cada segmento da coluna L ("Plano Governo") normalmente vem como "N – rótulo curto" (o
// número é a posição do item na aba "Plano Governo", 1 a 13). Extrai esse número; se não achar
// (alguns segmentos têm o texto completo colado em vez do rótulo numerado), cai para casar o
// texto contra o item correspondente em PG_PROPOSTAS.
function extractPlanoGovernoNumeroDoSegmento(segmento) {
    const m = segmento.match(/^(\d{1,2})\s*[–—\-−]/);
    if (m) {
        const n = parseInt(m[1], 10);
        if (PG_PROPOSTAS.some(item => item.numero === n)) return n;
    }
    const norm = normalizeString(segmento);
    const found = PG_PROPOSTAS.find(item => {
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

function matchPlanoGovernoProjects(numero) {
    return planejamentoProjectPool().filter(p => extractPlanoGovernoNumeros(p.planoGovernoLink).includes(numero));
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

function planItemHtml({ badgeText, badgeClass, titleHtml, subHtml, matched, showOrigin, closedCount = 0 }) {
    const chips = matched.length
        ? `<div class="plan-item-projects">${matched.map(p => {
            const origin = showOrigin ? projectOriginLabel(p) : null;
            const originPrefix = origin ? `(${origin}) ` : '';
            return `<span class="plan-project-chip" onclick="openProjectModal(${p.id})" title="${escapeHtml(p.secretaria)} — clique para abrir">${originPrefix}${escapeHtml(p.ticket)} <small>(${escapeHtml(p.status)})</small></span>`;
        }).join('')}</div>`
        : '';
    // Só aparece em itens de "Em Andamento" que já têm pelo menos 1 projeto encerrado vinculado
    // (junto de outro(s) ainda em andamento) — avisa que o item já está atendido por esse
    // encerrado, mesmo continuando aqui por causa do(s) projeto(s) que falta(m) fechar.
    const closedBadge = closedCount > 0
        ? ` <span class="plan-item-closed-badge" title="${closedCount} projeto${closedCount > 1 ? 's' : ''} encerrado${closedCount > 1 ? 's' : ''} já vinculado${closedCount > 1 ? 's' : ''} a este item — ou seja, já está atendido por ele(s), mesmo aparecendo aqui por ainda ter outro(s) projeto(s) em andamento para o mesmo item.">(${closedCount})</span>`
        : '';
    return `<div class="plan-item">
        <div class="plan-item-header">
            <span class="plan-item-title">${titleHtml}${closedBadge}</span>
            <span class="plan-year-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="plan-item-sub">${subHtml}</div>
        ${chips}
    </div>`;
}

function renderPlanejamentoEstrategico() {
    const anoAtual = PLANEJAMENTO_ANO_ATUAL;
    const computed = PE_METAS.map(meta => {
        const matched = matchPlanejEstrategicoProjects(meta);
        const status = classifyPlanejamentoStatus(matched);
        const displayStatus = classifyPlanejamentoDisplayStatus(matched);
        const futuro = status === 'faltante' && meta.ano > anoAtual;
        return { meta, matched, status, displayStatus, futuro };
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
        const closedCount = c.displayStatus === 'andamento' ? c.matched.filter(isProjectAtendido).length : 0;
        groups[c.displayStatus].push(planItemHtml({
            badgeText, badgeClass,
            titleHtml: `${escapeHtml(c.meta.acao)}: ${escapeHtml(c.meta.meta)}`,
            subHtml: 'Planej. Estratégico — aba "Planej. Estrategico"',
            matched: c.matched,
            showOrigin: c.displayStatus === 'andamento',
            closedCount
        }));
    });

    document.getElementById('pe-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma meta atendida ainda.</p>';
    document.getElementById('pe-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma meta em andamento.</p>';
    document.getElementById('pe-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma meta faltante.</p>';

    document.getElementById('pe-count-atendido').textContent = `(${groups.atendido.length})`;
    document.getElementById('pe-count-andamento').textContent = `(${groups.andamento.length})`;
    document.getElementById('pe-count-faltante').textContent = `(${groups.faltante.length})`;
}

function renderPlanoGoverno() {
    const computed = PG_PROPOSTAS.map(prop => {
        const matched = matchPlanoGovernoProjects(prop.numero);
        const status = classifyPlanejamentoStatus(matched);
        const displayStatus = classifyPlanejamentoDisplayStatus(matched);
        return { prop, matched, status, displayStatus };
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
        const closedCount = c.displayStatus === 'andamento' ? c.matched.filter(isProjectAtendido).length : 0;
        groups[c.displayStatus].push(planItemHtml({
            badgeText: `Item ${c.prop.numero}`, badgeClass: '',
            titleHtml: escapeHtml(c.prop.texto),
            subHtml: 'Plano de Governo 2025-2028 — Eixo Tecnologia',
            matched: c.matched,
            showOrigin: c.displayStatus === 'andamento',
            closedCount
        }));
    });

    document.getElementById('pg-list-atendido').innerHTML = groups.atendido.join('') || '<p class="plan-list-empty">Nenhuma proposta atendida ainda.</p>';
    document.getElementById('pg-list-andamento').innerHTML = groups.andamento.join('') || '<p class="plan-list-empty">Nenhuma proposta em andamento.</p>';
    document.getElementById('pg-list-faltante').innerHTML = groups.faltante.join('') || '<p class="plan-list-empty">Nenhuma proposta faltante.</p>';

    document.getElementById('pg-count-atendido').textContent = `(${groups.atendido.length})`;
    document.getElementById('pg-count-andamento').textContent = `(${groups.andamento.length})`;
    document.getElementById('pg-count-faltante').textContent = `(${groups.faltante.length})`;
}
