// Módulo de gráficos (view "Indicadores & Gráficos"): filtro por período, alternância de
// fonte (DT x CIINTEC) e as 6 visualizações Chart.js.

function applyChartDateFilter() {
    const startVal = document.getElementById('chart-date-start').value;
    const endVal = document.getElementById('chart-date-end').value;

    chartFilterStartDate = startVal ? new Date(startVal + 'T00:00:00') : null;
    chartFilterEndDate = endVal ? new Date(endVal + 'T23:59:59') : null;

    const statusEl = document.getElementById('chart-filter-status');
    if (statusEl) {
        if (chartFilterStartDate || chartFilterEndDate) {
            statusEl.innerText = `Filtro ativo (Ult. Atualiz.)`;
        } else {
            statusEl.innerText = '';
        }
    }

    buildAllCharts();
}

function clearChartDateFilter() {
    document.getElementById('chart-date-start').value = '';
    document.getElementById('chart-date-end').value = '';
    chartFilterStartDate = null;
    chartFilterEndDate = null;

    const statusEl = document.getElementById('chart-filter-status');
    if (statusEl) statusEl.innerText = '';

    buildAllCharts();
}

function isItemInDateRange(item) {
    if (!chartFilterStartDate && !chartFilterEndDate) return true;
    if (!item.ultAtualizDate) return false;

    if (chartFilterStartDate && item.ultAtualizDate < chartFilterStartDate) return false;
    if (chartFilterEndDate && item.ultAtualizDate > chartFilterEndDate) return false;

    return true;
}

// FUNÇÃO DE TROCA DE FONTE DOS GRÁFICOS (DT x CIINTEC)
function setChartSource(source) {
    currentChartSource = source;
    document.getElementById('btn-chart-dt').style.backgroundColor = (source === 'ativos') ? 'var(--primary-hover)' : '#64748b';
    document.getElementById('btn-chart-ciintec').style.backgroundColor = (source === 'ciintec') ? 'var(--primary-hover)' : '#64748b';

    const prefix = source === 'ativos' ? 'Projetos DT' : 'Projetos CIINTEC';
    document.getElementById('chart-title-gantt').innerText = source === 'ativos' ? `${prefix} - AVANÇO PARA ENTREGA` : `Projetos CIINTEC (Andamento) - AVANÇO PARA ENTREGA`;
    document.getElementById('chart-title-backlog').innerText = `${prefix} - BACKLOG`;
    document.getElementById('chart-title-encerrados').innerText = `${prefix} - ENCERRADOS POR IMPORTÂNCIA`;
    document.getElementById('chart-title-priority').innerText = `${prefix} - MATRIZ DE PRIORIDADES`;
    document.getElementById('chart-title-importance').innerText = `${prefix} - GRAU DE IMPORTÂNCIA DO PORTFÓLIO`;
    document.getElementById('chart-title-status').innerText = `${prefix} - SITUAÇÃO DO PORTFÓLIO`;

    if (!isDrilledDown) {
        document.getElementById('pie-chart-title').innerText = `${prefix} - Distribuição por Classificação`;
    }

    if (source === 'ativos') {
        document.getElementById('card-backlog').style.display = 'none';
        document.getElementById('card-encerrados').style.order = '2';
        document.getElementById('card-pie').style.order = '3';
        document.getElementById('card-priority').style.order = '4';
        document.getElementById('card-importance').style.order = '5';
        document.getElementById('card-status').style.order = '6';
    } else {
        document.getElementById('card-backlog').style.display = 'block';
        document.getElementById('card-backlog').style.order = '2';
        document.getElementById('card-pie').style.order = '3';
        document.getElementById('card-priority').style.order = '4';
        document.getElementById('card-importance').style.order = '5';
        document.getElementById('card-status').style.order = '6';
        document.getElementById('card-encerrados').style.order = '7';
    }

    buildAllCharts();
}

// MÓDULO DE GRÁFICOS
function buildAllCharts() {
    buildGanttChart(); buildBacklogList(); buildDrilldownPieChart(); buildPriorityChart();
    buildImportanceChart(); buildStatusGeralChart(); buildEncerradosImportanceChart();
    buildEisenhowerChart(); buildDeliveriesTrendChart();
}

