<template>
  <div class="write-shell">
    <!-- Toolbar -->
    <header class="write-toolbar">
      <router-link to="/desk" class="back-btn">← 返回控制台</router-link>
      <span class="write-mode">{{ editingId ? '编辑中' : '新建文章' }}</span>
      <div class="toolbar-right">
        <button class="mui-btn outlined" @click="showMeta = !showMeta">设置</button>
        <button class="mui-btn raised primary" @click="publish">发布</button>
      </div>
    </header>

    <div class="write-body">
      <!-- Editor -->
      <div class="write-editor" :class="{ 'with-meta': showMeta }">
        <input
          v-model="title"
          class="write-title"
          placeholder="文章标题..."
          autofocus
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

        <label>标签</label>
        <div class="tag-input-row">
          <input
            v-model="tagInput" class="mui-input" placeholder="添加标签..."
            @keyup.enter="addTag" @keyup.","="addTag"
          />
          <button class="mui-btn text" @click="addTag">+</button>
        </div>
        <div class="tag-pills" v-if="tags.length">
          <span class="tag-pill" v-for="(t, i) in tags" :key="t" @click="tags.splice(i,1)">{{ t }} ✕</span>
        </div>

        <label>封面图片</label>
        <div class="upload-area" @click="$refs.coverInput.click()" @dragover.prevent @drop.prevent="onCoverDrop">
          <span v-if="coverUploading">⏳</span>
          <span v-else-if="coverImage">✅ 已上传</span>
          <span v-else>📁 拖拽或点击上传</span>
        </div>
        <input ref="coverInput" type="file" accept="image/*" @change="onCoverFile" hidden />
        <img v-if="coverImage" :src="coverImage" class="preview-pic" />

        <hr />
        <button class="mui-btn text danger" v-if="editingId" @click="deletePost">删除这篇文章</button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { admin } from '../../api/admin.js'
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'

/* Theme — listen for custom event from App.vue */
function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark' }
const themeRef = ref(getTheme())
function onTheme(e) { themeRef.value = e.detail }
window.addEventListener('theme-change', onTheme)
onBeforeUnmount(() => window.removeEventListener('theme-change', onTheme))

const route = useRoute()
const router = useRouter()
const editingId = ref(route.query.id ? Number(route.query.id) : null)

const title = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const summary = ref('')
const tags = ref([])
const tagInput = ref('')
const coverImage = ref('')
const coverUploading = ref(false)
const showMeta = ref(true)

const editorWrap = ref(null)
let editor = null

function addTag() {
  const t = tagInput.value.replace(/,/g, '').trim()
  if (t && !tags.value.includes(t)) tags.value.push(t)
  tagInput.value = ''
}

/* Cover upload */
async function uploadCover(file) {
  if (!file) return
  coverUploading.value = true
  try { coverImage.value = await admin.uploadImage(file) } catch {}
  finally { coverUploading.value = false }
}
function onCoverFile(e) { uploadCover(e.target.files?.[0]) }
function onCoverDrop(e) { e.preventDefault(); uploadCover(e.dataTransfer?.files?.[0]) }

