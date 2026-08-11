// Ingestão de dados: dispara a cadeia de 4 chamadas JSONP (gviz) contra a planilha e
// transforma cada resposta em itens de parsedProjectsList via processSheetTable.
//
// As 4 abas (principal, Suspenso, Finalizados, CIINTEC) tinham no arquivo original 4 funções
// handle*Response quase idênticas (~150 linhas replicadas 4x). processSheetTable(response, config)
// concentra essa lógica; as diferenças entre abas ficam isoladas em SHEET_CONFIGS (js/config.js).

let fetchTimeoutId = null;

const SKELETON_TABLE_IDS = ['table-ativos-body', 'table-ciintec-body', 'table-parados-body', 'table-backlog-body', 'table-suspensos-body', 'table-encerrados-body'];
const SKELETON_KPI_IDS = ['count-ativos', 'count-pl-estr', 'count-pl-gov', 'avg-progress-ativos', 'count-ciintec', 'count-pl-estr-ciintec', 'count-pl-gov-ciintec', 'avg-progress-ciintec', 'count-parados', 'count-backlog', 'count-suspensos', 'count-encerrados'];

// Placeholder animado exibido enquanto os dados não chegam (primeira carga e "Atualizar Dados").
// Cada elemento é sobrescrito normalmente pelas funções de renderização assim que os dados chegam.
function showLoadingSkeletons() {
    SKELETON_TABLE_IDS.forEach(id => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        const table = tbody.closest('table');
        const cols = table ? table.querySelectorAll('thead th').length : 6;
        tbody.innerHTML = Array.from({ length: 4 }, () =>
            `<tr><td colspan="${cols || 6}" style="padding: 18px 24px;"><span class="skeleton" style="display:block; height:16px; width:100%;"></span></td></tr>`
        ).join('');
    });
    SKELETON_KPI_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="skeleton" style="width:44px; height:22px;"></span>';
    });
    ['ativos-por-setor', 'encerrados-por-setor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="color:var(--text-muted); font-size: 13px;">Carregando...</div>';
    });
}

function setUpdateButtonLoading(isLoading) {
    const btn = document.getElementById('btn-atualizar-dados');
    if (!btn) return;
    if (isLoading) {
        if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Atualizando...';
    } else {
        btn.disabled = false;
        btn.innerText = btn.dataset.originalText || 'Atualizar Dados (F5)';
    }
}

function hideFetchError() {
    const banner = document.getElementById('fetch-error-banner');
    if (banner) banner.style.display = 'none';
}

function clearFetchTimeout() {
    if (fetchTimeoutId) { clearTimeout(fetchTimeoutId); fetchTimeoutId = null; }
}

// Chamado pelo timeout de segurança ou por script.onerror de qualquer etapa da cadeia JSONP.
function showFetchError() {
    clearFetchTimeout();
    const banner = document.getElementById('fetch-error-banner');
    if (banner) banner.style.display = 'flex';
    document.getElementById('update-timestamp').innerText = 'Falha na sincronização';
    setUpdateButtonLoading(false);
}

