// View "Resumo Executivo": a "página zero" do portfólio — consolida em uma tela só o que
// hoje exige navegar por várias abas: KPIs-chave, maiores riscos, itens travados aguardando
// terceiros e entregas do mês corrente. Não introduz dado novo, só reagrega o que já existe.
// Assim como em Indicadores & Gráficos, pode ser filtrado por Projetos DT ou Projetos CIINTEC.

let execSource = 'ativos';

// Listas usadas para os popups dos cards clicáveis (Em Atraso / Estagnados / Entregues no Mês) —
// guardadas aqui para não precisar recalcular ao abrir o popup.
let execLastAtrasados = [];
let execLastEstagnados = [];
let execLastEntreguesMes = [];
let execLastAtrasoAtualizacao = [];

function setExecText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function setExecSource(source) {
    execSource = source;
    const btnDt = document.getElementById('exec-btn-dt');
    const btnCiintec = document.getElementById('exec-btn-ciintec');
    if (btnDt) btnDt.style.backgroundColor = (source === 'ativos') ? 'var(--primary-hover)' : 'var(--gray-500)';
    if (btnCiintec) btnCiintec.style.backgroundColor = (source === 'ciintec') ? 'var(--primary-hover)' : 'var(--gray-500)';
    renderResumoExecutivo();
}

// CIINTEC não tem sub-categorias como a aba principal (Parados/Backlog/Encerrados são todas
// viewCategory 'ciintec', diferenciadas só por status/classificação) — este helper normaliza
// as duas fontes para o mesmo formato {emAndamento, aguardandoTerceiros, encerrados}.
function getExecPopulation(source) {
    if (source === 'ativos') {
        return {
            emAndamento: parsedProjectsList.filter(p => p.viewCategory === 'ativos'),
            aguardandoTerceiros: parsedProjectsList.filter(p =>
                p.viewCategory === 'parados' && ['AGUARDANDO CLIENTE', 'AGUARDANDO PRESIDENTE'].includes((p.status || '').toUpperCase().trim())
            ),
            encerrados: parsedProjectsList.filter(p => p.viewCategory === 'encerrados'),
            usesDeliveredDate: true
        };
    }

    const ciintecAll = parsedProjectsList.filter(p => p.viewCategory === 'ciintec');
    return {
        emAndamento: ciintecAll.filter(p => !normalizeString(p.classificacao).includes('backlog') && !p.status.toUpperCase().includes('ENCERRAD')),
        aguardandoTerceiros: ciintecAll.filter(p => (p.status || '').toUpperCase().includes('AGUARDANDO')),
        encerrados: ciintecAll.filter(p => p.status.toUpperCase().includes('ENCERRAD')),
        usesDeliveredDate: false
    };
}

