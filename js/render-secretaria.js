// View "Visão por Secretaria": resumo isolado dos projetos de uma secretaria específica.
// Pensada para poder ser aberta/compartilhada com o cliente interno sem expor o portfólio
// inteiro das demais secretarias — só agrega dados já existentes, não requer campo novo.
// Assim como em Indicadores & Gráficos, pode ser filtrado por Projetos DT ou Projetos CIINTEC.

let secretariaSource = 'ativos';
let secretariaSortCriteria = 'ticket';

function setSecretariaSource(source) {
    secretariaSource = source;
    const btnDt = document.getElementById('secretaria-btn-dt');
    const btnCiintec = document.getElementById('secretaria-btn-ciintec');
    if (btnDt) btnDt.style.backgroundColor = (source === 'ativos') ? 'var(--primary-hover)' : 'var(--gray-500)';
    if (btnCiintec) btnCiintec.style.backgroundColor = (source === 'ciintec') ? 'var(--primary-hover)' : 'var(--gray-500)';
    populateSecretariaOptions();
    const select = document.getElementById('select-secretaria');
    if (select) renderVisaoSecretaria(select.value);
}

function sortSecretariaAndRender(criteria) {
    secretariaSortCriteria = criteria;
    const select = document.getElementById('select-secretaria');
    if (select) renderVisaoSecretaria(select.value);
}

function getSecretariaScopedList() {
    return secretariaSource === 'ativos'
        ? parsedProjectsList.filter(p => p.viewCategory !== 'ciintec')
        : parsedProjectsList.filter(p => p.viewCategory === 'ciintec');
}

function populateSecretariaOptions() {
    const select = document.getElementById('select-secretaria');
    if (!select) return;

    const currentValue = select.value;
    const secretarias = [...new Set(
        getSecretariaScopedList().map(p => p.secretaria).filter(s => s && s !== 'Não Informada')
    )].sort((a, b) => a.localeCompare(b));

    select.innerHTML = '<option value="">Selecione uma secretaria...</option>' +
        secretarias.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

    if (currentValue && secretarias.includes(currentValue)) {
        select.value = currentValue;
    }
}

function statusBadgeForAnyCategory(p) {
    if (p.viewCategory === 'encerrados') return getStatusBadge(p.status, 'encerrados');
    if (p.viewCategory === 'backlog') return getStatusBadge(p.status, 'backlog');
    if (p.viewCategory === 'parados' || p.viewCategory === 'suspensos') return getStatusBadge(p.status, 'parados');

    // CIINTEC não tem sub-categorias próprias (tudo é viewCategory 'ciintec') — o status real
    // do item é quem decide qual badge exibir aqui.
    if (p.viewCategory === 'ciintec') {
        const statusUpper = p.status.toUpperCase();
        if (statusUpper.includes('ENCERRAD')) return getStatusBadge(p.status, 'encerrados');
        if (normalizeString(p.classificacao).includes('backlog')) return getStatusBadge(p.status, 'backlog');
        if (statusUpper.includes('AGUARDANDO') || statusUpper.includes('SUSPENSO')) return getStatusBadge(p.status, 'parados');
    }

    return getStatusBadge(p.status, 'ativos');
}

function renderVisaoSecretaria(secretaria) {
    const container = document.getElementById('secretaria-content');
    if (!container) return;

    if (!secretaria) {
        container.innerHTML = '<div style="text-align:center; padding:48px; color:var(--text-muted);">Selecione uma secretaria acima para ver o resumo dos seus projetos.</div>';
        return;
    }

    const items = getSecretariaScopedList().filter(p => p.secretaria === secretaria);
    const ativos = secretariaSource === 'ativos'
        ? items.filter(p => p.viewCategory === 'ativos')
        : items.filter(p => p.viewCategory === 'ciintec' && !normalizeString(p.classificacao).includes('backlog') && !p.status.toUpperCase().includes('ENCERRAD'));
    const parados = secretariaSource === 'ativos'
        ? items.filter(p => p.viewCategory === 'parados' || p.viewCategory === 'suspensos')
        : items.filter(p => p.status.toUpperCase().includes('AGUARDANDO') || p.status.toUpperCase().includes('SUSPENSO'));
    const backlog = secretariaSource === 'ativos'
        ? items.filter(p => p.viewCategory === 'backlog')
        : items.filter(p => normalizeString(p.classificacao).includes('backlog'));
    const encerrados = secretariaSource === 'ativos'
        ? items.filter(p => p.viewCategory === 'encerrados')
        : items.filter(p => p.status.toUpperCase().includes('ENCERRAD'));
    const comProgresso = ativos.filter(p => p.hasProgress);
    const mediaProgresso = comProgresso.length
        ? Math.round(comProgresso.reduce((acc, p) => acc + p.progressPercentage, 0) / comProgresso.length)
        : 0;

    const kpiHtml = `
        <div class="kpi-grid">
            <div class="kpi-card"><h3>Total de Projetos</h3><p>${items.length}</p></div>
            <div class="kpi-card"><h3>Em Andamento</h3><p style="color: var(--color-primary);">${ativos.length}</p></div>
            <div class="kpi-card"><h3>Parados/Suspensos</h3><p style="color: var(--color-danger);">${parados.length}</p></div>
            <div class="kpi-card"><h3>Backlog</h3><p style="color: var(--gray-500);">${backlog.length}</p></div>
            <div class="kpi-card"><h3>Concluídos</h3><p style="color: var(--color-success);">${encerrados.length}</p></div>
            <div class="kpi-card"><h3>Progresso Médio (em andamento)</h3><p style="color: var(--color-primary);">${mediaProgresso}%</p></div>
        </div>
    `;

    const sortedItems = sortListByCriteria(items, secretariaSortCriteria);
    const rowsHtml = sortedItems.map(p => `
        <tr id="row-${p.id}">
            <td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}</td>
            <td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td>
            <td class="col-status" data-label="Status">${statusBadgeForAnyCategory(p)}</td>
            <td class="col-prioridade" data-label="Prioridade">${getPriorityBadge(p.prioridade)}</td>
            <td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td>
            <td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center; padding:32px;">Nenhum projeto encontrado para esta secretaria.</td></tr>';

    container.innerHTML = kpiHtml + `
        <div class="table-responsive">
            <table>
                <thead><tr><th class="col-ticket">Ticket / Nome do Projeto</th><th class="col-class">Classificação</th><th class="col-status">Status</th><th class="col-prioridade">Prioridade</th><th class="col-importancia">Importância</th><th class="col-acoes">Ações</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;
}
