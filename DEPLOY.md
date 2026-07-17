# ChenBlog 部署到 Vercel

## 你需要在 Vercel Dashboard 配置的东西

### 1. 数据库 — Neon Postgres

Vercel Dashboard → **Storage** → **Create Database** → 选 **Neon**

建完之后到 Neon 控制台跑建表 SQL：

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

### 2. 图片存储 — Vercel Blob

Vercel Dashboard → **Storage** → **Create Database** → 选 **Blob**

### 3. 环境变量

Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables**

| Key | Value | 哪里来 |
|---|---|---|
| `ADMIN_TOKEN` | 自己生成一个长随机串 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CHENWEBSITE_URL` | `https://你的ChenWebsite地址.vercel.app` | 你自己 |
| `DATABASE_URL` | (自动注入) | 创建完 Neon 就有了 |
| `BLOB_READ_WRITE_TOKEN` | (自动注入) | 创建完 Blob 就有了 |

> 全部勾选 **Production** 环境

### 4. 部署

```bash
npm i -g vercel         # 装 CLI
vercel login            # 浏览器授权
vercel                  # 首次部署（预览）
vercel --prod           # 上线
```

---

## 部署后验证

```bash
# 替换成你的域名和 TOKEN
URL=https://你的项目.vercel.app
TOKEN=你的ADMIN_TOKEN

# 健康检查
curl $URL/api/health

# 创建一篇文章
curl -X POST $URL/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello Vercel","summary":"已上线","content":"<p>博客后端跑在 Vercel 上了。</p>"}'

# 访问博客
open $URL
```

---

## 可选的：换用其他 Postgres 提供商

不需要 Neon 也可以——换个 `DATABASE_URL` 就行，代码不关心来源。

| 提供商 | 免费额度 | 国内访问 |
|---|---|---|
| Neon | 0.5 GB | 一般 |
| Supabase | 500 MB | 一般 |
| Railway | $5 额度/月 | 好一些 |
| Aiven | 1 GB | 好一些 |

---

## 兜底：如果不想配数据库

最简方式——所有数据还是写死在 `src/data/posts.js`，Vercel 只托管前端静态文件，什么 Neon、Blob 都不需要：

```bash
# 只部署前端
vercel --prod
```

博客正常访问，只是没有后台 CRUD，更新内容需要改代码重新部署。
