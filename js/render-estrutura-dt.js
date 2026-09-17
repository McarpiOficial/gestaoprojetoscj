// Estrutura DT/CIINTEC: cards de resumo montados a partir de UMA lista de dados (não é lido de
// planilha — é o mesmo organograma já mapeado manualmente uma vez aqui). Para atualizar nomes,
// coordenador ou headcount quando o organograma mudar, edita as listas abaixo; os cards são
// gerados automaticamente a partir delas, sem precisar tocar em HTML.

// Coordenadorias que reportam às duas Gerências da Diretoria Técnica (DTGI/DTGD).
// "pessoas" inclui o coordenador (uma vez só, mesmo quando ele também aparece como membro de
// uma das equipes da coordenadoria, como o Thiago na equipe Geo da DTG).
const ESTRUTURA_DT = [
    {
        coordenadoria: 'Coordenadoria de Transformação Digital (DTW)',
        coordenador: 'Mateus',
        departamento: 'Gerência de Inteligência de Dados e Aplicações (DTGI)',
        pessoas: ['Mateus', 'Erika', 'Leonardo', 'André', 'Franciele']
    },
    {
        coordenadoria: 'Coordenadoria de Inteligência Geográfica (DTG)',
        coordenador: 'Thiago',
        departamento: 'Gerência de Inteligência de Dados e Aplicações (DTGI)',
        pessoas: ['Thiago', '<nome concurso>', 'Mateus', 'Adriana']
    },
    {
        coordenadoria: 'Coordenadoria de Sistemas A (DTS)',
        coordenador: 'Marina',
        departamento: 'Gerência de Desenvolvimento de Sistemas (DTGD)',
        pessoas: ['Marina', 'Ivan', 'Caio', 'Adriano', 'Reginaldo', 'Diogo', 'Diego', 'Gislaine', 'Danilo', 'Silvia', 'Davi']
    },
    {
        coordenadoria: 'Coordenadoria de Sistemas B (DTP)',
        coordenador: 'Rogério',
        departamento: 'Gerência de Desenvolvimento de Sistemas (DTGD)',
        pessoas: ['Rogério', 'Luis', 'Kretz', 'Nilton', 'Gilioli', 'Regina Segatto', 'Pedro', 'Regina', 'Jonas', 'Aline', 'Antonio Costa', 'Luan', 'Juliana', 'Segretti', 'Bruno Rocha', 'Reinaldo']
    },
    {
        coordenadoria: 'Coordenadoria de Desenvolvimento (DTD)',
        coordenador: 'Natalia',
        departamento: 'Gerência de Desenvolvimento de Sistemas (DTGD)',
        pessoas: ['Natalia', 'Tomás', 'Marlon', 'Vinicius', 'Carlos', 'Gabriel']
    }
];

// Grupos funcionais do CIINTEC (Márcio) — não têm coordenador próprio, respondem direto ao Márcio.
const ESTRUTURA_CIINTEC = [
    { grupo: 'Técnicos', pessoas: ['Cassio', 'Lucas', 'Anderson'] },
    { grupo: 'Analista de Negócio', pessoas: ['Juliano'] },
    { grupo: 'Analista de Gestão Administrativa', pessoas: ['Daniel'] }
];

function estruturaDTCardHtml(item) {
    return `
        <div class="estrutura-dt-card">
            <div class="estrutura-dt-card-header">
                <i class="ph-fill ph-users-three"></i>
                <div class="estrutura-dt-card-title">${escapeHtml(item.coordenadoria)}</div>
            </div>
            <div class="estrutura-dt-card-row"><span>Coordenador</span><b>${escapeHtml(item.coordenador)}</b></div>
            <div class="estrutura-dt-card-row"><span>Departamento</span><b>${escapeHtml(item.departamento)}</b></div>
            <div class="estrutura-dt-card-row"><span>Pessoas</span><b>${item.pessoas.length}</b></div>
        </div>`;
}

function estruturaCiintecCardHtml(item) {
    return `
        <div class="estrutura-dt-card">
            <div class="estrutura-dt-card-header">
                <i class="ph-fill ph-users-three"></i>
                <div class="estrutura-dt-card-title">${escapeHtml(item.grupo)}</div>
            </div>
            <div class="estrutura-dt-card-row"><span>Pessoas</span><b>${item.pessoas.length}</b></div>
        </div>`;
}

function renderEstruturaDT() {
    const container = document.getElementById('estrutura-dt-cards');
    if (container) container.innerHTML = ESTRUTURA_DT.map(estruturaDTCardHtml).join('');

    const containerCiintec = document.getElementById('estrutura-ciintec-cards');
    if (containerCiintec) containerCiintec.innerHTML = ESTRUTURA_CIINTEC.map(estruturaCiintecCardHtml).join('');

    const totalCiintec = ESTRUTURA_CIINTEC.reduce((acc, g) => acc + g.pessoas.length, 0) + 1; // +1 = Márcio
    const subtitleEl = document.getElementById('estrutura-ciintec-subtitle');
    if (subtitleEl) subtitleEl.innerText = `Coordenação geral: Márcio — ${totalCiintec} pessoas`;
}

document.addEventListener('DOMContentLoaded', renderEstruturaDT);
