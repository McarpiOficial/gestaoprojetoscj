// View "Carga por Analista": agrega os projetos ativos de uma fonte (Projetos DT ou Projetos
// CIINTEC, como em Indicadores & Gráficos) por analista responsável, para responder "quem está
// sobrecarregado" — pergunta que antes não tinha resposta nenhuma no painel (o campo Analista só
// aparecia no modal de detalhe).

let workloadSource = 'ativos';

function setWorkloadSource(source) {
    workloadSource = source;
    const btnDt = document.getElementById('workload-btn-dt');
    const btnCiintec = document.getElementById('workload-btn-ciintec');
    if (btnDt) btnDt.style.backgroundColor = (source === 'ativos') ? 'var(--primary-hover)' : 'var(--gray-500)';
    if (btnCiintec) btnCiintec.style.backgroundColor = (source === 'ciintec') ? 'var(--primary-hover)' : 'var(--gray-500)';
    renderCargaAnalista();
}

function renderCargaAnalista() {
    const tbody = document.getElementById('table-carga-analista-body');
    if (!tbody) return;

    const relevantes = parsedProjectsList.filter(p =>
        p.viewCategory === workloadSource && p.analista && p.analista !== '-'
    );

    const porAnalista = {};
    relevantes.forEach(p => {
        const chave = p.analista.trim();
        if (!porAnalista[chave]) porAnalista[chave] = { total: 0, alta: 0, media: 0, baixa: 0 };
        porAnalista[chave].total++;
        const prio = (p.prioridade || '').toUpperCase().trim();
        if (prio === 'ALTA') porAnalista[chave].alta++;
        else if (prio === 'BAIXA') porAnalista[chave].baixa++;
        else porAnalista[chave].media++;
    });

    const isOverloaded = (stats) => stats.alta >= OVERLOAD_HIGH_PRIORITY_COUNT || stats.total >= OVERLOAD_TOTAL_COUNT;

    const linhas = Object.entries(porAnalista).sort((a, b) => b[1].total - a[1].total);

    tbody.innerHTML = linhas.map(([analista, stats]) => `
        <tr>
            <td class="col-ticket" data-label="Analista">${escapeHtml(analista)}</td>
            <td style="text-align:center;" data-label="Projetos Ativos">${stats.total}</td>
            <td style="text-align:center;" data-label="Alta Prioridade">${stats.alta}</td>
            <td style="text-align:center;" data-label="Média Prioridade">${stats.media}</td>
            <td style="text-align:center;" data-label="Baixa Prioridade">${stats.baixa}</td>
            <td style="text-align:center;" data-label="Alerta">${isOverloaded(stats) ? '<span class="badge-risk risk-alto">Sobrecarregado</span>' : '<span class="badge-risk risk-baixo">OK</span>'}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center; padding:32px;">Nenhum analista com projetos ativos mapeado.</td></tr>';

    const totalSobrecarregados = linhas.filter(([, stats]) => isOverloaded(stats)).length;
    const elTotalAnalistas = document.getElementById('count-analistas');
    const elSobrecarga = document.getElementById('count-analistas-sobrecarga');
    if (elTotalAnalistas) elTotalAnalistas.innerText = linhas.length;
    if (elSobrecarga) elSobrecarga.innerText = totalSobrecarregados;
}