// Comparativo de entregas mês a mês (Projetos DT, aba Finalizados). Honestidade: depende de
// extractDeliveredMonthYear ter conseguido extrair uma data do texto livre de "Andamento";
// entregas sem data reconhecível no texto não entram nesta contagem.
function buildDeliveriesTrendChart() {
    const canvas = document.getElementById('chartDeliveriesTrend');
    if (!canvas) return;
    if (chartDeliveriesTrendInstance) chartDeliveriesTrendInstance.destroy();

    const encerrados = parsedProjectsList.filter(p => p.viewCategory === 'encerrados');
    const counts = {};
    encerrados.forEach(p => {
        const key = p.deliveredDateStr;
        if (!key || key === '-') return;
        counts[key] = (counts[key] || 0) + 1;
    });

    const sortedKeys = Object.keys(counts).sort((a, b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        const da = new Date(parseInt(ya, 10), MONTHS_BR.indexOf(ma), 1);
        const db = new Date(parseInt(yb, 10), MONTHS_BR.indexOf(mb), 1);
        return da - db;
    });

    const lastKeys = sortedKeys.slice(-6);
    const data = lastKeys.map(k => counts[k]);

    chartDeliveriesTrendInstance = new Chart(canvas, {
        type: 'bar',
        data: { labels: lastKeys, datasets: [{ data, backgroundColor: '#0284c7', borderRadius: 6 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                legend: { display: false },
                datalabels: { anchor: 'end', align: 'top', color: '#0f172a', font: { weight: 'bold', size: 12 } }
            },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grace: '15%' } }
        }
    });
}

// Matriz Urgência (Prioridade) x Impacto (Importância), estilo Eisenhower — cruzamento que a
// "Matriz de Prioridades" (barra 1D) não mostra. Tamanho da bolha = quantidade de projetos na célula.
const EISENHOWER_LEVEL_ORDER = { 'BAIXA': 1, 'MÉDIA': 2, 'MEDIA': 2, 'ALTA': 3 };
const EISENHOWER_LEVEL_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };

// Classificação de Impacto (eixo Y) a partir das tags do campo Importância — o campo não usa
// Alta/Média/Baixa na prática, usa categorias estratégicas. Regra de negócio definida pelo
// usuário: PL.GOV, PL.ESTR e Mudança de Lei = Alta; Política e Técnica Interna = Média;
// qualquer outra tag (ex.: Comercial Cijun) = Baixa. Combinações de tags usam o maior nível.
function getImportanceImpactLevel(importanciaStr) {
    const tags = (importanciaStr || '').split(',').map(t => normalizeString(t));
    let impacto = 1;
    tags.forEach(tag => {
        if (tag.includes('pl.gov') || tag.includes('pl.estr') || tag.includes('mudancalei')) {
            impacto = Math.max(impacto, 3);
        } else if (tag.includes('politica') || tag.includes('tecnicainterna')) {
            impacto = Math.max(impacto, 2);
        }
    });
    return impacto;
}

// Plugin exclusivo deste gráfico: pinta os 4 quadrantes (Fazer Agora / Planejar / Delegar /
// Eliminar-Revisar) e desenha as linhas divisórias, para não depender de biblioteca externa
// de anotação. Não é registrado globalmente — só é passado via `plugins:[...]` do chart abaixo.
const eisenhowerQuadrantPlugin = {
    id: 'eisenhowerQuadrants',
    beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const xMid = scales.x.getPixelForValue(2);
        const yMid = scales.y.getPixelForValue(2);
        const { left, right, top, bottom } = chartArea;

        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.07)';   // Fazer Agora (urgente + importante)
        ctx.fillRect(xMid, top, right - xMid, yMid - top);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.07)';   // Planejar (importante, não urgente)
        ctx.fillRect(left, top, xMid - left, yMid - top);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';  // Delegar (urgente, pouco importante)
        ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);
        ctx.fillStyle = 'rgba(100, 116, 139, 0.07)'; // Eliminar / Revisar (nem urgente nem importante)
        ctx.fillRect(left, yMid, xMid - left, bottom - yMid);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xMid, top); ctx.lineTo(xMid, bottom);
        ctx.moveTo(left, yMid); ctx.lineTo(right, yMid);
        ctx.stroke();
        ctx.restore();
    }
};

