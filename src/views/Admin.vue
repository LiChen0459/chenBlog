<template>
  <div class="admin-root">
  <!-- ═══ LOGIN ═══ -->
  <div class="admin-login" v-if="!loggedIn">
    <div class="login-card">
      <div class="login-icon">🔐</div>
      <h1>Chen's Blog</h1>
      <p class="login-sub">管理后台</p>
      <div class="input-group">
        <input
          v-model="tokenInput"
          type="password"
          placeholder="管理密码"
          @keyup.enter="login"
          autofocus
        />
      </div>
      <!-- 验证码 -->
      <div class="captcha-row" v-if="captchaQuestion">
        <span class="captcha-label">{{ captchaQuestion }} =</span>
        <input v-model="captchaInput" type="number" placeholder="?" class="captcha-input" @keyup.enter="login" />
      </div>
      <button class="mui-btn raised primary" @click="login" style="width:100%;justify-content:center;margin-top:12px">
        <span>登 录</span>
      </button>
      <p v-if="errMsg" class="err-msg">{{ errMsg }}</p>
    </div>
  </div>

  <!-- ═══ DASHBOARD ═══ -->
  <div class="admin-shell" v-else>
    <!-- SIDEBAR -->
    <aside class="admin-sidebar">
      <div class="sb-brand" @click="nav = 'dashboard'">
        <span class="sb-logo">C</span>
        <span class="sb-name">控制台</span>
      </div>

      <nav class="sb-nav">
        <button :class="{ active: nav === 'dashboard' }" @click="nav = 'dashboard'">
          <span class="sb-icon">📊</span> 概览
        </button>
        <button :class="{ active: nav === 'posts' }" @click="nav = 'posts'">
          <span class="sb-icon">📝</span> 文章
        </button>
        <button :class="{ active: nav === 'moments' }" @click="nav = 'moments'">
          <span class="sb-icon">📷</span> 动态
        </button>
      </nav>

      <div class="sb-footer">
        <a href="/" class="sb-site-link">← 返回网站</a>
        <button class="sb-theme-btn" @click="toggleAdminTheme">
          <span>{{ themeRef === 'light' ? '🌙' : '☀️' }}</span>
          <span>{{ themeRef === 'light' ? '深色' : '浅色' }}</span>
        </button>
        <button @click="logout" class="sb-logout">退出登录</button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="content">
      <!-- ═══ 概览 ═══ -->
      <div v-if="nav === 'dashboard'" class="fade-in">
        <h2 class="page-heading">概览</h2>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:#e8f0fe;color:#1a73e8">📝</div>
            <div class="stat-num">{{ posts.length }}</div>
            <div class="stat-label">文章总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fce8e6;color:#ea4335">📷</div>
            <div class="stat-num">{{ moments.length }}</div>
            <div class="stat-label">动态总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#e6f4ea;color:#34a853">📅</div>
            <div class="stat-num">{{ todayCount }}</div>
            <div class="stat-label">今日动态</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef7e0;color:#f9ab00">⚡</div>
            <div class="stat-num">v1.0</div>
            <div class="stat-label">版本</div>
          </div>
        </div>

        <div class="recent-section">
          <h3>最近文章</h3>
          <div class="mui-table">
            <div v-for="p in posts.slice(0,5)" :key="p.id" class="mui-tr">
              <span class="mui-td title">{{ p.title }}</span>
              <span class="mui-td date">{{ p.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 文章管理 ═══ -->
      <div v-if="nav === 'posts'" class="fade-in">
        <div class="page-heading-row">
          <h2 class="page-heading">文章管理</h2>
          <div style="display:flex;gap:8px">
            <router-link to="/desk/write" class="mui-btn raised primary" style="text-decoration:none">✎ 写文章</router-link>
            <button class="mui-btn outlined" @click="openPostForm()">+ 快速编辑</button>
          </div>
        </div>

        <div class="mui-table">
          <div class="mui-tr header">
            <span>标题</span><span>日期</span><span>摘要</span><span></span>
          </div>
          <div v-for="p in posts" :key="p.id" class="mui-tr">
            <span class="title">{{ p.title }}</span>
            <span class="date">{{ p.date }}</span>
            <span class="summary">{{ p.summary?.slice(0,40) }}...</span>
            <span class="actions">
              <button class="mui-btn text" @click="togglePin(p.id)" :style="{color: p.pinned ? '#f59e0b' : ''}">{{ p.pinned ? '📌已置顶' : '📌置顶' }}</button>
              <router-link :to="`/desk/write?id=${p.id}`" class="mui-btn text" style="text-decoration:none">编辑</router-link>
              <button class="mui-btn text danger" @click="confirmDel('post', p.id)">删除</button>
            </span>
          </div>
        </div>

        <!-- Post Editor Modal -->
        <div v-if="showPostForm" class="mui-overlay" @click.self="showPostForm = false">
          <div class="mui-dialog wide">
            <div class="mui-dialog-header">
              <h3>{{ editingPost?.id ? '编辑文章' : '新建文章' }}</h3>
              <button class="mui-close" @click="showPostForm = false">✕</button>
            </div>
            <div class="mui-dialog-body">
              <div class="form-row">
                <input v-model="postForm.title" placeholder="文章标题..." class="mui-input" />
                <input type="date" v-model="postForm.date" class="mui-input short" />
              </div>
              <input v-model="postForm.summary" placeholder="摘要..." class="mui-input" />
              <div class="tag-input-inline">
                <input v-model="postTagInput" placeholder="标签（逗号分隔）" class="mui-input" @keyup.enter="addPostTag" @keyup.","="addPostTag" />
                <div class="tag-pills" v-if="postForm.tags?.length" style="margin-top:4px">
                  <span class="tag-pill" v-for="(t,i) in postForm.tags" :key="t" @click="postForm.tags.splice(i,1)">{{ t }} ✕</span>
                </div>
              </div>
              <label class="form-label">内容 <span class="hint">— 支持 Markdown</span></label>
              <div ref="editorContainer" class="editor-wrap"></div>
            </div>
            <div class="mui-dialog-footer">
              <button class="mui-btn outlined" @click="showPostForm = false">取消</button>
              <button class="mui-btn raised primary" @click="savePost">发布</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 动态管理 ═══ -->
      <div v-if="nav === 'moments'" class="fade-in">
        <div class="page-heading-row">
          <h2 class="page-heading">动态管理</h2>
          <button class="mui-btn raised primary" @click="openMomentForm()">+ 新建动态</button>
        </div>

        <div class="moment-grid">
          <div v-for="m in moments" :key="m.id" class="moment-item">
            <img v-if="m.image" :src="m.image" class="moment-pic" />
            <div v-else class="moment-pic placeholder">📷</div>
            <div class="moment-body">
              <span class="moment-meta">{{ m.date }} · {{ m.time }}</span>
              <p>{{ m.content }}</p>
            </div>
            <div class="moment-actions">
              <button class="mui-btn text" @click="openMomentForm(m)">编辑</button>
              <button class="mui-btn text danger" @click="confirmDel('moment', m.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- Moment Editor Modal -->
        <div v-if="showMomentForm" class="mui-overlay" @click.self="showMomentForm = false">
          <div class="mui-dialog">
            <div class="mui-dialog-header">
              <h3>{{ editingMoment?.id ? '编辑动态' : '新建动态' }}</h3>
              <button class="mui-close" @click="showMomentForm = false">✕</button>
            </div>
            <div class="mui-dialog-body">
              <div class="form-row">
                <input type="date" v-model="momentForm.date" class="mui-input short" />
                <input type="time" v-model="momentForm.time" class="mui-input short" />
              </div>
              <textarea v-model="momentForm.content" placeholder="此刻的想法..." class="mui-input" rows="3"></textarea>
              <div class="tag-input-inline">
                <input v-model="momentTagInput" placeholder="标签（逗号分隔）" class="mui-input" @keyup.enter="addMomentTag" @keyup.","="addMomentTag" />
                <div class="tag-pills" v-if="momentForm.tags?.length" style="margin-top:4px">
                  <span class="tag-pill" v-for="(t,i) in momentForm.tags" :key="t" @click="momentForm.tags.splice(i,1)">{{ t }} ✕</span>
                </div>
              </div>
              <label class="form-label">图片</label>
              <div class="upload-area" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="onDrop">
                <span v-if="uploading">⏳ 上传中...</span>
                <span v-else-if="momentForm.image">✅ 已上传 — 点击更换</span>
                <span v-else>📁 拖拽或点击上传图片</span>
              </div>
              <input ref="fileInput" type="file" accept="image/*" @change="onFileChange" hidden />
              <img v-if="momentForm.image" :src="momentForm.image" class="preview-pic" />
            </div>
            <div class="mui-dialog-footer">
              <button class="mui-btn outlined" @click="showMomentForm = false">取消</button>
              <button class="mui-btn raised primary" @click="saveMoment" :disabled="uploading">保存</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 删除确认 -->
      <div v-if="confirmState.show" class="mui-overlay" @click.self="confirmState.show = false">
        <div class="mui-dialog small">
          <div class="mui-dialog-header">
            <h3>确认删除</h3>
          </div>
          <div class="mui-dialog-body">
            <p>{{ confirmState.msg }}</p>
          </div>
          <div class="mui-dialog-footer">
            <button class="mui-btn outlined" @click="confirmState.show = false">取消</button>
            <button class="mui-btn raised danger" @click="confirmState.onOk">确认删除</button>
          </div>
        </div>
      </div>

      <!-- 提示 -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.msg }}</div>
      </transition>
    </main>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { admin } from '../api/admin.js'
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'

