// Badges, ordenação e renderização das tabelas de projetos (uma por view de status).

function getClassificationBadge(val) {
    const keyToken = normalizeString(val).toUpperCase();
    let cls = CLASSIFICATION_CLASSES['GERAL'];
    if (keyToken.includes('INICIACAO') || keyToken.includes('INICIA')) cls = CLASSIFICATION_CLASSES['INICIACAO'];
    else if (keyToken.includes('PLANEJAMENTO')) cls = CLASSIFICATION_CLASSES['PLANEJAMENTO'];
    else if (keyToken.includes('EXECUCAO') || keyToken.includes('EXECU')) cls = CLASSIFICATION_CLASSES['EXECUCAO'];
    else if (keyToken.includes('MONITORAMENTO') || keyToken.includes('MONITOR')) cls = CLASSIFICATION_CLASSES['MONITORAMENTO'];
    return `<span class="badge-classification ${cls}">${escapeHtml(val)}</span>`;
}

function getStatusBadge(val, viewCategory) {
    if (viewCategory === 'encerrados') return `<span class="badge-status status-encerrado">ENCERRADO</span>`;
    const statusUpper = val.toUpperCase().trim();
    if (viewCategory === 'parados') {
        const cls = statusUpper.includes('SUSPENSO') ? 'status-suspenso' : 'status-aguardando';
        return `<span class="badge-status ${cls}">${escapeHtml(val)}</span>`;
    }
    if (viewCategory === 'backlog') {
        return `<span class="badge-status status-backlog">${escapeHtml(val)}</span>`;
    }
    return `<span class="badge-status status-em-andamento">${escapeHtml(val)}</span>`;
}

function getPriorityBadge(val) {
    const key = val.toUpperCase().trim();
    let cls = 'prio-media';
    if (key === 'ALTA') cls = 'prio-alta';
    if (key === 'BAIXA') cls = 'prio-baixa';
    return `<span class="badge-prio ${cls}">${escapeHtml(val)}</span>`;
}

function getImportanceBadge(val) {
    if (!val || val === 'Não Informada') return `<span class="badge-na">-</span>`;
    return val.split(',').map(item => {
        const cleanItem = item.trim();
        let cls = 'importance-default';
        const key = cleanItem.toUpperCase();

        if (key === 'ALTA') cls = 'importance-alta';
        else if (key === 'MÉDIA' || key === 'MEDIA') cls = 'importance-media';
        else if (key === 'BAIXA') cls = 'importance-baixa';
        else if (key === 'PL.ESTR') cls = 'importance-plestr';
        else if (key === 'PL.GOV') cls = 'importance-plgov';

        return `<span class="badge-importance ${cls}">${escapeHtml(cleanItem)}</span>`;
    }).join('');
}

function sortListByCriteria(list, criteria) {
    if (criteria === 'none') return [...list];
    return [...list].sort((a, b) => {
        if (criteria === 'ticket') return a.ticket.localeCompare(b.ticket);
        if (criteria === 'secretaria') return a.secretaria.localeCompare(b.secretaria);
        if (criteria === 'classificacao') return a.classificacao.localeCompare(b.classificacao);
        if (criteria === 'importancia') return a.importancia.localeCompare(b.importancia);
        if (criteria === 'prioridade') {
            const pA = PRIORITY_ORDER[a.prioridade.toUpperCase().trim()] || 99;
            const pB = PRIORITY_ORDER[b.prioridade.toUpperCase().trim()] || 99;
            return pA - pB;
        }
        if (criteria === 'risco') {
            const RISK_ORDER = { alto: 1, medio: 2, baixo: 3 };
            const rA = RISK_ORDER[computeRiskLevel(a)] || 99;
            const rB = RISK_ORDER[computeRiskLevel(b)] || 99;
            return rA - rB;
        }
        return 0;
    });
}

function sortDataAndRender(paneKey, criteria) {
    activeSorts[paneKey] = criteria;
    renderCategoryPanes(activeSorts.ativos, activeSorts.parados, activeSorts.backlog, activeSorts.suspensos, activeSorts.encerrados, activeSorts.ciintec);
}

