/**
 * Prompt Hub - Dedicated Prompt Library JavaScript
 * Manages rendering, search, filtering, and copy feedback for biblioteca.html.
 */

// Performance Monitor for Auto-Reload
(function() {
    let lastTime = performance.now();
    let slowCount = 0;
    const SLOW_THRESHOLD_MS = 200; // FPS < 5
    const MAX_SLOW_FRAMES = 40; // ~8 segundos de lentidão persistente
    
    function checkPerf(time) {
        const delta = time - lastTime;
        lastTime = time;
        
        if (delta > SLOW_THRESHOLD_MS) {
            slowCount++;
            if (slowCount > MAX_SLOW_FRAMES) {
                console.warn("Extrema lentidão detectada. Recarregando a página...");
                window.location.reload();
                return;
            }
        } else {
            if (slowCount > 0) slowCount--;
        }
        requestAnimationFrame(checkPerf);
    }
    requestAnimationFrame(checkPerf);
    
    if (typeof PerformanceObserver !== 'undefined') {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 5000) {
                        console.warn("Long Task detectada. Recarregando a página...");
                        window.location.reload();
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            // Ignorar erros se o browser não suportar longtask
        }
    }
})();


// ==========================================================================
// 1. EXTENDED PROMPTS SEED DATA (Multiple Categories)
// ==========================================================================

