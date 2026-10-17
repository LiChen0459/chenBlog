<template>
  <div class="write-shell">
    <!-- Toolbar -->
    <header class="write-toolbar">
      <router-link to="/desk" class="back-btn">
        <Icon name="arrow-left" :size="15" />
        <span class="back-label">返回控制台</span>
      </router-link>
      <span class="write-mode">{{ editingId ? '编辑中' : '新建文章' }}</span>
      <div class="toolbar-right">
        <button class="mui-btn outlined" @click="showMeta = !showMeta">
          <Icon name="sliders" :size="14" />
          <span class="btn-label">设置</span>
        </button>
        <button class="mui-btn raised primary" :disabled="publishing" @click="publish">
          <Icon v-if="publishing" name="loader" :size="14" />
          <span>{{ publishing ? '发布中' : '发布' }}</span>
        </button>
      </div>
    </header>

    <p v-if="errMsg" class="write-error">{{ errMsg }}</p>

    <div class="write-body">
      <!-- Editor -->
      <div class="write-editor" :class="{ 'with-meta': showMeta }">
        <input
          v-model="title"
          class="write-title"
          placeholder="文章标题..."
          @input="errMsg = ''"
        />
        <div ref="editorWrap" class="editor-stage"></div>
      </div>

      <!-- Meta Panel -->
      <aside v-if="showMeta" class="write-meta">
        <h3>文章设置</h3>

        <label>日期</label>
        <input type="date" v-model="date" class="mui-input" />

        <label>摘要</label>
        <textarea v-model="summary" class="mui-input" rows="3" placeholder="简要摘要..."></textarea>

        <label>分类</label>
        <input
          v-model="category"
          list="write-category-options"
          class="mui-input"
          placeholder="分类（支持 父/子 层级，如 技术/前端）"
        />
        <datalist id="write-category-options">
          <option v-for="c in categoryOptions" :key="c.path" :value="c.path"></option>
        </datalist>

        <label>标签</label>
        <div class="tag-input-row">
          <input
            v-model="tagInput" class="mui-input" placeholder="添加标签..."
            @keyup.enter="addTag" @keyup.","="addTag"
          />
          <button class="mui-btn text" aria-label="添加标签" @click="addTag">
            <Icon name="plus" :size="15" />
          </button>
        </div>
        <div class="tag-pills" v-if="tags.length">
          <button type="button" class="tag-pill" v-for="(t, i) in tags" :key="t" @click="tags.splice(i,1)">
            {{ t }}
            <Icon name="x" :size="10" />
          </button>
        </div>

        <label>封面图片</label>
        <div class="upload-area" :class="{ busy: coverUploading }" @click="pickCover" @dragover.prevent @drop.prevent="onCoverDrop">
          <Icon v-if="coverUploading" name="loader" :size="16" />
          <Icon v-else-if="coverImage" name="check-circle" :size="16" />
          <Icon v-else name="upload" :size="16" />
          <span v-if="coverUploading">上传中…</span>
          <span v-else-if="coverImage">已上传 · 点击更换</span>
          <span v-else>点击或拖拽上传</span>
        </div>
        <input ref="coverInput" type="file" accept="image/*" @change="onCoverFile" hidden />
        <img v-if="coverImage" :src="coverImage" class="preview-pic" alt="" />

        <hr />
        <button class="mui-btn text danger" v-if="editingId" @click="deletePost">
          <Icon name="trash" :size="13" />
          删除这篇文章
        </button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../../components/Icon.vue'
import { admin } from '../../api/admin.js'
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'

/* ── Theme ── */
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark' }
const themeRef = ref(getTheme())
function onTheme(e) { themeRef.value = e.detail }
window.addEventListener('theme-change', onTheme)

const route = useRoute()
const router = useRouter()
const editingId = ref(route.query.id ? Number(route.query.id) : null)

const title = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const summary = ref('')
const category = ref('')
const categoryOptions = ref([])
const tags = ref([])
const tagInput = ref('')
const coverImage = ref('')
const coverUploading = ref(false)
const showMeta = ref(true)
const publishing = ref(false)
const errMsg = ref('')

const editorWrap = ref(null)
const coverInput = ref(null)
let editor = null

