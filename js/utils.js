// Funções utilitárias genéricas (parsing/formatação), sem dependência de estado da aplicação.

function normalizeString(str) { if (!str) return ''; return str.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, '').trim(); }
function escapeHtml(str) { if(!str) return ''; return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

function parseBrazilianDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let yr = parseInt(parts[2], 10);
            if (parts[2].length === 2) yr += 2000;
            return new Date(yr, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else if (parts[2].length === 4) {
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        }
    }
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? null : new Date(parsed);
}

// Parsing heurístico do texto livre de "Andamento": encontra todas as datas no texto e usa
// cada uma como marco de uma entrada de timeline, com o texto até a próxima data como descrição.
// Honestidade: como o campo é 100% texto livre, isso falha silenciosamente (retorna [])
// sempre que nenhuma data reconhecível é encontrada — quem chama deve tratar esse fallback.
function parseAndamentoTimeline(text) {
    if (!text) return [];
    const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g;
    const matches = [...text.matchAll(dateRegex)];
    if (matches.length === 0) return [];

    const entries = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const segment = text.slice(start, end).trim();
        const m = matches[i];
        let year = m[3];
        if (year.length === 2) year = '20' + year;
        const dateLabel = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${year}`;
        entries.push({ date: dateLabel, text: segment });
    }
    return entries;
}

function extractDeliveredMonthYear(andamentoText) {
    if (!andamentoText) return '-';
    const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
    const match = andamentoText.match(dateRegex);
    if (match) {
        const monthIndex = parseInt(match[2], 10) - 1;
        let year = match[3];
        if (year.length === 2) year = "20" + year;
        if (monthIndex >= 0 && monthIndex <= 11) return `${MONTHS_BR[monthIndex]}/${year}`;
    }
    return '-';
}
