// Dados estáticos extraídos dos PDFs "Planejamento Estratégico" (págs. 45-48, temas da
// Diretoria Técnica) e "Plano de Governo 2025-2028" (22 eixos). São só o texto das metas/
// propostas + o ano previsto; o status (Atendido/Andamento/Faltante) é sempre calculado ao
// vivo em js/render-planejamento.js a partir da planilha de projetos, nunca fixado aqui.
//
// `projetos`: trechos do nome do Ticket usados para casar com a planilha (comparação via
// normalizeString + includes). Lista vazia = meta/proposta ainda sem projeto identificado.

const PLANEJAMENTO_ANO_ATUAL = new Date().getFullYear();

// ---------------------------------------------------------------------------------------
// Planejamento Estratégico da CIJUN (DT) - págs. 45 a 48
// ---------------------------------------------------------------------------------------
const PE_METAS = [
    {
        id: 'pe1', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Permitir realizar login também pelo Gov.Br', ano: 2025,
        projetos: ['Reformulação App Jundiai']
    },
    {
        id: 'pe2', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Pelo menos 3 serviços de IA na plataforma até o Q3', ano: 2026,
        projetos: ['Reestruturação Chatbot Ju', 'Chatbot Saepro', 'APIs para os Chatbots']
    },
    {
        id: 'pe3', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Obter índice máximo de 30% de ausência de respostas para perguntas dos usuários no chatbot', ano: 2028,
        projetos: []
    },
    {
        id: 'pe4', tema: 'Sustentabilidade', objetivo: 'Ser reconhecida como empresa socialmente responsável',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Desenvolver e testar pelo menos 1 Prova de Conceito (PoC) de integração da plataforma com dispositivos IoT ou assistentes de voz', ano: 2028,
        projetos: []
    },
    {
        id: 'pe5', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Fidelizar os clientes dos setores público e privado oferecendo serviços de alta qualidade',
        acao: 'Desenvolver plataforma integrada JundIA (aplicativo mobile e portal web unificados)',
        meta: '3 serviços municipais críticos integrados e funcionando na plataforma', ano: 2025,
        projetos: ['POC Guanxi SuperApp']
    },
    {
        id: 'pe6', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Aprovar arquitetura até o meio de 2026; MVP implantado e integrado com as fontes de dados de pelo menos 2 secretarias piloto', ano: 2026,
        projetos: ['BIs Orçamentário e Financeiro', 'BI educação crianças x escola', 'BI de Medicamentos', 'Bi Segurança Pública']
    },
    {
        id: 'pe7', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Ferramenta BI self-service implantada e com pelo menos 10 usuários', ano: 2027,
        projetos: []
    },
    {
        id: 'pe8', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Automatizar processos internos das secretarias e aumentar a produtividade dos servidores',
        meta: '2 processos automatizados com RPA em uma secretaria piloto', ano: 2025,
        projetos: []
    },
    {
        id: 'pe9', tema: 'Crescimento', objetivo: 'Fomentar uma cultura organizacional voltada à inovação utilizando tecnologias emergentes',
        acao: 'Desenvolver e implantar tecnologias de cidades inteligentes para mobilidade, segurança, meio ambiente, etc.',
        meta: 'Desenvolver e testar pelo menos 1 Prova de Conceito (PoC) de integração da plataforma com dispositivos IoT ou assistentes de voz', ano: 2028,
        projetos: []
    },
    {
        id: 'pe10', tema: 'Qualidade', objetivo: 'Obter, desenvolver e reter capital humano',
        acao: 'Estruturar eventos de Hackathons',
        meta: 'Ter realizado um evento', ano: 2026,
        projetos: []
    }
];

// ---------------------------------------------------------------------------------------
// Plano de Governo 2025-2028 - só as propostas do Eixo 21 (TECNOLOGIA), que é literalmente
// o eixo da CIJUN no plano (págs. 205-212). Os indicadores desta tela usam só essas 5
// propostas. As propostas de TI que aparecem em outros eixos (Saúde, Finanças, Segurança
// etc.) pertencem organizacionalmente àquela secretaria no plano, não à CIJUN — mesmo que a
// CIJUN construa o sistema — então não entram aqui: contam só no card agregado "outras
// propostas do plano", calculado dinamicamente em js/render-planejamento.js a partir de
// todo projeto com a tag PL.GOV na planilha que não esteja em nenhuma proposta abaixo.
// ---------------------------------------------------------------------------------------
const PG_PROPOSTAS = [
    { id: 'pg37', eixo: '21. Tecnologia', texto: 'Instituir um Programa de Aperfeiçoamento Tecnológico para investigar, avaliar, desenvolver e implementar ferramentas, processos e procedimentos na administração municipal', projetos: ['Estudo ANIA - IA do SEI'] },
    { id: 'pg38', eixo: '21. Tecnologia', texto: 'Ampliar a oferta de Wifi em equipamentos públicos, praças e espaços públicos', projetos: [] },
    { id: 'pg39', eixo: '21. Tecnologia', texto: 'Fomentar iniciativas em inteligência artificial com aplicação direta na prefeitura: chatbot/PNL para dúvidas e OCR/Deep Learning para documentação', projetos: ['Reestruturação Chatbot Ju', 'Chatbot Saepro', 'APIs para os Chatbots'] },
    { id: 'pg40', eixo: '21. Tecnologia', texto: 'Adotar os princípios de "Smart Cities", integrando tecnologia aos setores de saneamento, energia e meio ambiente', projetos: ['GeoEspacial. SIMIH', 'Novo GeoJundiaí'] },
    { id: 'pg41', eixo: '21. Tecnologia', texto: 'Analisar sistema de monitoramento da qualidade da água, painéis fotovoltaicos com monitoramento remoto e sensores em bueiros e depósitos de lixo', projetos: [] }
];
