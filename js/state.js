// Estado global mutável da aplicação (mesma coisa que já existia como variáveis soltas no
// arquivo único original — mantido como globals para não introduzir risco nesta fase).

let parsedProjectsList = [];

let activePieChartInstance = null;
let chartGanttInstance = null;
let chartPriorityInstance = null;
let chartImportanceInstance = null;
let chartStatusGeralInstance = null;
let chartEncerradosImpInstance = null;
let chartEisenhowerInstance = null;
let chartDeliveriesTrendInstance = null;

let isDrilledDown = false;
let currentClassificationSelected = "";
let currentChartSource = 'ativos';

// Variáveis de Filtro por Data
let chartFilterStartDate = null;
let chartFilterEndDate = null;

// Variáveis Globais de Busca
let searchMatches = [];
let currentSearchIndex = 0;
let lastSearchTerm = "";

let activeSorts = { ativos: 'none', parados: 'none', backlog: 'none', suspensos: 'none', encerrados: 'none', ciintec: 'none' };

// Contratos (aba Planejado2026) — planilha separada do portfólio de projetos.
let contractsList = [];
let chartContratosOrcamentoInstance = null;
let chartContratosAcumuladoMesInstance = null;