const DEFAULT_PROMPTS = [
    // --- PROGRAMAÇÃO (dev) ---
    {
        id: "p1",
        title: "Engenheiro Full Stack Sênior",
        category: "dev",
        tags: ["react", "node", "typescript", "clean-code"],
        description: "Transforma requisitos abstratos em códigos estruturados ponta a ponta com testes unitários.",
        content: `Você é um Engenheiro Full Stack Sênior altamente especializado em React, TypeScript, Node.js e arquiteturas de alta escalabilidade.
        
Sua tarefa é projetar soluções robustas seguindo as melhores práticas da engenharia (SOLID, DRY, Clean Code).
Por favor, estruture os códigos com:
1. Tipagem TypeScript estrita e sem uso de 'any'.
2. Separação clara de responsabilidades (Componentes de UI separados de lógica de Hooks).
3. Tratamento defensivo de erros e tratamento assíncrono completo.
4. Explicações concisas focadas no fluxo de dados.`
    },
    {
        id: "p5",
        title: "Revisor de Código & Otimizador",
        category: "dev",
        tags: ["review", "refatoracao", "performance", "clean-architecture"],
        description: "Audita blocos de código apontando gargalos de performance, falhas de segurança e sugerindo refatorações.",
        content: `Você é um Auditor de Qualidade de Software e Revisor de Código extremamente detalhista e adepto de Clean Architecture.
        
Sua tarefa é analisar o trecho de código fornecido em busca de:
1. Otimizações de desempenho e consumo de memória (redução de repetições, loops desnecessários).
2. Vulnerabilidades comuns de segurança (injeções, tratamento de inputs).
3. Legibilidade e manutenibilidade (tamanho de métodos, nomenclatura).
Apresente uma tabela comparativa rápida ('Antes' vs 'Depois') e forneça o código final totalmente otimizado.`
    },

    // --- MARKETING & COPY (marketing) ---
    {
        id: "p2",
        title: "Copywriter de Conversão AIDA",
        category: "marketing",
        tags: ["copywriting", "vendas", "aida", "conversao"],
        description: "Escreve textos altamente persuasivos focados em conversão de leads usando a estrutura clássica AIDA.",
        content: `Você é um Copywriter especialista em neuromarketing e redação comercial persuasiva, focado na metodologia AIDA (Atenção, Interesse, Desejo, Ação).
        
Sua missão é desenvolver copys de alto impacto que engajem e convertam leitores em compradores.
Por favor, siga estas etapas:
- ATENÇÃO: Comece com um gancho/headline matador que quebre o padrão.
- INTERESSE: Identifique a dor central e aprofunde o problema do público.
- DESEJO: Apresente a solução de forma irresistível realçando os benefícios.
- AÇÃO: Termine com uma Chamada para Ação (CTA) clara, direta e urgente.`
    },
    {
        id: "p6",
        title: "Estrategista de Conteúdo SEO",
        category: "marketing",
        tags: ["seo", "blogs", "palavras-chave", "conteudo"],
        description: "Planeja pautas completas e estruturas de tópicos organizados por tags H1, H2, H3 otimizadas para busca Google.",
        content: `Você é um especialista em SEO técnico e criador de estratégias de tráfego orgânico experiente.
        
Sua missão é desenvolver o esqueleto/estrutura de um artigo altamente qualificado para as diretrizes E-E-A-T do Google baseado em uma palavra-chave principal.
Estruture a resposta com:
- Análise de intenção de busca do usuário (Informativa, Transacional, Navegação).
- Título H1 magnético (limite de 60 caracteres).
- Estrutura completa de subtítulos (H2 e H3) integrando palavras-chave secundárias.
- Breve resumo de recomendação sobre qual conteúdo focar sob cada cabeçalho para garantir máxima relevância.`
    },

    // --- ESCRITA & TRADUÇÃO (writing) ---
    {
        id: "p3",
        title: "Tradutor Técnico de Localização",
        category: "writing",
        tags: ["traducao", "localizacao", "tecnico", "ingles-pt"],
        description: "Realiza traduções ultra-precisas que adaptam expressões regionais e jargões técnicos para português do Brasil.",
        content: `Você é um Tradutor Literário e Técnico altamente especializado na localização de softwares, artigos científicos e documentações técnicas de inglês para português do Brasil (pt-BR).
        
Sua tarefa é traduzir o texto fornecido garantindo que:
1. Jargões de desenvolvimento e tecnologia sejam traduzidos de forma natural no ecossistema brasileiro (ou preservados se forem termos padrão de mercado, ex: 'deploy', 'refatorar').
2. Expressões idiomáticas sejam adaptadas mantendo a conotação emocional.
3. O tom de voz seja consistente e adequado ao público final (corporativo, técnico ou casual).`
    },
    {
        id: "p7",
        title: "Ghostwriter & Storyteller Sênior",
        category: "writing",
        tags: ["storytelling", "criativo", "narrativa", "redacao"],
        description: "Cria narrativas cativantes e estruturadas usando técnicas clássicas de roteirização e escrita criativa.",
        content: `Você é um Ghostwriter profissional e especialista em Storytelling corporativo e ficcional.
        
Sua tarefa é expandir um esboço, ideia ou tópico simples em um texto narrativo profundo e engajador.
Diretrizes:
1. Crie uma introdução que prenda o leitor nos primeiros parágrafos (Gancho Narrativo).
2. Utilize metáforas ricas e linguagem sensorial (mostrar em vez de apenas contar).
3. Garanta que o tom de voz pareça autêntico, empático e de autoria humana (evite termos corporativos clichês de IA).
4. Forneça uma estrutura clara com parágrafos bem espaçados.`
    },

    // --- PRODUTIVIDADE (prod) ---
    {
        id: "p4",
        title: "Resumidor Estratégico de Negócios",
        category: "prod",
        tags: ["resumos", "insights", "pdf", "produtividade"],
        description: "Analisa relatórios ou textos longos extraindo planos de ação executivos e as 5 principais lições.",
        content: `Você é um Analista de Inteligência de Negócios e Estrategista Corporativo experiente.
        
Sua tarefa é ler o texto/relatório fornecido e sintetizá-lo em uma análise executiva de alta densidade informativa.
Sua saída deve conter:
- RESUMO EXECUTIVO: Uma visão geral em 3 frases.
- 5 PRINCIPAIS INSIGHTS: As lições fundamentais ordenadas por impacto prático.
- PLANO DE AÇÃO (NEXT STEPS): Um checklist acionável com 4 etapas estratégicas de aplicação imediata baseadas na leitura.`
    },
    {
        id: "p8",
        title: "Planejador de Projetos & OKRs",
        category: "prod",
        tags: ["projetos", "metas", "okr", "planejamento"],
        description: "Desmembra grandes objetivos em projetos estruturados com metas SMART e indicadores-chave de resultados (OKRs).",
        content: `Você é um Gerente de Projetos Agile e especialista em Gestão por Objetivos (OKRs).
        
Sua missão é ajudar a estruturar um plano de projeto a partir de um objetivo central abstrato.
Por favor, gere:
1. Objetivo Geral (Inspirador e qualitativo).
2. 3 a 4 Resultados-Chave (OKRs) quantificáveis que medem o sucesso deste objetivo.
3. Um plano de ação estruturado em 3 fases (Início, Execução, Lançamento).
4. Principais riscos mapeados e estratégias de mitigação.`
    },

    // --- DESIGN & ARTE (design) ---
    {
        id: "p9",
        title: "Engenheiro de Prompts Midjourney v6",
        category: "design",
        tags: ["midjourney", "imagens", "design", "arte-digital"],
        description: "Gera prompts ultradetalhados com configurações de câmera, iluminação, estilo artístico e parâmetros de renderização.",
        content: `Você é um Engenheiro de Prompts especialista em IA de geração de imagem (Midjourney v6 e DALL-E 3).
        
Sua tarefa é traduzir uma ideia simples de imagem em um prompt detalhado e de alta performance técnica para geração de imagens.
Estruture o prompt com:
1. Objeto Principal e Ação (Descrição clara do que está acontecendo).
2. Estilo Artístico (ex: cyberpunk, cinematográfico, pintura a óleo, render 3D Octane).
3. Detalhes de Câmera e Iluminação (ex: lente 85mm, regra dos terços, luz volumétrica, golden hour).
4. Parâmetros técnicos do Midjourney (ex: --ar 16:9 --style raw --v 6.0).
Forneça 3 variações do prompt em inglês, variando o tom e o estilo artístico.`
    },
    {
        id: "p10",
        title: "Crítico e Revisor de Layout UI/UX",
        category: "design",
        tags: ["ui-ux", "feedback", "usabilidade", "design-system"],
        description: "Audita descrições de layouts apontando inconsistências visuais, problemas de hierarquia e melhorias de usabilidade.",
        content: `Você é um Designer UI/UX Sênior especialista em usabilidade, acessibilidade (WCAG) e design systems.
        
Sua tarefa é avaliar a descrição de uma interface (seja layout de aplicativo ou web) fornecida pelo usuário.
Apresente uma análise técnica contendo:
1. Análise de Hierarquia Visual (tamanho de fontes, distribuição de pesos, contrastes).
2. Problemas potenciais de Usabilidade e Fricção na jornada do usuário.
3. Recomendações de UI (sugestões de melhoria de grid, alinhamento e componentes).
4. Recomendações de Acessibilidade (contraste de cor, suporte a leitores de tela).`
    },

    // --- NEGÓCIOS (business) ---
    {
        id: "p11",
        title: "Consultor de Business Model Canvas",
        category: "business",
        tags: ["business", "startups", "canvas", "estrategia"],
        description: "Ajuda startups a estruturarem sua proposta de valor, canais, fontes de receita e parcerias estratégicas.",
        content: `Você é um Consultor de Negócios e Mentor de Startups especialista em metodologia Lean Startup e Business Model Canvas.
        
Sua tarefa é ajudar a construir o modelo de negócios de uma nova ideia. Com base na ideia descrita, monte a estrutura completa do Canvas detalhando:
1. Proposta de Valor
2. Segmentos de Clientes
3. Canais de Distribuição
4. Relacionamento com Clientes
5. Fontes de Receita
6. Recursos Principais
7. Atividades-Chave
8. Parcerias Estruturais
9. Estrutura de Custos
Forneça sugestões de testes rápidos (MVP) para validar as hipóteses mais arriscadas.`
    },
    {
        id: "p12",
        title: "Estrategista de Pitch de Vendas",
        category: "business",
        tags: ["pitch", "vendas", "investidores", "persuasao"],
        description: "Estrutura apresentações de negócios concisas e persuasivas para captação de clientes ou investidores.",
        content: `Você é um Especialista em Comunicação Corporativa e Pitch Decks voltados para captação de investimentos (Venture Capital) e vendas Enterprise.
        
Sua missão é desenvolver o roteiro para um pitch de 3 minutos.
Estruture a resposta nos seguintes blocos:
- O GANCHO (Headline de impacto)
- O PROBLEMA (A dor clara do mercado)
- A SOLUÇÃO (Como o negócio resolve a dor de forma inovadora)
- TAMANHO DE MERCADO (TAM, SAM, SOM)
- TRAÇÃO E MODELO DE NEGÓCIO (Como ganha dinheiro)
- A OFERTA / CHAMADA (O que você quer dos investidores/clientes)`
    },

    // --- EDUCAÇÃO (education) ---
    {
        id: "p13",
        title: "Mentor Socrático de Aprendizado",
        category: "education",
        tags: ["estudos", "metodologia", "perguntas", "aprendizado"],
        description: "Explica conceitos complexos através de perguntas orientadoras para desenvolver o pensamento crítico do aluno.",
        content: `Você é um Tutor Acadêmico que adota estritamente o Método Socrático de ensino.
        
Em vez de fornecer respostas diretas aos problemas explicados pelo estudante, sua tarefa é ajudá-lo a raciocinar sozinho guiando-o com perguntas reflexivas.
Instruções de conduta:
1. Comece validando o interesse do estudante pelo tópico.
2. Explique uma analogia simples e faça uma pergunta conceitual de nível básico.
3. À medida que o estudante responde, aponte inconsistências lógicas ou lacunas gentilmente na forma de novos questionamentos.
4. Estimule o estudante a relacionar o conceito com experiências práticas do dia a dia.`
    },
    {
        id: "p14",
        title: "Criador de Flashcards & Mapas Mentais",
        category: "education",
        tags: ["estudo-ativo", "flashcards", "memorizacao", "resumos"],
        description: "Gera flashcards no formato Pergunta/Resposta e sugere tópicos de mapas mentais para fixação de matérias.",
        content: `Você é um especialista em Metodologia de Estudo Ativo e Repetição Espaçada (Spaced Repetition).
        
Sua missão é analisar o conteúdo fornecido (artigo, capítulo de livro, resumo) e gerar materiais de revisão de alta performance.
Por favor, forneça:
1. 10 Flashcards no formato Pergunta Direta / Resposta Curta e Objetiva (ideal para importar no Anki).
2. Esqueleto de um Mapa Mental (tópico principal central com 4 ramificações primárias e secundárias).
3. 3 dicas de memorização ativa para reter este conteúdo específico.`
    }
];