// Preload Write component
import('./admin/Write.vue')

/* Theme */
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark' }
const themeRef = ref(getTheme())
function onTheme(e) { themeRef.value = e.detail }
window.addEventListener('theme-change', onTheme)
function toggleAdminTheme() {
  const next = themeRef.value === 'light' ? 'dark' : 'light'
  themeRef.value = next
  localStorage.setItem('blog-theme', next)
  document.documentElement.setAttribute('data-theme', next)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: next }))
}
onBeforeUnmount(() => window.removeEventListener('theme-change', onTheme))

/* Auth */
const loggedIn = ref(!!localStorage.getItem('admin_token'))
const tokenInput = ref('')
const errMsg = ref('')

/* Captcha */
function genCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  return { q: `${a} + ${b}`, a: a + b }
}
const captcha = ref(genCaptcha())
const captchaInput = ref('')
const captchaQuestion = ref(captcha.value.q)

async function login() {
  if (!tokenInput.value) { errMsg.value = '请输入管理密码'; return }
  const ans = parseInt(captchaInput.value)
  if (isNaN(ans) || ans !== captcha.value.a) {
    errMsg.value = '验证码错误'
    captcha.value = genCaptcha()
    captchaQuestion.value = captcha.value.q
    captchaInput.value = ''
    return
  }
  errMsg.value = '验证中...'
  try {
    const res = await fetch('/api/auth', {
      headers: { Authorization: `Bearer ${tokenInput.value}` }
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || '密码错误')
    localStorage.setItem('admin_token', tokenInput.value)
    loggedIn.value = true
    tokenInput.value = ''
    captchaInput.value = ''
    errMsg.value = ''
    captcha.value = genCaptcha()
    captchaQuestion.value = captcha.value.q
    loadAll()
  } catch (e) {
    errMsg.value = '❌ ' + (e.message || '登录失败')
    captcha.value = genCaptcha()
    captchaQuestion.value = captcha.value.q
    captchaInput.value = ''
  }
}

function logout() {
  localStorage.removeItem('admin_token')
  loggedIn.value = false
}

/* Nav */
const nav = ref('dashboard')

/* Dashboard */
const posts = ref([])
const moments = ref([])
const todayCount = ref(0)

async function loadAll() {
  try {
    posts.value = await admin.getPosts()
    moments.value = await admin.getMoments()
    const today = new Date().toISOString().slice(0, 10)
    todayCount.value = moments.value.filter(m => m.date === today).length
  } catch (e) { toastMsg(e.message, 'error') }
}

if (loggedIn.value) loadAll()

/* Toast */
const toast = reactive({ show: false, msg: '', type: 'success' })
function toastMsg(msg, type = 'success') {
  toast.msg = msg; toast.type = type; toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}

/* Confirm */
const confirmState = reactive({ show: false, msg: '', type: '', id: null, onOk: () => {} })
function confirmDel(type, id) {
  const label = type === 'post' ? '文章' : '动态'
  confirmState.msg = `确定要删除这条${label}吗？此操作不可撤销。`
  confirmState.show = true
  confirmState.onOk = async () => {
    confirmState.show = false
    try {
      if (type === 'post') { await admin.deletePost(id); await loadPosts() }
      else { await admin.deleteMoment(id); await loadMoments() }
      toastMsg('已删除')
    } catch (e) { toastMsg(e.message, 'error') }
  }
}

/* Posts */
const showPostForm = ref(false)
const editingPost = ref(null)
const postForm = reactive({ title: '', date: '', summary: '', content: '', tags: [] })
const postTagInput = ref('')
function addPostTag() {
  const t = postTagInput.value.replace(/,/g, '').trim()
  if (t && !postForm.tags.includes(t)) postForm.tags.push(t)
  postTagInput.value = ''
}
const editorContainer = ref(null)
let editorInstance = null

function initEditor() {
  if (editorInstance) editorInstance.destroy()
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  editorInstance = new Editor({
    el: editorContainer.value,
    height: '420px',
    initialValue: postForm.content || '',
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    placeholder: 'Markdown 写作...',
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'image', 'link'],
      ['code', 'codeblock'],
      ['scrollSync'],
    ],
  })
}

