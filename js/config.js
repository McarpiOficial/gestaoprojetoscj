// Configuração estática da aplicação: identificadores da planilha, tabelas de estilo e
// a configuração declarativa de cada aba consumida por processSheetTable (js/data-fetch.js).

const SPREADSHEET_ID = "1PXqVV1taHoanBwtE8IfqAg2ApkDJBmZyz7Wi8F3pinM";

// Aba de ata de reunião com a Prefeitura — formato livre (não é tabela com cabeçalhos),
// lida separadamente da cadeia principal de projetos (ver js/render-prefeitura.js).
const PREFEITURA_SHEET_NAME = "Resumo Reuniao Prefeito";

// Planilha de Contratos — arquivo separado do portfólio de projetos, lida independentemente
// da cadeia principal (ver js/render-contratos.js). Só a aba "Planejado2026" é usada.
const CONTRATOS_SPREADSHEET_ID = "1qp4y5wHSpQosfdkHg5xOWILmePPIQ2TnzlHHsNjhxgU";
const CONTRATOS_SHEET_NAME = "Planejado2026";
// Nº de meses à frente considerados na grid "vencimento em 5 meses" do card de Indicadores Gestão.
const CONTRATOS_VENCIMENTO_JANELA_MESES = 5;

// Classes de css/components.css usadas por getClassificationBadge (js/render-tables.js).
const CLASSIFICATION_CLASSES = {
    'INICIACAO': 'classification-iniciacao',
    'PLANEJAMENTO': 'classification-planejamento',
    'EXECUCAO': 'classification-execucao',
    'MONITORAMENTO': 'classification-monitoramento',
    'GERAL': 'classification-geral'
};

const PRIORITY_ORDER = { 'ALTA': 1, 'MÉDIA': 2, 'MEDIA': 2, 'BAIXA': 3 };
// Tempo máximo de espera pela cadeia completa de 5 chamadas JSONP antes de considerar falha.
const FETCH_TIMEOUT_MS = 12000;

// A partir de quantos dias sem atualização (Ult. Atualiz.) um projeto é considerado estagnado.
const STAGNATION_THRESHOLD_DAYS = 15;

// Threshold específico do card "Estagnados" do Resumo Executivo (mais sensível que o geral acima).
const EXEC_STAGNATION_THRESHOLD_DAYS = 10;

// A partir de quantos projetos ativos/de alta prioridade um analista é considerado sobrecarregado.
const OVERLOAD_HIGH_PRIORITY_COUNT = 3;
const OVERLOAD_TOTAL_COUNT = 6;
const MONTHS_BR = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Deriva o viewCategory da aba principal a partir do status (regra original de handleSheetsResponse).
function deriveViewCategoryPrincipal(item) {
    const statusUpper = item.status.toUpperCase().trim();
    const stoppedStatuses = ['SUSPENSO', 'AGUARDANDO CLIENTE', 'AGUARDANDO PRESIDENTE'];
    if (stoppedStatuses.includes(statusUpper)) return 'parados';
    if (statusUpper === 'NÃO INICIADOS' || statusUpper === 'NÃO INICIADO') return 'backlog';
    return 'ativos';
}

// Uma entrada por aba lida via gviz. Cada campo documenta uma diferença de comportamento
// que já existia nos antigos handle*Response e precisa ser preservada pela unificação.
const SHEET_CONFIGS = {
    // Aba principal: sem gid/sheet fixo, gera ativos/backlog/parados conforme o status.
    principal: {
        defaultStatus: 'NÃO INICIADO',
        defaultSetor: '',
        hasDates: true,
        includeDateFallbackIndices: true,
        // 'conditional': só calcula progresso se o status não estiver na lista de excluídos e houver setor definido.
        progressMode: 'conditional',
        fixedProgress: 0,
        computeDeliveredDate: false,
        getViewCategory: deriveViewCategoryPrincipal
    },
    // Aba "Suspenso" (gid fixo): todo item já é suspenso; progresso é calculado sempre que houver datas.
    suspenso: {
        defaultStatus: 'SUSPENSO',
        defaultSetor: '',
        hasDates: true,
        includeDateFallbackIndices: true,
        progressMode: 'always',
        fixedProgress: 0,
        computeDeliveredDate: false,
        viewCategory: 'suspensos'
    },
    // Aba "Finalizados": não tem Dt.Inicio/Dt.Fim, progresso fixo em 100% e a data de entrega
    // é extraída heuristicamente do texto livre de Andamento.
    finalizados: {
        defaultStatus: 'ENCERRADO',
        defaultSetor: 'Operações',
        hasDates: false,
        includeDateFallbackIndices: false,
        progressMode: 'none',
        fixedProgress: 100,
        computeDeliveredDate: true,
        viewCategory: 'encerrados'
    },
    // Aba "CIINTEC": mesmo formato da principal, mas viewCategory fixo e progresso sempre calculado.
    ciintec: {
        defaultStatus: 'NÃO INICIADO',
        defaultSetor: '',
        hasDates: true,
        includeDateFallbackIndices: true,
        progressMode: 'always',
        fixedProgress: 0,
        computeDeliveredDate: false,
        viewCategory: 'ciintec'
    }
};
