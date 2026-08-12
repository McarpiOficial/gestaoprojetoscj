// Contratos: lê a aba "Planejado2026" de uma planilha separada do portfólio de projetos
// (ver CONTRATOS_SPREADSHEET_ID/CONTRATOS_SHEET_NAME em js/config.js). Independente da cadeia
// principal de fetch — se falhar, só as views de Contratos ficam indisponíveis.
//
// Layout da aba (linhas de título mescladas nas primeiras linhas, dados a partir da 1ª linha
// com Fornecedor preenchido): Nro | Fornecedor | Contrato | Vencimento Contrato |
// Compra Direta ou Licitação | Status Compra/Renov | (Mês | Gasto) x12 | Total Previsto | Total Gasto.
// A resolução de coluna é por nome do cabeçalho (com fallback posicional) para resistir a
// pequenos ajustes de layout na planilha, no mesmo espírito de processSheetTable.

function showContratosError() {
    const body = document.getElementById('contratos-acompanhamento-body');
    if (body) body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:24px; color:var(--color-danger);">Não foi possível carregar os dados de Contratos.</td></tr>';
    const grid5m = document.getElementById('contratos-5meses-body');
    if (grid5m) grid5m.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:24px; color:var(--color-danger);">Não foi possível carregar os dados de Contratos.</td></tr>';
}

function fetchContratosData() {
    const oldScript = document.getElementById('contratos-jsonp');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'contratos-jsonp';
    script.onerror = showContratosError;
    const antiCache = new Date().getTime();
    script.src = `https://docs.google.com/spreadsheets/d/${CONTRATOS_SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(CONTRATOS_SHEET_NAME)}&tq=select *&nocache=${antiCache}&tqx=responseHandler:handleContratosResponse`;
    document.body.appendChild(script);
}

function parseContratosSheet(response) {
    if (!response || !response.table) return [];

    const cols = response.table.cols.map(c => normalizeString(c ? c.label : ''));
    const rows = response.table.rows;

    const findCol = (needle, fallbackIdx) => {
        const target = normalizeString(needle);
        const idx = cols.findIndex(c => c === target || c.includes(target));
        return idx !== -1 ? idx : fallbackIdx;
    };

    const idxNro = findCol('Nro', 0);
    const idxFornecedor = findCol('Fornecedor', 1);
    const idxVencimento = findCol('Vencimento Contrato', 3);
    const idxTipo = findCol('Compra Direta ou Licitação', 4);
    const idxObservacao = findCol('Observação', 5);
    // Contratos marcados como "não será renovado" na coluna Observação são ignorados em
    // todas as views de Contratos (Acompanhamento e Indicadores Gestão).
    const NAO_RENOVAR_MARKER = normalizeString('não será renovado');

    // Pares (Mês, Gasto) — localizados pelo nome do mês, com fallback posicional a partir da
    // coluna 6 (2 colunas por mês), caso o cabeçalho não seja reconhecido.
    const monthCols = MONTHS_BR.map((mes, i) => {
        const idxMes = findCol(mes, 6 + i * 2);
        return { mes, idxPrevisto: idxMes, idxGasto: idxMes + 1 };
    });

    const results = [];
    rows.forEach(row => {
        if (!row || !row.c) return;
        const cellValues = row.c.map(cell => cell ? (cell.f !== undefined && cell.f !== null ? cell.f : cell.v) : '');
        const cellStr = (idx) => (cellValues[idx] !== undefined && cellValues[idx] !== null) ? cellValues[idx].toString().trim() : '';

        // Linhas de rodapé (subtotal, nota "Planilha oficial da DA", link da planilha) não têm
        // número em Nro (coluna A) — só linhas de contrato real são numeradas 1, 2, 3...
        if (!cellStr(idxNro)) return;

        const fornecedor = cellStr(idxFornecedor);
        if (!fornecedor || normalizeString(fornecedor) === 'fornecedor') return;

        const observacao = cellStr(idxObservacao);
        if (normalizeString(observacao).includes(NAO_RENOVAR_MARKER)) return;

        const vencimentoStr = cellStr(idxVencimento);
        const monthly = monthCols.map(mc => {
            // "-" é o jeito que a planilha marca "sem gasto neste mês" (informado). Célula vazia
            // ou só espaço em branco é diferente: significa que ninguém preencheu ainda — é essa
            // lacuna que o quadro "sem pagamento informado" (abaixo) precisa distinguir.
            const rawGasto = cellValues[mc.idxGasto];
            const rawGastoStr = (rawGasto !== undefined && rawGasto !== null) ? rawGasto.toString().trim() : '';
            return {
                mes: mc.mes,
                previsto: parseBrazilianCurrency(cellValues[mc.idxPrevisto]),
                gasto: parseBrazilianCurrency(rawGasto),
                gastoInformado: rawGastoStr.length > 0
            };
        });

        results.push({
            fornecedor,
            vencimentoStr,
            vencimentoDate: parseBrazilianDate(vencimentoStr),
            tipoContratacao: cellStr(idxTipo) || '-',
            monthly,
            totalPrevisto: monthly.reduce((acc, m) => acc + m.previsto, 0),
            totalGasto: monthly.reduce((acc, m) => acc + m.gasto, 0)
        });
    });

    return results;
}