watch(themeRef, () => {
  if (!editorInstance || !showPostForm.value) return
  const md = editorInstance.getMarkdown()
  editorInstance.destroy()
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  editorInstance = new Editor({
    el: editorContainer.value, height: '420px', initialValue: md,
    initialEditType: 'markdown', previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'], ['hr', 'quote'],
      ['ul', 'ol', 'task'], ['table', 'image', 'link'],
      ['code', 'codeblock'], ['scrollSync'],
    ],
  })
})

function openPostForm(post = null) {
  editingPost.value = post
  postForm.title = post?.title || ''
  postForm.date = post?.date || new Date().toISOString().slice(0, 10)
  postForm.summary = post?.summary || ''
  postForm.content = post?.content || ''
  postForm.tags = post?.tags ? [...post.tags] : []
  showPostForm.value = true
  nextTick(() => initEditor())
}

async function savePost() {
  try {
    const data = { ...postForm, tags: [...postForm.tags], content: editorInstance?.getMarkdown() || postForm.content }
    if (editingPost.value?.id) {
      await admin.updatePost(editingPost.value.id, data)
    } else {
      await admin.createPost(data)
    }
    showPostForm.value = false
    if (editorInstance) { editorInstance.destroy(); editorInstance = null }
    await loadPosts()
    toastMsg(editingPost.value?.id ? '文章已更新' : '文章已发布')
  } catch (e) { toastMsg(e.message, 'error') }
}

