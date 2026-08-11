// Exportação client-side da tabela visível na view ativa para CSV (impressão/PDF usa
// window.print() direto, estilizado por css/print.css).

function exportActiveTableToCSV() {
    const activePane = document.querySelector('.view-pane.active');
    const table = activePane ? activePane.querySelector('table') : null;

    if (!table) {
        const feedback = document.getElementById('search-feedback');
        if (feedback) {
            feedback.innerText = 'Nenhuma tabela para exportar nesta tela.';
            setTimeout(() => { feedback.innerText = ''; }, 4000);
        }
        return;
    }

    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
        Array.from(tr.children)
            .filter(cell => !cell.classList.contains('col-acoes'))
            .map(cell => '"' + cell.innerText.replace(/"/g, '""').replace(/\s+/g, ' ').trim() + '"')
            .join(',')
    ).filter(line => line.length > 0);

    const csvContent = rows.join('\r\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `export-${document.getElementById('view-title').innerText.replace(/\s+/g, '_')}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