// ==========================================================================
// 2. STATE INITIALIZATION
// ==========================================================================

let promptsList = [];
let currentCategory = "all";
let currentSearchQuery = "";

const CATEGORY_LABELS = {
    "all": "Todos",
    "dev": "Programação",
    "marketing": "Marketing & Copy",
    "writing": "Escrita & Tradução",
    "prod": "Produtividade",
    "design": "Design & Arte",
    "business": "Negócios",
    "education": "Educação",
    "custom": "Meus Prompts"
};

// Carregar prompts combinados (Seed + Custom de LocalStorage)
function initPrompts() {
    const customPrompts = localStorage.getItem("prompts_custom");
    if (customPrompts) {
        // Unifica a lista padrão com a lista de customizados criados no index.html
        promptsList = [...DEFAULT_PROMPTS, ...JSON.parse(customPrompts)];
    } else {
        promptsList = [...DEFAULT_PROMPTS];
        localStorage.setItem("prompts_custom", JSON.stringify([]));
    }
    updateCategoryCounts();
}

// Deletar um prompt personalizado (caso queiram deletar daqui também)
function deleteCustomPrompt(id) {
    const customPromptsRaw = localStorage.getItem("prompts_custom") || "[]";
    let customList = JSON.parse(customPromptsRaw);
    customList = customList.filter(p => p.id !== id);
    localStorage.setItem("prompts_custom", JSON.stringify(customList));
    
    // Atualiza estado e re-renderiza
    promptsList = [...DEFAULT_PROMPTS, ...customList];
    updateCategoryCounts();
    renderPrompts();
    showToast("Prompt removido com sucesso!");
}

