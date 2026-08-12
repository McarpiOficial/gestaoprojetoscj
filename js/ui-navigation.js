// Troca de view via sidebar, e controle do drawer mobile da sidebar.

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('open')) { closeSidebar(); } else { openSidebarDrawer(); }
}

function openSidebarDrawer() {
    document.querySelector('.sidebar').classList.add('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.add('open');
}

function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('open');
}

// Recolher/expandir a sidebar para modo só-ícone no desktop (a seta no topo da sidebar).
// A preferência fica salva no navegador para já abrir recolhida da próxima vez.
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'cijun-sidebar-collapsed';

function toggleSidebarCollapse() {
    const sidebar = document.querySelector('.sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, isCollapsed ? '1' : '0');

    const btn = document.querySelector('.sidebar-collapse-btn');
    if (btn) btn.setAttribute('aria-label', isCollapsed ? 'Expandir menu' : 'Recolher menu');
}

function applyStoredSidebarCollapsePreference() {
    if (localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1') {
        document.querySelector('.sidebar').classList.add('collapsed');
        const btn = document.querySelector('.sidebar-collapse-btn');
        if (btn) btn.setAttribute('aria-label', 'Expandir menu');
    }
}

window.addEventListener('DOMContentLoaded', applyStoredSidebarCollapsePreference);

// Recolher/expandir a área de busca/CSV/Imprimir/Atualizar no mobile (o botão só aparece
// visualmente abaixo de 767px, ver responsive.css) — no celular essa área sozinha ocupava
// boa parte da tela, sobrando pouco espaço pros projetos. Preferência salva no navegador.
const HEADER_ACTIONS_COLLAPSE_KEY = 'cijun-header-actions-collapsed';

function toggleHeaderActions() {
    const actions = document.getElementById('header-actions');
    const btn = document.getElementById('header-actions-toggle');
    if (!actions) return;
    const isCollapsed = actions.classList.toggle('collapsed');
    localStorage.setItem(HEADER_ACTIONS_COLLAPSE_KEY, isCollapsed ? '1' : '0');

    if (btn) {
        btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        btn.setAttribute('aria-label', isCollapsed ? 'Expandir busca e ações' : 'Recolher busca e ações');
        btn.title = btn.getAttribute('aria-label');
    }
}

function applyStoredHeaderActionsPreference() {
    if (localStorage.getItem(HEADER_ACTIONS_COLLAPSE_KEY) === '1') {
        const actions = document.getElementById('header-actions');
        const btn = document.getElementById('header-actions-toggle');
        if (actions) actions.classList.add('collapsed');
        if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Expandir busca e ações');
            btn.title = btn.getAttribute('aria-label');
        }
    }
}

window.addEventListener('DOMContentLoaded', applyStoredHeaderActionsPreference);

// Menu em 2 níveis (grupo/subgrupo) — accordion: só um grupo fica aberto por vez, para o menu
// não ficar extenso com tantas opções. Preferência (qual grupo ficou aberto) persiste no
// navegador; switchView() abaixo também abre automaticamente o grupo do item selecionado
// (clique direto ou destaque vindo da busca em js/search.js).
const MENU_OPEN_GROUP_KEY = 'cijun-menu-open-group';

function setOpenMenuGroup(groupId, persist = true) {
    document.querySelectorAll('.sidebar-menu .menu-group').forEach(group => {
        const isTarget = group.dataset.group === groupId;
        group.classList.toggle('open', isTarget);
        const toggleBtn = group.querySelector('.menu-group-toggle');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
    });
    if (persist) localStorage.setItem(MENU_OPEN_GROUP_KEY, groupId || '');
}

function toggleMenuGroup(btn) {
    const group = btn.closest('.menu-group');
    if (!group) return;
    const isOpen = group.classList.contains('open');
    setOpenMenuGroup(isOpen ? null : group.dataset.group);
}

function applyStoredMenuGroupPreference() {
    const stored = localStorage.getItem(MENU_OPEN_GROUP_KEY);
    setOpenMenuGroup(stored === null ? 'projetos' : stored, false);
}

window.addEventListener('DOMContentLoaded', applyStoredMenuGroupPreference);

function switchView(viewName, element) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    const group = element.closest ? element.closest('.menu-group') : null;
    if (group && group.dataset.group) setOpenMenuGroup(group.dataset.group);

    const titles = {
        'ativos': 'Projetos Ativos DT',
        'ciintec': 'Projetos CIINTEC',
        'parados': 'Projetos Parados DT',
        'backlog': 'Backlogs DT',
        'suspensos': 'Projetos Suspensos DT',
        'encerrados': 'Projetos Encerr. DT',
        'carga-analista': 'Carga de Trabalho por Analista',
        'secretaria': 'Visão por Secretaria',
        'resumo-executivo': 'Resumo Executivo',
        'indicadores': 'Painel de Indicadores Executivos',
        'gestao-interna': 'Gestão Interna',
        'estrutura-ferramentas': 'Estrutura Ferramentas',
        'acompanhamento-prefeitura': 'Acompanhamento Prefeitura',
        'contratos-acompanhamento': 'Contratos - Acompanhamento',
        'contratos-indicadores': 'Contratos - Indicadores Gestão'
    };
    document.getElementById('view-title').innerText = titles[viewName];
    document.querySelectorAll('.view-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`pane-${viewName}`).classList.add('active');

    if (viewName === 'indicadores') {
        buildAllCharts();
    }

    if (viewName === 'contratos-indicadores') {
        renderContratosIndicadores();
    }

    if (window.innerWidth <= 767) closeSidebar();
}
