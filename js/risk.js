// Indicadores de PMO derivados dos dados já existentes na planilha: atraso real de prazo,
// estagnação por falta de atualização, semáforo de risco (RAG) e aging de itens parados.
// Nenhum destes campos vem da planilha — são calculados no cliente a partir de Dt.Fim,
// Ult. Atualiz., Prioridade e Importância.

function computeDaysLate(p) {
    if (!p.hasProgress || !p.dtFimStr) return 0;
    const endDate = parseBrazilianDate(p.dtFimStr);
    if (!endDate) return 0;
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endMid = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.round((todayMid - endMid) / 86400000);
    return diffDays > 0 ? diffDays : 0;
}

// Retorna null quando não há Ult. Atualiz. registrada (não dá para afirmar estagnação sem dado).
function computeDaysStagnant(p) {
    if (!p.ultAtualizDate) return null;
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const updMid = new Date(p.ultAtualizDate.getFullYear(), p.ultAtualizDate.getMonth(), p.ultAtualizDate.getDate());
    const diffDays = Math.round((todayMid - updMid) / 86400000);
    return diffDays > 0 ? diffDays : 0;
}

// Score simples e transparente (não um modelo formal): soma pontos por atraso, estagnação,
// prioridade e importância (com peso extra para PL.ESTR/PL.GOV). Serve de triagem visual rápida.
function computeRiskLevel(p) {
    if (p.viewCategory === 'encerrados') return null;

    let score = 0;
    const diasAtraso = computeDaysLate(p);
    const diasSemAtualizar = computeDaysStagnant(p);

    if (diasAtraso > 0) score += 2;
    if (diasAtraso > 15) score += 1;
    if (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS) score += 2;
    if (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS * 2) score += 1;

    const prio = (p.prioridade || '').toUpperCase().trim();
    if (prio === 'ALTA') score += 2;
    else if (prio === 'MEDIA' || prio === 'MÉDIA') score += 1;

    const importanciaTags = (p.importancia || '').toUpperCase().split(',').map(s => s.trim());
    if (importanciaTags.includes('ALTA')) score += 1;
    if (importanciaTags.includes('PL.ESTR') || importanciaTags.includes('PL.GOV')) score += 1;

    if (score >= 5) return 'alto';
    if (score >= 3) return 'medio';
    return 'baixo';
}

const RISK_LABELS = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' };

// Explica em português, item a item, por que computeRiskLevel chegou naquele score —
// usado tanto no tooltip do badge quanto no campo "Risco" do modal de detalhe.
function getRiskReasons(p) {
    const reasons = [];
    const diasAtraso = computeDaysLate(p);
    const diasSemAtualizar = computeDaysStagnant(p);

    if (diasAtraso > 15) reasons.push(`Atraso crítico: ${diasAtraso} dias após o prazo (Dt. Fim)`);
    else if (diasAtraso > 0) reasons.push(`Atraso de prazo: ${diasAtraso} dia(s) após o prazo (Dt. Fim)`);

    if (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS * 2) reasons.push(`Estagnação crítica: ${diasSemAtualizar} dias sem atualização`);
    else if (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS) reasons.push(`Sem atualização há ${diasSemAtualizar} dias`);

    const prio = (p.prioridade || '').toUpperCase().trim();
    if (prio === 'ALTA') reasons.push('Prioridade Alta');
    else if (prio === 'MEDIA' || prio === 'MÉDIA') reasons.push('Prioridade Média');

    const importanciaTags = (p.importancia || '').toUpperCase().split(',').map(s => s.trim());
    if (importanciaTags.includes('ALTA')) reasons.push('Importância Alta');
    if (importanciaTags.includes('PL.ESTR')) reasons.push('Projeto do Plano Estratégico (PL.ESTR)');
    if (importanciaTags.includes('PL.GOV')) reasons.push('Projeto do Plano de Governo (PL.GOV)');

    if (reasons.length === 0) reasons.push('Nenhum fator de risco relevante identificado.');
    return reasons;
}

// Detalhamento fator-a-fator do placar de computeRiskLevel, na mesma ordem e pontuação —
// alimenta a tabela explicativa exibida ao passar o mouse (ou tocar) no badge de Risco.
// Ao contrário de getRiskReasons (que só lista o que pontuou), aqui TODOS os fatores aparecem,
// com 0 pontos quando não se aplicam, para deixar o cálculo completo e auditável.
function getRiskBreakdown(p) {
    const diasAtraso = computeDaysLate(p);
    const diasSemAtualizar = computeDaysStagnant(p);
    const prio = (p.prioridade || '').toUpperCase().trim();
    const importanciaTags = (p.importancia || '').toUpperCase().split(',').map(s => s.trim());

    const rows = [
        { fator: 'Atraso de prazo', condicao: 'Dt. Fim já vencida', pontos: diasAtraso > 0 ? 2 : 0 },
        { fator: 'Atraso crítico', condicao: 'Mais de 15 dias após o prazo', pontos: diasAtraso > 15 ? 1 : 0 },
        { fator: 'Estagnação', condicao: `Sem atualização há ≥ ${STAGNATION_THRESHOLD_DAYS} dias`, pontos: (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS) ? 2 : 0 },
        { fator: 'Estagnação crítica', condicao: `Sem atualização há ≥ ${STAGNATION_THRESHOLD_DAYS * 2} dias`, pontos: (diasSemAtualizar !== null && diasSemAtualizar >= STAGNATION_THRESHOLD_DAYS * 2) ? 1 : 0 },
        { fator: 'Prioridade Alta', condicao: 'Prioridade = Alta', pontos: prio === 'ALTA' ? 2 : 0 },
        { fator: 'Prioridade Média', condicao: 'Prioridade = Média', pontos: (prio === 'MEDIA' || prio === 'MÉDIA') ? 1 : 0 },
        { fator: 'Importância Alta', condicao: 'Tag "Alta" em Importância', pontos: importanciaTags.includes('ALTA') ? 1 : 0 },
        { fator: 'Projeto Estratégico', condicao: 'Tag PL.ESTR ou PL.GOV em Importância', pontos: (importanciaTags.includes('PL.ESTR') || importanciaTags.includes('PL.GOV')) ? 1 : 0 }
    ];

    return { rows, total: rows.reduce((acc, r) => acc + r.pontos, 0) };
}

