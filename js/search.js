// Busca por ticket com navegação cíclica entre resultados.

function resetSearch() {
    searchMatches = [];
    currentSearchIndex = 0;
    lastSearchTerm = "";
    const badge = document.getElementById('search-badge');
    if (badge) badge.style.display = 'none';
    const feedback = document.getElementById('search-feedback');
    if (feedback) feedback.innerText = '';
}

function buscarProjeto() {
    const input = document.getElementById('input-busca');
    const termo = input.value.toLowerCase().trim();

    if (!termo) {
        resetSearch();
        return;
    }

    if (termo !== lastSearchTerm) {
        lastSearchTerm = termo;
        currentSearchIndex = 0;
        searchMatches = parsedProjectsList.filter(p => p.ticket.toLowerCase().includes(termo));
    } else {
        currentSearchIndex++;
        if (currentSearchIndex >= searchMatches.length) {
            currentSearchIndex = 0;
        }
    }

    const feedback = document.getElementById('search-feedback');

    if (searchMatches.length === 0) {
        resetSearch();
        if (feedback) feedback.innerText = 'Não encontrado.';
        return;
    }

    if (feedback) feedback.innerText = '';

    const badge = document.getElementById('search-badge');
    const faltam = searchMatches.length - currentSearchIndex - 1;

    if (faltam > 0) {
        badge.style.display = 'flex';
        badge.innerText = faltam;
    } else {
        badge.style.display = 'none';
    }

    const projetoEncontrado = searchMatches[currentSearchIndex];
    const categoria = projetoEncontrado.viewCategory;

    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    let targetMenu = null;
    menuItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`switchView('${categoria}'`)) {
            targetMenu = item;
        }
    });

    if (targetMenu) {
        switchView(categoria, targetMenu);
    }

    setTimeout(() => {
        const linhaTr = document.getElementById(`row-${projetoEncontrado.id}`);
        if (linhaTr) {
            linhaTr.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const corOriginal = linhaTr.style.backgroundColor;
            linhaTr.style.transition = 'background-color 0.4s ease';
            linhaTr.style.backgroundColor = '#fef08a';

            setTimeout(() => {
                linhaTr.style.backgroundColor = corOriginal;
            }, 2500);
        }
    }, 150);
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const searchInput = document.getElementById('input-busca');
        if(searchInput) {
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    buscarProjeto();
                }
            });
        }
    }, 500);
});
