<p align="center">
  <h1 align="center">Chen's Blog</h1>
  <p align="center">记录技术思考，分享生活碎片。不追逐热点，只写自己的节奏。</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono&logoColor=white" alt="Hono">
  <img src="https://img.shields.io/badge/Neon-Postgres-00E599?logo=neon&logoColor=white" alt="Neon">
  <img src="https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white" alt="Vercel">
</p>

<p align="center">
  <a href="./DEPLOY.md"><strong>📦 完整部署指南 → DEPLOY.md</strong></a>
</p>

---

## 📑 目录

- [✨ 功能](#功能)
- [🛠 技术栈](#技术栈)
- [🚀 部署到 Vercel](#部署到-vercel)
- [💻 本地开发](#本地开发)
- [⚡ 性能](#性能)
- [📁 项目结构](#项目结构)
- [📄 License](#license)

---

## ✨ 功能

- 📝 **博客文章** — Markdown 写作，KaTeX 数学公式，代码高亮，置顶（书签丝带）
- 📸 **动态 Moments** — 类似朋友圈的短内容分享，支持一次上传多张图片 + 灯箱浏览
- 🙈 **隐藏动态** — 单条动态可隐藏，前台需输入访问密码才能查看；密码可在后台自定义
- ✅ **批量操作** — 文章/动态列表可多选，一次置顶、隐藏或删除
- 🎨 **暗色/亮色主题** — 一键切换，自动记忆
- 🔧 **后台管理** — 文章 & 动态的 CRUD，Markdown 编辑器，批量图片上传
- 📱 **响应式设计** — 桌面端侧边栏 + 移动端适配
- ⚡ **Vercel 部署** — 一键部署，全球 CDN 加速

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vue Router, GSAP, Toast UI Editor |
| 构建 | Vite 6 |
| 后端 API | Hono (运行于 Vercel Serverless) |
| 数据库 | Neon Postgres（生产）/ JSON 文件（本地） |
| 图片存储 | Vercel Blob（生产）/ 本地文件系统（本地） |
| 部署 | Vercel |

## 🚀 部署到 Vercel

> 📦 **完整步骤（建表 SQL、Neon/Blob 创建、环境变量、上线与验证命令）请看 [DEPLOY.md](./DEPLOY.md)。** 下文只给速览。

**前置条件：** 你需要一个 [GitHub](https://github.com) 账号和 [Vercel](https://vercel.com) 账号。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LiChen0459/chenBlog&env=ADMIN_TOKEN,CHENWEBSITE_URL,VITE_BLOG_URL)

点击按钮后按提示操作，只需在 Vercel 后台填这几个环境变量（详细说明见 [DEPLOY.md](./DEPLOY.md)）：

| 变量 | 说明 | 必填 |
|---|---|---|
| `ADMIN_TOKEN` | 后台管理密码，自己生成一个随机字符串 | ✅ |
| `VITE_BLOG_URL` | 你的博客完整 URL（如 `https://blog.example.com`） | ✅ |
| `CHENWEBSITE_URL` | 你的主站地址（用于跨站链接） | ❌ |

> **数据库 & 存储：** 在 Vercel Dashboard 创建 **Neon Postgres** 与 **Vercel Blob**，会自动注入 `DATABASE_URL` 和 `BLOB_READ_WRITE_TOKEN`，无需手填。

> **已有数据库？** 不用重建表，跑 `npm run db:migrate` 即可增量补齐 `tags` / `pinned` / `images` / `hidden` 列、创建 `settings` 表与查询索引（SQL 详见 [DEPLOY.md](./DEPLOY.md)）。

> 🔒 **隐藏动态**：后台「动态管理」里可把任意一条动态设为隐藏（或编辑时勾选「隐藏这条动态」）。
> 隐藏后前台不再展示，只在 `/moments` 顶部显示「有 N 条隐藏动态 · 输入密码查看」。
> 访问密码可在后台「设置」里自定义；不设置时默认使用 `ADMIN_TOKEN`。

部署完成后访问 Vercel 提供的域名即可。

> 💡 **不想配数据库？** 也可以直接部署纯静态前端，博客数据写在 `src/data/posts.js`，只是没有后台管理功能（详见 [DEPLOY.md](./DEPLOY.md) 的「兜底」一节）。

## 💻 本地开发

```bash
# 安装依赖
npm install

# 推荐：一条命令同时启动前端 + 后端
npm run dev:all
#   前端 http://localhost:5173
#   后端 http://localhost:3001
```

> ⚠️ **`npm run dev` 只启动前端**。此时 `/api` 请求会被代理到 `localhost:3001` 而无人应答，
> 页面会回落到内置示例数据、后台无法登录。请改用 `npm run dev:all`，或另开一个终端跑 `npm run dev:server`。

单独启动：

```bash
npm run dev              # 只启动前端 (5173)
npm run dev:server       # 只启动后端 API (3001)
npm run dev:server:local # 后端 + 强制使用本地 JSON 存储（不连数据库）
npm run dev:all:local    # 前后端 + 本地 JSON 存储
```

### 环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

```env
ADMIN_TOKEN=your-secret-token-here
CHENWEBSITE_URL=https://your-website.vercel.app
VITE_BLOG_URL=https://your-blog.vercel.app
```

### 数据存在哪？

后端启动时会打印当前存储位置：

- **`.env` 里没有 `DATABASE_URL`** → 用本地 JSON（`server/data/*.json`）+ `public/uploads/`，无需任何外部服务。
- **`.env` 里有 `DATABASE_URL`** → 直接读写 Neon 线上库（Vercel Blob 存图），**改动会直接影响线上数据**。

想在配了 `DATABASE_URL` 的情况下改用本地 JSON，加 `--local` 即可（跨平台，无需改环境变量）：

```bash
npm run dev:server:local
```

### 测试

```bash
npm test
```

四组回归测试，共 108 项断言，全部跑在本地 JSON 存储上（会强制 `USE_LOCAL_DATA=1`，不会碰线上库），
每个用例结束都会把 `server/data/*.json` 还原：

| 文件 | 覆盖内容 |
| --- | --- |
| `server/tests/payload.test.mjs` | 列表接口的精简投影、`LIMIT`/`OFFSET` 分页、`?page=` 别名、limit 上限、`/api/backup` 仍带正文 |
| `server/tests/settings-unlock.test.mjs` | 设置读写、自定义密码（scrypt 存储）、解锁令牌的签发与篡改拒绝、令牌权限边界 |
| `server/tests/vercel-entry.test.mjs` | `api/index.js`（生产真正跑的入口）的分页、隐藏动态、解锁令牌、CORS 头 |
| `server/tests/bulk.test.mjs` | 批量隐藏/显示/删除/置顶的权限、参数校验、未知 id 容错、去重，Hono 与 Vercel 两个入口都测 |

> 用例之间会互相写 `server/data/settings.json`，所以 `npm test` 用 `&&` **串行**执行，不要改成并行。

> 🚀 准备上线到 Vercel？环境变量与完整部署流程看 **[DEPLOY.md](./DEPLOY.md)**。

## ⚡ 性能

早期版本有两个会随内容量线性恶化的点，现已修掉：

**1. 列表接口不再返回正文。** 以前 `GET /api/posts` 是 `SELECT *`，博客列表和后台表格
都会把每篇文章的完整 Markdown 正文一起拉下来——后台表格根本用不到正文。
现在列表走精简投影（`id, title, date, summary, tags, pinned`），正文只在
`GET /api/posts/:id` 单独取。

实测（60 篇文章，每篇正文约 21.7 KB）：

| | 修复前 | 修复后 | 降幅 |
| --- | --- | --- | --- |
| 全量列表 | 1364.8 KB | 11.4 KB | **119.4×** |
| 首屏（9 篇） | 204.7 KB | 1.7 KB | **119.0×** |

**2. 分页下推到数据库。** 以前是"全查出来再在 JS 里 `slice`"，文章越多、
每次请求传输和内存占用越大。现在用真正的 SQL `LIMIT`/`OFFSET`，并给排序键建了索引：

```sql
CREATE INDEX posts_list_idx   ON posts   (pinned DESC, date DESC);
CREATE INDEX moments_list_idx ON moments (date DESC, time DESC);
```

文章列表每页 9 篇，滚动到底再拉下一页，因此首屏成本与文章总数无关。

**3. 编辑器不再阻塞后台首屏。** Toast UI 编辑器约 573 KB JS + 183 KB CSS。
它原本在 `Admin.vue` 顶层静态引入，意味着只要打开 `/desk` 就会下载整套编辑器，
哪怕你只是想看一眼文章列表。现在改为打开编辑弹窗时才动态加载，
`/desk` 首屏少下载约 738 KB（gzip 约 286 KB）。

> 其余体积来自 KaTeX / marked（文章详情页）与编辑器本身，都是按路由懒加载的，
> 首页只加载入口 chunk（约 123 KB，gzip 48.8 KB）。


## 📁 项目结构

```
chen-blog/
├── src/                  # Vue 前端
│   ├── views/            # 页面组件
│   │   ├── Home.vue      # 首页
│   │   ├── Blog.vue      # 文章列表
│   │   ├── BlogDetail.vue# 文章详情
│   │   ├── Moments.vue   # 动态
│   │   ├── Admin.vue     # 后台管理
│   │   └── admin/Write.vue # 文章编辑器
│   ├── api/              # 前端 API 调用
│   ├── router/           # 路由配置
│   └── App.vue           # 根组件
├── server/               # Hono API 服务
│   ├── routes/           # 路由 (posts, moments, settings, upload)
│   ├── repositories/     # 数据层 (file / vercel)
│   ├── middleware/       # 认证中间件
│   └── tests/            # 回归测试 (npm test)
├── api/index.js          # Vercel Serverless 入口
├── public/               # 静态资源
├── DEPLOY.md             # 📦 部署到 Vercel 的完整指南
├── README.md             # 本文件
├── vercel.json           # Vercel 配置
└── vite.config.js        # Vite 配置
```

## 📄 License

MIT © Chen

---

> 📦 部署、建表 SQL、环境变量、上线与验证等问题，先看 **[DEPLOY.md](./DEPLOY.md)**。
