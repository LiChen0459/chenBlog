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

---

## ✨ 功能

- 📝 **博客文章** — Markdown 写作，KaTeX 数学公式，代码高亮
- 📸 **动态 Moments** — 类似朋友圈的短内容分享
- 🎨 **暗色/亮色主题** — 一键切换，自动记忆
- 🔧 **后台管理** — 文章 & 动态的 CRUD，Markdown 编辑器
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

## 🚀 一键部署到 Vercel

> **前置条件：** 你需要一个 [GitHub](https://github.com) 账号和 [Vercel](https://vercel.com) 账号。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/chen-blog&env=ADMIN_TOKEN,CHENWEBSITE_URL)

点击按钮后按提示操作：

1. **创建 Git 仓库** — Vercel 会自动 fork 到你的 GitHub
2. **配置环境变量：**

| 变量 | 说明 | 必填 |
|---|---|---|
| `ADMIN_TOKEN` | 后台管理密码，自己生成一个随机字符串 | ✅ |
| `CHENWEBSITE_URL` | 你的主站地址（用于跨站链接） | ✅ |

3. **添加数据库和存储**（在 Vercel Dashboard）：
   - **Neon Postgres** → 自动注入 `DATABASE_URL`
   - **Vercel Blob** → 自动注入 `BLOB_READ_WRITE_TOKEN`
4. **运行建表 SQL**（在 Neon 控制台）：

```sql
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  summary    TEXT DEFAULT '',
  content    TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moments (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  time       TEXT NOT NULL,
  content    TEXT NOT NULL,
  image      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

部署完成后访问 Vercel 提供的域名即可。

> 💡 **不想配数据库？** 也可以直接部署纯静态前端，博客数据写在 `src/data/posts.js`，只是没有后台管理功能。

## 💻 本地开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器 (localhost:5173)
npm run dev

# 启动后端 API (localhost:3001)
npm run dev:server

# 同时启动前后端
npm run dev:all
```

### 环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

```env
ADMIN_TOKEN=your-secret-token-here
CHENWEBSITE_URL=https://chenwebsite.vercel.app
```

本地开发默认使用 JSON 文件存储数据，无需配置数据库。

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
│   ├── routes/           # 路由 (posts, moments, upload)
│   ├── repositories/     # 数据层 (file / vercel)
│   └── middleware/       # 认证中间件
├── api/index.js          # Vercel Serverless 入口
├── public/               # 静态资源
├── vercel.json           # Vercel 配置
└── vite.config.js        # Vite 配置
```

## 📄 License

MIT © Chen