/* Editor */
function initEditor(val = '') {
  if (editor) editor.destroy()
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  editor = new Editor({
    el: editorWrap.value,
    height: 'calc(100vh - 120px)',
    initialValue: val,
    initialEditType: 'markdown',
    previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    placeholder: '开始写 Markdown...',
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

/* Sync editor theme */
watch(themeRef, () => {
  if (!editor) return
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const md = editor.getMarkdown()
  editor.destroy()
  editor = new Editor({
    el: editorWrap.value, height: 'calc(100vh - 120px)', initialValue: md,
    initialEditType: 'markdown', previewStyle: 'vertical',
    theme: isDark ? 'dark' : 'default',
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'], ['hr', 'quote'],
      ['ul', 'ol', 'task'], ['table', 'image', 'link'],
      ['code', 'codeblock'], ['scrollSync'],
    ],
  })
})

/* Load existing post */
async function loadPost(id) {
  try {
    const p = await admin.getPost(id)
    if (p) {
      title.value = p.title
      date.value = p.date
      summary.value = p.summary
      tags.value = p.tags || []
      initEditor(p.content || '')
    }
  } catch {}
}

/* Publish */
async function publish() {
  const content = editor?.getMarkdown() || ''
  if (!title.value.trim()) return alert('Title is required')
  const data = {
    title: title.value,
    date: date.value,
    summary: summary.value,
    content,
    tags: tags.value,
  }
  try {
    if (editingId.value) {
      await admin.updatePost(editingId.value, data)
    } else {
      await admin.createPost(data)
      editingId.value = null
    }
    router.push('/desk')
  } catch (e) {
    alert(e.message)
  }
}

async function deletePost() {
  if (!editingId.value || !confirm('Delete this post?')) return
  try { await admin.deletePost(editingId.value); router.push('/desk') } catch (e) { alert(e.message) }
}

/* Init */
onMounted(async () => {
  await nextTick()
  if (editingId.value) {
    loadPost(editingId.value)
  } else {
    initEditor('')
  }
})

onBeforeUnmount(() => {
  if (editor) editor.destroy()
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   WRITE — GLASSMORPHISM EDITION
   ═══════════════════════════════════════════ */

/* ── Shell ── */
.write-shell {
  position: fixed; inset: 0; z-index: 999;
  display: flex; flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ── Toolbar ── */
.write-toolbar {
  height: 54px; display: flex; align-items: center; gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  flex-shrink: 0;
}
.back-btn {
  font-size: 0.85rem; color: var(--text-muted); text-decoration: none;
  transition: color 0.2s;
}
.back-btn:hover { color: var(--accent-light); }
.write-mode { font-size: 0.8rem; color: var(--text-muted); }
.toolbar-right { margin-left: auto; display: flex; gap: 8px; }

/* ── Body ── */
.write-body { display: flex; flex: 1; overflow: hidden; }

/* ── Editor ── */
.write-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.write-editor.with-meta { border-right: 1px solid var(--glass-border); }
.write-title {
  border: none; padding: 24px 28px 16px; font-size: 1.8rem; font-weight: 700;
  background: transparent; color: var(--text-hero); outline: none;
  font-family: var(--font-display); letter-spacing: -0.5px;
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
.tag-input-row { display: flex; gap: 4px; }
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
.mui-btn.primary {
  background: var(--accent-gradient); color: #fff;
  box-shadow: var(--glow-indigo);
}
.mui-btn.primary:hover { box-shadow: 0 0 24px rgba(99, 102, 241, 0.35); transform: translateY(-1px); }
.mui-btn.outlined {
  background: transparent; border: 1px solid var(--glass-border); color: var(--text-primary);
}
.mui-btn.outlined:hover { border-color: var(--accent-2); background: var(--accent-dim); }
.mui-btn.text { background: transparent; color: var(--accent-light); padding: 4px 10px; font-size: 0.8rem; }
.mui-btn.text:hover { background: var(--accent-dim); }
.mui-btn.text.danger { color: #ef4444; }
.mui-btn.text.danger:hover { background: rgba(239, 68, 68, 0.08); }

/* ── Upload ── */
.upload-area {
  border: 2px dashed var(--glass-border); border-radius: var(--radius);
  padding: 18px; text-align: center; color: var(--text-muted);
  font-size: 0.8rem; cursor: pointer;
  transition: all 0.2s var(--ease);
}
.upload-area:hover { border-color: var(--accent-2); background: var(--accent-dim); }
.preview-pic { width: 100%; max-height: 150px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 8px; }

/* ── Tags ── */
.tag-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag-pill {
  font-size: 0.7rem; padding: 3px 10px; border-radius: 12px;
  background: var(--accent-dim); color: var(--accent-light);
  border: 1px solid rgba(99, 102, 241, 0.15);
  cursor: pointer; transition: all 0.15s;
}
.tag-pill:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
</style>
