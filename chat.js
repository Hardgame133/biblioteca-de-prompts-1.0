/**
 * Prompts Workspace - Chat AI JavaScript Core
 * Controla as conversas, renderização de chat, configurações de API local e integração multi-provider.
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
            // Ignorar
        }
    }
})();

// ==========================================================================
// 1. CONFIGURAÇÕES PADRÃO E LOCALSTORAGE
// ==========================================================================

const DEFAULT_SETTINGS = {
    provider: 'gemini',
    key: '',
    aiName: 'Gemini AI',
    model: 'gemini-1.5-flash',
    customUrl: '',
    systemPrompt: 'Você é um assistente especialista em engenharia de prompts. Dê respostas detalhadas, bem organizadas e formatadas.'
};

let apiSettings = { ...DEFAULT_SETTINGS };
let conversations = [];
let currentConversationId = null;
let isGenerating = false;

// Carregar Configurações de API do LocalStorage
function loadSettings() {
    const saved = localStorage.getItem('workspace_api_settings');
    if (saved) {
        apiSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        // Se a key parece inválida (URL, muito curta), limpa para evitar erros silenciosos
        if (apiSettings.key && (apiSettings.key.startsWith('http') || apiSettings.key.length < 10)) {
            apiSettings.key = '';
            localStorage.setItem('workspace_api_settings', JSON.stringify(apiSettings));
        }
    } else {
        localStorage.setItem('workspace_api_settings', JSON.stringify(apiSettings));
    }
}

function isValidAPIKey(key) {
    if (!key || key.trim() === '') return false;
    if (key.startsWith('http')) return false;
    if (key.length < 10) return false;
    return true;
}

// Carregar Conversas do LocalStorage
function loadConversations() {
    const saved = localStorage.getItem('workspace_conversations');
    if (saved) {
        conversations = JSON.parse(saved);
    } else {
        conversations = [];
        localStorage.setItem('workspace_conversations', JSON.stringify(conversations));
    }
}

// Salvar Conversas
function saveConversations() {
    localStorage.setItem('workspace_conversations', JSON.stringify(conversations));
}

// ==========================================================================
// 2. UTILITÁRIOS DE UI E NOTIFICAÇÃO (TOAST)
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
    
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });
    
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// Parser de Markdown super simples para chat elegante
function parseMarkdown(text) {
    if (!text) return '';
    
    // Escapar tags html para evitar XSS
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Code blocks: ```linguagem ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span>${lang || 'code'}</span>
                <button class="btn-copy-code" onclick="copyCodeText(this)">Copiar</button>
            </div>
            <pre><code class="language-${lang}">${code.trim()}</code></pre>
        </div>`;
    });
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italics: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Lists: - ou * no começo da linha
    html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
    // Envolver grupos de li em ul
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // Limpar tags ul duplicadas seguidas
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Copiar código de blocos
window.copyCodeText = function(button) {
    const codeEl = button.parentElement.nextElementSibling.querySelector('code');
    if (!codeEl) return;
    
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
        const originalText = button.innerText;
        button.innerText = "Copiado!";
        setTimeout(() => {
            button.innerText = originalText;
        }, 2000);
    });
};

// ==========================================================================
// 3. GERENCIAMENTO DE CONVERSAS (SIDEBAR)
// ==========================================================================

function renderConversationsList() {
    const listContainer = document.getElementById("conversations-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    if (conversations.length === 0) {
        listContainer.innerHTML = `
            <div class="no-conversations">
                <p>Nenhuma conversa iniciada.</p>
            </div>
        `;
        return;
    }
    
    conversations.forEach(convo => {
        const item = document.createElement("div");
        item.className = `conversation-item ${convo.id === currentConversationId ? 'active' : ''}`;
        item.dataset.id = convo.id;
        
        // Formatar data abreviada
        const date = new Date(convo.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        item.innerHTML = `
            <div class="convo-info">
                <svg class="convo-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="convo-title">${convo.title}</span>
            </div>
            <div class="convo-actions">
                <span class="convo-time">${timeStr}</span>
                <button class="btn-delete-convo" title="Excluir Conversa">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Selecionar conversa
        item.addEventListener("click", (e) => {
            if (e.target.closest(".btn-delete-convo")) {
                e.stopPropagation();
                deleteConversation(convo.id);
                return;
            }
            selectConversation(convo.id);
        });
        
        listContainer.appendChild(item);
    });
}

function updateAPIStatus() {
    const statusEl = document.getElementById("chat-ai-status");
    if (!statusEl) return;
    if (!apiSettings.key || !isValidAPIKey(apiSettings.key)) {
        statusEl.innerHTML = `<span style="color:#f87171;">⚠️ API não configurada</span>`;
    } else {
        statusEl.innerText = `Modelo: ${apiSettings.model}`;
    }
}

function selectConversation(id) {
    currentConversationId = id;
    renderConversationsList();
    
    const convo = conversations.find(c => c.id === id);
    if (!convo) return;
    
    // Atualizar Header do Chat
    document.getElementById("chat-title-display").innerText = convo.title;
    updateAPIStatus();
    
    // Ocultar a mensagem de boas-vindas
    const welcomeState = document.getElementById("chat-welcome-state");
    if (welcomeState) welcomeState.classList.add("hidden");
    
    // Renderizar mensagens
    renderMessages(convo.messages);
}

function deleteConversation(id) {
    if (confirm("Tem certeza que deseja excluir esta conversa?")) {
        conversations = conversations.filter(c => c.id !== id);
        saveConversations();
        
        if (currentConversationId === id) {
            currentConversationId = null;
            document.getElementById("chat-title-display").innerText = "Nova Conversa";
            document.getElementById("chat-ai-status").innerText = "Pronto para interagir";
            
            // Mostrar tela de boas vindas novamente
            const welcomeState = document.getElementById("chat-welcome-state");
            if (welcomeState) welcomeState.classList.remove("hidden");
            
            // Limpar container de mensagens
            const msgContainer = document.getElementById("chat-messages-container");
            // Mantém a tela de boas vindas
            Array.from(msgContainer.children).forEach(child => {
                if (child.id !== "chat-welcome-state") child.remove();
            });
        }
        
        renderConversationsList();
        showToast("Conversa removida.");
    }
}

function createNewConversation(initialMessage = null) {
    const id = "convo_" + Date.now();
    const title = initialMessage ? (initialMessage.substring(0, 24) + (initialMessage.length > 24 ? "..." : "")) : "Nova Conversa";
    
    const newConvo = {
        id,
        title,
        timestamp: Date.now(),
        messages: []
    };
    
    conversations.unshift(newConvo);
    saveConversations();
    selectConversation(id);
    
    return id;
}

// ==========================================================================
// 4. RENDERIZAÇÃO DAS MENSAGENS NO CHAT
// ==========================================================================

function renderMessages(messages) {
    const msgContainer = document.getElementById("chat-messages-container");
    if (!msgContainer) return;
    
    // Remover mensagens antigas (exceto welcome-state que fica escondido)
    Array.from(msgContainer.children).forEach(child => {
        if (child.id !== "chat-welcome-state") child.remove();
    });
    
    messages.forEach(msg => {
        appendMessageToUI(msg.role, msg.content);
    });
    
    scrollToBottom();
}

function appendMessageToUI(role, content) {
    const msgContainer = document.getElementById("chat-messages-container");
    if (!msgContainer) return;
    
    const msgBubble = document.createElement("div");
    msgBubble.className = `message-bubble ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    const avatar = role === 'user'
        ? `<div class="message-avatar user-avatar">U</div>`
        : `<div class="message-avatar ai-avatar">AI</div>`;
        
    const parsedText = parseMarkdown(content);
    
    msgBubble.innerHTML = `
        ${role === 'ai' ? avatar : ''}
        <div class="message-content">
            <div class="message-sender">${role === 'user' ? 'Você' : apiSettings.aiName}</div>
            <div class="message-text">${parsedText}</div>
        </div>
        ${role === 'user' ? avatar : ''}
    `;
    
    msgContainer.appendChild(msgBubble);
    scrollToBottom();
    return msgBubble;
}

function scrollToBottom() {
    const msgContainer = document.getElementById("chat-messages-container");
    if (msgContainer) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

// Efeito de digitação da IA
function simulateTypingEffect(messageBubble, fullText, callback) {
    const textContainer = messageBubble.querySelector(".message-text");
    if (!textContainer) return;
    
    textContainer.innerHTML = "";
    let currentText = "";
    let index = 0;
    
    // Como queremos velocidade, adicionamos blocos de palavras ou letras
    const words = fullText.split(" ");
    
    function type() {
        if (index < words.length) {
            currentText += (index > 0 ? " " : "") + words[index];
            textContainer.innerHTML = parseMarkdown(currentText);
            index++;
            scrollToBottom();
            setTimeout(type, Math.min(25, 100 / words.length)); // ajusta velocidade baseado no tamanho
        } else {
            textContainer.innerHTML = parseMarkdown(fullText); // finaliza
            scrollToBottom();
            if (callback) callback();
        }
    }
    type();
}

// Typing Indicator (Pontinhos de carregamento)
function showTypingIndicator() {
    const msgContainer = document.getElementById("chat-messages-container");
    if (!msgContainer) return null;
    
    const indicator = document.createElement("div");
    indicator.className = "message-bubble ai-message typing-indicator-bubble";
    indicator.id = "typing-indicator";
    
    indicator.innerHTML = `
        <div class="message-avatar ai-avatar">AI</div>
        <div class="message-content">
            <div class="message-sender">${apiSettings.aiName}</div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    msgContainer.appendChild(indicator);
    scrollToBottom();
    return indicator;
}

function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
        indicator.remove();
    }
}

// ==========================================================================
// 5. INTEGRAÇÃO REAL COM APIS (Google Gemini, OpenAI, Anthropic)
// ==========================================================================

async function callAI(messagesList) {
    if (!apiSettings.key || !isValidAPIKey(apiSettings.key)) {
        throw new Error("API Key inválida ou não configurada! Clique na engrenagem ⚙️ no canto superior direito e insira uma chave de API válida (ex: AIzaSy... para Gemini, sk-... para OpenAI).");
    }
    
    const provider = apiSettings.provider;
    const model = apiSettings.model;
    const systemPrompt = apiSettings.systemPrompt;
    
    if (provider === 'gemini') {
        // Formatar para API do Gemini
        // Gemini espera o histórico alternado entre 'user' e 'model'
        const formattedContents = messagesList.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiSettings.key}`;
        
        const payload = {
            contents: formattedContents
        };
        
        if (systemPrompt) {
            payload.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || response.statusText;
            throw new Error(`Erro Gemini: ${errMsg}`);
        }
        
        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) throw new Error("A API do Gemini retornou uma resposta vazia.");
        return aiText;
        
    } else if (provider === 'openai' || provider === 'custom') {
        // OpenAI ou Provedor Customizado
        const baseUrl = provider === 'custom' ? apiSettings.customUrl : 'https://api.openai.com/v1';
        const url = `${baseUrl}/chat/completions`;
        
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        messagesList.forEach(msg => {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiSettings.key}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || response.statusText;
            throw new Error(`Erro OpenAI: ${errMsg}`);
        }
        
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        if (!aiText) throw new Error("A API retornou uma resposta vazia.");
        return aiText;
        
    } else if (provider === 'anthropic') {
        // Anthropic Claude
        // Obs: Chamadas diretas do front à Anthropic geram bloqueio de CORS.
        // Aconselhamos usar proxy ou Gemini/OpenAI que suportam CORS direto.
        const url = `https://api.anthropic.com/v1/messages`;
        
        const formattedMessages = messagesList.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiSettings.key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                system: systemPrompt,
                messages: formattedMessages,
                max_tokens: 1024
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || response.statusText;
            throw new Error(`Erro Anthropic: ${errMsg} (Nota: a API da Anthropic bloqueia chamadas diretas por CORS no front-end)`);
        }
        
        const data = await response.json();
        const aiText = data.content?.[0]?.text;
        if (!aiText) throw new Error("A API do Claude retornou uma resposta vazia.");
        return aiText;
    } else {
        throw new Error("Provider de API inválido.");
    }
}

// Enviar mensagem no chat
async function handleSendMessage(text) {
    if (!text || text.trim() === "" || isGenerating) return;
    
    isGenerating = true;
    
    // Se não tiver conversa ativa, cria uma
    if (!currentConversationId) {
        createNewConversation(text);
    }
    
    const convoIndex = conversations.findIndex(c => c.id === currentConversationId);
    if (convoIndex === -1) return;
    
    const convo = conversations[convoIndex];
    
    // Adicionar mensagem do usuário
    const userMsg = { role: 'user', content: text };
    convo.messages.push(userMsg);
    
    // Atualizar título se for a primeira mensagem
    if (convo.title === "Nova Conversa") {
        convo.title = text.substring(0, 24) + (text.length > 24 ? "..." : "");
    }
    
    saveConversations();
    renderConversationsList();
    
    // Limpar mensagem de boas-vindas do chat
    const welcomeState = document.getElementById("chat-welcome-state");
    if (welcomeState) welcomeState.classList.add("hidden");
    
    // Renderizar mensagem na tela
    appendMessageToUI('user', text);
    
    // Exibir indicador de digitação da IA
    showTypingIndicator();
    
    try {
        // Enviar requisição para IA
        const responseText = await callAI(convo.messages);
        
        // Adicionar resposta da IA no estado
        const aiMsg = { role: 'ai', content: responseText };
        convo.messages.push(aiMsg);
        saveConversations();
        
        // Remover indicador e imprimir resposta com efeito de digitação
        removeTypingIndicator();
        
        const aiBubble = appendMessageToUI('ai', "");
        simulateTypingEffect(aiBubble, responseText, () => {
            isGenerating = false;
        });
        
    } catch (err) {
        console.error(err);
        removeTypingIndicator();
        appendMessageToUI('ai', `⚠️ **Erro:** ${err.message}`);
        isGenerating = false;
    }
}

// ==========================================================================
// 7. PROMPT LIBRARY SEARCH (Sidebar)
// ==========================================================================

const CHAT_DEFAULT_PROMPTS = [
    { id: "p1", title: "Engenheiro Full Stack Sênior", category: "dev", tags: ["react", "node", "typescript"], description: "Transforma requisitos abstratos em códigos estruturados com testes.", content: "Você é um Engenheiro Full Stack Sênior especializado em React, TypeScript, Node.js e arquiteturas escaláveis.\n\nSua tarefa é projetar soluções robustas seguindo SOLID, DRY e Clean Code.\nEstruture os códigos com:\n1. Tipagem TypeScript estrita.\n2. Separação clara de responsabilidades.\n3. Tratamento defensivo de erros.\n4. Explicações focadas no fluxo de dados." },
    { id: "p2", title: "Copywriter de Conversão AIDA", category: "marketing", tags: ["copywriting", "vendas", "aida"], description: "Escreve textos persuasivos focados em conversão usando a estrutura AIDA.", content: "Você é um Copywriter especialista em neuromarketing focado na metodologia AIDA (Atenção, Interesse, Desejo, Ação).\n\nDesenvolva copys de alto impacto:\n- ATENÇÃO: Gancho/headline matador.\n- INTERESSE: Identifique a dor central.\n- DESEJO: Solução irresistível.\n- AÇÃO: CTA clara e urgente." },
    { id: "p3", title: "Tradutor Técnico de Localização", category: "writing", tags: ["traducao", "localizacao", "tecnico"], description: "Traduções precisas adaptando expressões regionais e jargões técnicos.", content: "Você é um Tradutor Técnico especializado em localização de software e documentação.\n\nTraduza garantindo:\n1. Jargões traduzidos naturalmente.\n2. Expressões idiomáticas adaptadas.\n3. Tom de voz consistente com o público." },
    { id: "p4", title: "Resumidor Estratégico de Negócios", category: "prod", tags: ["resumos", "insights", "produtividade"], description: "Analisa textos longos extraindo planos de ação executivos.", content: "Você é um Analista de Inteligência de Negócios.\n\nSintetize o texto em:\n- RESUMO EXECUTIVO em 3 frases.\n- 5 PRINCIPAIS INSIGHTS ordenados.\n- PLANO DE AÇÃO com 4 etapas." },
    { id: "p5", title: "Revisor de Código & Otimizador", category: "dev", tags: ["review", "refatoracao", "performance"], description: "Audita código apontando gargalos de performance e sugerindo refatorações.", content: "Você é um Auditor de Qualidade de Software.\n\nAnalise o código em busca de:\n1. Otimizações de desempenho.\n2. Vulnerabilidades de segurança.\n3. Legibilidade e manutenibilidade.\nApresente tabela Antes/Depois e código otimizado." },
    { id: "p6", title: "Estrategista de Conteúdo SEO", category: "marketing", tags: ["seo", "blogs", "conteudo"], description: "Planeja pautas completas otimizadas para busca Google.", content: "Você é um especialista em SEO técnico.\n\nDesenvolva a estrutura de um artigo:\n- Análise de intenção de busca.\n- Título H1 magnético (60 chars).\n- Subtítulos H2/H3 com palavras-chave.\n- Recomendações de conteúdo." },
    { id: "p7", title: "Ghostwriter & Storyteller Sênior", category: "writing", tags: ["storytelling", "criativo", "narrativa"], description: "Cria narrativas cativantes usando técnicas de roteirização.", content: "Você é um Ghostwriter profissional.\n\nExpanda uma ideia em texto narrativo:\n1. Gancho narrativo inicial.\n2. Metáforas e linguagem sensorial.\n3. Tom autêntico e humano.\n4. Estrutura clara com parágrafos espaçados." },
    { id: "p8", title: "Planejador de Projetos & OKRs", category: "prod", tags: ["projetos", "metas", "okr"], description: "Desmembra objetivos em projetos com metas SMART.", content: "Você é um Gerente de Projetos Agile.\n\nEstruture o plano:\n1. Objetivo Geral inspirador.\n2. 3-4 Resultados-Chave (OKRs).\n3. Plano em 3 fases.\n4. Riscos e mitigação." },
    { id: "p9", title: "Engenheiro de Prompts Midjourney", category: "design", tags: ["midjourney", "imagens", "design"], description: "Gera prompts detalhados para geração de imagens.", content: "Você é especialista em Midjourney v6 e DALL-E 3.\n\nTraduza uma ideia em prompt detalhado:\n1. Objeto e Ação.\n2. Estilo Artístico.\n3. Câmera e Iluminação.\n4. Parâmetros técnicos (--ar 16:9 --style raw).\nForneça 3 variações em inglês." },
    { id: "p10", title: "Crítico de Layout UI/UX", category: "design", tags: ["ui-ux", "feedback", "usabilidade"], description: "Audita layouts apontando problemas de hierarquia e usabilidade.", content: "Você é um Designer UI/UX Sênior.\n\nAvalie a interface com:\n1. Análise de hierarquia visual.\n2. Problemas de usabilidade.\n3. Recomendações de UI.\n4. Recomendações de acessibilidade WCAG." },
    { id: "p11", title: "Consultor Business Model Canvas", category: "business", tags: ["business", "startups", "canvas"], description: "Ajuda a estruturar proposta de valor e modelo de negócios.", content: "Você é um Consultor de Negócios especialista em Lean Startup.\n\nMonte o Canvas:\n1. Proposta de Valor\n2. Segmentos de Clientes\n3. Canais\n4. Receita\n5. Recursos\n6. Atividades\n7. Parcerias\n8. Custos\nE sugira testes MVP." },
    { id: "p12", title: "Estrategista de Pitch de Vendas", category: "business", tags: ["pitch", "vendas", "investidores"], description: "Estrutura pitches persuasivos para clientes ou investidores.", content: "Você é especialista em Pitch Decks para VC.\n\nRoteiro de pitch de 3min:\n- O Gancho\n- O Problema\n- A Solução\n- Tamanho de Mercado\n- Tração e Modelo\n- A Oferta" },
    { id: "p13", title: "Mentor Socrático", category: "education", tags: ["estudos", "perguntas", "aprendizado"], description: "Explica conceitos através de perguntas orientadoras.", content: "Você é um Tutor Acadêmico que usa o Método Socrático.\n\nGuie o estudante com perguntas:\n1. Valide o interesse.\n2. Analogia + pergunta conceitual.\n3. Aponte inconsistências com perguntas.\n4. Relacione com experiências práticas." },
    { id: "p14", title: "Criador de Flashcards & Mapas Mentais", category: "education", tags: ["flashcards", "memorizacao", "resumos"], description: "Gera flashcards e mapas mentais para fixação de matérias.", content: "Você é especialista em Spaced Repetition.\n\nGere materiais de revisão:\n1. 10 flashcards Pergunta/Resposta.\n2. Mapa mental com 4 ramificações.\n3. 3 dicas de memorização ativa." }
];

let chatPromptList = [];
let chatPromptSearchTimer = null;
let chatAISearching = false;

function initChatPrompts() {
    const customRaw = localStorage.getItem("prompts_custom");
    if (customRaw) {
        chatPromptList = [...CHAT_DEFAULT_PROMPTS, ...JSON.parse(customRaw)];
    } else {
        chatPromptList = [...CHAT_DEFAULT_PROMPTS];
    }
}

function renderChatPromptSearch(query) {
    const container = document.getElementById("chat-prompt-search-results");
    if (!container) return;

    if (!query || query.trim() === "") {
        container.innerHTML = `<div class="chat-prompt-search-empty">Digite para buscar prompts da biblioteca.</div>`;
        return;
    }

    const q = query.toLowerCase();
    const filtered = chatPromptList.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="chat-prompt-search-empty">Nenhum prompt encontrado. Tente "Buscar com IA".</div>`;
        return;
    }

    container.innerHTML = "";
    filtered.slice(0, 8).forEach(p => {
        const item = document.createElement("div");
        item.className = "chat-prompt-result-item";
        const isAI = p.isAIGenerated;
        item.innerHTML = `
            <div class="result-title">
                ${p.title}
                ${isAI ? '<span class="result-ai-badge">IA</span>' : ''}
            </div>
            <div class="result-category">${p.category}</div>
        `;
        item.addEventListener("click", () => {
            const input = document.getElementById("chat-input-message");
            if (input) {
                input.value = p.content;
                input.focus();
                input.dispatchEvent(new Event('input'));
                showToast("Prompt inserido no chat!");
            }
        });
        container.appendChild(item);
    });
}

async function handleChatAISearch() {
    if (chatAISearching) return;

    const input = document.getElementById("chat-prompt-search-input");
    const query = input ? input.value.trim() : "";
    if (!query) {
        showToast("Digite algo na busca primeiro.", "error");
        return;
    }

    const btn = document.getElementById("chat-prompt-ai-search");
    chatAISearching = true;
    btn.classList.add("loading");

    try {
        const results = await window.searchWithAI(query);
        const mapped = results.map(r => ({ ...r }));
        chatPromptList = [...chatPromptList, ...mapped];
        renderChatPromptSearch(query);
        showToast(`${mapped.length} prompts encontrados com IA!`, "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        chatAISearching = false;
        btn.classList.remove("loading");
    }
}

// ==========================================================================
// 8. EVENTOS DE INTERFACE E INICIALIZAÇÃO DO APP
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Carregar dados e configurações
    loadSettings();
    loadConversations();
    initChatPrompts();
    
    // Preencher formulário de configurações com valores salvos
    document.getElementById("settings-provider").value = apiSettings.provider;
    document.getElementById("settings-key").value = apiSettings.key;
    document.getElementById("settings-ai-name").value = apiSettings.aiName;
    document.getElementById("settings-model").value = apiSettings.model;
    document.getElementById("settings-custom-url").value = apiSettings.customUrl || "";
    document.getElementById("settings-system-prompt").value = apiSettings.systemPrompt || "";
    
    // Toggle campo URL Customizada se for o provider custom
    const toggleCustomUrl = () => {
        const provider = document.getElementById("settings-provider").value;
        const customGroup = document.getElementById("custom-url-group");
        if (provider === 'custom') {
            customGroup.classList.remove("hidden");
        } else {
            customGroup.classList.add("hidden");
        }
    };
    
    document.getElementById("settings-provider").addEventListener("change", toggleCustomUrl);
    toggleCustomUrl();
    
    // Renderizar lista lateral de conversas
    renderConversationsList();
    
    // Atualizar status da API no header
    updateAPIStatus();
    
    // Evento Nova Conversa
    document.getElementById("btn-new-chat").addEventListener("click", () => {
        createNewConversation();
    });
    
    // Evento Abre Painel Configurações
    document.getElementById("btn-open-settings").addEventListener("click", () => {
        document.getElementById("settings-sidebar-overlay").classList.remove("hidden");
    });
    
    // Evento Fecha Painel Configurações
    const closeSettings = () => {
        document.getElementById("settings-sidebar-overlay").classList.add("hidden");
    };
    document.getElementById("btn-close-settings").addEventListener("click", closeSettings);
    document.getElementById("settings-sidebar-overlay").addEventListener("click", (e) => {
        if (e.target === document.getElementById("settings-sidebar-overlay")) {
            closeSettings();
        }
    });
    
    // Envio do formulário de Configurações
    document.getElementById("api-settings-form").addEventListener("submit", (e) => {
        e.preventDefault();
        
        const keyVal = document.getElementById("settings-key").value.trim();
        if (keyVal && !isValidAPIKey(keyVal)) {
            showToast("A chave inserida parece inválida. Deve ter ao menos 10 caracteres e não pode ser uma URL.", "error");
            return;
        }
        
        apiSettings.provider = document.getElementById("settings-provider").value;
        apiSettings.key = keyVal;
        apiSettings.aiName = document.getElementById("settings-ai-name").value.trim();
        apiSettings.model = document.getElementById("settings-model").value.trim();
        apiSettings.customUrl = document.getElementById("settings-custom-url").value.trim();
        apiSettings.systemPrompt = document.getElementById("settings-system-prompt").value.trim();
        
        localStorage.setItem('workspace_api_settings', JSON.stringify(apiSettings));
        closeSettings();
        
        updateAPIStatus();
        
        showToast("Configurações salvas com sucesso!");
    });
    
    // Testar Conexão da API
    document.getElementById("btn-test-settings").addEventListener("click", async () => {
        const testBtn = document.getElementById("btn-test-settings");
        const originalText = testBtn.innerText;
        
        const testProvider = document.getElementById("settings-provider").value;
        const testKey = document.getElementById("settings-key").value.trim();
        const testModel = document.getElementById("settings-model").value.trim();
        const testSystemPrompt = document.getElementById("settings-system-prompt").value.trim();
        
        if (!testKey) {
            showToast("Insira a chave de API para testar!", "error");
            return;
        }
        
        testBtn.innerText = "Testando...";
        testBtn.disabled = true;
        
        const backupSettings = { ...apiSettings };
        apiSettings.provider = testProvider;
        apiSettings.key = testKey;
        apiSettings.model = testModel;
        apiSettings.systemPrompt = testSystemPrompt;
        if (testProvider === 'custom') {
            apiSettings.customUrl = document.getElementById("settings-custom-url").value.trim();
        }
        
        try {
            const reply = await callAI([{ role: 'user', content: 'responda apenas com a palavra OK' }]);
            if (reply.toLowerCase().includes('ok') || reply.length > 0) {
                showToast("Conexão bem sucedida com a API!", "success");
            } else {
                showToast("A API respondeu mas a resposta foi incomum.", "error");
            }
        } catch (err) {
            showToast("Falha na conexão: " + err.message, "error");
        } finally {
            apiSettings = backupSettings;
            testBtn.innerText = originalText;
            testBtn.disabled = false;
        }
    });
    
    // Envio do Form de Mensagem
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input-message");
    
    if (chatForm && chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                chatForm.requestSubmit();
            }
        });
        
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text === "" || isGenerating) return;
            
            chatInput.value = "";
            handleSendMessage(text);
        });
    }
    
    // Sugestões da tela de boas vindas
    const suggestionCards = document.querySelectorAll(".suggestion-card");
    suggestionCards.forEach(card => {
        card.addEventListener("click", () => {
            const promptText = card.getAttribute("data-prompt");
            handleSendMessage(promptText);
        });
    });
    
    // Prompt Library Search Events
    const searchToggle = document.getElementById("chat-prompt-search-toggle");
    const searchBody = document.getElementById("chat-prompt-search-body");
    if (searchToggle && searchBody) {
        searchToggle.addEventListener("click", () => {
            searchBody.classList.toggle("collapsed");
            searchToggle.classList.toggle("collapsed");
        });
    }
    
    const searchInput = document.getElementById("chat-prompt-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(chatPromptSearchTimer);
            chatPromptSearchTimer = setTimeout(() => {
                renderChatPromptSearch(e.target.value);
            }, 200);
        });
    }
    
    const aiSearchBtn = document.getElementById("chat-prompt-ai-search");
    if (aiSearchBtn && window.searchWithAI) {
        aiSearchBtn.addEventListener("click", handleChatAISearch);
    } else if (aiSearchBtn) {
        aiSearchBtn.title = "API não configurada";
        aiSearchBtn.style.opacity = "0.4";
    }
});