function handleContratosResponse(response) {
    contractsList = parseContratosSheet(response);
    renderContratosAcompanhamento();
    renderContratosIndicadores();
}

// --- View "Acompanhamento" -------------------------------------------------------------

function renderContratosAcompanhamento() {
    const tbody = document.getElementById('contratos-acompanhamento-body');
    if (!tbody) return;

    const yearNow = new Date().getFullYear();
    const anoEl = document.getElementById('contratos-ano-atual');
    if (anoEl) anoEl.innerText = yearNow;

    const searchInput = document.getElementById('input-busca-contratos');
    const term = searchInput ? normalizeString(searchInput.value) : '';
    const sortSelect = document.getElementById('select-sort-contratos');
    const dir = sortSelect ? sortSelect.value : 'asc';

    let items = term
        ? contractsList.filter(c => normalizeString(c.fornecedor).includes(term))
        : [...contractsList];

    items.sort((a, b) => {
        if (!a.vencimentoDate && !b.vencimentoDate) return 0;
        if (!a.vencimentoDate) return 1;
        if (!b.vencimentoDate) return -1;
        return dir === 'desc' ? (b.vencimentoDate - a.vencimentoDate) : (a.vencimentoDate - b.vencimentoDate);
    });

    tbody.innerHTML = items.map(c => {
        const isExpiringThisYear = c.vencimentoDate && c.vencimentoDate.getFullYear() === yearNow;
        return `
        <tr class="${isExpiringThisYear ? 'row-contract-expiring' : ''}">
            <td class="col-contrato-forn" data-label="Fornecedor / Objeto">${escapeHtml(c.fornecedor)}</td>
            <td class="col-contrato-venc" data-label="Vencimento">${escapeHtml(c.vencimentoStr) || '-'}</td>
            <td class="col-contrato-valor" data-label="Total Previsto (Ano)">${formatCurrencyBRL(c.totalPrevisto)}</td>
            <td class="col-contrato-valor" data-label="Total Pago (Ano)">${formatCurrencyBRL(c.totalGasto)}</td>
            <td class="col-contrato-tipo" data-label="Tipo de Contratação">${escapeHtml(c.tipoContratacao)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center; padding:32px;">Nenhum contrato encontrado.</td></tr>';

    renderContratosSemPagamento();
}

// Contratos com previsto orçado num mês anterior ao atual (deste ano) cujo Gasto não foi
// preenchido — distingue de "-" (que na planilha significa "sem gasto neste mês", já
// informado) olhando o texto bruto da célula em parseContratosSheet (gastoInformado).
function getContratosSemPagamento() {
    const currentMonthIndex = new Date().getMonth(); // 0 = Janeiro

    const contratosComGap = contractsList
        .map(c => ({
            contrato: c,
            gaps: c.monthly
                .map((m, idx) => ({ ...m, idx }))
                .filter(m => m.idx < currentMonthIndex && m.previsto > 0 && !m.gastoInformado)
        }))
        .filter(x => x.gaps.length > 0);

    const mesesComGap = [...new Set(contratosComGap.flatMap(x => x.gaps.map(g => g.idx)))].sort((a, b) => a - b);

    return { contratosComGap, mesesComGap, currentMonthIndex };
}

function renderContratosSemPagamento() {
    const container = document.getElementById('contratos-sem-pagamento-container');
    if (!container) return;

    const { contratosComGap, mesesComGap, currentMonthIndex } = getContratosSemPagamento();

    const titleEl = document.getElementById('contratos-sem-pagamento-title');
    if (titleEl) {
        titleEl.innerText = currentMonthIndex === 0
            ? 'Contratos sem Pagamento Informado'
            : `Contratos sem Pagamento Informado (meses anteriores a ${MONTHS_BR[currentMonthIndex]})`;
    }

    if (currentMonthIndex === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding: 4px 0 12px;">Ainda não há meses anteriores no ano para analisar.</div>';
        return;
    }

    if (contratosComGap.length === 0) {
        container.innerHTML = '<div style="color:var(--color-success); font-size:13px; font-weight:600; padding: 4px 0 12px;"><i class="ph-bold ph-check-circle"></i> Nenhum contrato com pagamento não informado nos meses anteriores.</div>';
        return;
    }

    const theadMeses = mesesComGap.map(idx => `<th class="col-contrato-valor">${MONTHS_BR[idx]} (Previsto)</th><th class="col-contrato-valor">${MONTHS_BR[idx]} (Pago)</th>`).join('');

    const rows = contratosComGap.map(({ contrato, gaps }) => {
        const gapByIdx = new Map(gaps.map(g => [g.idx, g]));
        const cells = mesesComGap.map(idx => {
            const gap = gapByIdx.get(idx);
            if (!gap) return `<td class="col-contrato-valor" data-label="Previsto ${MONTHS_BR[idx]}">-</td><td class="col-contrato-valor" data-label="Pago ${MONTHS_BR[idx]}">-</td>`;
            return `<td class="col-contrato-valor" data-label="Previsto ${MONTHS_BR[idx]}">${formatCurrencyBRL(gap.previsto)}</td><td class="col-contrato-valor" data-label="Pago ${MONTHS_BR[idx]}"></td>`;
        }).join('');
        return `<tr><td class="col-contrato-forn" data-label="Fornecedor / Objeto">${escapeHtml(contrato.fornecedor)}</td>${cells}</tr>`;
    }).join('');

    container.innerHTML = `
        <div class="table-responsive" style="max-height: 360px;">
            <table>
                <thead><tr><th class="col-contrato-forn">Fornecedor / Objeto</th>${theadMeses}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// --- View "Indicadores Gestão" ----------------------------------------------------------

function getContratosMonthlyTotals() {
    return MONTHS_BR.map((mes, i) => ({
        mes,
        previsto: contractsList.reduce((acc, c) => acc + (c.monthly[i] ? c.monthly[i].previsto : 0), 0),
        gasto: contractsList.reduce((acc, c) => acc + (c.monthly[i] ? c.monthly[i].gasto : 0), 0)
    }));
}

function renderContratosVencimento5Meses() {
    const tbody = document.getElementById('contratos-5meses-body');
    if (!tbody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limite = new Date(today);
    limite.setMonth(limite.getMonth() + CONTRATOS_VENCIMENTO_JANELA_MESES);

    const items = contractsList
        .filter(c => c.vencimentoDate && c.vencimentoDate >= today && c.vencimentoDate <= limite)
        .sort((a, b) => a.vencimentoDate - b.vencimentoDate);

    tbody.innerHTML = items.map(c => `
        <tr>
            <td class="col-contrato-forn" data-label="Fornecedor / Objeto">${escapeHtml(c.fornecedor)}</td>
            <td class="col-contrato-venc" data-label="Vencimento">${escapeHtml(c.vencimentoStr)}</td>
            <td class="col-contrato-tipo" data-label="Tipo de Contratação">${escapeHtml(c.tipoContratacao)}</td>
        </tr>
    `).join('') || `<tr><td colspan="3" style="text-align:center; padding:24px;">Nenhum contrato com vencimento nos próximos ${CONTRATOS_VENCIMENTO_JANELA_MESES} meses.</td></tr>`;
}

function renderContratosDesvioTable() {
    const tbody = document.getElementById('contratos-desvio-body');
    if (!tbody) return;

    const comOrcamento = contractsList
        .filter(c => c.totalPrevisto > 0 || c.totalGasto > 0)
        .map(c => {
            const desvio = c.totalGasto - c.totalPrevisto;
            const desvioPerc = c.totalPrevisto > 0 ? (desvio / c.totalPrevisto * 100) : (c.totalGasto > 0 ? 100 : 0);
            return { ...c, desvio, desvioPerc };
        })
        .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));

    tbody.innerHTML = comOrcamento.map(c => {
        const cls = c.desvio > 0 ? 'desvio-acima' : (c.desvio < 0 ? 'desvio-abaixo' : 'desvio-neutro');
        const sinal = c.desvio > 0 ? '+' : '';
        return `
        <tr>
            <td class="col-contrato-forn" data-label="Fornecedor / Objeto">${escapeHtml(c.fornecedor)}</td>
            <td class="col-contrato-valor" data-label="Total Previsto">${formatCurrencyBRL(c.totalPrevisto)}</td>
            <td class="col-contrato-valor" data-label="Total Gasto">${formatCurrencyBRL(c.totalGasto)}</td>
            <td style="text-align:center;" data-label="Desvio"><span class="badge-desvio ${cls}">${sinal}${formatCurrencyBRL(c.desvio)} (${sinal}${c.desvioPerc.toFixed(0)}%)</span></td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center; padding:24px;">Sem dados de orçamento disponíveis.</td></tr>';
}

function buildContratosOrcamentoChart() {
    const canvas = document.getElementById('chartContratosOrcamento');
    if (!canvas) return;
    if (chartContratosOrcamentoInstance) chartContratosOrcamentoInstance.destroy();

    const monthly = getContratosMonthlyTotals();

    chartContratosOrcamentoInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: monthly.map(m => m.mes.slice(0, 3)),
            datasets: [
                { label: 'Previsto', data: monthly.map(m => m.previsto), backgroundColor: '#94a3b8', borderRadius: 4 },
                { label: 'Gasto', data: monthly.map(m => m.gasto), backgroundColor: '#0284c7', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                datalabels: { display: false },
                tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrencyBRL(ctx.raw)}` } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrencyBRL(v) } } }
        }
    });
}

function renderContratosIndicadores() {
    if (!document.getElementById('contratos-count-a-vencer')) return;

    const yearNow = new Date().getFullYear();
    const aVencer = contractsList.filter(c => c.vencimentoDate && c.vencimentoDate.getFullYear() === yearNow);

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };

    setText('contratos-count-a-vencer', aVencer.length);
    setText('contratos-count-ativos', contractsList.length);

    const totalPrevisto = contractsList.reduce((acc, c) => acc + c.totalPrevisto, 0);
    const totalGasto = contractsList.reduce((acc, c) => acc + c.totalGasto, 0);
    const percExecutado = totalPrevisto > 0 ? Math.round((totalGasto / totalPrevisto) * 100) : 0;

    setText('contratos-total-previsto', formatCurrencyBRL(totalPrevisto));
    setText('contratos-total-gasto', formatCurrencyBRL(totalGasto));
    setText('contratos-perc-executado', percExecutado + '%');
    setText('contratos-saldo', formatCurrencyBRL(totalPrevisto - totalGasto));

    renderContratosVencimento5Meses();
    renderContratosDesvioTable();
    buildContratosOrcamentoChart();
}