function renderCategoryPanes(sortAtivos, sortParados, sortBacklog, sortSuspensos, sortEncerrados, sortCiintec = 'none') {
    const ativos = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'ativos'), sortAtivos);
    const parados = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'parados'), sortParados);
    const backlog = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'backlog'), sortBacklog);
    const suspensos = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'suspensos'), sortSuspensos);
    const encerrados = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'encerrados'), sortEncerrados);
    const ciintec = sortListByCriteria(parsedProjectsList.filter(p => p.viewCategory === 'ciintec'), sortCiintec);

    const ciintecSorted = [
        ...ciintec.filter(p => !normalizeString(p.classificacao).includes('backlog')),
        ...ciintec.filter(p => normalizeString(p.classificacao).includes('backlog'))
    ];

    const sectorCounts = {};
    ativos.forEach(p => {
        if (p.setor) {
            const setores = p.setor.split(',').map(s => s.trim()).filter(s => s !== "");
            setores.forEach(s => {
                sectorCounts[s] = (sectorCounts[s] || 0) + 1;
            });
        }
    });

    const sectorContainer = document.getElementById('ativos-por-setor');
    if (sectorContainer) {
        const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
        sectorContainer.innerHTML = sortedSectors.map(([sector, count]) => `
            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 12px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <h3 style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${escapeHtml(sector.toUpperCase())}">${escapeHtml(sector.toUpperCase())}</h3>
                <p style="font-size: 22px; font-weight: 700; color: var(--text-title); margin: 0;">${count}</p>
            </div>
        `).join('') || '<div style="color:var(--text-muted); font-size: 13px;">Nenhum setor encontrado.</div>';
    }

    const sectorCountsEncerrados = {};
    encerrados.forEach(p => {
        if (p.setor) {
            const setores = p.setor.split(',').map(s => s.trim()).filter(s => s !== "");
            setores.forEach(s => {
                sectorCountsEncerrados[s] = (sectorCountsEncerrados[s] || 0) + 1;
            });
        }
    });

    const sectorContainerEncerrados = document.getElementById('encerrados-por-setor');
    if (sectorContainerEncerrados) {
        const sortedSectorsEncerrados = Object.entries(sectorCountsEncerrados).sort((a, b) => b[1] - a[1]);
        sectorContainerEncerrados.innerHTML = sortedSectorsEncerrados.map(([sector, count]) => `
            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 12px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <h3 style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${escapeHtml(sector.toUpperCase())}">${escapeHtml(sector.toUpperCase())}</h3>
                <p style="font-size: 22px; font-weight: 700; color: var(--text-title); margin: 0;">${count}</p>
            </div>
        `).join('') || '<div style="color:var(--text-muted); font-size: 13px;">Nenhum setor encontrado.</div>';
    }

    const countPlEstr = ativos.filter(p => {
        if (!p.importancia) return false;
        const importancias = p.importancia.toUpperCase().split(',').map(item => item.trim());
        return importancias.includes('PL.ESTR');
    }).length;

    const countPlGov = ativos.filter(p => {
        if (!p.importancia) return false;
        const importancias = p.importancia.toUpperCase().split(',').map(item => item.trim());
        return importancias.includes('PL.GOV');
    }).length;

    const elAtivos = document.getElementById('count-ativos');
    const elPlEstr = document.getElementById('count-pl-estr');
    const elPlGov = document.getElementById('count-pl-gov');
    const elSuspensos = document.getElementById('count-suspensos');

    if(elAtivos) elAtivos.innerText = ativos.length;
    if(elPlEstr) elPlEstr.innerText = countPlEstr;
    if(elPlGov) elPlGov.innerText = countPlGov;
    if (elSuspensos) elSuspensos.innerText = suspensos.length;

    document.getElementById('count-parados').innerText = parados.length;
    document.getElementById('count-backlog').innerText = backlog.length;
    document.getElementById('count-encerrados').innerText = encerrados.length;

    const activeWithProgress = ativos.filter(p => p.hasProgress);
    const averageAtivos = activeWithProgress.length > 0
        ? Math.round(activeWithProgress.reduce((acc, curr) => acc + curr.progressPercentage, 0) / activeWithProgress.length)
        : 0;
    document.getElementById('avg-progress-ativos').innerText = `${averageAtivos}%`;

    const countPlEstrCiintec = ciintecSorted.filter(p => {
        if (!p.importancia) return false;
        const importancias = p.importancia.toUpperCase().split(',').map(item => item.trim());
        return importancias.includes('PL.ESTR');
    }).length;

    const countPlGovCiintec = ciintecSorted.filter(p => {
        if (!p.importancia) return false;
        const importancias = p.importancia.toUpperCase().split(',').map(item => item.trim());
        return importancias.includes('PL.GOV');
    }).length;

    const elCiintec = document.getElementById('count-ciintec');
    const elPlEstrCiintec = document.getElementById('count-pl-estr-ciintec');
    const elPlGovCiintec = document.getElementById('count-pl-gov-ciintec');

    if(elCiintec) elCiintec.innerText = ciintecSorted.length;
    if(elPlEstrCiintec) elPlEstrCiintec.innerText = countPlEstrCiintec;
    if(elPlGovCiintec) elPlGovCiintec.innerText = countPlGovCiintec;

    const activeWithProgressCiintec = ciintecSorted.filter(p => p.hasProgress);
    const averageCiintec = activeWithProgressCiintec.length > 0
        ? Math.round(activeWithProgressCiintec.reduce((acc, curr) => acc + curr.progressPercentage, 0) / activeWithProgressCiintec.length)
        : 0;
    const avgProgressCiintec = document.getElementById('avg-progress-ciintec');
    if(avgProgressCiintec) avgProgressCiintec.innerText = `${averageCiintec}%`;

    const renderRowAtivo = (p) => {
        let rHtml = `<span class="badge-na">Aguardando Cronograma</span>`;
        if (p.hasProgress) {
            // Status ANDAMENTO com progresso saturado em 100% não significa concluído — significa
            // que a Dt.Fim já passou (ver computeDaysLate). Nesse caso a régua de percentual não
            // faz sentido: substitui por um aviso para revisar o prazo, mantendo o badge de atraso.
            if (p.progressPercentage === 100 && p.status.toUpperCase().trim() === 'ANDAMENTO') {
                rHtml = `<div class="progress-wrapper"><span class="progress-review-prazo">Rever prazo início/fim</span></div>${getDelayBadge(p)}`;
            } else {
                const completeClass = p.progressPercentage === 100 ? 'complete' : '';
                rHtml = `<div class="progress-wrapper">
                            <div class="progress-container"><div class="progress-fill ${completeClass}" style="width: ${p.progressPercentage}%"></div></div>
                            <span class="progress-text">${p.progressPercentage}%</span>
                         </div>${getDelayBadge(p)}`;
            }
        }
        return `<tr id="row-${p.id}"><td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}${getStagnationFlag(p)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-status" data-label="Status">${getStatusBadge(p.status, 'ativos')}</td><td class="col-regua" data-label="Avanço p/ DT. ENTREGA">${rHtml}</td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-risco" data-label="Risco">${getRiskBadge(p)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`;
    };

    const chkGroupPriority = document.getElementById('group-priority-ativos');
    if (chkGroupPriority && chkGroupPriority.checked) {
        const groupedAtivos = { 'ALTA': [], 'MÉDIA': [], 'BAIXA': [], 'OUTROS': [] };
        ativos.forEach(p => {
            let prio = p.prioridade ? p.prioridade.toUpperCase().trim() : 'OUTROS';
            if (prio === 'MEDIA') prio = 'MÉDIA';
            if (groupedAtivos[prio]) { groupedAtivos[prio].push(p); } else { groupedAtivos['OUTROS'].push(p); }
        });

        let htmlGrouped = '';
        ['ALTA', 'MÉDIA', 'BAIXA', 'OUTROS'].forEach(prioGroup => {
            if (groupedAtivos[prioGroup].length > 0) {
                let headerBg = '#f1f5f9'; let headerColor = '#334155';
                if (prioGroup === 'ALTA') { headerBg = '#fee2e2'; headerColor = '#ef4444'; }
                if (prioGroup === 'MÉDIA') { headerBg = '#fef3c7'; headerColor = '#d97706'; }
                if (prioGroup === 'BAIXA') { headerBg = '#ccfbf1'; headerColor = '#115e59'; }

                htmlGrouped += `<tr class="group-header-row" style="background-color: ${headerBg};"><td colspan="8" style="font-weight: bold; padding: 10px 24px; color: ${headerColor}; font-size: 13px; text-transform: uppercase;">Prioridade: ${prioGroup} (${groupedAtivos[prioGroup].length})</td></tr>`;
                htmlGrouped += groupedAtivos[prioGroup].map(p => renderRowAtivo(p)).join('');
            }
        });
        document.getElementById('table-ativos-body').innerHTML = htmlGrouped || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto ativo mapeado.</td></tr>';
    } else {
        document.getElementById('table-ativos-body').innerHTML = ativos.map(p => renderRowAtivo(p)).join('') || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto ativo mapeado.</td></tr>';
    }

    const renderRowCiintec = (p) => {
        let rHtml = `<span class="badge-na">Aguardando Cronograma</span>`;
        if (p.hasProgress) {
            const completeClass = p.progressPercentage === 100 ? 'complete' : '';
            rHtml = `<div class="progress-wrapper">
                        <div class="progress-container"><div class="progress-fill ${completeClass}" style="width: ${p.progressPercentage}%"></div></div>
                        <span class="progress-text">${p.progressPercentage}%</span>
                     </div>${getDelayBadge(p)}`;
        }
        const isExecucao = p.classificacao.toUpperCase().includes('EXECU') || p.status.toUpperCase().includes('EXECU') || p.status.toUpperCase().includes('ANDAMENTO');
        const ticketColor = isExecucao ? 'color: #0284c7 !important;' : '';
        return `<tr id="row-${p.id}"><td class="col-ticket" style="${ticketColor}" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}${getStagnationFlag(p)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-status" data-label="Status">${getStatusBadge(p.status, 'ativos')}</td><td class="col-regua" data-label="Avanço p/ DT. ENTREGA">${rHtml}</td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-risco" data-label="Risco">${getRiskBadge(p)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`;
    };

    const chkGroupPriorityCiintec = document.getElementById('group-priority-ciintec');
    if (chkGroupPriorityCiintec && chkGroupPriorityCiintec.checked) {
        const groupedCiintec = { 'ALTA': [], 'MÉDIA': [], 'BAIXA': [], 'OUTROS': [], 'BACKLOG': [] };

        ciintecSorted.forEach(p => {
            let prio = p.prioridade ? p.prioridade.toUpperCase().trim() : 'OUTROS';
            if (prio === 'MEDIA') prio = 'MÉDIA';

            if (normalizeString(p.classificacao).includes('backlog')) {
                groupedCiintec['BACKLOG'].push(p);
            } else {
                if (groupedCiintec[prio]) { groupedCiintec[prio].push(p); } else { groupedCiintec['OUTROS'].push(p); }
            }
        });

        let htmlGroupedCiintec = '';
        ['ALTA', 'MÉDIA', 'BAIXA', 'OUTROS', 'BACKLOG'].forEach(prioGroup => {
            if (groupedCiintec[prioGroup] && groupedCiintec[prioGroup].length > 0) {
                let headerBg = '#f1f5f9'; let headerColor = '#334155'; let displayName = `Prioridade: ${prioGroup}`;
                if (prioGroup === 'ALTA') { headerBg = '#fee2e2'; headerColor = '#ef4444'; }
                if (prioGroup === 'MÉDIA') { headerBg = '#fef3c7'; headerColor = '#d97706'; }
                if (prioGroup === 'BAIXA') { headerBg = '#ccfbf1'; headerColor = '#115e59'; }
                if (prioGroup === 'BACKLOG') { headerBg = '#e2e8f0'; headerColor = '#475569'; displayName = 'BACKLOG'; }

                htmlGroupedCiintec += `<tr class="group-header-row" style="background-color: ${headerBg};"><td colspan="8" style="font-weight: bold; padding: 10px 24px; color: ${headerColor}; font-size: 13px; text-transform: uppercase;">${displayName} (${groupedCiintec[prioGroup].length})</td></tr>`;
                htmlGroupedCiintec += groupedCiintec[prioGroup].map(p => renderRowCiintec(p)).join('');
            }
        });
        document.getElementById('table-ciintec-body').innerHTML = htmlGroupedCiintec || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto mapeado na aba CIINTEC.</td></tr>';
    } else {
        document.getElementById('table-ciintec-body').innerHTML = ciintecSorted.map(p => renderRowCiintec(p)).join('') || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto mapeado na aba CIINTEC.</td></tr>';
    }

    document.getElementById('table-parados-body').innerHTML = parados.map(p => `<tr id="row-${p.id}"><td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-status" data-label="Status">${getStatusBadge(p.status, 'parados')}</td><td class="col-prioridade" data-label="Prioridade">${getPriorityBadge(p.prioridade)}</td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-aging" data-label="Há Quanto Tempo">${getAgingBadge(p)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto parado mapeado.</td></tr>';

    document.getElementById('table-backlog-body').innerHTML = backlog.map(p => `<tr id="row-${p.id}"><td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}${getStagnationFlag(p)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-prioridade" data-label="Prioridade">${getPriorityBadge(p.prioridade)}</td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-aging" data-label="Há Quanto Tempo">${getAgingBadge(p)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center; padding:32px;">Nenhum backlog mapeado.</td></tr>';

    document.getElementById('table-suspensos-body').innerHTML = suspensos.map(p => {
        let rHtml = `<span class="badge-na">Aguardando Cronograma</span>`;
        if (p.hasProgress) {
            const completeClass = p.progressPercentage === 100 ? 'complete' : '';
            rHtml = `<div class="progress-wrapper"><div class="progress-container"><div class="progress-fill ${completeClass}" style="width: ${p.progressPercentage}%"></div></div><span class="progress-text">${p.progressPercentage}%</span></div>`;
        }
        return `<tr id="row-${p.id}"><td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-status" data-label="Status"><span class="badge-status status-suspenso">${escapeHtml(p.status)}</span></td><td class="col-regua" data-label="Avanço p/ DT. ENTREGA">${rHtml}</td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-aging" data-label="Há Quanto Tempo">${getAgingBadge(p)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto suspenso mapeado.</td></tr>';

    document.getElementById('table-encerrados-body').innerHTML = encerrados.map(p => `<tr id="row-${p.id}"><td class="col-ticket" data-label="Ticket / Nome do Projeto">${escapeHtml(p.ticket)}</td><td class="col-sec" data-label="Secretaria"><b>${escapeHtml(p.secretaria)}</b></td><td class="col-class" data-label="Classificação">${getClassificationBadge(p.classificacao)}</td><td class="col-status" data-label="Status">${getStatusBadge(p.status, 'encerrados')}</td><td class="col-prioridade" data-label="Prioridade">${getPriorityBadge(p.prioridade)}</td><td class="col-entregue" data-label="Entregue Em"><span>${p.deliveredDateStr}</span></td><td class="col-importancia" data-label="Importância">${getImportanceBadge(p.importancia)}</td><td class="col-acoes" data-label="Ações"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center; padding:32px;">Nenhum projeto finalizado mapeado na lista.</td></tr>';

    renderCargaAnalista();
    renderResumoExecutivo();
    populateSecretariaOptions();
    const selectSecretaria = document.getElementById('select-secretaria');
    if (selectSecretaria) renderVisaoSecretaria(selectSecretaria.value);
    buildAllCharts();
}