function fetchSpreadsheetData() {
    hideFetchError();
    setUpdateButtonLoading(true);
    showLoadingSkeletons();
    document.getElementById('update-timestamp').innerText = 'Sincronizando...';

    clearFetchTimeout();
    fetchTimeoutId = setTimeout(showFetchError, FETCH_TIMEOUT_MS);

    const oldScript = document.getElementById('google-sheets-jsonp');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'google-sheets-jsonp';
    script.onerror = showFetchError;
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleSheetsResponse`;
    document.body.appendChild(script);

    // Independente da cadeia principal acima: se a aba da Prefeitura falhar, só o quadro
    // de acompanhamento fica indisponível (ver js/render-prefeitura.js).
    fetchPrefeituraBoard();
}

function isNotStopped(p) {
    if (!p || !p.status) return true;
    const stoppedStatuses = ['SUSPENSO', 'AGUARDANDO CLIENTE', 'AGUARDANDO PRESIDENTE'];
    return !stoppedStatuses.includes(p.status.toUpperCase().trim());
}

// Converte uma resposta gviz (response.table) numa lista de itens de projeto, aplicando as
// regras declaradas em `config` (ver SHEET_CONFIGS em js/config.js). `startId` é explícito
// (em vez de inferido de parsedProjectsList.length) porque a aba principal sempre reinicia a
// numeração em 0 a cada atualização, mesmo que já haja dados de uma carga anterior.
function processSheetTable(response, config, startId) {
    if (!response || !response.table) return [];

    const columnsNormalized = response.table.cols.map(c => normalizeString(c ? c.label : ''));
    const rows = response.table.rows;
    const today = new Date();
    const results = [];
    let universalId = startId;

    rows.forEach((row) => {
        if (!row || !row.c) return;
        const cellValues = row.c.map(cell => cell ? (cell.f || cell.v || '') : '');

        const getVal = (targetName) => {
            const normalizedTarget = normalizeString(targetName);
            let idx = columnsNormalized.findIndex(c => c === normalizedTarget || c.includes(normalizedTarget));
            if (idx === -1 && targetName === 'Ticket') idx = 0;
            if (idx === -1 && targetName === 'Secretaria') idx = 1;
            if (idx === -1 && targetName === 'Setor') idx = 2;
            if (idx === -1 && targetName === 'Status') idx = 3;
            if (idx === -1 && targetName === 'Classificacao') idx = 4;
            if (idx === -1 && targetName === 'Andamento') idx = 5;
            if (idx === -1 && targetName === 'Prioridade') idx = 6;
            if (idx === -1 && targetName === 'Importancia') idx = 7;
            if (idx === -1 && targetName === 'Observacao') idx = 8;
            if (config.includeDateFallbackIndices) {
                if (idx === -1 && targetName === 'Dt.Inicio') idx = 9;
                if (idx === -1 && targetName === 'Dt.Fim') idx = 10;
            }
            if (idx === -1 && (targetName === 'Ult. Atualiz.' || targetName === 'ultAtualiz')) {
                idx = columnsNormalized.findIndex(c => c.includes('atualiz'));
            }
            if (idx === -1 && targetName === 'Analista') idx = columnsNormalized.findIndex(c => c === 'analista' || c.includes('analista'));
            return (idx !== -1 && cellValues[idx] !== undefined) ? cellValues[idx].toString().trim() : '';
        };

        const ticketVal = getVal('Ticket');
        if (!ticketVal || normalizeString(ticketVal) === 'ticket' || ticketVal.trim() === "") return;

        const andamentoText = getVal('Andamento') || '';
        const ultAtualizStr = getVal('Ult. Atualiz.');

        const item = {
            id: universalId++,
            ticket: ticketVal,
            analista: getVal('Analista') || '-',
            secretaria: getVal('Secretaria') || 'Não Informada',
            setor: getVal('Setor') || config.defaultSetor,
            status: getVal('Status') || config.defaultStatus,
            classificacao: getVal('Classificacao') || 'Geral',
            andamento: andamentoText,
            prioridade: getVal('Prioridade') || 'Média',
            importancia: getVal('Importancia') || 'Média',
            observacao: getVal('Observacao') || '',
            dtInicioStr: config.hasDates ? (getVal('Dt.Inicio') || '') : '',
            dtFimStr: config.hasDates ? (getVal('Dt.Fim') || '') : '',
            ultAtualizStr: ultAtualizStr,
            ultAtualizDate: parseBrazilianDate(ultAtualizStr),
            deliveredDateStr: config.computeDeliveredDate ? extractDeliveredMonthYear(andamentoText) : '-',
            progressPercentage: config.fixedProgress,
            hasProgress: false
        };

        if (config.hasDates) {
            const startParsed = parseBrazilianDate(item.dtInicioStr);
            const endParsed = parseBrazilianDate(item.dtFimStr);
            let shouldCompute = false;

            if (config.progressMode === 'conditional') {
                const statusUpper = item.status.toUpperCase().trim();
                const stoppedStatuses = ['SUSPENSO', 'AGUARDANDO CLIENTE', 'AGUARDANDO PRESIDENTE'];
                const excludedStatuses = [...stoppedStatuses, 'NÃO INICIADOS', 'NÃO INICIADO'];
                shouldCompute = !excludedStatuses.includes(statusUpper) && item.setor !== "";
            } else if (config.progressMode === 'always') {
                shouldCompute = true;
            }

            if (shouldCompute && startParsed && endParsed) {
                item.hasProgress = true;
                if (today < startParsed) item.progressPercentage = 0;
                else if (today > endParsed) item.progressPercentage = 100;
                else item.progressPercentage = Math.round(((today - startParsed) / (endParsed - startParsed)) * 100);
            }
        }

        item.viewCategory = config.getViewCategory ? config.getViewCategory(item) : config.viewCategory;

        results.push(item);
    });

    return results;
}

// 1. ABA PRINCIPAL
function handleSheetsResponse(response) {
    parsedProjectsList = processSheetTable(response, SHEET_CONFIGS.principal, 0);

    const scriptSusp = document.createElement('script');
    scriptSusp.onerror = showFetchError;
    const antiCacheSusp = new Date().getTime();
    scriptSusp.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=1449581229&headers=1&tq=select *&nocache=${antiCacheSusp}&tqx=responseHandler:handleSuspensosResponse`;
    document.body.appendChild(scriptSusp);
}