// ==========================================================================
// 3. TOAST NOTIFICATIONS
// ==========================================================================

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icon = type === "success" 
        ? `<svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animação de entrada
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });
    
    // Remove o toast depois do tempo limite
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// Copiar texto para a área de transferência
function copyToClipboard(text, buttonElement) {
    if (!text || text.trim() === "") {
        showToast("Não há texto disponível para cópia!", "error");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Prompt copiado para a área de transferência!");
        
        if (buttonElement) {
            const originalContent = buttonElement.innerHTML;
            buttonElement.classList.add("copied");
            buttonElement.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Copiado!
            `;
            
            setTimeout(() => {
                buttonElement.classList.remove("copied");
                buttonElement.innerHTML = originalContent;
            }, 2000);
        }
    }).catch(err => {
        showToast("Erro ao tentar copiar o texto.", "error");
        console.error("Falha ao copiar: ", err);
    });
}

// ==========================================================================
// 4. RENDER PROMPTS GRID
// ==========================================================================

function updateCategoryCounts() {
    // Function kept for compatibility but numbers removed per user request
}

function updateResultsCounter(total) {
    const existing = document.querySelector(".results-counter");
    if (existing) existing.remove();
    
    if (currentSearchQuery) {
        const counter = document.createElement("div");
        counter.className = "results-counter";
        const label = CATEGORY_LABELS[currentCategory] || currentCategory;
        counter.innerHTML = `<span class="counter-num">${total}</span> ${total === 1 ? 'resultado' : 'resultados'} encontrados em <span class="counter-cat">${label}</span>`;
        const container = document.getElementById("library-prompts-container");
        if (container) container.before(counter);
    }
}

