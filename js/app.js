// Bootstrap da aplicação — deve ser o último script carregado.

Chart.register(ChartDataLabels);

window.addEventListener('DOMContentLoaded', () => { fetchSpreadsheetData(); });
