// View "Acompanh. Prefeitura": recria visualmente o quadro da aba "Resumo Reuniao Prefeito".
// Diferente das demais abas, essa não é uma tabela com cabeçalhos — é uma ata de reunião em
// formato livre, editada à mão a cada reunião (tema, sub-itens indentados em vários níveis).
// O parsing (ver parsePrefeituraBoard) NÃO fixa índices de coluna — usa a posição da primeira
// célula preenchida de cada linha como nível de indentação, para sobreviver a ajustes de
// layout entre reuniões (célula arrastada, coluna nova inserida, novo nível de detalhe etc.).
//
// Buscada de forma independente da cadeia principal de projetos: se essa aba falhar ou for
// renomeada, só o quadro de acompanhamento fica indisponível — o resto do painel continua
// funcionando normalmente.

let prefeituraFetchTimeoutId = null;

function fetchPrefeituraBoard() {
    const container = document.getElementById('prefeitura-board-content');
    if (container) {
        container.innerHTML = '<div style="text-align:center; padding:48px; color:var(--text-muted);">Sincronizando quadro de acompanhamento...</div>';
    }

    clearTimeout(prefeituraFetchTimeoutId);
    prefeituraFetchTimeoutId = setTimeout(showPrefeituraError, FETCH_TIMEOUT_MS);

    const oldScript = document.getElementById('prefeitura-jsonp');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'prefeitura-jsonp';
    script.onerror = showPrefeituraError;
    const antiCache = new Date().getTime();
    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(PREFEITURA_SHEET_NAME)}&headers=0&tq=select *&nocache=${antiCache}&tqx=responseHandler:handlePrefeituraResponse`;
    document.body.appendChild(script);
}

function showPrefeituraError() {
    clearTimeout(prefeituraFetchTimeoutId);
    const container = document.getElementById('prefeitura-board-content');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:48px; color: var(--color-danger);">
                <p style="font-weight:700; margin-bottom:12px;">Não foi possível sincronizar o quadro de acompanhamento.</p>
                <button class="btn btn-secondary" onclick="fetchPrefeituraBoard()">Tentar novamente</button>
            </div>`;
    }
}

function handlePrefeituraResponse(response) {
    clearTimeout(prefeituraFetchTimeoutId);
    if (!response || !response.table) { showPrefeituraError(); return; }

    const rows = response.table.rows.map(row =>
        (row && row.c) ? row.c.map(cell => cell ? (cell.f || cell.v || '') : '') : []
    );

    renderPrefeituraBoard(parsePrefeituraBoard(rows));
}

// Propositalmente SEM índices de coluna fixos (não assume "B=tema, C=item..."). Tratamos a
// planilha como um outline: o que importa é a POSIÇÃO da primeira célula preenchida em cada
// linha, não a letra da coluna — colunas mais à direita = mais aninhado, não importa em qual
// coluna exata isso caia. Assim, arrastar uma célula, inserir uma coluna nova à esquerda ou
// aprofundar um nível de detalhe numa reunião futura não quebra o parsing.
function parsePrefeituraBoard(rows) {
    const entries = [];
    rows.forEach(row => {
        for (let col = 0; col < row.length; col++) {
            const val = (row[col] || '').toString().trim();
            if (val !== '') {
                entries.push({ level: col, text: val.replace(/^-+\s*/, '') });
                break;
            }
        }
    });
    if (entries.length === 0) return [];

    // Árvore genérica via pilha: cada entrada aninha sob a última entrada de nível mais raso
    // ainda na pilha. root.level = -1 garante que a(s) coluna(s) mais à esquerda usada(s) —
    // seja qual for — sempre vire(m) o nível de "tema" (card), sem hardcode de qual índice é.
    const root = { level: -1, children: [] };
    const stack = [root];
    entries.forEach(entry => {
        while (stack.length > 1 && stack[stack.length - 1].level >= entry.level) stack.pop();
        const node = { level: entry.level, text: entry.text, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    });

    return root.children.map(node => ({ title: node.text, items: node.children }));
}

function renderPrefeituraNode(node, depth) {
    const isSuspenso = normalizeString(node.text).includes('suspenso');
    const headingClass = depth === 0 ? ' prefeitura-item-heading' : '';
    const textStyle = isSuspenso ? ' style="color: var(--color-danger); font-weight:700; text-transform:uppercase;"' : '';
    return `
        <div class="prefeitura-item${headingClass}" style="padding-left: ${depth * 20}px;">
            <span class="prefeitura-item-text"${textStyle}>${escapeHtml(node.text)}</span>
        </div>
        ${node.children.map(child => renderPrefeituraNode(child, depth + 1)).join('')}
    `;
}

function renderPrefeituraBoard(blocks) {
    const container = document.getElementById('prefeitura-board-content');
    if (!container) return;

    if (blocks.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:48px; color:var(--text-muted);">Nenhum item registrado no quadro de acompanhamento.</div>';
        return;
    }

    container.innerHTML = `<div class="prefeitura-board">${blocks.map(block => `
        <div class="prefeitura-card">
            <div class="prefeitura-card-header"><i class="ph-bold ph-crown-simple"></i> ${escapeHtml(block.title || 'Itens sem tema associado')}</div>
            <div class="prefeitura-card-body">
                ${block.items.length === 0
                    ? '<div style="color:var(--text-muted); font-size:13px; font-style:italic;">Sem detalhamento registrado ainda.</div>'
                    : block.items.map(item => renderPrefeituraNode(item, 0)).join('')
                }
            </div>
        </div>
    `).join('')}</div>`;
}