async function togglePin(id) {
  try {
    await admin.togglePin(id)
    await loadPosts()
    toastMsg('置顶状态已更新')
  } catch (e) { toastMsg(e.message, 'error') }
}

async function loadPosts() {
  try { posts.value = await admin.getPosts() } catch {}
}

/* Moments */
const showMomentForm = ref(false)
const editingMoment = ref(null)
const momentForm = reactive({ date: '', time: '', content: '', image: '', tags: [] })
const momentTagInput = ref('')
function addMomentTag() {
  const t = momentTagInput.value.replace(/,/g, '').trim()
  if (t && !momentForm.tags.includes(t)) momentForm.tags.push(t)
  momentTagInput.value = ''
}
const uploading = ref(false)

function openMomentForm(moment = null) {
  editingMoment.value = moment
  const now = new Date()
  momentForm.date = moment?.date || now.toISOString().slice(0, 10)
  momentForm.time = moment?.time || now.toTimeString().slice(0, 5)
  momentForm.content = moment?.content || ''
  momentForm.image = moment?.image || ''
  momentForm.tags = moment?.tags ? [...moment.tags] : []
  showMomentForm.value = true
}

async function onFileChange(e) { await uploadFile(e.target.files?.[0]) }
async function onDrop(e) { await uploadFile(e.dataTransfer?.files?.[0]) }
async function uploadFile(file) {
  if (!file) return
  uploading.value = true
  try {
    momentForm.image = await admin.uploadImage(file)
    toastMsg('图片已上传')
  } catch (e) { toastMsg(e.message, 'error') }
  finally { uploading.value = false }
}

