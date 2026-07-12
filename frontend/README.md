# Aura 前端与模型代理

## 本地开发

```bash
npm ci
npm run dev
```

默认入口为 `http://localhost:3000`，可通过环境变量 `PORT` 修改。

## 配置模型服务

应用不依赖全局 AI 密钥。打开“模型服务”页面后：

1. 添加支持 OpenAI-compatible API 的模型服务。
2. 填写 API Base URL，例如 `https://api.openai.com/v1`。
3. 按需填写 API Key；本地免鉴权服务可以留空。
4. 点击“检测”或“获取模型列表”。
5. 选择一个模型作为当前对话模型。

聊天和润色请求会使用浏览器中当前选中的模型服务，通过同源 Express 代理调用其 `/chat/completions` 接口。

## 检查

```bash
npm run lint
npm run build
```