function editorHeight() {
  return window.matchMedia('(max-width: 768px)').matches ? '440px' : 'calc(100vh - 150px)'
}

function pickCover() {
  if (!coverUploading.value) coverInput.value?.click()
}

function addTag() {
  const t = tagInput.value.replace(/,/g, '').trim()
  if (t && !tags.value.includes(t)) tags.value.push(t)
  tagInput.value = ''
}

/* ── Cover upload ── */
async function uploadCover(file) {
  if (!file) return
  coverUploading.value = true
  try {
    coverImage.value = await admin.uploadImage(file)
  } catch (e) {
    errMsg.value = e.message
  } finally {
    coverUploading.value = false
  }
}
function onCoverFile(e) {
  uploadCover(e.target.files?.[0])
  e.target.value = ''
}
function onCoverDrop(e) { e.preventDefault(); uploadCover(e.dataTransfer?.files?.[0]) }

/* ── Editor ── */
const TOOLBAR = [
  ['heading', 'bold', 'italic', 'strike'],
  ['hr', 'quote'],
  ['ul', 'ol', 'task'],
  ['table', 'image', 'link'],
  ['code', 'codeblock'],
  ['scrollSync'],
]

function buildEditor(value) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  return new Editor({
    el: editorWrap.value,
    height: editorHeight(),
    initialValue: value || '',
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    placeholder: '开始写 Markdown...',
    toolbarItems: TOOLBAR,
  })
}

function initEditor(val = '') {
  if (editor) { editor.destroy(); editor = null }
  editor = buildEditor(val)
}

watch(themeRef, () => {
  if (!editor) return
  const md = editor.getMarkdown()
  editor.destroy()
  editor = buildEditor(md)
})

/* ── Load existing post ── */
async function loadPost(id) {
  try {
    const p = await admin.getPost(id)
    if (!p) return
    title.value = p.title || ''
    date.value = p.date || date.value
    summary.value = p.summary || ''
    category.value = p.category || ''
    tags.value = p.tags || []
    initEditor(p.content || '')
  } catch (e) {
    errMsg.value = e.message
  }
}

/* ── Publish / delete ── */
async function publish() {
  errMsg.value = ''
  if (!title.value.trim()) {
    errMsg.value = '请先填写文章标题'
    return
  }
  publishing.value = true
  try {
    const data = {
      title: title.value.trim(),
      date: date.value,
      summary: summary.value,
      category: category.value,
      content: editor?.getMarkdown() || '',
      tags: tags.value,
    }
    if (editingId.value) await admin.updatePost(editingId.value, data)
    else await admin.createPost(data)
    router.push('/desk')
  } catch (e) {
    errMsg.value = e.message
  } finally {
    publishing.value = false
  }
}

async function deletePost() {
  if (!editingId.value || !confirm('确定删除这篇文章吗？此操作不可撤销。')) return
  try {
    await admin.deletePost(editingId.value)
    router.push('/desk')
  } catch (e) {
    errMsg.value = e.message
  }
}

/* ── Init ── */
onMounted(async () => {
  if (!localStorage.getItem('admin_token')) {
    router.replace('/desk')
    return
  }
  await nextTick()
  if (editingId.value) loadPost(editingId.value)
  else initEditor('')

  // Category suggestions are advisory — a failure must not block writing.
  admin.getTaxonomy()
    .then((tax) => { categoryOptions.value = tax?.categories || [] })
    .catch(() => {})
})