async function saveMoment() {
  try {
    const data = { date: momentForm.date, time: momentForm.time, content: momentForm.content, image: momentForm.image || null, tags: [...momentForm.tags] }
    if (editingMoment.value?.id) {
      await admin.updateMoment(editingMoment.value.id, data)
    } else {
      await admin.createMoment(data)
    }
    showMomentForm.value = false
    await loadMoments()
    toastMsg(editingMoment.value?.id ? '动态已更新' : '动态已创建')
  } catch (e) { toastMsg(e.message, 'error') }
}

async function loadMoments() {
  try { moments.value = await admin.getMoments() } catch {}
}

/* Cleanup editor on unmount */
onBeforeUnmount(() => {
  if (editorInstance) { editorInstance.destroy(); editorInstance = null }
})

/* Cleanup forms when switching tabs */
watch(nav, (newTab, oldTab) => {
  if (oldTab === 'posts' && showPostForm.value) {
    if (editorInstance) { editorInstance.destroy(); editorInstance = null }
    showPostForm.value = false
  }
  if (oldTab === 'moments' && showMomentForm.value) {
    showMomentForm.value = false
  }
})

watch(() => showPostForm.value, (v) => {
  if (!v && editorInstance) { editorInstance.destroy(); editorInstance = null }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   ADMIN — CLEAN EDITION
   ═══════════════════════════════════════════ */

/* ── Login ── */
.admin-login {
  position: fixed; inset: 0; z-index: 999;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-primary);
}
.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 48px 40px; text-align: center;
  width: 400px; max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.login-icon { font-size: 2.4rem; margin-bottom: 8px; }
.login-card h1 {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 800;
  color: var(--text-hero);
}
.login-sub { color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 20px; }
.input-group { display: flex; gap: 8px; margin-bottom: 8px; }
.input-group input {
  flex: 1; padding: 10px 16px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  font-size: 0.9rem; transition: all 0.2s;
}
.input-group input:focus { outline: none; border-color: var(--accent); box-shadow: var(--glow-indigo); }
.captcha-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.captcha-label { font-family: var(--font-mono); font-size: 1rem; color: var(--text-primary); white-space: nowrap; }
.captcha-input { width: 80px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-primary); font-size: 1rem; text-align: center; }
.captcha-input:focus { outline: none; border-color: var(--accent); }
.err-msg { color: #ef4444; font-size: 0.82rem; margin-top: 12px; }

/* ── Shell ── */
.admin-shell {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
  display: flex; background: var(--bg-primary);
}

/* ── Admin Sidebar ── */
.admin-sidebar {
  width: 220px; min-width: 220px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 20px 0;
}
.sb-brand { display: flex; align-items: center; gap: 10px; padding: 0 20px 20px; cursor: pointer; }
.sb-logo {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--accent-gradient);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.1rem;
  box-shadow: var(--glow-indigo);
}
.sb-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
.sb-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
.sb-nav button {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: none; border-radius: 10px; background: transparent;
  color: var(--text-secondary); font-size: 0.87rem; cursor: pointer;
  transition: all 0.2s; text-align: left;
  font-family: var(--font-sans);
}
.sb-nav button:hover { background: var(--accent-dim); color: var(--text-primary); }
.sb-nav button.active {
  background: var(--accent-gradient);
  color: #fff; font-weight: 600;
  box-shadow: var(--glow-indigo);
}
.sb-icon { font-size: 1.1rem; width: 22px; text-align: center; }
.sb-footer { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.sb-site-link {
  display: block; padding: 8px 12px; border-radius: 8px;
  font-size: 0.8rem; color: var(--text-muted); text-decoration: none;
  transition: all 0.2s;
}
.sb-site-link:hover { color: var(--accent); background: var(--accent-dim); }
.sb-theme-btn {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px; border: 1px solid var(--border);
  border-radius: 8px; background: transparent; cursor: pointer;
  color: var(--text-secondary); font-size: 0.8rem;
  transition: all 0.2s; font-family: inherit;
}
.sb-theme-btn:hover { border-color: var(--accent); color: var(--accent); }
.sb-logout {
  width: 100%; padding: 8px 12px; border: none; border-radius: 8px;
  background: transparent; color: var(--text-muted); font-size: 0.8rem; cursor: pointer;
  transition: all 0.2s; text-align: left;
}
.sb-logout:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

/* ── Content ── */
.content {
  flex: 1; min-width: 0; padding: 32px 36px;
  overflow-y: auto; overflow-x: hidden;
  max-height: 100vh;
}
.page-heading {
  font-family: var(--font-display);
  font-size: 1.5rem; font-weight: 700; color: var(--text-hero); margin-bottom: 24px;
}
.page-heading-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-heading-row .page-heading { margin-bottom: 0; }
.fade-in { animation: fadeIn 0.25s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ── Stat Cards ── */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 22px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
}
.stat-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
.stat-icon {
  width: 44px; height: 44px; border-radius: 12px; display: flex;
  align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 14px;
}
.stat-num { font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--text-hero); }
.stat-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
.recent-section { margin-top: 8px; }
.recent-section h3 { font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }

/* ── Table ── */
.mui-table { display: flex; flex-direction: column; }
.mui-tr {
  display: grid; grid-template-columns: 2fr 1fr 2fr 120px; gap: 12px; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  font-size: 0.87rem; transition: background 0.2s;
}
.mui-tr:hover { background: var(--bg-card-hover); }
.mui-tr.header {
  font-size: 0.72rem; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
}
.mui-tr .title { font-weight: 600; color: var(--text-primary); }
.mui-tr .date { color: var(--text-muted); font-size: 0.8rem; }
.mui-tr .summary { color: var(--text-secondary); font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mui-tr .actions { display: flex; gap: 4px; justify-content: flex-end; }

/* ── Buttons ── */
.mui-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
  border: none; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.mui-btn.raised { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.mui-btn.raised:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.2); transform: translateY(-1px); }
.mui-btn.primary {
  background: var(--accent-gradient); color: #fff;
  box-shadow: var(--glow-indigo);
}
.mui-btn.primary:hover { box-shadow: 0 0 24px rgba(99, 102, 241, 0.35); }
.mui-btn.danger { background: #ef4444; color: #fff; }
.mui-btn.outlined {
  background: transparent; border: 1px solid var(--border); color: var(--text-primary);
}
.mui-btn.outlined:hover { border-color: var(--accent); background: var(--accent-dim); }
.mui-btn.text {
  background: transparent; color: var(--accent-light); padding: 6px 12px; font-size: 0.8rem;
}
.mui-btn.text:hover { background: var(--accent-dim); }
.mui-btn.text.danger { color: #ef4444; }
.mui-btn.text.danger:hover { background: rgba(239, 68, 68, 0.08); }
.mui-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Dialog ── */
.mui-overlay {
  position: fixed; top: 0; left: 220px; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 3000;
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.15s ease;
}
.mui-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  width: 500px; max-width: 92vw;
  max-height: 85vh; display: flex; flex-direction: column;
}
.mui-dialog.wide { width: 900px; }
.mui-dialog.small { width: 400px; }
.mui-dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 0;
}
.mui-dialog-header h3 {
  font-family: var(--font-display);
  font-size: 1.15rem; font-weight: 700; color: var(--text-hero);
}
.mui-dialog-body { padding: 20px 24px; overflow-y: auto; flex: 1; color: var(--text-primary); }
.mui-dialog-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid var(--border);
}
.mui-close {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);
  background: transparent; cursor: pointer; font-size: 1rem; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.mui-close:hover { background: var(--accent-dim); color: var(--text-primary); border-color: var(--accent); }