function renderPrompts() {
    const container = document.getElementById("library-prompts-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Filtrar com base na categoria ativa e barra de pesquisa
    const filteredPrompts = promptsList.filter(prompt => {
        const matchesCategory = currentCategory === "all" || 
                               (currentCategory === "custom" && prompt.id.startsWith("custom-")) ||
                               prompt.category === currentCategory;
                                
        const matchesSearch = !currentSearchQuery ||
                              prompt.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.description.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery.toLowerCase()));
                               
        return matchesCategory && matchesSearch;
    });
    
    updateResultsCounter(filteredPrompts.length);
    
    if (filteredPrompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" style="margin: 0 auto 16px; opacity: 0.4;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <p>Nenhum prompt localizado para esta pesquisa nesta categoria.</p>
            </div>
        `;
        return;
    }
    
    filteredPrompts.forEach(prompt => {
        const card = document.createElement("div");
        card.className = "prompt-card";
        
        // Tags HTML
        const tagsMarkup = prompt.tags.map(tag => `
            <span class="prompt-tag tag-${prompt.category}">${tag}</span>
        `).join("");
        
        // Delete button para prompts customizados criados pelo usuário
        const isCustom = prompt.id.startsWith("custom-");
        const deleteButtonMarkup = isCustom 
            ? `<button class="btn-card-secondary btn-delete" data-id="${prompt.id}" title="Deletar Prompt">
                 <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
               </button>`
            : "";
            
        const categoryLabel = CATEGORY_LABELS[prompt.category] || prompt.category;
        
        card.innerHTML = `
            <div class="prompt-card-top">
                <div class="prompt-tags">
                    <span class="prompt-cat-badge tag-${prompt.category}">${categoryLabel}</span>
                    ${tagsMarkup}
                </div>
                <h3>${prompt.title}</h3>
                <p class="prompt-desc">${prompt.description}</p>
            </div>
            <div class="prompt-card-actions">
                ${deleteButtonMarkup}
                <button class="btn-card-copy" data-id="${prompt.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copiar Prompt
                </button>
            </div>
        `;
        
        // Evento de cópia
        const copyBtn = card.querySelector(".btn-card-copy");
        copyBtn.addEventListener("click", () => {
            copyToClipboard(prompt.content, copyBtn);
        });
        
        // Evento de exclusão (se aplicável)
        if (isCustom) {
            const deleteBtn = card.querySelector(".btn-delete");
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza de que deseja excluir o prompt "${prompt.title}"?`)) {
                    deleteCustomPrompt(prompt.id);
                }
            });
        }
        
        container.appendChild(card);
    });
}

// ==========================================================================
// 5. AI SEARCH
// ==========================================================================

let aiResults = [];
let isAISearching = false;