function buildEisenhowerChart() {
    const canvas = document.getElementById('chartEisenhower');
    if (!canvas) return;
    if (chartEisenhowerInstance) chartEisenhowerInstance.destroy();

    const baseItems = parsedProjectsList.filter(p => p.viewCategory === currentChartSource && isItemInDateRange(p) && isNotStopped(p));

    // Guarda os projetos de cada célula (não só a contagem) para alimentar o tooltip
    // (lista nominal ao passar o mouse) e o popup de detalhe (clique/toque na bolha).
    const grid = {};
    baseItems.forEach(p => {
        const urgencia = EISENHOWER_LEVEL_ORDER[(p.prioridade || '').toUpperCase().trim()] || 2;
        const impacto = getImportanceImpactLevel(p.importancia);
        const key = `${urgencia}-${impacto}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(p);
    });

    const data = Object.entries(grid).map(([key, items]) => {
        const [x, y] = key.split('-').map(Number);
        return { x, y, r: Math.min(10 + items.length * 4, 40), count: items.length, items };
    });

    chartEisenhowerInstance = new Chart(canvas, {
        type: 'bubble',
        data: { datasets: [{ data, backgroundColor: 'rgba(2, 132, 199, 0.55)', borderColor: '#0284c7', borderWidth: 1 }] },
        plugins: [eisenhowerQuadrantPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onHover: (evt, elements) => {
                if (evt.native && evt.native.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            onClick: (evt, elements, chart) => {
                if (!elements.length) return;
                const point = chart.data.datasets[0].data[elements[0].index];
                openEisenhowerCellModal(point);
            },
            plugins: {
                legend: { display: false },
                datalabels: { color: '#0f172a', font: { weight: 'bold', size: 12 }, formatter: (v) => v.count },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const raw = items[0].raw;
                            return `Urgência ${EISENHOWER_LEVEL_LABELS[raw.x]} · Impacto ${EISENHOWER_LEVEL_LABELS[raw.y]} — ${raw.count} projeto(s)`;
                        },
                        label: (ctx) => ctx.raw.items.map(p => `• ${p.ticket}`),
                        footer: () => 'Clique na bolha para ver a lista completa'
                    }
                }
            },
            scales: {
                x: { min: 0.5, max: 3.5, ticks: { stepSize: 1, callback: (v) => EISENHOWER_LEVEL_LABELS[v] || '' }, title: { display: true, text: 'Urgência (Prioridade)' } },
                y: { min: 0.5, max: 3.5, ticks: { stepSize: 1, callback: (v) => EISENHOWER_LEVEL_LABELS[v] || '' }, title: { display: true, text: 'Impacto (Importância)' } }
            }
        }
    });
}

// Mesma regra usada para colorir os 4 quadrantes no eisenhowerQuadrantPlugin: Média (2) conta
// para o "lado alto" de cada eixo, então toda combinação de x/y cai numa única ação, sem zona
// cinza — consistente com a pintura de fundo do gráfico.
function getEisenhowerActionLabel(x, y) {
    const urgente = x >= 2;
    const importante = y >= 2;
    if (urgente && importante) return 'Fazer Agora';
    if (!urgente && importante) return 'Planejar';
    if (urgente && !importante) return 'Delegar';
    return 'Eliminar / Revisar';
}

// Popup (clique na bolha ou toque em tablet/celular) com a lista nominal dos projetos daquela
// célula da matriz. Reaproveita o modal de lista genérico já usado no Resumo Executivo, com uma
// coluna extra de Ação para deixar claro o que fazer com aquele grupo de projetos.
function openEisenhowerCellModal(point) {
    const title = `Urgência ${EISENHOWER_LEVEL_LABELS[point.x]} · Impacto ${EISENHOWER_LEVEL_LABELS[point.y]} (${point.count} projeto${point.count > 1 ? 's' : ''})`;
    const acao = getEisenhowerActionLabel(point.x, point.y);
    openListModal(
        title,
        point.items,
        p => `Prioridade: ${p.prioridade || '-'} · Importância: ${p.importancia || '-'}`,
        { header: 'Ação', fn: () => acao }
    );
}

function buildGanttChart() {
    const canvas = document.getElementById('chartGantt');
    const wrapper = document.getElementById('gantt-wrapper');
    if(chartGanttInstance) chartGanttInstance.destroy();

    let items = parsedProjectsList.filter(p => p.viewCategory === currentChartSource && isItemInDateRange(p) && isNotStopped(p));

    if (currentChartSource === 'ciintec') {
        items = items.filter(p => !normalizeString(p.classificacao).includes('backlog'));
    }

    items.sort((a, b) => b.progressPercentage - a.progressPercentage);
    if (wrapper) wrapper.style.height = `${Math.max(320, items.length * 30)}px`;

    // Status ANDAMENTO com progresso saturado em 100% não é conclusão — é a Dt.Fim já vencida
    // (ver computeDaysLate) — mesmo critério usado na régua da tabela de Ativos.
    const isOverdueComplete = (p) => p.progressPercentage === 100 && p.status.toUpperCase().trim() === 'ANDAMENTO';

    chartGanttInstance = new Chart(canvas, {
        type: 'bar',
        data: { labels: items.map(p => p.ticket), datasets: [{ data: items.map(p => p.progressPercentage), backgroundColor: items.map(p => isOverdueComplete(p) ? '#dc2626' : (p.progressPercentage === 100 ? '#10b981' : '#0284c7')), borderRadius: 4, barThickness: 16, minBarLength: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, color: (context) => context.dataset.data[context.dataIndex] === 0 ? '#475569' : '#ffffff', anchor: (context) => context.dataset.data[context.dataIndex] === 0 ? 'end' : 'center', align: (context) => context.dataset.data[context.dataIndex] === 0 ? 'right' : 'center', font: { weight: 'bold', size: 11 }, formatter: (val, context) => { const p = items[context.dataIndex]; if (isOverdueComplete(p)) return `${computeDaysLate(p)}d atraso`; return val === 0 || val > 5 ? val + '%' : ''; } } }, scales: { x: { min: 0, max: 100, ticks: { display: false }, grid: { display: false } } } }
    });
}

function buildBacklogList() {
    if (currentChartSource !== 'ciintec') return;

    const tbody = document.getElementById('backlog-list-body');
    let items = parsedProjectsList.filter(p => p.viewCategory === 'ciintec' && normalizeString(p.classificacao).includes('backlog') && isItemInDateRange(p));

    tbody.innerHTML = items.map(p => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: var(--text-title);">${escapeHtml(p.ticket)}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: var(--text-main);">${escapeHtml(p.analista)}</td>
            <td style="padding: 10px 12px; text-align: center;">${getImportanceBadge(p.importancia)}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" style="text-align: center; padding: 24px; font-size: 13px; color: var(--text-muted);">Nenhum projeto em backlog</td></tr>';
}

function buildImportanceChart() {
    const canvas = document.getElementById('chartImportance');
    if(chartImportanceInstance) chartImportanceInstance.destroy();
    const counts = {};

    const items = parsedProjectsList.filter(p => p.viewCategory === currentChartSource && isItemInDateRange(p) && isNotStopped(p));

    items.forEach(p => { if (p.importancia) { const tags = p.importancia.split(',').map(item => item.trim()); tags.forEach(tag => { if (tag !== "") counts[tag] = (counts[tag] || 0) + 1; }); } });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const sortedLabels = sortedEntries.map(entry => entry[0]);
    const sortedData = sortedEntries.map(entry => entry[1]);
    const CoresFatias = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

    chartImportanceInstance = new Chart(canvas, {
        type: 'pie', data: { labels: sortedLabels, datasets: [{ data: sortedData, backgroundColor: CoresFatias.slice(0, sortedLabels.length), borderWidth: 1, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 12 }, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 12, weight: '500' }, color: '#334155' } }, datalabels: { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: (val) => { if (val === 0) return ''; const perc = ((val / total) * 100).toFixed(0); return [`${val}`, `(${perc}%)`]; } } } }
    });
}

function buildStatusGeralChart() {
    const canvas = document.getElementById('chartStatusGeral');
    if(chartStatusGeralInstance) chartStatusGeralInstance.destroy();

    let dataArr, labelsArr, bgColors;

    if (currentChartSource === 'ativos') {
        const filteredList = parsedProjectsList.filter(p => isItemInDateRange(p));
        const ativos = filteredList.filter(p => p.viewCategory === 'ativos').length;
        const parados = filteredList.filter(p => p.viewCategory === 'parados').length;
        const backlog = filteredList.filter(p => p.viewCategory === 'backlog').length;
        const suspensos = filteredList.filter(p => p.viewCategory === 'suspensos').length;
        const encerrados = filteredList.filter(p => p.viewCategory === 'encerrados').length;
        dataArr = [ativos, parados, backlog, suspensos, encerrados];
        labelsArr = ['Ativos', 'Parados', 'Backlog', 'Suspensos', 'Finalizados'];
        bgColors = ['#0284c7', '#ea580c', '#64748b', '#dc2626', '#059669'];
    } else {
        const ciintecList = parsedProjectsList.filter(p => p.viewCategory === 'ciintec' && isItemInDateRange(p));
        const stCounts = {};
        ciintecList.forEach(p => {
            let st = p.status ? p.status.toUpperCase().trim() : 'OUTROS';
            stCounts[st] = (stCounts[st] || 0) + 1;
        });
        labelsArr = Object.keys(stCounts);
        dataArr = Object.values(stCounts);
        bgColors = ['#0284c7', '#10b981', '#f59e0b', '#dc2626', '#8b5cf6', '#64748b'].slice(0, labelsArr.length);
    }

    const total = dataArr.reduce((a, b) => a + b, 0);

    chartStatusGeralInstance = new Chart(canvas, {
        type: 'pie', data: { labels: labelsArr, datasets: [{ data: dataArr, backgroundColor: bgColors, borderWidth: 1, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 12 }, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 12, weight: '500' }, color: '#334155' } }, datalabels: { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: (val) => { if (val === 0) return ''; const perc = ((val / total) * 100).toFixed(0); return [`${val}`, `(${perc}%)`]; } } } }
    });
}

function buildEncerradosImportanceChart() {
    const canvas = document.getElementById('chartEncerradosImp');
    const container = canvas.parentElement;
    if(chartEncerradosImpInstance) chartEncerradosImpInstance.destroy();
    const counts = {};

    let items;
    if (currentChartSource === 'ativos') {
        items = parsedProjectsList.filter(p => p.viewCategory === 'encerrados' && isItemInDateRange(p));
    } else {
        items = parsedProjectsList.filter(p => p.viewCategory === 'ciintec' && p.status.toUpperCase().includes('ENCERRAD') && isItemInDateRange(p));
    }

    items.forEach(p => { if (p.importancia) { const tags = p.importancia.split(',').map(item => item.trim()); tags.forEach(tag => { if (tag !== "") counts[tag] = (counts[tag] || 0) + 1; }); } });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    let noDataMsg = document.getElementById('no-data-encerrados-msg');
    if (total === 0) {
        canvas.style.display = 'none';
        if (!noDataMsg) {
            noDataMsg = document.createElement('div');
            noDataMsg.id = 'no-data-encerrados-msg';
            noDataMsg.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--text-muted); font-weight: 500; font-size: 14px;';
            container.appendChild(noDataMsg);
        }
        noDataMsg.innerText = 'Sem projetos encerrados no período selecionado';
        noDataMsg.style.display = 'block';
        return;
    } else {
        canvas.style.display = 'block';
        if (noDataMsg) noDataMsg.style.display = 'none';
    }

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const sortedLabels = sortedEntries.map(entry => entry[0]);
    const sortedData = sortedEntries.map(entry => entry[1]);
    const CoresFatias = ['#10b981', '#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'];

    chartEncerradosImpInstance = new Chart(canvas, {
        type: 'pie', data: { labels: sortedLabels, datasets: [{ data: sortedData, backgroundColor: CoresFatias.slice(0, sortedLabels.length), borderWidth: 1, borderColor: '#ffffff' }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 12 }, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 12, weight: '500' }, color: '#334155' } }, datalabels: { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 11 }, formatter: (val) => { if (val === 0) return ''; const perc = ((val / total) * 100).toFixed(0); return [`${val}`, `(${perc}%)`]; } } } }
    });
}

function buildDrilldownPieChart() {
    const canvas = document.getElementById('chartPieDistribution');
    if(activePieChartInstance) activePieChartInstance.destroy();

    let baseItems = parsedProjectsList.filter(p => p.viewCategory === currentChartSource && isItemInDateRange(p) && isNotStopped(p));

    if (!isDrilledDown) {
        const prefix = currentChartSource === 'ativos' ? "Projetos DT" : "Projetos CIINTEC";
        document.getElementById('pie-chart-title').innerText = `${prefix} - Distribuição por Classificação`;
        document.getElementById('btn-back-drilldown').style.display = 'none';

        const metrics = {};
        baseItems.forEach(p => { metrics[p.classificacao] = (metrics[p.classificacao] || 0) + 1; });
        const total = Object.values(metrics).reduce((a, b) => a + b, 0);

        activePieChartInstance = new Chart(canvas, {
            type: 'doughnut', data: { labels: Object.keys(metrics), datasets: [{ data: Object.values(metrics), backgroundColor: ['#1e3a8a', '#6d28d9', '#065f46', '#c2410c', '#64748b'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => `${value} (${((value / total) * 100).toFixed(1)}%)` } }, onClick: (e, el) => { if (el && el.length > 0) { isDrilledDown = true; currentClassificationSelected = Object.keys(metrics)[el[0].index]; buildDrilldownPieChart(); } } }
        });
    } else {
        document.getElementById('pie-chart-title').innerText = `Status em: ${currentClassificationSelected}`;
        document.getElementById('btn-back-drilldown').style.display = 'inline-block';

        const subMetrics = {};
        const filtered = baseItems.filter(p => p.classificacao === currentClassificationSelected);
        filtered.forEach(p => { subMetrics[p.status] = (subMetrics[p.status] || 0) + 1; });
        const totalSub = Object.values(subMetrics).reduce((a, b) => a + b, 0);

        activePieChartInstance = new Chart(canvas, {
            type: 'pie', data: { labels: Object.keys(subMetrics), datasets: [{ data: Object.values(subMetrics), backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#64748b'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (value) => `${value} (${((value / totalSub) * 100).toFixed(1)}%)` } } }
        });
    }
}
function resetPieDrilldown() { isDrilledDown = false; currentClassificationSelected = ""; buildDrilldownPieChart(); }

function buildPriorityChart() {
    const canvas = document.getElementById('chartPriority');
    if(chartPriorityInstance) chartPriorityInstance.destroy();

    const pCounts = { 'ALTA': 0, 'MÉDIA': 0, 'BAIXA': 0 };

    let baseItems = parsedProjectsList.filter(p => p.viewCategory === currentChartSource && isItemInDateRange(p) && isNotStopped(p));

    baseItems.forEach(p => { let name = p.prioridade.toUpperCase().trim(); if(name === 'MEDIA') name = 'MÉDIA'; if(pCounts[name] !== undefined) pCounts[name]++; });
    const total = Object.values(pCounts).reduce((a, b) => a + b, 0);

    chartPriorityInstance = new Chart(canvas, {
        type: 'bar', data: { labels: ['Alta', 'Média', 'Baixa'], datasets: [{ data: [pCounts['ALTA'], pCounts['MÉDIA'], pCounts['BAIXA']], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 30 } }, plugins: { legend: { display: false }, datalabels: { display: true, color: '#0f172a', anchor: 'end', align: 'top', font: { weight: 'bold', size: 12 }, formatter: (val) => val === 0 ? '' : `${val} (${((val / total) * 100).toFixed(0)}%)` } }, scales: { y: { beginAtZero: true, grace: '15%' } } }
    });
}
