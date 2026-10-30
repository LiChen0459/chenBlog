<h1 align="center">Chen's Blog</h1>

<p align="center">一个用来写文章、记日常，也方便自己维护的个人博客。</p>

这是我平时整理技术笔记和生活记录的地方。前台用 Vue 展示文章、动态和归档，后台负责编辑内容、管理图片；开发时可以用本地文件存储，部署后可以接 Neon 和 Vercel Blob。

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono&logoColor=white" alt="Hono">
  <img src="https://img.shields.io/badge/Neon-Postgres-00E599?logo=neon&logoColor=white" alt="Neon">
  <img src="https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white" alt="Vercel">
</p>

<p align="center">
  <a href="./DEPLOY.md"><strong>部署说明 → DEPLOY.md</strong></a>
</p>

---

## 目录

- [功能](#功能)
- [技术栈](#技术栈)
- [部署到 Vercel](#部署到-vercel)
- [本地开发](#本地开发)
- [性能](#性能)
- [项目结构](#项目结构)
- [License](#license)

---

## 功能

- **文章** — Markdown、数学公式、代码高亮与复制；支持置顶和精选。
- **动态** — 发布短内容和多张图片，支持灯箱浏览。
- **隐藏动态** — 可在后台设置为隐藏，通过访问密码查看。
- **批量操作** — 批量置顶、精选、隐藏或删除文章和动态。
- **分类和标签** — 分类支持层级路径（如 `技术/前端`），标签用于补充关键词；归档页提供分类树和标签列表。
- **媒体库** — 浏览和筛选图片，查看图片引用位置，并管理分组、标签和删除。
- **图片选择** — 写文章时插入图片，编辑动态时从媒体库添加图片。
- **归档** — 按年份浏览文章，并查看分类和标签。
- **搜索** — 搜索文章标题、摘要和正文。
- **独立页面** — 管理关于、友情链接等固定页面。
- **分享** — 复制文章链接、分享到微博，或用微信扫码。
- **订阅** — 提供 RSS、Atom 和 sitemap。
- **SEO** — 页面级标题和描述、canonical、社交分享信息及文章结构化数据。
- **登录验证** — 后台登录前需完成算术验证。
- **主题** — 支持暗色和亮色模式。
- **后台** — 管理文章、动态、页面和图片。
- **响应式布局** — 适配桌面和手机。
- **部署** — 可使用 Vercel Functions、Neon Postgres 和 Blob。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vue Router, GSAP, Toast UI Editor |
| 构建 | Vite 6 |
| 后端 API | Hono (运行于 Vercel Serverless) |
| 数据库 | Neon Postgres（生产）/ JSON 文件（本地） |
| 图片存储 | Vercel Blob（生产）/ 本地文件系统（本地） |
| 部署 | Vercel |

## 部署到 Vercel

> 建表、环境变量和上线验证步骤见 [DEPLOY.md](./DEPLOY.md)。

**前置条件：** 你需要一个 [GitHub](https://github.com) 账号和 [Vercel](https://vercel.com) 账号。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LiChen0459/chenBlog&env=ADMIN_TOKEN,CHENWEBSITE_URL,VITE_BLOG_URL)

点击按钮后按提示操作，只需在 Vercel 后台填这几个环境变量（详细说明见 [DEPLOY.md](./DEPLOY.md)）：

| 变量 | 说明 | 必填 |
|---|---|---|
| `ADMIN_TOKEN` | 后台管理密码，自己生成一个随机字符串 | ✅ |
| `VITE_BLOG_URL` | 你的博客完整 URL（如 `https://blog.example.com`） | ✅ |
| `CHENWEBSITE_URL` | 你的主站地址（用于跨站链接） | ❌ |
| `SITE_URL` | 订阅源 / sitemap 里使用的绝对域名；不填则自动取请求域名 | ❌ |

> **数据库 & 存储：** 在 Vercel Dashboard 创建 **Neon Postgres** 与 **Vercel Blob**，会自动注入 `DATABASE_URL` 和 `BLOB_READ_WRITE_TOKEN`，无需手填。

> **已有数据库？** 不用重建表，跑 `npm run db:migrate` 即可增量补齐 `tags` / `pinned` / `featured` / `images` / `hidden` / `category` 列，创建 `pages` / `media_meta` 表与查询索引（SQL 详见 [DEPLOY.md](./DEPLOY.md)）。

> 🔒 **隐藏动态**：后台「动态管理」里可把任意一条动态设为隐藏（或编辑时勾选「隐藏这条动态」）。
> 隐藏后前台不再展示，只在 `/moments` 顶部显示「有 N 条隐藏动态 · 输入密码查看」。
> 访问密码可在后台「设置」里自定义；不设置时默认使用 `ADMIN_TOKEN`。

部署完成后访问 Vercel 提供的域名即可。

> 💡 **不想配数据库？** 也可以直接部署纯静态前端，博客数据写在 `src/data/posts.js`，只是没有后台管理功能（详见 [DEPLOY.md](./DEPLOY.md) 的「兜底」一节）。

## 本地开发

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
# 设了 DATABASE_URL 时上传图片和后台媒体库还需要它（图片走线上 Blob）；
# 纯本地 --local 开发不需要。Vercel 控制台 → 存储 → Blob → .env.local 可复制。
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxx
```

### 数据存在哪？

后端启动时会打印当前存储位置：

- **`.env` 里没有 `DATABASE_URL`** → 用本地 JSON（`server/data/*.json`）+ `public/uploads/`，无需任何外部服务。
- **`.env` 里有 `DATABASE_URL`** → 直接读写 Neon 线上库（Vercel Blob 存图），**改动会直接影响线上数据**。此模式下还需配 `BLOB_READ_WRITE_TOKEN`，否则后台上传图片和「媒体库」会提示未配置（媒体库里会显示修复办法，按提示补变量或改回本地存储即可）。

想在配了 `DATABASE_URL` 的情况下改用本地 JSON，加 `--local` 即可（跨平台，无需改环境变量）：

```bash
npm run dev:server:local
```

### 测试

```bash
npm test
```

八组回归测试，共 260 项断言，全部跑在本地 JSON 存储上（会强制 `USE_LOCAL_DATA=1`，不会碰线上库），
每个用例结束都会把 `server/data/*.json` 还原：

| 文件 | 覆盖内容 |
| --- | --- |
| `server/tests/payload.test.mjs` | 列表接口的精简投影、`LIMIT`/`OFFSET` 分页、`?page=` 别名、limit 上限、`/api/backup` 仍带正文 |
| `server/tests/features.test.mjs` | 分类/标签/年份筛选、全文搜索与排序、分类树、独立页面 CRUD（含地址规范化与占用检查）、RSS/Atom/sitemap 的绝对链接与 XML 转义；Hono 与 Vercel 两个入口都测 |
| `server/tests/settings-unlock.test.mjs` | 设置读写、自定义密码（scrypt 存储）、解锁令牌的签发与篡改拒绝、令牌权限边界 |
| `server/tests/vercel-entry.test.mjs` | `api/index.js`（生产真正跑的入口）的分页、隐藏动态、解锁令牌、CORS 头 |
| `server/tests/bulk.test.mjs` | 批量隐藏/显示/删除/置顶/精选的权限、参数校验、未知 id 容错、去重，`?featured=1` 筛选与精选开关，Hono 与 Vercel 两个入口都测 |
| `server/tests/auth-captcha.test.mjs` | 登录人机验证：挑战题签发、无/错/伪造验证码一律 401、答对+错密码 401、答对+对密码 200、答对后可复用、解锁令牌不能冒充验证码；Hono 与 Vercel 两个入口都测 |
| `server/tests/category-norm.test.mjs` | 分类路径规范化：`normCategory` 各种脏输入、分类树不注册幽灵节点、创建/更新写入时自动清洗、清洗后精确筛选能命中 |
| `server/tests/media.test.mjs` | 媒体库：未登录 401、列出图片与体积、使用位置索引（文章/动态/隐藏动态命中）、标签与分组增改读回、缺 url 400、路径穿越拒绝、删除后文件与列表同步消失、总量字段 |

> 用例之间会互相写 `server/data/settings.json`，所以 `npm test` 用 `&&` **串行**执行，不要改成并行。

> 🚀 准备上线到 Vercel？环境变量与完整部署流程看 **[DEPLOY.md](./DEPLOY.md)**。

## 公开 API

所有读接口都是公开的（无需 token），返回统一信封 `{ ok, data, ... }`。写接口需要
`Authorization: Bearer <ADMIN_TOKEN>`。

| 接口 | 说明 |
| --- | --- |
| `GET /api/posts` | 文章列表（`id`、标题、日期、摘要、分类、标签、置顶和精选状态，不含正文）。筛选参数可叠加：`?category=技术/前端`、`?tag=vue`、`?year=2026`、`?featured=1`、`?limit=N&offset=N`（或 `?page=N`） |
| `GET /api/posts/:id` | 单篇文章全文（含 `content`） |
| `GET /api/posts/featured` | **精选文章**，等价于 `/api/posts?featured=1` |
| `GET /api/posts/search?q=` | 全文搜索 |
| `GET /api/posts/taxonomy` | 分类树 + 标签云（含计数） |
| `GET /api/moments` | 动态列表；`?limit=N&offset=N` |
| `GET /api/media` | 媒体库（需 admin token）：分页列举图片 + 每张图的使用位置 |
| `GET /rss.xml` `/atom.xml` `/sitemap.xml` | 订阅源与站点地图 |

**精选文章的用法**：在后台「文章」列表点某行的「精选」星标（或勾选多篇后批量「设为精选」），
然后在任意页面直接拉取：

```bash
curl https://你的域名/api/posts/featured?limit=5
```

```jsonc
// 200
{
  "ok": true,
  "data": [
    { "id": 12, "title": "…", "date": "2026-10-01", "summary": "…",
      "category": "技术/前端", "tags": ["vue"], "pinned": false, "featured": true }
  ],
  "total": 1, "limit": 5, "offset": 0, "hasMore": false
}
```

列表项是精简投影，没有 `content`；需要全文再按 `id` 拉 `/api/posts/:id`。

## 性能

前台文章列表使用精简字段和分页：列表接口不返回正文，数据库按页读取；文章正文只在打开详情页时请求。这样首页和列表页不必下载所有文章内容。

**1. 列表接口不再返回正文。** 以前 `GET /api/posts` 是 `SELECT *`，博客列表和后台表格
都会把每篇文章的完整 Markdown 正文一起拉下来——后台表格根本用不到正文。
现在列表走精简投影（`id, title, date, summary, category, tags, pinned, featured`），正文只在
`GET /api/posts/:id` 单独取。

一次本地对比（60 篇文章，每篇正文约 21.7 KB）：

| | 修复前 | 修复后 | 降幅 |
| --- | --- | --- | --- |
| 全量列表 | 1364.8 KB | 11.4 KB | **119.4×** |
| 首屏（9 篇） | 204.7 KB | 1.7 KB | **119.0×** |

分页也由数据库完成。旧实现会先读出全部文章，再在 JS 里 `slice`；文章越多，
每次请求传输和内存占用越大。现在用真正的 SQL `LIMIT`/`OFFSET`，并给排序键建了索引：

```sql
CREATE INDEX posts_list_idx   ON posts   (pinned DESC, date DESC);
CREATE INDEX moments_list_idx ON moments (date DESC, time DESC);
```

文章列表每页 9 篇，滚动到底再拉下一页，因此首屏成本与文章总数无关。

**3. 编辑器按需加载。** Toast UI 编辑器约 573 KB JS + 183 KB CSS。
它原本在 `Admin.vue` 顶层静态引入，意味着只要打开 `/desk` 就会下载整套编辑器，
哪怕你只是想看一眼文章列表。现在改为打开编辑弹窗时才动态加载，
`/desk` 首屏少下载约 738 KB（gzip 约 286 KB）。

> 体积是依赖版本、构建配置和压缩方式共同决定的。当前本地构建首页需加载的入口、Vue 与路由脚本合计约 133 KB（gzip 约 53 KB）；KaTeX 和代码高亮在打开文章后再加载，编辑器只在进入写作页面时加载。不同部署环境的结果可能略有差异。


## 项目结构

```
chen-blog/
├── src/                  # Vue 前端
│   ├── views/            # 页面组件
│   │   ├── Home.vue      # 首页
│   │   ├── Blog.vue      # 文章列表
│   │   ├── BlogDetail.vue# 文章详情
│   │   ├── Moments.vue   # 动态
│   │   ├── Archive.vue   # 归档（分类树 + 标签云 + 时间线）
│   │   ├── Category.vue  # 分类视图
│   │   ├── Tag.vue       # 标签视图
│   │   ├── Search.vue    # 全文搜索
│   │   ├── PageView.vue  # 独立页面（/page/:slug）
│   │   ├── Admin.vue     # 后台管理
│   │   └── admin/Write.vue # 文章编辑器
│   ├── components/       # 组件（Icon / ShareBar / MomentGallery / Lightbox …）
│   ├── api/              # 前端 API 调用
│   ├── utils/            # 工具（markdown 渲染 / moment / seo）
│   ├── router/           # 路由配置
│   └── App.vue           # 根组件
├── server/               # Hono API 服务
│   ├── routes/           # 路由 (posts, moments, settings, upload, media, pages, feeds)
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

> 部署与数据库配置步骤见 **[DEPLOY.md](./DEPLOY.md)**。
