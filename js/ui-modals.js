// Modal de detalhe do projeto e modal de imagem (organograma ampliado),
// com focus trap, fechamento por Esc e devolução de foco ao elemento de origem.

// Pilha de modais abertos — suporta um modal sendo aberto por cima de outro já aberto (ex.:
// clicar na lupa 🔍 de um projeto dentro do popup de lista da Matriz Eisenhower ou do Resumo
// Executivo abre o modal de detalhe SOBRE o popup de lista, sem fechá-lo). Cada entrada guarda
// seu próprio foco de origem e handler de teclado, para que Esc/Tab só afetem o modal do topo.
let modalStack = [];

function getFocusableElements(container) {
    return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.disabled && el.offsetParent !== null);
}

function openModalWithA11y(modalId) {
    const modalEl = document.getElementById(modalId);
    const card = modalEl.querySelector('.modal-card') || modalEl.querySelector(':scope > div') || modalEl;

    const lastFocusedEl = document.activeElement;
    // z-index crescente por profundidade da pilha: o modal aberto por último sempre fica visualmente
    // por cima de qualquer outro já aberto, não importa a ordem dos elementos no HTML.
    modalEl.style.zIndex = 2000 + modalStack.length * 10;
    modalEl.style.display = 'flex';

    const focusable = getFocusableElements(card);
    (focusable[0] || card).focus();

    const isTopmost = () => modalStack.length > 0 && modalStack[modalStack.length - 1].modalId === modalId;

    const keydownHandler = function (e) {
        if (!isTopmost()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeModalWithA11y(modalId);
            return;
        }
        if (e.key === 'Tab') {
            const f = getFocusableElements(card);
            if (f.length === 0) return;
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
    };
    document.addEventListener('keydown', keydownHandler);
    modalStack.push({ modalId, lastFocusedEl, keydownHandler });
}

function closeModalWithA11y(modalId) {
    const modalEl = document.getElementById(modalId);
    modalEl.style.display = 'none';
    modalEl.style.zIndex = '';

    const idx = modalStack.map(m => m.modalId).lastIndexOf(modalId);
    if (idx === -1) return;
    const [entry] = modalStack.splice(idx, 1);
    document.removeEventListener('keydown', entry.keydownHandler);
    if (entry.lastFocusedEl && typeof entry.lastFocusedEl.focus === 'function') {
        entry.lastFocusedEl.focus();
    }
}

// Tenta renderizar o histórico de Andamento como timeline visual (uma data = um marco);
// se nenhuma data for reconhecida no texto livre, cai de volta para o texto puro original.
function renderAndamentoField(andamentoText) {
    const container = document.getElementById('m-andamento');
    const entries = parseAndamentoTimeline(andamentoText);

    if (entries.length === 0) {
        container.innerText = andamentoText || 'Sem logs.';
        return;
    }

    container.innerHTML = `<div class="andamento-timeline">${entries.map(e => `
        <div class="timeline-entry">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">${escapeHtml(e.date)}</div>
                <div class="timeline-text">${escapeHtml(e.text)}</div>
            </div>
        </div>
    `).join('')}</div>`;
}

// Mostra o nível de risco (RAG) e, quando aplicável, a lista dos fatores que levaram àquele
// score — é a resposta a "por que esse projeto está com risco Alto?".
function renderRiscoField(p) {
    const container = document.getElementById('m-risco');
    const level = computeRiskLevel(p);
    if (!level) {
        container.innerHTML = '<span class="badge-na">Não aplicável (projeto encerrado)</span>';
        return;
    }
    const reasons = getRiskReasons(p);
    container.innerHTML = `${getRiskBadge(p)}<ul style="margin: 8px 0 0 18px; padding: 0;">${reasons.map(r => `<li style="margin-bottom: 4px;">${escapeHtml(r)}</li>`).join('')}</ul>`;
}

function openProjectModal(projectId) {
    const p = parsedProjectsList.find(proj => proj.id === projectId);
    if(!p) return;
    document.getElementById('m-ticket').innerText = p.ticket;
    document.getElementById('m-secretaria').innerText = p.secretaria;
    document.getElementById('m-setor').innerText = p.setor || 'Não Informado';
    document.getElementById('m-status').innerText = p.status;
    document.getElementById('m-classificacao').innerText = p.classificacao;
    document.getElementById('m-prioridade').innerText = p.prioridade;
    document.getElementById('m-importancia').innerText = p.importancia;
    renderRiscoField(p);
    document.getElementById('m-dtinicio').innerText = p.dtInicioStr || '-';
    document.getElementById('m-dtfim').innerText = p.dtFimStr || '-';
    renderAndamentoField(p.andamento);
    document.getElementById('m-observacao').innerText = p.observacao || 'Nenhuma observação interna.';

    const container = document.getElementById('m-avanco-container');
    if (p.viewCategory === 'encerrados') {
        container.className = "field-value highlight-progress";
        container.innerHTML = `<span style="font-weight:700; color:#059669;">100% Concluído [Entregue em: ${p.deliveredDateStr}]</span>`;
    } else if (p.hasProgress) {
        container.className = "field-value highlight-progress";
        container.innerHTML = `<div class="progress-container" style="height:12px; border:none; background:#e2e8f0; width:100%;"><div class="progress-fill" style="width: ${p.progressPercentage}%;"></div></div><span style="font-weight:700; color:#166534;">${p.progressPercentage}%</span>`;
    } else {
        container.className = "field-value";
        container.innerHTML = `<span style="color:var(--text-muted); font-style:italic;">Cálculo suspenso pelas diretrizes de gestão de avanço.</span>`;
    }
    openModalWithA11y('detail-modal');
}

function closeModal() { closeModalWithA11y('detail-modal'); }

function openImageModal() { openModalWithA11y('image-modal'); }
function closeImageModal() { closeModalWithA11y('image-modal'); }

// Modal genérico de lista, usado pelos cards clicáveis do Resumo Executivo (Em Atraso,
// Estagnados, Entregues no Mês) e pelo popup de bolha da Matriz Eisenhower para detalhar
// quais projetos compõem cada contagem. `extraColumn` é opcional: {header, fn(p)} — quando
// informado, acrescenta uma 5ª coluna (ex.: "Ação" recomendada na Matriz Eisenhower).
function openListModal(title, items, detailFn, extraColumn) {
    document.getElementById('list-modal-title').innerText = title;
    const extraHeader = document.getElementById('list-modal-extra-header');
    if (extraHeader) {
        extraHeader.style.display = extraColumn ? '' : 'none';
        if (extraColumn) extraHeader.innerText = extraColumn.header;
    }

    const tbody = document.getElementById('list-modal-body');
    const colspan = extraColumn ? 5 : 4;
    tbody.innerHTML = items.map(p => `
        <tr>
            <td class="col-ticket">${escapeHtml(p.ticket)}</td>
            <td class="col-sec"><b>${escapeHtml(p.secretaria)}</b></td>
            <td>${escapeHtml(detailFn(p))}</td>
            ${extraColumn ? `<td>${escapeHtml(extraColumn.fn(p))}</td>` : ''}
            <td class="col-acoes"><button class="action-btn" onclick="openProjectModal(${p.id})">🔍</button></td>
        </tr>
    `).join('') || `<tr><td colspan="${colspan}" style="text-align:center; padding:24px;">Nenhum projeto encontrado.</td></tr>`;
    openModalWithA11y('list-modal');
}

function closeListModal() { closeModalWithA11y('list-modal'); }

function openIndicatorRulesModal() { openModalWithA11y('rules-modal'); }
function closeRulesModal() { closeModalWithA11y('rules-modal'); }

window.onclick = function(e) {
    if (e.target === document.getElementById('detail-modal')) closeModal();
    if (e.target === document.getElementById('image-modal')) closeImageModal();
    if (e.target === document.getElementById('list-modal')) closeListModal();
    if (e.target === document.getElementById('rules-modal')) closeRulesModal();
}
