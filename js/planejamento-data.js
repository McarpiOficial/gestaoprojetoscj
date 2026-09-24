// Dados estáticos das telas "Planejamento" (menu lateral). O vínculo com os projetos NÃO é
// feito aqui, nem por nome de ticket: cada projeto na planilha (abas "Projetos Recebidos",
// "CIINTEC" e "Finalizados") já tem colunas próprias de vínculo — coluna L ("Plano Governo")
// e coluna M ("Planej. Estratégico") — carregadas em cada item como `planoGovernoLink` /
// `planejEstrategicoLink` (js/data-fetch.js). O casamento ao vivo contra esses dois campos
// acontece em js/render-planejamento.js; aqui só ficam os textos das metas/propostas e,
// para Plano Governo, a posição (1 a 13) que a planilha usa para referenciá-las na coluna L.

const PLANEJAMENTO_ANO_ATUAL = new Date().getFullYear();

// ---------------------------------------------------------------------------------------
// Planejamento Estratégico da CIJUN (DT) — tema/objetivo/ação/meta/ano vêm do PDF
// "Planejamento estratégico" (págs. 45-48). `linkText` é o texto exato "Ação - Meta" que os
// projetos usam na coluna M da planilha para se vincular a cada meta (copiado ao pé da letra
// dos valores reais já em uso; `null` quando nenhum projeto usa essa meta ainda).
// ---------------------------------------------------------------------------------------
const PE_METAS = [
    {
        id: 'pe1', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Permitir realizar login também pelo Gov.Br', ano: 2025,
        linkText: null
    },
    {
        id: 'pe2', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Pelo menos 3 serviços de IA na plataforma até o Q3', ano: 2026,
        linkText: null
    },
    {
        id: 'pe3', tema: 'Sustentabilidade', objetivo: 'Assegurar a sustentabilidade financeira',
        acao: 'Implantar Aplicativo Jund.AI',
        meta: 'Obter índice máximo de 30% de ausência de respostas para perguntas dos usuários no chatbot', ano: 2028,
        linkText: 'Implantar Aplicativo Jund.AI - Obter índice máximo de 30% de ausência de respostas para perguntas dos usuários no chatbot'
    },
    {
        id: 'pe4', tema: 'Sustentabilidade', objetivo: 'Ser reconhecida como empresa socialmente responsável',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Desenvolver e testar pelo menos 1 Prova de Conceito (PoC) de integração da plataforma com dispositivos IoT ou assistentes de voz', ano: 2028,
        linkText: null
    },
    {
        id: 'pe5', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Fidelizar os clientes dos setores público e privado oferecendo serviços de alta qualidade',
        acao: 'Desenvolver plataforma integrada JundIA (aplicativo mobile e portal web unificados)',
        meta: '3 serviços municipais críticos integrados e funcionando na plataforma', ano: 2025,
        linkText: 'Desenvolver plataforma integrada - JundIA (aplicativo mobile e portal web unificados). - 3 serviços municipais críticos integrados e funcionando na plataforma'
    },
    {
        id: 'pe6', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Aprovar arquitetura até o meio de 2026; MVP implantado e integrado com as fontes de dados de pelo menos 2 secretarias piloto', ano: 2026,
        linkText: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais) - Aprovar arquitetura até o meio de 2026. MVP implantado e integrado com as fontes de dados de pelos menos 2 secretarias piloto'
    },
    {
        id: 'pe7', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais)',
        meta: 'Ferramenta BI self-service implantada e com pelo menos 10 usuários', ano: 2027,
        linkText: 'Implementar Soluções de Interação Cidadã com IA (Chatbots e Assistentes Virtuais) - Ferramenta BI self service implantada e com pelo menos 10 usuários'
    },
    {
        id: 'pe8', tema: 'Apoio à Gestão Pública / Qualidade', objetivo: 'Instrumentalizar a gestão empresarial e de governo',
        acao: 'Automatizar processos internos das secretarias e aumentar a produtividade dos servidores',
        meta: '2 processos automatizados com RPA em uma secretaria piloto', ano: 2025,
        linkText: 'Automatizar processos internos das secretarias e aumentar a produtividade dos servidores - 2 processos automatizados com RPA em uma secretaria piloto até o final'
    },
    {
        id: 'pe9', tema: 'Crescimento', objetivo: 'Fomentar uma cultura organizacional voltada à inovação utilizando tecnologias emergentes',
        acao: 'Desenvolver e implantar tecnologias de cidades inteligentes para mobilidade, segurança, meio ambiente, etc.',
        meta: 'Desenvolver e testar pelo menos 1 Prova de Conceito (PoC) de integração da plataforma com dispositivos IoT ou assistentes de voz', ano: 2028,
        linkText: 'Desenvolver e Implantar tecnologias de cidades inteligentes para mobilidade, segurança, meio ambiente, etc. - pelo menos 1 Prova de Conceito (PoC) de integração da plataforma com dispositivos IoT ou assistentes de voz'
    },
    {
        id: 'pe10', tema: 'Qualidade', objetivo: 'Obter, desenvolver e reter capital humano',
        acao: 'Estruturar eventos de Hackathons',
        meta: 'Ter realizado um evento', ano: 2026,
        linkText: 'Estruturar eventos de Hackathons - Ter realizado um evento'
    }
];

