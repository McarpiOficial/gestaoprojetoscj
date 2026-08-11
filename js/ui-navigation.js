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

function switchView(viewName, element) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
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
        'acompanhamento-prefeitura': 'Acompanhamento Prefeitura'
    };
    document.getElementById('view-title').innerText = titles[viewName];
    document.querySelectorAll('.view-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`pane-${viewName}`).classList.add('active');

    if (viewName === 'indicadores') {
        buildAllCharts();
    }

    if (window.innerWidth <= 767) closeSidebar();
}
