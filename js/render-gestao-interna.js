// Renderização da view "Gestão Interna": grupos de links vindos da aba "Indice Cockpit Marcio",
// com paleta de cor e ícone escolhidos heuristicamente a partir do nome do grupo.

function renderGestaoInterna(groupedData) {
    const container = document.getElementById('gestao-interna-content');

    const palettes = [
        { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', btnBg: '#ffffff', btnText: '#0284c7', btnBorder: '#7dd3fc', btnHoverBg: '#0284c7', btnHoverText: '#ffffff', shadow: 'rgba(2, 132, 199, 0.25)' },
        { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', btnBg: '#ffffff', btnText: '#059669', btnBorder: '#6ee7b7', btnHoverBg: '#059669', btnHoverText: '#ffffff', shadow: 'rgba(5, 150, 105, 0.25)' },
        { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', btnBg: '#ffffff', btnText: '#7c3aed', btnBorder: '#c4b5fd', btnHoverBg: '#7c3aed', btnHoverText: '#ffffff', shadow: 'rgba(124, 58, 237, 0.25)' },
        { bg: '#fffbeb', border: '#fde68a', text: '#b45309', btnBg: '#ffffff', btnText: '#d97706', btnBorder: '#fcd34d', btnHoverBg: '#ea580c', btnHoverText: '#ffffff', shadow: 'rgba(234, 88, 12, 0.25)' },
        { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', btnBg: '#ffffff', btnText: '#e11d48', btnBorder: '#fda4af', btnHoverBg: '#e11d48', btnHoverText: '#ffffff', shadow: 'rgba(225, 29, 72, 0.25)' }
    ];

    function getIconForGroup(name) {
        const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

        if (n.includes('visao') || n.includes('dt')) return 'ph-eye';
        if (n.includes('orcamento') || n.includes('dinheiro')) return 'ph-money';
        if (n.includes('projeto')) return 'ph-leaf';
        if (n.includes('gestao')) return 'ph-thumbs-up';
        if (n.includes('rh') || n.includes('pessoa') || n.includes('humanos')) return 'ph-users-three';
        if (n.includes('sistema') || n.includes('ti') || n.includes('tecnologia')) return 'ph-desktop-tower';
        if (n.includes('relatorio') || n.includes('dado') || n.includes('indicador') || n.includes('dashboard')) return 'ph-chart-bar';
        if (n.includes('facilita') || n.includes('jucesp') || n.includes('integracao') || n.includes('cnpj')) return 'ph-arrows-left-right';
        if (n.includes('configuracao') || n.includes('ajuste') || n.includes('admin')) return 'ph-gear';
        if (n.includes('doc') || n.includes('arquivo') || n.includes('manual')) return 'ph-folders';

        return 'ph-squares-four';
    }
    let html = '';
    let colorIndex = 0;

    for (const [agrupamento, items] of Object.entries(groupedData)) {
        const pal = palettes[colorIndex % palettes.length];
        const styleVars = `--group-bg: ${pal.bg}; --group-border: ${pal.border}; --group-text: ${pal.text}; --btn-bg: ${pal.btnBg}; --btn-text: ${pal.btnText}; --btn-border: ${pal.btnBorder}; --btn-hover-bg: ${pal.btnHoverBg}; --btn-hover-text: ${pal.btnHoverText}; --btn-shadow: ${pal.shadow};`;

        const iconClass = getIconForGroup(agrupamento);

        // Descrição pode usar "Subgrupo | Item" (ex.: "Resumo Executivo | Janeiro") para agrupar
        // visualmente vários documentos dentro do mesmo agrupamento, sem precisar de 3º nível
        // na planilha (que só tem Agrupamento/Descrição/Link).
        const mainItems = [];
        const subgroups = new Map();
        items.forEach(item => {
            const sepIdx = item.descricao.indexOf(' | ');
            if (sepIdx === -1) {
                mainItems.push(item);
            } else {
                const subName = item.descricao.slice(0, sepIdx).trim();
                const itemName = item.descricao.slice(sepIdx + 3).trim();
                if (!subgroups.has(subName)) subgroups.set(subName, []);
                subgroups.get(subName).push({ descricao: itemName, link: item.link });
            }
        });

        const renderButtons = (list) => list.map(item => {
            const hrefStr = item.link ? `href="${escapeHtml(item.link)}" target="_blank"` : `href="#" onclick="return false;"`;
            return `<a ${hrefStr} class="gi-btn">${escapeHtml(item.descricao)}</a>`;
        }).join('');

        html += `
            <div class="gi-group" style="${styleVars}">
                <h2 class="gi-group-title">
                    <i class="ph-bold ${iconClass}"></i>
                    ${escapeHtml(agrupamento)}
                </h2>
        `;

        if (mainItems.length) {
            html += `<div class="gi-buttons-grid">${renderButtons(mainItems)}</div>`;
        }

        for (const [subName, subItems] of subgroups) {
            html += `
                <h3 class="gi-subgroup-title">${escapeHtml(subName)}</h3>
                <div class="gi-buttons-grid">${renderButtons(subItems)}</div>
            `;
        }

        html += `</div>`;
        colorIndex++;
    }

    container.innerHTML = html || '<div style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum dado encontrado para Gestão Interna.</div>';
}
