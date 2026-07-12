import express from 'express';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '2mb' }));

interface ModelServiceInput {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function normalizeBaseUrl(value?: string): string {
  if (!value?.trim()) {
    throw new Error('请先在“模型服务”中配置 API Base URL。');
  }

  const normalized = value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|models)$/i, '');
  const url = new URL(normalized);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('模型服务地址只支持 HTTP 或 HTTPS。');
  }
  return url.toString().replace(/\/$/, '');
}

function selectApiKey(value?: string): string {
  const keys = (value || '').split(',').map(key => key.trim()).filter(Boolean);
  return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : '';
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const selectedKey = selectApiKey(apiKey);
  if (selectedKey) headers.Authorization = `Bearer ${selectedKey}`;
  return headers;
}

async function parseUpstreamResponse(response: Response): Promise<any> {
  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.message || raw || `HTTP ${response.status}`;
    throw new Error(`模型服务请求失败：${detail}`);
  }
  return data;
}

async function requestWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function createChatCompletion(
  modelService: ModelServiceInput,
  messages: ChatMessageInput[],
  config: { temperature?: number; topP?: number; maxOutputTokens?: number },
): Promise<string> {
  const baseUrl = normalizeBaseUrl(modelService?.baseUrl);
  if (!modelService?.model?.trim()) {
    throw new Error('请先在“模型服务”中选择一个可用模型。');
  }

  const response = await requestWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: buildHeaders(modelService.apiKey),
      body: JSON.stringify({
        model: modelService.model.trim(),
        messages,
        temperature: typeof config.temperature === 'number' ? config.temperature : 0.7,
        top_p: typeof config.topP === 'number' ? config.topP : 0.95,
        max_tokens: typeof config.maxOutputTokens === 'number' ? config.maxOutputTokens : 2048,
        stream: false,
      }),
    },
    120_000,
  );
  const data = await parseUpstreamResponse(response);
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(item => typeof item === 'string' ? item : item?.text || '').join('');
  }
  throw new Error('模型服务返回了无法识别的对话格式。');
}

app.post('/api/model-services/models', async (req, res) => {
  try {
    const modelService = req.body as ModelServiceInput;
    const baseUrl = normalizeBaseUrl(modelService?.baseUrl);
    const response = await requestWithTimeout(
      `${baseUrl}/models`,
      { method: 'GET', headers: buildHeaders(modelService.apiKey) },
      20_000,
    );
    const data = await parseUpstreamResponse(response);
    const models = Array.isArray(data?.data)
      ? data.data.map((item: any) => item?.id).filter((id: unknown): id is string => typeof id === 'string')
      : [];
    return res.json({ models: [...new Set(models)].sort() });
  } catch (err: any) {
    console.error('Model service connection error:', err);
    return res.status(502).json({ error: err.message || '无法连接模型服务。' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, temperature, topP, maxOutputTokens, modelService } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    const normalizedMessages: ChatMessageInput[] = messages
      .filter((message: any) => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
      .map((message: any) => ({ role: message.role, content: message.content }));
    if (systemInstruction) {
      normalizedMessages.unshift({ role: 'system', content: String(systemInstruction) });
    }

    const reply = await createChatCompletion(
      modelService,
      normalizedMessages,
      { temperature, topP, maxOutputTokens },
    );
    return res.json({ reply });
  } catch (err: any) {
    console.error('Chat completion error:', err);
    return res.status(502).json({ error: err.message || '调用模型服务时发生错误。' });
  }
});

app.post('/api/polish', async (req, res) => {
  try {
    const { text, userProfileName, characterName, modelService } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const prompt = `用户写下了一段简单的对话或动作："${String(text).trim()}"。
请将它改写为从用户视角（角色名为“${userProfileName || '旅人'}”）出发、沉浸且优美的角色扮演段落。
要求：
1. 用单星号包裹动作、神态、心理或场景描写。
2. 台词不要放在星号内。
3. 内容要生动，并自然回应正在互动的“${characterName || '对方'}”。
4. 只描写用户这一回合，不要代替对方作答。
5. 只输出润色后的正文，不要输出解释。`;

    const polished = await createChatCompletion(
      modelService,
      [
        { role: 'system', content: '你是一名擅长中文沉浸式角色扮演文风的编辑。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, topP: 0.95, maxOutputTokens: 2048 },
    );
    return res.json({ polished: polished.trim() });
  } catch (err: any) {
    console.error('Polish completion error:', err);
    return res.status(502).json({ error: err.message || '调用模型服务润色失败。' });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    modelServiceMode: 'browser-configured',
    timestamp: new Date().toISOString(),
  });
});

async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

setupFrontend().catch((err) => {
  console.error('Failed to start frontend middleware:', err);
});
