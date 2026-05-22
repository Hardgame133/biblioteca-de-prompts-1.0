/**
 * Prompt Hub - Workspace JavaScript Core
 * Coordena as funcionalidades de gerenciamento da Biblioteca de Prompts (filtros, busca, cÃ³pia, salvamento local)
 * e do Criador de Prompts interativo com compilaÃ§Ã£o reativa em tempo real.
 */

// Performance Monitor for Auto-Reload
(function() {
    let lastTime = performance.now();
    let slowCount = 0;
    const SLOW_THRESHOLD_MS = 200; // FPS < 5
    const MAX_SLOW_FRAMES = 40; // ~8 segundos de lentidÃ£o persistente
    
    function checkPerf(time) {
        const delta = time - lastTime;
        lastTime = time;
        
        if (delta > SLOW_THRESHOLD_MS) {
            slowCount++;
            if (slowCount > MAX_SLOW_FRAMES) {
                console.warn("Extrema lentidÃ£o detectada. Recarregando a pÃ¡gina...");
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
                        console.warn("Long Task detectada. Recarregando a pÃ¡gina...");
                        window.location.reload();
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            // Ignorar erros se o browser nÃ£o suportar longtask
        }
    }
})();


// ==========================================================================
// 1. DADOS DOS PROMPTS PADRÃƒO (LIBRARY SEED DATA)
// ==========================================================================

const DEFAULT_PROMPTS = [
    {
        id: "p1",
        title: "Engenheiro Full Stack SÃªnior",
        category: "dev",
        tags: ["react", "node", "typescript", "clean-code"],
        description: "Transforma requisitos abstratos em cÃ³digos estruturados ponta a ponta com testes unitÃ¡rios.",
        content: `VocÃª Ã© um Engenheiro Full Stack SÃªnior altamente especializado em React, TypeScript, Node.js e arquiteturas de alta escalabilidade.
        
Sua tarefa Ã© projetar soluÃ§Ãµes robustas seguindo as melhores prÃ¡ticas da engenharia (SOLID, DRY, Clean Code).
Por favor, estruture os cÃ³digos com:
1. Tipagem TypeScript estrita e sem uso de 'any'.
2. SeparaÃ§Ã£o clara de responsabilidades (Componentes de UI separados de lÃ³gica de Hooks).
3. Tratamento defensivo de erros e tratamento assÃ­ncrono completo.
4. ExplicaÃ§Ãµes concisas focadas no fluxo de dados.`
    },
    {
        id: "p2",
        title: "Copywriter de ConversÃ£o AIDA",
        category: "marketing",
        tags: ["copywriting", "vendas", "aida", "conversao"],
        description: "Escreve textos altamente persuasivos focados em conversÃ£o de leads usando a estrutura clÃ¡ssica AIDA.",
        content: `VocÃª Ã© um Copywriter especialista em neuromarketing e redaÃ§Ã£o comercial persuasiva, focado na metodologia AIDA (AtenÃ§Ã£o, Interesse, Desejo, AÃ§Ã£o).
        
Sua missÃ£o Ã© desenvolver copys de alto impacto que engajem e convertam leitores em compradores.
Por favor, siga estas etapas:
- ATENÃ‡ÃƒO: Comece com um gancho/headline matador que quebre o padrÃ£o.
- INTERESSE: Identifique a dor central e aprofunde o problema do pÃºblico.
- DESEJO: Apresente a soluÃ§Ã£o de forma irresistÃ­vel realÃ§ando os benefÃ­cios.
- AÃ‡ÃƒO: Termine com uma Chamada para AÃ§Ã£o (CTA) clara, direta e urgente.`
    },
    {
        id: "p3",
        title: "Tradutor TÃ©cnico de LocalizaÃ§Ã£o",
        category: "writing",
        tags: ["traducao", "localizacao", "tecnico", "ingles-pt"],
        description: "Realiza traduÃ§Ãµes ultra-precisas que adaptam expressÃµes regionais e jargÃµes tÃ©cnicos para portuguÃªs do Brasil.",
        content: `VocÃª Ã© um Tradutor LiterÃ¡rio e TÃ©cnico altamente especializado na localizaÃ§Ã£o de softwares, artigos cientÃ­ficos e documentaÃ§Ãµes tÃ©cnicas de inglÃªs para portuguÃªs do Brasil (pt-BR).
        
Sua tarefa Ã© traduzir o texto fornecido garantindo que:
1. JargÃµes de desenvolvimento e tecnologia sejam traduzidos de forma natural no ecossistema brasileiro (ou preservados se forem termos padrÃ£o de mercado, ex: 'deploy', 'refatorar').
2. ExpressÃµes idiomÃ¡ticas sejam adaptadas mantendo a conotaÃ§Ã£o emocional.
3. O tom de voz seja consistente e adequado ao pÃºblico final (corporativo, tÃ©cnico ou casual).`
    },
    {
        id: "p4",
        title: "Resumidor EstratÃ©gico de NegÃ³cios",
        category: "prod",
        tags: ["resumos", "insights", "pdf", "produtividade"],
        description: "Analisa relatÃ³rios ou textos longos extraindo planos de aÃ§Ã£o executivos e as 5 principais liÃ§Ãµes.",
        content: `VocÃª Ã© um Analista de InteligÃªncia de NegÃ³cios e Estrategista Corporativo experiente.
        
Sua tarefa Ã© ler o texto/relatÃ³rio fornecido e sintetizÃ¡-lo em uma anÃ¡lise executiva de alta densidade informativa.
Sua saÃ­da deve conter:
- RESUMO EXECUTIVO: Uma visÃ£o geral em 3 frases.
- 5 PRINCIPAIS INSIGHTS: As liÃ§Ãµes fundamentais ordenadas por impacto prÃ¡tico.
- PLANO DE AÃ‡ÃƒO (NEXT STEPS): Um checklist acionÃ¡vel com 4 etapas estratÃ©gicas de aplicaÃ§Ã£o imediata baseadas na leitura.`
    },
    {
        id: "p5",
        title: "Revisor de CÃ³digo & Otimizador",
        category: "dev",
        tags: ["review", "refatoracao", "performance", "clean-architecture"],
        description: "Audita blocos de cÃ³digo apontando gargalos de performance, falhas de seguranÃ§a e sugerindo refatoraÃ§Ãµes.",
        content: `VocÃª Ã© um Auditor de Qualidade de Software e Revisor de CÃ³digo extremamente detalhista e adepto de Clean Architecture.
        
Sua tarefa Ã© analisar o trecho de cÃ³digo fornecido em busca de:
1. OtimizaÃ§Ãµes de desempenho e consumo de memÃ³ria (reduÃ§Ã£o de repetiÃ§Ãµes, loops desnecessÃ¡rios).
2. Vulnerabilidades comuns de seguranÃ§a (injeÃ§Ãµes, tratamento de inputs).
3. Legibilidade e manutenibilidade (tamanho de mÃ©todos, nomenclatura).
Apresente uma tabela comparativa rÃ¡pida ('Antes' vs 'Depois') e forneÃ§a o cÃ³digo final totalmente otimizado.`
    },
    {
        id: "p6",
        title: "Estrategista de ConteÃºdo SEO",
        category: "marketing",
        tags: ["seo", "blogs", "palavras-chave", "conteudo"],
        description: "Planeja pautas completas e estruturas de tÃ³picos organizados por tags H1, H2, H3 otimizadas para busca Google.",
        content: `VocÃª Ã© um especialista em SEO tÃ©cnico e criador de estratÃ©gias de trÃ¡fego orgÃ¢nico experiente.
        
Sua missÃ£o Ã© desenvolver o esqueleto/estrutura de um artigo altamente qualificado para as diretrizes E-E-A-T do Google baseado em uma palavra-chave principal.
Estruture a resposta com:
- AnÃ¡lise de intenÃ§Ã£o de busca do usuÃ¡rio (Informativa, Transacional, NavegaÃ§Ã£o).
- TÃ­tulo H1 magnÃ©tico (limite de 60 caracteres).
- Estrutura completa de subtÃ­tulos (H2 e H3) integrando palavras-chave secundÃ¡rias.
- Breve resumo de recomendaÃ§Ã£o sobre qual conteÃºdo focar sob cada cabeÃ§alho para garantir mÃ¡xima relevÃ¢ncia.`
    }
];

// ==========================================================================
// 2. INICIALIZAÃ‡ÃƒO DE ESTADO
// ==========================================================================

let promptsList = [];
let currentCategory = "all";
let currentSearchQuery = "";

// Carregar prompts do LocalStorage ou do Seed de prompts iniciais
function initPrompts() {
    const customPrompts = localStorage.getItem("prompts_custom");
    if (customPrompts) {
        promptsList = [...DEFAULT_PROMPTS, ...JSON.parse(customPrompts)];
    } else {
        promptsList = [...DEFAULT_PROMPTS];
        localStorage.setItem("prompts_custom", JSON.stringify([]));
    }
}

// Salvar novos prompts personalizados no LocalStorage
function saveCustomPrompt(newPrompt) {
    const customPromptsRaw = localStorage.getItem("prompts_custom") || "[]";
    const customList = JSON.parse(customPromptsRaw);
    customList.push(newPrompt);
    localStorage.setItem("prompts_custom", JSON.stringify(customList));
    
    // Atualiza estado local da aplicaÃ§Ã£o
    promptsList.push(newPrompt);
    renderPrompts();
}

// Deletar um prompt personalizado
function deleteCustomPrompt(id) {
    const customPromptsRaw = localStorage.getItem("prompts_custom") || "[]";
    let customList = JSON.parse(customPromptsRaw);
    customList = customList.filter(p => p.id !== id);
    localStorage.setItem("prompts_custom", JSON.stringify(customList));
    
    // Atualiza estado e re-renderiza
    promptsList = [...DEFAULT_PROMPTS, ...customList];
    renderPrompts();
    showToast("Prompt removido com sucesso!");
}

// ==========================================================================
// 3. TOAST FLOATING NOTIFICATIONS
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
    
    // Trigger animation frame for CSS transition scale & fade-in
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });
    
    // Remove toast after time out
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// Copiar texto para o clipboard com suporte de fallback
function copyToClipboard(text, buttonElement) {
    if (!text || text.trim() === "") {
        showToast("NÃ£o hÃ¡ texto disponÃ­vel para cÃ³pia!", "error");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Prompt copiado para a Ã¡rea de transferÃªncia!");
        
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
// 4. CONEXÃƒO E RENDERIZAÃ‡ÃƒO DA BIBLIOTECA
// ==========================================================================

function renderPrompts() {
    const container = document.getElementById("prompts-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    // Filtra prompts com base nas variÃ¡veis globais
    const filteredPrompts = promptsList.filter(prompt => {
        const matchesCategory = currentCategory === "all" || 
                               (currentCategory === "custom" && prompt.id.startsWith("custom-")) ||
                               prompt.category === currentCategory;
                               
        const matchesSearch = prompt.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.description.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery.toLowerCase()));
                              
        return matchesCategory && matchesSearch;
    });
    
    if (filteredPrompts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-secondary);">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" style="margin: 0 auto 16px; opacity: 0.5;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <p style="font-size: 15px;">Nenhum prompt localizado para esta pesquisa.</p>
            </div>
        `;
        return;
    }
    
    filteredPrompts.forEach(prompt => {
        const card = document.createElement("div");
        card.className = "prompt-card";
        
        // Tags Markup
        const tagsMarkup = prompt.tags.map(tag => `
            <span class="prompt-tag tag-${prompt.category}">${tag}</span>
        `).join("");
        
        // Custom Delete Action se for adicionado pelo usuÃ¡rio
        const isCustom = prompt.id.startsWith("custom-");
        const deleteButtonMarkup = isCustom 
            ? `<button class="btn-card-secondary btn-delete" data-id="${prompt.id}" title="Deletar Prompt">
                 <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
               </button>`
            : "";
            
        card.innerHTML = `
            <div class="prompt-card-top">
                <div class="prompt-tags">
                    ${tagsMarkup}
                </div>
                <h3>${prompt.title}</h3>
                <p class="prompt-desc">${prompt.description}</p>
            </div>
            <div class="prompt-card-actions">
                ${deleteButtonMarkup}
                <button class="btn-card-copy" data-id="${prompt.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copiar
                </button>
            </div>
        `;
        
        // Configura eventos para o card especÃ­fico
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

// ==========================================================================
// 5. COMPILAÃ‡ÃƒO REATIVA DO CRIADOR DE PROMPTS
// ==========================================================================

function compileCreatorPrompt() {
    const roleVal = document.getElementById("creator-role").value.trim();
    const taskVal = document.getElementById("creator-task").value.trim();
    const contextVal = document.getElementById("creator-context").value.trim();
    const formatVal = document.getElementById("creator-format").value.trim();
    const constraintsVal = document.getElementById("creator-constraints").value.trim();
    
    const previewContainer = document.getElementById("compiled-prompt-preview");
    if (!previewContainer) return;
    
    // Verifica se algum campo foi preenchido
    if (!roleVal && !taskVal && !contextVal && !formatVal && !constraintsVal) {
        previewContainer.innerHTML = `<span class="preview-placeholder">O prompt compilado aparecerÃ¡ aqui estruturado dinamicamente Ã  medida que vocÃª preenche o formulÃ¡rio ao lado...</span>`;
        return;
    }
    
    let compiled = "";
    
    if (roleVal) {
        compiled += `[PAPEL / PERSONA]\n${roleVal}\n\n`;
    }
    if (taskVal) {
        compiled += `[TAREFA PRINCIPAL]\n${taskVal}\n\n`;
    }
    if (contextVal) {
        compiled += `[CONTEXTO ADICIONAL]\n${contextVal}\n\n`;
    }
    if (formatVal) {
        compiled += `[FORMATO DE SAÃDA]\n${formatVal}\n\n`;
    }
    if (constraintsVal) {
        compiled += `[DIRETRIZES & RESTRIÃ‡Ã•ES]\n${constraintsVal}\n\n`;
    }
    
    // Formata o texto final com realces de tags CSS para simular sintaxe
    const escaped = compiled.trim()
        .replace(/\[PAPEL \/ PERSONA\]/g, '<span class="preview-token">[PAPEL / PERSONA]</span>')
        .replace(/\[TAREFA PRINCIPAL\]/g, '<span class="preview-token">[TAREFA PRINCIPAL]</span>')
        .replace(/\[CONTEXTO ADICIONAL\]/g, '<span class="preview-token">[CONTEXTO ADICIONAL]</span>')
        .replace(/\[FORMATO DE SAÃDA\]/g, '<span class="preview-token">[FORMATO DE SAÃDA]</span>')
        .replace(/\[DIRETRIZES \& RESTRIÃ‡Ã•ES\]/g, '<span class="preview-token">[DIRETRIZES & RESTRIÃ‡Ã•ES]</span>');
        
    previewContainer.innerHTML = escaped;
}

// Resetar o criador para valores em branco
function clearCreatorForm() {
    document.getElementById("creator-title").value = "";
    document.getElementById("creator-role").value = "";
    document.getElementById("creator-task").value = "";
    document.getElementById("creator-context").value = "";
    document.getElementById("creator-format").value = "";
    document.getElementById("creator-constraints").value = "";
    compileCreatorPrompt();
}

// ==========================================================================
// 6. AI SEARCH (Dashboard)
// ==========================================================================

let aiResults = [];
let isAISearching = false;

function renderPromptsWithAI() {
    const container = document.getElementById("prompts-container");
    if (!container) return;

    container.innerHTML = "";

    const localFiltered = promptsList.filter(prompt => {
        const matchesCategory = currentCategory === "all" ||
                               (currentCategory === "custom" && prompt.id.startsWith("custom-")) ||
                               prompt.category === currentCategory;

        const matchesSearch = prompt.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.description.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                              prompt.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery.toLowerCase()));

        return matchesCategory && matchesSearch;
    });

    const displayPrompts = [...localFiltered, ...aiResults];

    if (displayPrompts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-secondary);">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" style="margin: 0 auto 16px; opacity: 0.5;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <p style="font-size: 15px;">Nenhum prompt localizado para esta pesquisa.</p>
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

        card.innerHTML = `
            <div class="prompt-card-top">
                <div class="prompt-tags">
                    ${tagsMarkup}
                </div>
                <h3>${prompt.title}${aiBadge}</h3>
                <p class="prompt-desc">${prompt.description}</p>
            </div>
            <div class="prompt-card-actions">
                ${deleteButtonMarkup}
                <button class="btn-card-copy" data-id="${prompt.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copiar
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

async function handleDashboardAISearch() {
    if (isAISearching) return;
    if (!currentSearchQuery || currentSearchQuery.trim() === "") {
        showToast("Digite algo na busca antes de pesquisar com IA.", "error");
        return;
    }

    const btn = document.getElementById("btn-ai-search-dash");
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
// 7. EVENTOS DE INTERFACE E CARREGAMENTO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o banco de dados
    initPrompts();
    
    // ReferÃªncias dos elementos DOM principais
    const dashboard = document.getElementById("workspace-dashboard");
    const openLibraryBtn = document.querySelector(".btn-solid");
    const openCreatorBtn = document.querySelector(".btn-outline");
    const closeDashboardBtn = document.getElementById("close-dashboard-btn");
    
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    const searchInput = document.getElementById("prompt-search");
    const categoryButtons = document.querySelectorAll(".category-btn");
    
    // O botÃ£o principal da Biblioteca agora navega diretamente para biblioteca.html
    // O botÃ£o do Criador agora navega diretamente para chat.html
    
    // Fechar o Dashboard
    if (closeDashboardBtn) {
        closeDashboardBtn.addEventListener("click", () => {
            dashboard.classList.add("hidden");
        });
    }
    
    // Fechar ao clicar fora da janela (no overlay escuro)
    if (dashboard) {
        dashboard.addEventListener("click", (e) => {
            if (e.target === dashboard) {
                dashboard.classList.add("hidden");
            }
        });
    }
    
    // Alternar Abas (Tabs System)
    function switchTab(tabId) {
        tabButtons.forEach(btn => {
            if (btn.getAttribute("data-tab") === tabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
        
        tabContents.forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add("active");
            } else {
                content.classList.remove("active");
            }
        });
    }
    
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
            if (tabId === "library") renderPrompts();
            if (tabId === "creator") compileCreatorPrompt();
        });
    });
    
    // Filtro por Barra de Busca
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value;
            aiResults = [];
            renderPrompts();
        });
    }
    
    // AI Search Button (Dashboard)
    const dashAIBtn = document.getElementById("btn-ai-search-dash");
    if (dashAIBtn && window.searchWithAI) {
        dashAIBtn.addEventListener("click", handleDashboardAISearch);
    } else if (dashAIBtn) {
        dashAIBtn.addEventListener("click", () => {
            showToast("API não configurada. Vá até o Chat para configurar.", "error");
        });
    }
    
    // Filtro por Categoria
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            currentCategory = btn.getAttribute("data-category");
            aiResults = [];
            renderPrompts();
        });
    });
    
    // MODAL DE NOVO PROMPT (Biblioteca)
    const openAddModalBtn = document.getElementById("open-add-modal-btn");
    const addPromptModal = document.getElementById("add-prompt-modal");
    const closeAddModalBtn = document.getElementById("close-add-modal-btn");
    const cancelModalBtn = document.getElementById("btn-cancel-modal");
    const addPromptForm = document.getElementById("add-prompt-form");
    
    if (openAddModalBtn && addPromptModal) {
        openAddModalBtn.addEventListener("click", () => {
            addPromptModal.classList.remove("hidden");
        });
    }
    
    function closeAddModal() {
        if (addPromptModal) {
            addPromptModal.classList.add("hidden");
            if (addPromptForm) addPromptForm.reset();
        }
    }
    
    if (closeAddModalBtn) closeAddModalBtn.addEventListener("click", closeAddModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeAddModal);
    
    if (addPromptModal) {
        addPromptModal.addEventListener("click", (e) => {
            if (e.target === addPromptModal) {
                closeAddModal();
            }
        });
    }
    
    // Envio do formulÃ¡rio de Novo Prompt
    if (addPromptForm) {
        addPromptForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const title = document.getElementById("new-title").value.trim();
            const category = document.getElementById("new-category").value;
            const tagsInput = document.getElementById("new-tags").value.trim();
            const description = document.getElementById("new-description").value.trim();
            const content = document.getElementById("new-content").value.trim();
            
            const tags = tagsInput 
                ? tagsInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t !== "")
                : [category];
                
            const newPrompt = {
                id: "custom-" + Date.now(),
                title,
                category,
                tags,
                description,
                content
            };
            
            saveCustomPrompt(newPrompt);
            closeAddModal();
            showToast("Prompt cadastrado com sucesso!");
            
            // Foca na categoria de Meus Prompts para ver a inclusÃ£o
            const customCatBtn = document.querySelector('.category-btn[data-category="custom"]');
            if (customCatBtn) customCatBtn.click();
        });
    }
    
    // EVENTOS DO CRIADOR DE PROMPTS (CompilaÃ§Ã£o reativa)
    const creatorInputs = [
        "creator-role", 
        "creator-task", 
        "creator-context", 
        "creator-format", 
        "creator-constraints"
    ];
    
    creatorInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", compileCreatorPrompt);
        }
    });
    
    // AÃ§Ã£o: Copiar do Criador
    const btnCopyCreator = document.getElementById("btn-copy-creator");
    if (btnCopyCreator) {
        btnCopyCreator.addEventListener("click", () => {
            const previewContainer = document.getElementById("compiled-prompt-preview");
            // Copia o texto puro do preview tirando tags html e placeholders
            if (previewContainer.querySelector(".preview-placeholder")) {
                showToast("Escreva nos campos antes de copiar!", "error");
                return;
            }
            
            const textToCopy = previewContainer.innerText;
            copyToClipboard(textToCopy, btnCopyCreator);
        });
    }
    
    // AÃ§Ã£o: Salvar do Criador na Biblioteca
    const btnSaveCreator = document.getElementById("btn-save-creator");
    if (btnSaveCreator) {
        btnSaveCreator.addEventListener("click", () => {
            const titleVal = document.getElementById("creator-title").value.trim();
            const categoryVal = document.getElementById("creator-category").value;
            const previewContainer = document.getElementById("compiled-prompt-preview");
            
            if (previewContainer.querySelector(".preview-placeholder")) {
                showToast("Preencha as diretrizes antes de salvar!", "error");
                return;
            }
            
            const title = titleVal || `Prompt Customizado ${new Date().toLocaleDateString()}`;
            const content = previewContainer.innerText;
            
            const newPrompt = {
                id: "custom-" + Date.now(),
                title,
                category: categoryVal,
                tags: ["criador", categoryVal],
                description: `Prompt gerado a partir do Criador estruturado.`,
                content
            };
            
            saveCustomPrompt(newPrompt);
            showToast("Prompt salvo na Biblioteca!");
            
            // Pergunta opcional/feedback rÃ¡pido para ir Ã  biblioteca ver
            clearCreatorForm();
            
            // Troca de aba dinamicamente para mostrar o item
            switchTab("library");
            const customCatBtn = document.querySelector('.category-btn[data-category="custom"]');
            if (customCatBtn) customCatBtn.click();
        });
    }
});