// ---------------------------------------------------------------------------------------
// Plano de Governo 2025-2028 — os 13 itens são o texto literal (verbatim, só sem o ";" final)
// da própria aba "Plano Governo" da planilha, coluna A, na ordem em que aparecem lá. Essa
// ordem É a numeração que a coluna L usa para vincular um projeto a um item ("2 – Programa de
// Aperfeiçoamento Tecnológico" = item nº2 = índice 1 deste array) — ver
// extractPlanoGovernoIndex em js/render-planejamento.js.
// ---------------------------------------------------------------------------------------
const PG_PROPOSTAS = [
    { numero: 1, texto: 'Usar a tecnologia para criar uma cidade mais inteligente, conectada, inovadora e dinâmica' },
    { numero: 2, texto: 'Instituir um Programa de Aperfeiçoamento Tecnológico destinado a investigar, avaliar, desenvolver e implementar ferramentas, processos e procedimentos nas diversas áreas da administração municipal. Esse programa visa reunir especialistas em tecnologia e profissionais de outros setores para discutir e debater os desafios e realidades cotidianas de cada departamento, com o objetivo de sugerir, criar e implementar soluções tecnológicas para otimizar os serviços' },
    { numero: 3, texto: 'Criar o "Fórum Anual de Inovação e Novas Tecnologias" para promover o engajamento de empreendedores, inovadores e especialistas em tecnologia, facilitando o networking e incentivando iniciativas voltadas para o crescimento da cidade, o avanço pessoal e o fortalecimento das políticas públicas' },
    { numero: 4, texto: 'Potencializar a política de compras governamentais eletrônicas' },
    { numero: 5, texto: 'Desenvolver parcerias com empresas privadas para estimular investimentos e criar oportunidades tecnológicas' },
    { numero: 6, texto: 'Estudar a possibilidade de implantar um laboratório multidisciplinar de tecnologia no município, incentivando o desenvolvimento de soluções tecnológicas, pesquisas inovadoras no campo da ciência da computação, estimulando o surgimento de novos profissionais de TI (Tecnologia da Informação), moldados na aplicação de conhecimentos teóricos suportados por ações práticas, além de possibilitar o uso dos produtos desenvolvidos dentro do próprio município, entregando valor agregado à comunidade' },
    { numero: 7, texto: 'Incentivar a cultura maker' },
    { numero: 8, texto: 'Estimular um ambiente que inspire e motive as pessoas a usar a imaginação para desenvolver soluções que resolvam problemas, fomentando a criatividade. Com a supervisão de um profissional do laboratório e uma avaliação prévia das ideias e projetos, este espaço permitirá que estudantes, membros da comunidade e empresas compartilhem conhecimentos e implementem ideias inovadoras' },
    { numero: 9, texto: 'Disponibilizar cursos profissionalizantes gratuitos para pessoas em situação de vulnerabilidade social, para idosos, crianças e pessoas com deficiência, proporcionando um maior grau de empregabilidade, renda e inclusão' },
    { numero: 10, texto: 'Fomentar iniciativas em inteligência artificial com aplicação direta na prefeitura, como atendimento ao munícipe para dúvidas, suporte ou serviços por chatbot/PNL (Processamento de Linguagem Natural), e recebimento de documentação enviada digitalmente utilizando OCR e Deep Learning' },
    { numero: 11, texto: 'Implantar uma metodologia de análise e diagnóstico das necessidades da população, focada em um pensamento digital centrado no cidadão. Este modelo conecta os munícipes aos serviços digitais oferecidos pela administração pública municipal, envolvendo a sociedade, centros acadêmicos, empresas, ONGs e instituições financeiras. Como resultado, serão criados objetivos estratégicos, ações e projetos que promovam um "pensamento digital" do cidadão, impulsionando a transformação dos serviços públicos para um formato totalmente digital, preservando o atendimento presencial para as pessoas que não se adaptarem ao uso da tecnologia' },
    { numero: 12, texto: 'Adotar os princípios de "Smart Cities" e cidades sustentáveis, posicionando Jundiaí como líder em inovação, tecnologia e sustentabilidade. Isso será realizado integrando tecnologia aos setores de saneamento, energia e meio ambiente' },
    { numero: 13, texto: 'Implementar um modelo de transformação do pensamento do cidadão voltado ao mundo digital, através do esforço colaborativo que envolve múltiplos patrocinadores, cada um contribuindo com sua expertise, recursos e perspectivas' }
];