/* ── Form ── */
.form-row { display: flex; gap: 10px; }
.form-label { display: block; font-size: 0.78rem; color: var(--text-muted); margin: 14px 0 4px; font-weight: 500; }
.form-label .hint { font-weight: 400; opacity: 0.7; }
.mui-input {
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  font-size: 0.9rem; font-family: inherit; margin-bottom: 10px;
  transition: all 0.2s;
}
.mui-input:focus { outline: none; border-color: var(--accent); box-shadow: var(--glow-indigo); }
.mui-input.short { width: auto; }

/* ── Editor ── */
.editor-wrap {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  overflow: hidden; margin-top: 6px;
}
.editor-wrap:focus-within { border-color: var(--accent); box-shadow: var(--glow-indigo); }

/* ── Moments ── */
.moment-grid { display: flex; flex-direction: column; gap: 8px; }
.moment-item {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 18px;
  transition: all 0.3s;
}
.moment-item:hover { border-color: var(--border-hover); }
.moment-pic {
  width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); font-size: 1.5rem; flex-shrink: 0;
}
.moment-pic.placeholder { color: var(--text-muted); }
.moment-body { flex: 1; min-width: 0; }
.moment-meta { font-size: 0.72rem; color: var(--text-muted); }
.moment-body p { font-size: 0.87rem; color: var(--text-primary); margin-top: 2px; }
.moment-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* ── Upload ── */
.upload-area {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 24px; text-align: center; color: var(--text-muted);
  font-size: 0.85rem; cursor: pointer;
  transition: all 0.2s;
}
.upload-area:hover { border-color: var(--accent); background: var(--accent-dim); }
.preview-pic { max-width: 280px; max-height: 200px; border-radius: var(--radius-sm); margin-top: 10px; }
.tag-input-inline { margin-bottom: 10px; }
.tag-input-inline .tag-pills { margin-top: 4px; }
.tag-input-inline .tag-pill { cursor: pointer; }
.tag-input-inline .tag-pill:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 4000;
  padding: 12px 24px; border-radius: 12px; font-size: 0.85rem; font-weight: 500;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3); color: #fff;
}
.toast.success { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.toast.error { background: #ef4444; }
.toast-enter-active { animation: slideUp 0.3s ease; }
.toast-leave-active { animation: slideUp 0.2s ease reverse; }
@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

/* ── Light theme admin ── */
[data-theme="light"] .admin-shell {
  --bg-primary: #f2f1f6;
  --bg-secondary: #e8e7ed;
  --bg-card: #ffffff;
  --bg-input: #ededf2;
  --text-hero: #1a1a2e;
  --text-primary: #3a3a4e;
  --text-secondary: #6e6e82;
  --text-muted: #9e9eb2;
  --border: rgba(0,0,0,0.06);
}
[data-theme="light"] .admin-login { background: #f2f1f6; }
[data-theme="light"] .admin-sidebar { background: #e8e7ed; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .admin-shell { flex-direction: column; }
  .admin-sidebar {
    width: 100%; min-width: 100%; height: 52px;
    flex-direction: row; align-items: center;
    padding: 0 10px; flex-shrink: 0;
    border-right: none; border-bottom: 1px solid var(--border);
  }
  .sb-brand { padding: 0 8px 0 0; flex-shrink: 0; }
  .sb-logo { width: 30px; height: 30px; font-size: 0.9rem; }
  .sb-name { font-size: 0.85rem; }
  .sb-nav { flex-direction: row; flex: 1; gap: 2px; padding: 0; justify-content: center; }
  .sb-nav button { padding: 8px 10px; font-size: 0.75rem; gap: 4px; }
  .sb-nav button span:not(.sb-icon) { display: inline; }
  .sb-footer { flex-direction: row; padding: 0; gap: 4px; flex-shrink: 0; align-items: center; }
  .sb-site-link, .sb-theme-btn span:last-child, .sb-logout { display: none; }
  .sb-theme-btn { width: 32px; height: 32px; padding: 0; justify-content: center; border-radius: 50%; border: none; }
  .content { padding: 16px 12px; max-height: calc(100vh - 52px); }
  .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-num { font-size: 1.5rem; }
  .mui-tr { grid-template-columns: 1fr 80px 80px; }
  .mui-tr .summary { display: none; }
  .mui-overlay { left: 0; top: 52px; }
  .mui-dialog.wide { width: 95vw; }
}
</style>