onBeforeUnmount(() => {
  window.removeEventListener('theme-change', onTheme)
  if (editor) { editor.destroy(); editor = null }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   WRITE
   ═══════════════════════════════════════════ */

.write-shell {
  position: fixed; inset: 0; z-index: 999;
  display: flex; flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ── Toolbar ── */
.write-toolbar {
  min-height: 56px; display: flex; align-items: center; gap: 14px;
  padding: 0 20px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  flex-shrink: 0;
}
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.85rem; color: var(--text-muted);
  transition: color 0.2s;
}
.back-btn:hover { color: var(--accent); }
.write-mode { font-size: 0.8rem; color: var(--text-muted); }
.toolbar-right { margin-left: auto; display: flex; gap: 8px; }

.write-error {
  margin: 0; padding: 10px 20px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444; font-size: 0.82rem;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

/* ── Body ── */
.write-body { display: flex; flex: 1; overflow: hidden; }

/* ── Editor ── */
.write-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.write-editor.with-meta { border-right: 1px solid var(--glass-border); }
.write-title {
  border: none; padding: 22px 28px 14px; font-size: 1.7rem; font-weight: 700;
  background: transparent; color: var(--text-hero); outline: none;
  font-family: var(--font-display); letter-spacing: -0.5px;
  flex-shrink: 0;
}
.write-title::placeholder { color: var(--text-muted); }
.editor-stage { flex: 1; overflow: hidden; }

/* ── Meta Panel ── */
.write-meta {
  width: 300px; flex-shrink: 0; padding: 20px; overflow-y: auto;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid var(--glass-border);
}
.write-meta h3 {
  font-family: var(--font-display); font-size: 1rem; font-weight: 700;
  color: var(--text-hero); margin-bottom: 16px;
}
.write-meta label { display: block; font-size: 0.75rem; color: var(--text-muted); margin: 10px 0 4px; }
.write-meta hr { border: none; border-top: 1px solid var(--glass-border); margin: 16px 0; }
.tag-input-row { display: flex; gap: 4px; align-items: flex-start; }
.tag-input-row input { flex: 1; margin-bottom: 0; }

/* ── Inputs ── */
.mui-input {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--glass-border); border-radius: var(--radius-sm);
  background: var(--bg-input); color: var(--text-primary);
  font-size: 0.85rem; font-family: inherit; margin-bottom: 8px;
  transition: all 0.2s;
}
.mui-input:focus {
  outline: none;
  border-color: var(--accent-2);
  box-shadow: var(--glow-indigo);
}

/* ── Buttons ── */
.mui-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  border: none; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s var(--ease); font-family: inherit;
}
.mui-btn.raised { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.mui-btn.raised:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.2); transform: translateY(-1px); }
.mui-btn.raised:active { box-shadow: 0 1px 3px rgba(0,0,0,0.1); transform: translateY(0); }
.mui-btn.primary { background: var(--accent-gradient); color: #fff; }
.mui-btn.primary:hover { box-shadow: 0 0 22px rgba(41, 151, 255, 0.35); transform: translateY(-1px); }
.mui-btn.outlined { background: transparent; border: 1px solid var(--glass-border); color: var(--text-primary); }
.mui-btn.outlined:hover { border-color: var(--accent-2); background: var(--accent-dim); }
.mui-btn.text { background: transparent; color: var(--accent-light); padding: 6px 10px; font-size: 0.8rem; }
.mui-btn.text:hover { background: var(--accent-dim); }
.mui-btn.text.danger { color: #ef4444; }
.mui-btn.text.danger:hover { background: rgba(239, 68, 68, 0.08); }
.mui-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ── Upload ── */
.upload-area {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 2px dashed var(--glass-border); border-radius: var(--radius);
  padding: 16px; text-align: center; color: var(--text-muted);
  font-size: 0.8rem; cursor: pointer;
  transition: all 0.2s var(--ease);
}
.upload-area:hover { border-color: var(--accent-2); background: var(--accent-dim); color: var(--accent); }
.upload-area.busy { cursor: progress; opacity: 0.75; }
.preview-pic { width: 100%; max-height: 150px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 8px; }

/* ── Tags ── */
.tag-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.7rem; padding: 4px 10px; border-radius: 999px;
  background: var(--accent-dim); color: var(--accent-light);
  border: 1px solid rgba(41, 151, 255, 0.15);
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.tag-pill:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .write-toolbar { padding: 0 12px; gap: 8px; min-height: 52px; }
  .back-label { display: none; }
  .btn-label { display: none; }
  .write-body { flex-direction: column; overflow-y: auto; }
  .write-editor { flex: none; }
  .write-editor.with-meta { border-right: none; }
  .write-title { font-size: 1.35rem; padding: 16px 16px 10px; }
  .write-meta {
    width: 100%; border-left: none;
    border-top: 1px solid var(--glass-border);
  }
}
</style>
