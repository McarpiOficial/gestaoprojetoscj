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
// Plano de Governo 2025-2028 - propostas dos 22 eixos que dependem de sistema, app, site,
// dados/BI, IA, geoprocessamento ou automação (escopo CIJUN). Cada uma cita o eixo original.
// ---------------------------------------------------------------------------------------
const PG_PROPOSTAS = [
    // Eixo 1 - Administração Municipal, Gestão de Pessoas e Previdência
    { id: 'pg1', eixo: '1. Administração Municipal, Gestão de Pessoas e Previdência', texto: 'Melhorar o sistema de compras pela internet para expandir a participação de fornecedores e promover maior competitividade', projetos: ['Melhorias Sist. Compras'] },
    { id: 'pg2', eixo: '1. Administração Municipal, Gestão de Pessoas e Previdência', texto: 'Aprimorar as formas de atendimento ao munícipe, privilegiando o uso da tecnologia da informação, ampliando a gama de prestação de serviços disponibilizados pela internet', projetos: ['Cartão da Gente', 'Cartão da Gente x SME'] },
    { id: 'pg3', eixo: '1. Administração Municipal, Gestão de Pessoas e Previdência', texto: 'Aprimorar os sistemas de gerenciamento eletrônico de documentos, em continuidade com a implantação do SEI e do conceito digital e online', projetos: ['Atualizar SEI PMJ v5'] },
    { id: 'pg4', eixo: '1. Administração Municipal, Gestão de Pessoas e Previdência', texto: 'Implantar um projeto para diminuir o uso de papel e digitalizar os processos físicos da Prefeitura e seus órgãos', projetos: ['Documento 100% Digital'] },
    { id: 'pg5', eixo: '1. Administração Municipal, Gestão de Pessoas e Previdência', texto: 'Reestruturar o sistema de controle do CD e promover a modernização do sistema funcional de movimentação de insumos armazenados', projetos: [] },

    // Eixo 2 - Agricultura, Abastecimento e Turismo
    { id: 'pg6', eixo: '2. Agricultura, Abastecimento e Turismo', texto: 'Monitoramento de Fertilidade – Análise do Solo', projetos: [] },

    // Eixo 6 - Economia, Planejamento e Desenvolvimento Econômico (Ciência e Tecnologia)
    { id: 'pg7', eixo: '6. Economia, Planejamento e Desenvolvimento Econômico', texto: 'Desenvolver uma nova plataforma digital para o Balcão do Empreendedor', projetos: [] },
    { id: 'pg8', eixo: '6. Economia, Planejamento e Desenvolvimento Econômico', texto: 'Estudar a criação do parque tecnológico, para incentivo de jovens na pesquisa e desenvolvimento de novas tecnologias', projetos: [] },
    { id: 'pg9', eixo: '6. Economia, Planejamento e Desenvolvimento Econômico', texto: 'Promover a aceleração para o desenvolvimento de Jundiaí como uma cidade inteligente, comprometida com a transformação digital', projetos: ['POC Erione'] },
    { id: 'pg10', eixo: '6. Economia, Planejamento e Desenvolvimento Econômico', texto: 'Buscar e formalizar parcerias nacionais e internacionais para fortalecer as capacidades científicas e tecnológicas do município', projetos: [] },

    // Eixo 7 - Educação
    { id: 'pg11', eixo: '7. Educação', texto: 'Aprimorar a ação pedagógica com foco na aprendizagem, apoiado por um sistema de monitoramento e avaliação', projetos: ['BI educação crianças x escola'] },
    { id: 'pg12', eixo: '7. Educação', texto: 'Programa Auxílio Uniforme com compra feita pelas famílias em lojas credenciadas, a partir de um sistema de concessão de benefícios', projetos: ['Integraçao SEED x Voucher Educação Uniforme'] },
    { id: 'pg13', eixo: '7. Educação', texto: 'Incentivar uma central de matrículas para Ensino Infantil e Fundamental I, com assistente social que colete os dados sociais', projetos: [] },

    // Eixo 9 - Finanças
    { id: 'pg14', eixo: '9. Finanças', texto: 'Investir em tecnologia para automatizar, desburocratizar e simplificar processos, economizando verbas públicas', projetos: ['Melhorias Sist. Compras', 'Nova reforma administrativa'] },
    { id: 'pg15', eixo: '9. Finanças', texto: 'Ampliar a digitalização dos processos de atendimento, incluindo aprovação de projetos, fiscalização do comércio e serviços e administração de pessoal', projetos: [] },
    { id: 'pg16', eixo: '9. Finanças', texto: 'Empreender iniciativas fiscais visando a redução dos tributos municipais e a simplificação do sistema de impostos', projetos: ['Codigo Tributário - Alteração'] },
    { id: 'pg17', eixo: '9. Finanças', texto: 'Modernizar a arrecadação fiscal incorporando tecnologias digitais para otimizar e simplificar o pagamento de tributos', projetos: ['Nova PGV Espacial', 'PGV - Ajustes Sistema IPTU', 'Parametrização calculo IPTU para nova PGV', 'FI no ITBI', 'Hotsite ITBI', 'SINTER - Sist.Nac.Gestão Inf. Territor.', 'Mudança CNPJ EICON', 'Mudança CNPJ'] },

    // Eixo 10 - Fiscalização, Controle e Transparência
    { id: 'pg18', eixo: '10. Fiscalização, Controle e Transparência', texto: 'Reformular o Portal da Transparência', projetos: ['Portal da Transparência DAE (Funcionalismo)', 'Novo Observatório'] },
    { id: 'pg19', eixo: '10. Fiscalização, Controle e Transparência', texto: 'Estudar a criação de ferramentas de controle de entregas de projetos, podendo ser desenvolvida junto ao departamento de tecnologia', projetos: ['TR DA G&P'] },
    { id: 'pg20', eixo: '10. Fiscalização, Controle e Transparência', texto: 'Acompanhar e medir as entregas, além de analisar os dados e resultados', projetos: ['Bi Segurança Pública', 'BIs Orçamentário e Financeiro', 'BI de Medicamentos'] },

    // Eixo 17 - Saneamento
    { id: 'pg21', eixo: '17. Saneamento', texto: 'Melhorar a informatização dos serviços ao cidadão, oferecendo maior gama de produtos e soluções através de atendimentos on-line', projetos: ['Convenio DAE - API dados'] },
    { id: 'pg22', eixo: '17. Saneamento', texto: 'Desenvolver e implantar software unificado para a área operacional, visando a unificação de informações, ocorrências e acompanhamento de manutenções', projetos: [] },
    { id: 'pg23', eixo: '17. Saneamento', texto: 'Utilizar dispositivos IoT visando obter dados de telemetria, automação e medidores de consumo de água de forma mais precisa e rápida', projetos: [] },

    // Eixo 18 - Saúde
    { id: 'pg24', eixo: '18. Saúde', texto: 'Consultas de retorno agendadas automaticamente após a realização de exames, com aviso da data ao paciente', projetos: ['Proposta Agend. retorno Ambulatorial', 'NIS - Agendamento retorno'] },
    { id: 'pg25', eixo: '18. Saúde', texto: 'Implantar sistema de comunicação com os usuários fazendo uso de inteligência artificial', projetos: ['Whatsapp Funss', 'Lembre consultas - Whatsapp', 'WHATSAPP SAÚDE'] },
    { id: 'pg26', eixo: '18. Saúde', texto: 'Estimular uma integração mais eficiente entre o Hospital São Vicente e o Hospital Regional, contemplando os sistemas e os prontuários', projetos: [] },
    { id: 'pg27', eixo: '18. Saúde', texto: 'Implementar um sistema de controle e distribuição de medicamentos municipais para garantir o acesso equitativo aos medicamentos essenciais', projetos: ['BI de Medicamentos'] },
    { id: 'pg28', eixo: '18. Saúde', texto: 'Integrar os prontuários eletrônicos em todos os serviços de saúde (atenção básica, especializada, Hospital São Vicente e PAs)', projetos: [] },
    { id: 'pg29', eixo: '18. Saúde', texto: 'Implementar sistemas de gestão informatizados para otimizar o fluxo de pacientes, o agendamento de consultas e a organização de recursos', projetos: ['Implantação SISS', 'Implantação Almoxarif SISS - Farmacia', 'Agendamento de ambulância SAEC', 'Informatização SAMU', 'Sistema Mutilação/suicidio (retomada)', 'Proposta Com. Suicidio', 'Proposta Modulo Neurodivergente'] },
    { id: 'pg30', eixo: '18. Saúde', texto: 'Permitir a integração de dados do banco de atendimento com Geoprocessamento, possibilitando mapas georreferenciados de tendências de saúde', projetos: [] },

    // Eixo 19 - Segurança
    { id: 'pg31', eixo: '19. Segurança', texto: 'Continuar a implantação de câmeras e sistemas de vigilância eletrônica nos bairros', projetos: [] },
    { id: 'pg32', eixo: '19. Segurança', texto: 'Rede de segurança colaborativa com câmeras via internet, integrada à central de monitoramento da Guarda Municipal', projetos: ['Implantação Cadastro Central'] },
    { id: 'pg33', eixo: '19. Segurança', texto: 'Utilizar a tecnologia para identificação de demandas e planejamento de execução', projetos: ['Dashboard Infocrim'] },
    { id: 'pg34', eixo: '19. Segurança', texto: 'Expandir o sistema de monitoramento por câmeras e vigilância eletrônica por OCR', projetos: [] },

    // Eixo 20 - Serviços Públicos
    { id: 'pg35', eixo: '20. Serviços Públicos', texto: 'Utilizar a tecnologia para identificação de demandas e planejamento de execução, alimentado pela ouvidoria (156), internet e outras tecnologias', projetos: [] },
    { id: 'pg36', eixo: '20. Serviços Públicos', texto: 'Realizar o mapeamento por bairro do sistema de águas pluviais para identificar os pontos de deságue', projetos: [] },

    // Eixo 21 - Tecnologia
    { id: 'pg37', eixo: '21. Tecnologia', texto: 'Instituir um Programa de Aperfeiçoamento Tecnológico para investigar, avaliar, desenvolver e implementar ferramentas, processos e procedimentos na administração municipal', projetos: ['Estudo ANIA - IA do SEI'] },
    { id: 'pg38', eixo: '21. Tecnologia', texto: 'Ampliar a oferta de Wifi em equipamentos públicos, praças e espaços públicos', projetos: [] },
    { id: 'pg39', eixo: '21. Tecnologia', texto: 'Fomentar iniciativas em inteligência artificial com aplicação direta na prefeitura: chatbot/PNL para dúvidas e OCR/Deep Learning para documentação', projetos: ['Reestruturação Chatbot Ju', 'Chatbot Saepro', 'APIs para os Chatbots'] },
    { id: 'pg40', eixo: '21. Tecnologia', texto: 'Adotar os princípios de "Smart Cities", integrando tecnologia aos setores de saneamento, energia e meio ambiente', projetos: ['GeoEspacial. SIMIH', 'Novo GeoJundiaí'] },
    { id: 'pg41', eixo: '21. Tecnologia', texto: 'Analisar sistema de monitoramento da qualidade da água, painéis fotovoltaicos com monitoramento remoto e sensores em bueiros e depósitos de lixo', projetos: [] },

    // Eixo 22 - Urbanismo, Mobilidade e Infraestrutura
    { id: 'pg42', eixo: '22. Urbanismo, Mobilidade e Infraestrutura', texto: 'Implantar a Central de Monitoramento da Mobilidade para monitorar o tráfego em tempo real e coletar dados para o planejamento urbano', projetos: [] },
    { id: 'pg43', eixo: '22. Urbanismo, Mobilidade e Infraestrutura', texto: 'Desenvolver aplicativo eficiente que disponibilize informações e dados, possibilitando avaliação dos usuários quanto ao serviço prestado', projetos: ['App Ciclofaixa'] }
];