// 2. ABA SUSPENSO
function handleSuspensosResponse(response) {
    parsedProjectsList.push(...processSheetTable(response, SHEET_CONFIGS.suspenso, parsedProjectsList.length));

    const scriptFin = document.createElement('script');
    scriptFin.onerror = showFetchError;
    const antiCacheFin = new Date().getTime();
    scriptFin.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=Finalizados&headers=1&tq=select *&nocache=${antiCacheFin}&tqx=responseHandler:handleFinalizadosResponse`;
    document.body.appendChild(scriptFin);
}

// 3. ABA FINALIZADOS
function handleFinalizadosResponse(response) {
    parsedProjectsList.push(...processSheetTable(response, SHEET_CONFIGS.finalizados, parsedProjectsList.length));

    const scriptGI = document.createElement('script');
    scriptGI.onerror = showFetchError;
    const antiCacheGI = new Date().getTime();
    scriptGI.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=Indice%20Cockpit%20Marcio&headers=1&tq=select%20A,B,C&nocache=${antiCacheGI}&tqx=responseHandler:handleGestaoInternaResponse`;
    document.body.appendChild(scriptGI);
}

// 4. ABA GESTÃO INTERNA (não é um projeto — é a lista de links/atalhos agrupados)
function handleGestaoInternaResponse(response) {
    if (response && response.table) {
        const rows = response.table.rows;
        const groupedData = {};

        rows.forEach((row) => {
            if (!row || !row.c) return;

            const agrupamento = row.c[0] ? (row.c[0].f || row.c[0].v || '').toString().trim() : 'Geral';
            const descricao = row.c[1] ? (row.c[1].f || row.c[1].v || '').toString().trim() : '';
            const link = row.c[2] ? (row.c[2].f || row.c[2].v || '').toString().trim() : '';

            if (!descricao) return;

            if (!groupedData[agrupamento]) {
                groupedData[agrupamento] = [];
            }
            groupedData[agrupamento].push({ descricao, link });
        });

        renderGestaoInterna(groupedData);
    }

    const scriptCiintec = document.createElement('script');
    scriptCiintec.onerror = showFetchError;
    const antiCacheCiintec = new Date().getTime();
    scriptCiintec.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=CIINTEC&headers=1&tq=select *&nocache=${antiCacheCiintec}&tqx=responseHandler:handleCiintecResponse`;
    document.body.appendChild(scriptCiintec);
}

// 5. ABA CIINTEC
function handleCiintecResponse(response) {
    parsedProjectsList.push(...processSheetTable(response, SHEET_CONFIGS.ciintec, parsedProjectsList.length));

    renderCategoryPanes(activeSorts.ativos, activeSorts.parados, activeSorts.backlog, activeSorts.suspensos, activeSorts.encerrados, activeSorts.ciintec);
    document.getElementById('update-timestamp').innerText = new Date().toLocaleString('pt-BR');
    clearFetchTimeout();
    setUpdateButtonLoading(false);
}
