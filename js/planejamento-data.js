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
// Plano de Governo 2025-2028 - os itens são os 13 itens reais da própria planilha de
// projetos, aba "Plano Governo", coluna A (a empresa já filtrou ali só os itens do eixo
// Tecnologia que dizem respeito a sistemas — por isso são usados literalmente, sem seleção
// nossa por cima). `projetos` continua sendo o vínculo manual com a planilha de projetos.
// ---------------------------------------------------------------------------------------
const PG_PROPOSTAS = [
    { id: 'pg1', texto: 'Usar a tecnologia para criar uma cidade mais inteligente, conectada, inovadora e dinâmica', projetos: [] },
    { id: 'pg2', texto: 'Instituir um Programa de Aperfeiçoamento Tecnológico destinado a investigar, avaliar, desenvolver e implementar ferramentas, processos e procedimentos nas diversas áreas da administração municipal, para sugerir, criar e implementar soluções tecnológicas que otimizem os serviços', projetos: ['Estudo ANIA - IA do SEI', 'Atualizar SEI PMJ v5'] },
    { id: 'pg3', texto: 'Criar o "Fórum Anual de Inovação e Novas Tecnologias" para promover o engajamento de empreendedores, inovadores e especialistas em tecnologia', projetos: [] },
    { id: 'pg4', texto: 'Potencializar a política de compras governamentais eletrônicas', projetos: ['Melhorias Sist. Compras'] },
    { id: 'pg5', texto: 'Desenvolver parcerias com empresas privadas para estimular investimentos e criar oportunidades tecnológicas', projetos: [] },
    { id: 'pg6', texto: 'Estudar a possibilidade de implantar um laboratório multidisciplinar de tecnologia no município, incentivando o desenvolvimento de soluções tecnológicas e pesquisas inovadoras no campo da ciência da computação', projetos: [] },
    { id: 'pg7', texto: 'Incentivar a cultura maker', projetos: [] },
    { id: 'pg8', texto: 'Estimular um ambiente que inspire e motive as pessoas a usar a imaginação para desenvolver soluções que resolvam problemas, fomentando a criatividade', projetos: [] },
    { id: 'pg9', texto: 'Disponibilizar cursos profissionalizantes gratuitos para pessoas em situação de vulnerabilidade social, idosos, crianças e pessoas com deficiência', projetos: [] },
    { id: 'pg10', texto: 'Fomentar iniciativas em inteligência artificial com aplicação direta na prefeitura, como atendimento ao munícipe por chatbot/PNL e recebimento de documentação enviada digitalmente utilizando OCR e Deep Learning', projetos: ['Reestruturação Chatbot Ju', 'Chatbot Saepro', 'APIs para os Chatbots'] },
    { id: 'pg11', texto: 'Implantar uma metodologia de análise e diagnóstico das necessidades da população, focada em um pensamento digital centrado no cidadão', projetos: [] },
    { id: 'pg12', texto: 'Adotar os princípios de "Smart Cities" e cidades sustentáveis, integrando tecnologia aos setores de saneamento, energia e meio ambiente', projetos: ['GeoEspacial. SIMIH', 'Novo GeoJundiaí'] },
    { id: 'pg13', texto: 'Implementar um modelo de transformação do pensamento do cidadão voltado ao mundo digital, através do esforço colaborativo entre múltiplos patrocinadores', projetos: [] }
];