function renderResumoExecutivo() {
    if (!document.getElementById('exec-count-ativos')) return;

    const pop = getExecPopulation(execSource);
    const comProgresso = pop.emAndamento.filter(p => p.hasProgress);
    const mediaProgresso = comProgresso.length
        ? Math.round(comProgresso.reduce((acc, p) => acc + p.progressPercentage, 0) / comProgresso.length)
        : 0;

    execLastAtrasados = pop.emAndamento
        .filter(p => computeDaysLate(p) > 0)
        .sort((a, b) => computeDaysLate(b) - computeDaysLate(a));
    execLastEstagnados = pop.emAndamento.filter(p => {
        const dias = computeDaysStagnant(p);
        return dias !== null && dias > EXEC_STAGNATION_THRESHOLD_DAYS;
    });
    // Mesma regra do aviso "⚠ Xd sem atualização" exibido sob o ticket nas tabelas
    // (STAGNATION_THRESHOLD_DAYS=15) — diferente do card "Estagnados" acima, que usa um limiar
    // mais sensível (EXEC_STAGNATION_THRESHOLD_DAYS=10) só para o KPI de resumo.
    execLastAtrasoAtualizacao = pop.emAndamento.filter(p => {
        const dias = computeDaysStagnant(p);
        return dias !== null && dias >= STAGNATION_THRESHOLD_DAYS;
    }).sort((a, b) => computeDaysStagnant(b) - computeDaysStagnant(a));

    const now = new Date();
    if (pop.usesDeliveredDate) {
        execLastEntreguesMes = pop.encerrados.filter(p => {
            const match = (p.deliveredDateStr || '').match(/^(\D+)\/(\d{4})$/);
            if (!match) return false;
            const monthIndex = MONTHS_BR.indexOf(match[1]);
            return monthIndex === now.getMonth() && parseInt(match[2], 10) === now.getFullYear();
        });
    } else {
        // CIINTEC não grava data de entrega estruturada (deliveredDateStr é sempre "-" nessa aba);
        // Ult. Atualiz. do item encerrado é usada como aproximação honesta, não como data exata.
        execLastEntreguesMes = pop.encerrados.filter(p => {
            if (!p.ultAtualizDate) return false;
            return p.ultAtualizDate.getMonth() === now.getMonth() && p.ultAtualizDate.getFullYear() === now.getFullYear();
        });
    }

    setExecText('exec-count-ativos', pop.emAndamento.length);
    setExecText('exec-avg-progress', mediaProgresso + '%');
    setExecText('exec-count-atraso', execLastAtrasados.length);
    setExecText('exec-count-estagnados', execLastEstagnados.length);
    setExecText('exec-count-aguardando', pop.aguardandoTerceiros.length);
    setExecText('exec-count-entregues-mes', execLastEntreguesMes.length);

    const entreguesTitleEl = document.getElementById('exec-card-entregues-title');
    if (entreguesTitleEl) {
        entreguesTitleEl.title = pop.usesDeliveredDate
            ? 'Contagem pela data de entrega extraída do texto de Andamento (aba Finalizados).'
            : 'CIINTEC não registra data de entrega estruturada — aproximação pela Ult. Atualiz. do item encerrado.';
    }

    const candidatosRisco = [...pop.emAndamento, ...pop.aguardandoTerceiros];
    const topRiscos = candidatosRisco
        .filter(p => computeRiskLevel(p) === 'alto')
        .sort((a, b) => {
            const scoreA = computeDaysLate(a) + (computeDaysStagnant(a) || 0);
            const scoreB = computeDaysLate(b) + (computeDaysStagnant(b) || 0);
            return scoreB - scoreA;
        })
        .slice(0, 5);

    const riscosBody = document.getElementById('exec-top-riscos-body');
    if (riscosBody) {
        riscosBody.innerHTML = topRiscos.map(p => `
            <tr>
                <td class="col-ticket">${escapeHtml(p.ticket)}</td>
                <td class="col-sec"><b>${escapeHtml(p.secretaria)}</b></td>
                <td style="text-align:center;">${getRiskBadge(p)}</td>
                <td class="col-acoes"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:24px;">Nenhum projeto em risco alto no momento.</td></tr>';
    }

    const aguardandoBody = document.getElementById('exec-aguardando-body');
    if (aguardandoBody) {
        aguardandoBody.innerHTML = pop.aguardandoTerceiros.map(p => `
            <tr>
                <td class="col-ticket">${escapeHtml(p.ticket)}</td>
                <td class="col-sec"><b>${escapeHtml(p.secretaria)}</b></td>
                <td style="text-align:center;">${getStatusBadge(p.status, 'parados')}</td>
                <td class="col-acoes"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:24px;">Nenhum item aguardando terceiros.</td></tr>';
    }

    const atrasoAtualizTitleEl = document.getElementById('exec-atraso-atualizacao-title');
    if (atrasoAtualizTitleEl) atrasoAtualizTitleEl.innerText = `Projetos com Atraso de Atualização (≥ ${STAGNATION_THRESHOLD_DAYS}d sem atualização) — ${execLastAtrasoAtualizacao.length}`;

    const atrasoAtualizBody = document.getElementById('exec-atraso-atualizacao-body');
    if (atrasoAtualizBody) {
        atrasoAtualizBody.innerHTML = execLastAtrasoAtualizacao.map(p => `
            <tr>
                <td class="col-ticket">${escapeHtml(p.ticket)}</td>
                <td class="col-sec"><b>${escapeHtml(p.secretaria)}</b></td>
                <td style="text-align:center;">${formatDiasSemAtualizacao(p)}</td>
                <td style="text-align:center;">${getRiskBadge(p)}</td>
                <td class="col-acoes"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:24px;">Nenhum projeto com atraso de atualização no momento.</td></tr>';
    }

    const entregaTitleEl = document.getElementById('exec-atraso-entrega-title');
    if (entregaTitleEl) entregaTitleEl.innerText = `Projetos Atrasados para Entrega (Dt. Fim vencida) — ${execLastAtrasados.length}`;

    const entregaBody = document.getElementById('exec-atraso-entrega-body');
    if (entregaBody) {
        entregaBody.innerHTML = execLastAtrasados.map(p => `
            <tr>
                <td class="col-ticket">${escapeHtml(p.ticket)}</td>
                <td class="col-sec"><b>${escapeHtml(p.secretaria)}</b></td>
                <td style="text-align:center;">${computeDaysLate(p)}d</td>
                <td style="text-align:center;">${formatDiasSemAtualizacao(p)}</td>
                <td class="col-acoes"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:24px;">Nenhum projeto atrasado para entrega no momento.</td></tr>';
    }
}

// Usado tanto na nova tabela "Atrasados para Entrega" quanto na coluna extra do popup
// showAtrasoPopup — mostra os dias sem atualização (independente de threshold) ou "-" quando
// o projeto não tem Ult. Atualiz. registrada.
function formatDiasSemAtualizacao(p) {
    const dias = computeDaysStagnant(p);
    return dias === null ? '-' : `${dias}d`;
}

function showAtrasoPopup() {
    openListModal(
        'Projetos em Atraso',
        execLastAtrasados,
        p => `${computeDaysLate(p)} dia(s) após o prazo (Dt. Fim)`,
        { header: 'Dias sem Atualização', fn: p => formatDiasSemAtualizacao(p) }
    );
}

function showEstagnadosPopup() {
    openListModal(`Projetos Estagnados (sem atualização há mais de ${EXEC_STAGNATION_THRESHOLD_DAYS} dias)`, execLastEstagnados, p => `${computeDaysStagnant(p)} dia(s) sem atualização`);
}

function showEntreguesMesPopup() {
    openListModal('Projetos Entregues Este Mês', execLastEntreguesMes, p =>
        (p.deliveredDateStr && p.deliveredDateStr !== '-') ? `Entregue em ${p.deliveredDateStr}` : 'Aproximado pela Ult. Atualiz. (CIINTEC não registra data de entrega)'
    );
}
