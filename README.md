# Aura AI 角色扮演

Aura 是一个中文 AI 角色扮演应用。React 前端负责角色、会话和人设交互，Express 负责代理用户配置的 OpenAI-compatible 模型服务，FastAPI 提供 PostgreSQL 和 Redis 基础设施接口，Nginx 作为统一入口。

## 服务结构

- `http://localhost:3000/`：React 应用
- `http://localhost:3000/api/*`：Express 模型服务代理
- `http://localhost:3000/backend/*`：FastAPI
- `http://localhost:8000/`：FastAPI 本地调试入口
- `localhost:5432`：PostgreSQL 本地调试端口

端口可通过根目录 `.env` 中的 `WEB_PORT`、`API_PORT` 和 `POSTGRES_PORT` 调整。

## 使用 Docker 启动

1. 从示例创建配置：

   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env`，设置 PostgreSQL 凭据。模型密钥不写入 `.env`，而是在应用的“模型服务”页面中配置。

3. 构建并启动：

   ```bash
   docker compose up --build -d
   ```

4. 查看状态：

   ```bash
   docker compose ps
   curl http://localhost:3000/api/status
   curl http://localhost:3000/backend/health/db
   curl http://localhost:3000/backend/health/redis
   ```

5. 停止服务：

   ```bash
   docker compose down
   ```

PostgreSQL 数据保存在 `docker/postgresql/data/`，Redis 数据保存在 Docker 命名卷中。

AI 角色、用户资料、对话线程和消息由 FastAPI 持久化到 PostgreSQL。首次升级到数据库版本时，前端会自动将当前浏览器中的本地数据导入数据库；之后数据库作为主数据源，localStorage 仅作为后端暂时不可用时的本地缓存。数据库迁移由 Alembic 管理，并在后端容器启动前自动执行。

## 启用访问密码

本地开发默认不要求登录。公开部署时，在 `.env` 中设置 `AUTH_ENABLED=true`，填写 `APP_ADMIN_PASSWORD`，并用 `openssl rand -hex 32` 生成 `APP_SECRET_KEY`。HTTPS 部署同时设置 `AUTH_COOKIE_SECURE=true`。启用后，角色、资料和对话状态 API 只接受已登录浏览器通过 HttpOnly Cookie 访问。

## 单独开发前端

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

开发模式默认监听 `http://localhost:3000`。

## 配置模型服务

进入应用的“模型服务”页面，添加支持 OpenAI-compatible API 的服务，填写 Base URL 和可选 API Key，然后获取模型列表并选择当前模型。聊天与润色都会使用这个当前模型。

模型平台配置保存在 PostgreSQL，API Key 使用 Fernet 对称加密后落库。浏览器只保存运行时配置缓存，不会读取解密后的密钥；Express 代理通过内部服务令牌从 FastAPI 临时解析凭据。升级后，前端会在首次成功迁移模型平台配置后清除浏览器中遗留的 `aura_api_key_*`、平台列表和当前平台键。

生产部署应分别设置随机的 `MODEL_CREDENTIAL_KEY` 和 `INTERNAL_SERVICE_TOKEN`。未设置 `MODEL_CREDENTIAL_KEY` 时会依次使用 `APP_SECRET_KEY`、PostgreSQL 密码派生加密密钥，以保持本地开发可运行；生产环境不建议依赖此回退行为。更换 `MODEL_CREDENTIAL_KEY` 前必须先重新保存已有模型密钥，否则旧密文将无法解密。

本地开发默认允许访问局域网或 `host.docker.internal` 上的模型服务。公开部署时，建议在 `.env` 中设置 `ALLOW_PRIVATE_MODEL_HOSTS=false`，阻止模型代理访问私有网络；`API_RATE_LIMIT_PER_MINUTE` 控制每个客户端每分钟的 API 请求上限。云元数据等受保护地址始终会被拒绝。

## 静态检查与构建

```bash
cd frontend
npm run lint
npm run build
```

后端导入检查：

```bash
cd backend
.venv/bin/python -c "from app.main import app; print(app.title)"
```

后端单元测试与迁移检查：

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/alembic upgrade head --sql
```

GitHub Actions 会自动执行前端类型检查、代理安全测试、生产构建、后端状态 API 测试、Alembic SQL 生成和 Docker 镜像构建。
