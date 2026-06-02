/**
 * api-shared.js — Módulo de API compartilhado para busca inteligente com IA
 * Utilizado pela Biblioteca e pelo Dashboard para buscar prompts via API configurada.
 */

const AI_SEARCH_SYSTEM_PROMPT = `Você é um especialista em engenharia de prompts. Sua função é gerar prompts profissionais baseados na solicitação do usuário. Responda APENAS com um array JSON válido, sem formatação markdown, sem explicações extras.`;

function buildSearchUserPrompt(query) {
    return `O usuário está procurando prompts sobre: "${query}".

Com base nessa consulta, gere 4 prompts profissionais e prontos para uso relacionados ao tema.
Para cada prompt, forneça as seguintes informações em português brasileiro:
- titulo: um título descritivo e atrativo
- categoria: uma das categorias: dev, marketing, writing, prod, design, business, education
- tags: array de 2-4 tags relevantes em minúsculo
- descricao: descrição curta do que o prompt faz
- conteudo: o prompt completo e pronto para uso (mínimo 3 parágrafos)

Responda APENAS com um array JSON válido seguindo este formato:
[
  {
    "titulo": "Título do Prompt",
    "categoria": "dev",
    "tags": ["tag1", "tag2"],
    "descricao": "Descrição curta",
    "conteudo": "Conteúdo completo do prompt..."
  }
]`;
}

function isValidAPIKey(key) {
    if (!key || key.trim() === '') return false;
    if (key.startsWith('http')) return false;
    if (key.length < 10) return false;
    return true;
}

async function searchWithAI(query) {
    const settingsRaw = localStorage.getItem('workspace_api_settings');
    if (!settingsRaw) {
        throw new Error('API não configurada. Vá até o Chat, configure sua chave de API e tente novamente.');
    }

    const settings = JSON.parse(settingsRaw);
    if (!settings.key || !isValidAPIKey(settings.key)) {
        throw new Error('Chave de API inválida ou não configurada. Vá até o Chat (engrenagem ⚙️) e insira uma chave válida (ex: AIzaSy... para Gemini).');
    }

    const provider = settings.provider || 'gemini';
    const model = settings.model || 'gemini-1.5-flash';
    const userPrompt = buildSearchUserPrompt(query);

    let responseText;

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.key}`;
        const payload = {
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: AI_SEARCH_SYSTEM_PROMPT }] }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Erro Gemini: ${err.error?.message || res.statusText}`);
        }

        const data = await res.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (provider === 'openai' || provider === 'custom' || provider === 'openrouter') {
        const baseUrl = provider === 'custom' ? settings.customUrl : (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
        const url = `${baseUrl}/chat/completions`;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.key}`
        };
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = window.location.href;
            headers['X-Title'] = 'Biblioteca de Prompts';
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: AI_SEARCH_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Erro OpenAI: ${err.error?.message || res.statusText}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content;
    } else if (provider === 'anthropic') {
        const url = 'https://api.anthropic.com/v1/messages';

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': settings.key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                system: AI_SEARCH_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 2048
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Erro Anthropic: ${err.error?.message || res.statusText}`);
        }

        const data = await res.json();
        responseText = data.content?.[0]?.text;
    } else {
        throw new Error('Provedor de API inválido.');
    }

    if (!responseText) throw new Error('A API retornou uma resposta vazia.');

    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const results = JSON.parse(cleaned);

    if (!Array.isArray(results)) throw new Error('Formato de resposta inválido da API.');

    return results.map((item, index) => ({
        id: 'ai-' + Date.now() + '-' + index,
        title: item.titulo || item.title || 'Prompt sem título',
        category: item.categoria || item.category || 'dev',
        tags: item.tags || [],
        description: item.descricao || item.description || '',
        content: item.conteudo || item.content || '',
        isAIGenerated: true
    }));
}

window.searchWithAI = searchWithAI;