function buildRiskTooltipHtml(p) {
    const level = computeRiskLevel(p);
    const { rows, total } = getRiskBreakdown(p);
    return `
        <div class="risk-tooltip-title">Modelo heurístico transparente de triagem visual</div>
        <table class="risk-tooltip-table">
            <thead><tr><th>Fator</th><th>Condição</th><th style="text-align:center;">Pontos</th></tr></thead>
            <tbody>
                ${rows.map(r => `<tr><td>${escapeHtml(r.fator)}</td><td>${escapeHtml(r.condicao)}</td><td style="text-align:center;">${r.pontos}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><td colspan="2" style="text-align:right;">Total</td><td style="text-align:center;">${total}</td></tr></tfoot>
        </table>
        <div class="risk-tooltip-result">Resultado: <b class="risk-tooltip-level-${level}">${RISK_LABELS[level] || '-'}</b> <span style="color:var(--text-muted);">(≥5 Alto · ≥3 Médio · &lt;3 Baixo)</span></div>
    `;
}

// Tooltip rico (com tabela) do badge de Risco: o atributo `title` nativo do navegador não
// renderiza HTML, então usamos um único elemento flutuante compartilhado (não duplicado por
// linha), reposicionado a cada hover/toque com base na posição real do badge na tela.
function showRiskTooltip(event, badgeEl) {
    const p = parsedProjectsList.find(item => item.id === parseInt(badgeEl.dataset.riskId, 10));
    if (!p) return;

    let tooltip = document.getElementById('risk-tooltip-float');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'risk-tooltip-float';
        tooltip.className = 'risk-tooltip-float';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = buildRiskTooltipHtml(p);
    tooltip.style.display = 'block';

    const margin = 8;
    const rect = badgeEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

    // Em vez de só "tenta embaixo, senão joga pro topo da tela" (que podia colocar o tooltip
    // longe do badge quando nem embaixo nem em cima cabia por inteiro), escolhe o lado com mais
    // espaço livre e encaixa o tooltip inteiro dentro da tela nesse lado — sempre o mais perto
    // possível do badge, nunca cortado ou fora da área visível.
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferBelow = spaceBelow >= tooltipRect.height || spaceBelow >= spaceAbove;

    let top = preferBelow ? rect.bottom + margin : rect.top - tooltipRect.height - margin;
    const maxTop = window.innerHeight - margin - Math.min(tooltipRect.height, window.innerHeight - margin * 2);
    top = Math.max(margin, Math.min(top, maxTop));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function hideRiskTooltip() {
    const tooltip = document.getElementById('risk-tooltip-float');
    if (tooltip) tooltip.style.display = 'none';
}

// Toque em tablet/celular não dispara hover — o onclick no badge (ver getRiskBadge) chama
// showRiskTooltip também; este listener fecha o tooltip ao tocar/clicar fora dele.
document.addEventListener('click', (e) => {
    const tooltip = document.getElementById('risk-tooltip-float');
    if (!tooltip || tooltip.style.display === 'none') return;
    if (e.target.closest('.badge-risk') || e.target.closest('.risk-tooltip-float')) return;
    hideRiskTooltip();
});

function getRiskBadge(p) {
    const level = computeRiskLevel(p);
    if (!level) return '<span class="badge-na">-</span>';
    return `<span class="badge-risk risk-${level}" data-risk-id="${p.id}" onmouseenter="showRiskTooltip(event, this)" onmouseleave="hideRiskTooltip()" onclick="event.stopPropagation(); showRiskTooltip(event, this)">${RISK_LABELS[level]}</span>`;
}

// Badge de "X dias em atraso" para a célula de avanço (Ativos/CIINTEC).
function getDelayBadge(p) {
    const dias = computeDaysLate(p);
    if (dias <= 0) return '';
    return `<span class="badge-atraso" title="Dt. Fim vencida — o percentual acima satura em 100% e não reflete o atraso">⏰ ${dias}d em atraso</span>`;
}

// Aviso compacto sob o nome do ticket quando o projeto está sem atualização há muito tempo.
function getStagnationFlag(p) {
    const dias = computeDaysStagnant(p);
    if (dias === null || dias < STAGNATION_THRESHOLD_DAYS) return '';
    return `<div class="ticket-stagnant-flag" title="Sem atualização registrada há ${dias} dias">⚠ ${dias}d sem atualização</div>`;
}

// Aging de itens Parados/Suspensos/Backlog: usa Ult. Atualiz. como proxy de "há quanto tempo
// está nessa condição" (limitação honesta: não é a data exata de entrada no status).
function getAgingBadge(p) {
    const dias = computeDaysStagnant(p);
    if (dias === null) return '<span class="badge-na">Sem registro</span>';
    let cls = 'aging-ok';
    if (dias >= STAGNATION_THRESHOLD_DAYS * 2) cls = 'aging-critical';
    else if (dias >= STAGNATION_THRESHOLD_DAYS) cls = 'aging-warning';
    return `<span class="badge-aging ${cls}">${dias}d</span>`;
}