function renderPromptsWithAI() {
    const container = document.getElementById("library-prompts-container");
    if (!container) return;

    container.innerHTML = "";

    const localFiltered = promptsList.filter(prompt => {
        const matchesCategory = currentCategory === "all" ||
                               (currentCategory === "custom" && prompt.id.startsWith("custom-")) ||
                               prompt.category === currentCategory;

        const matchesSearch = !currentSearchQuery ||
                              prompt.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.description.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery.toLowerCase()));

        return matchesCategory && matchesSearch;
    });

    const displayPrompts = [...localFiltered, ...aiResults];
    
    updateResultsCounter(displayPrompts.length);

    if (displayPrompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" style="margin: 0 auto 16px; opacity: 0.4;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <p>Nenhum prompt localizado para esta pesquisa.</p>
            </div>
        `;
        return;
    }

    displayPrompts.forEach(prompt => {
        const card = document.createElement("div");
        card.className = "prompt-card";

        const tagsMarkup = prompt.tags.map(tag => `
            <span class="prompt-tag tag-${prompt.category}">${tag}</span>
        `).join("");

        const isCustom = prompt.id.startsWith("custom-");
        const isAI = prompt.isAIGenerated;

        const deleteButtonMarkup = isCustom
            ? `<button class="btn-card-secondary btn-delete" data-id="${prompt.id}" title="Deletar Prompt">
                 <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>`
            : "";

        const aiBadge = isAI
            ? `<span class="ai-badge">✨ IA</span>`
            : "";

        const categoryLabel = CATEGORY_LABELS[prompt.category] || prompt.category;
        
        card.innerHTML = `
            <div class="prompt-card-top">
                <div class="prompt-tags">
                    <span class="prompt-cat-badge tag-${prompt.category}">${categoryLabel}</span>
                    ${tagsMarkup}
                </div>
                <h3>${prompt.title}${aiBadge}</h3>
                <p class="prompt-desc">${prompt.description}</p>
            </div>
            <div class="prompt-card-actions">
                ${deleteButtonMarkup}
                <button class="btn-card-copy" data-id="${prompt.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copiar Prompt
                </button>
            </div>
        `;

        const copyBtn = card.querySelector(".btn-card-copy");
        copyBtn.addEventListener("click", () => {
            copyToClipboard(prompt.content, copyBtn);
        });

        if (isCustom) {
            const deleteBtn = card.querySelector(".btn-delete");
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza de que deseja excluir o prompt "${prompt.title}"?`)) {
                    deleteCustomPrompt(prompt.id);
                }
            });
        }

        container.appendChild(card);
    });
}

async function handleAISearch() {
    if (isAISearching) return;
    if (!currentSearchQuery || currentSearchQuery.trim() === "") {
        showToast("Digite algo na busca antes de pesquisar com IA.", "error");
        return;
    }

    const btn = document.getElementById("btn-ai-search-lib");
    isAISearching = true;
    btn.classList.add("loading");
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path></svg>
        Buscando...
    `;

    try {
        const results = await window.searchWithAI(currentSearchQuery);
        aiResults = results;
        renderPromptsWithAI();
        showToast(`${results.length} prompts encontrados com IA!`, "success");
    } catch (err) {
        showToast(err.message, "error");
        aiResults = [];
        renderPromptsWithAI();
    } finally {
        isAISearching = false;
        btn.classList.remove("loading");
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path></svg>
            Buscar com IA
        `;
    }
}

// ==========================================================================
// 6. INTERFACE EVENTS
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa lista de prompts
    initPrompts();

    // Renderiza prompts iniciais
    renderPrompts();

    // Controle da barra de busca
    const searchInput = document.getElementById("library-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value;
            aiResults = [];
            renderPrompts();
        });
    }

    // AI Search Button
    const aiSearchBtn = document.getElementById("btn-ai-search-lib");
    if (aiSearchBtn && window.searchWithAI) {
        aiSearchBtn.addEventListener("click", handleAISearch);
    } else if (aiSearchBtn) {
        aiSearchBtn.addEventListener("click", () => {
            showToast("API não configurada. Vá até o Chat para configurar.", "error");
        });
    }

    // Controle dos botões de categoria da pílula arredondada (Pill Bar)
    const categoryButtons = document.querySelectorAll(".category-pill-btn");
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.getAttribute("data-category");
            aiResults = [];
            renderPrompts();
        });
    });
});
