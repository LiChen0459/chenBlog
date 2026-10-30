<template>
  <Teleport to="body">
    <div v-if="open" class="picker-overlay" @click.self="close">
    <section class="picker-panel" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <header class="picker-header">
        <h3 id="picker-title">从媒体库选择图片</h3>
        <button class="picker-close" aria-label="关闭媒体库" @click="close">
          <Icon name="x" :size="18" />
        </button>
      </header>

      <div v-if="groupOptions.length" class="picker-filters">
        <select v-model="filterGroup" class="picker-select" @change="onFilterChange">
          <option value="">全部分组</option>
          <option v-for="g in groupOptions" :key="g" :value="g">{{ g }}</option>
        </select>
        <span v-if="filterGroup" class="picker-count">已筛选 {{ visibleItems.length }} 张</span>
      </div>

      <div class="picker-body">
        <div v-if="error" class="picker-error" role="alert">
          <span>{{ error }}</span>
          <button type="button" @click="retryLoad">重试</button>
        </div>

        <div v-if="loading && !items.length" class="picker-grid">
          <div v-for="n in 8" :key="`sk-${n}`" class="picker-item picker-sk">
            <div class="sk-rect" />
          </div>
        </div>

        <div v-else-if="visibleItems.length" class="picker-grid">
          <div
            v-for="item in visibleItems"
            :key="item.url"
            class="picker-item"
            :class="{ selected: selectedUrl === item.url }"
            @click="pick(item)"
          >
            <img :src="item.url" :alt="mediaName(item)" loading="lazy" />
            <div v-if="item.meta?.group" class="picker-tag">{{ item.meta.group }}</div>
          </div>
        </div>

        <div v-else-if="!error" class="picker-empty">
          <Icon name="image" :size="24" />
          <span>{{ filterGroup ? '该分组暂无图片' : '还没有图片' }}</span>
        </div>
      </div>

      <div class="picker-footer">
        <button
          v-if="hasMore || filteredHasMore"
          class="mui-btn outlined"
          :disabled="loading"
          @click="loadMore"
        >
          <Icon v-if="loading" name="loader" :size="14" class="spin" />
          <span>{{ loading ? '加载中…' : '加载更多' }}</span>
        </button>
        <span v-else-if="visibleItems.length" class="picker-done">已加载全部</span>
      </div>
    </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { getMedia } from '../api/media.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'select'])

const items = ref([])
const cursor = ref(null)
const hasMore = ref(false)
const loading = ref(false)
const error = ref('')
const filterGroup = ref('')
const selectedUrl = ref('')

const PAGE = 40

const groupOptions = computed(() => {
  const s = new Set()
  for (const it of items.value) {
    const g = String(it.meta?.group || '').trim()
    if (g) s.add(g)
  }
  return [...s].sort()
})

const visibleItems = computed(() => {
  if (!filterGroup.value) return items.value
  return items.value.filter((it) => (it.meta?.group || '') === filterGroup.value)
})

const filteredHasMore = computed(() => {
  // If filtering, we may need more pages to find items in the chosen group.
  if (!filterGroup.value) return hasMore.value
  return hasMore.value
})

async function load(reset) {
  if (loading.value) return activeLoad
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  activeLoad = (async () => {
    try {
      const page = await getMedia({ cursor: reset ? undefined : cursor.value || undefined, limit: PAGE })
      if (seq !== requestSeq || !props.open) return
      const arr = page.items || []
      items.value = reset ? arr : [...items.value, ...arr]
      cursor.value = page.cursor ?? null
      hasMore.value = !!page.hasMore
    } catch {
      if (seq === requestSeq) error.value = '媒体库加载失败，请检查网络后重试。'
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  })()
  return activeLoad
}

function loadMore() {
  load(false)
}

async function onFilterChange() {
  // If filtering and we already have items, no need to reload.
  // If the filtered view is empty but hasMore is true, auto-load next pages
  // until we find some or exhaust the store.
  while (filterGroup.value && !visibleItems.value.length && hasMore.value && !error.value) {
    await load(false)
  }
}

function retryLoad() {
  load(!items.value.length)
}

function pick(item) {
  selectedUrl.value = item.url
  emit('select', item.url)
  // Keep open for multi; caller decides whether to close.
}

function close() {
  emit('close')
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

let previousBodyOverflow = ''
let requestSeq = 0
let activeLoad = null

function mediaName(item) {
  const p = String(item.pathname || item.url || '')
  try { return decodeURIComponent(p.split('/').pop() || p) } catch { return p.split('/').pop() || p }
}

watch(() => props.open, (v) => {
  if (v) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    filterGroup.value = ''
    selectedUrl.value = ''
    load(true)
  } else {
    requestSeq++
    loading.value = false
    error.value = ''
    document.body.style.overflow = previousBodyOverflow
    window.removeEventListener('keydown', onKeydown)
    items.value = []
    cursor.value = null
    hasMore.value = false
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.picker-overlay {
  position: fixed; inset: 0; z-index: 5000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.68);
  backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
}
.picker-panel {
  width: min(900px, 100%);
  max-height: min(760px, calc(100vh - 32px));
  display: flex; flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  overflow: hidden;
}
.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.picker-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
.picker-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: transparent; border: none; color: var(--text-muted); cursor: pointer;
  transition: all 0.2s;
}
.picker-close:hover { background: var(--bg-secondary); color: var(--text-primary); }

.picker-filters {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px; border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.picker-select {
  padding: 6px 10px; font-size: 0.8rem;
  border: 1px solid var(--glass-border); border-radius: 8px;
  background: var(--bg-input); color: var(--text-primary);
  min-width: 140px;
}
.picker-count { font-size: 0.75rem; color: var(--text-muted); }

.picker-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.picker-item {
  position: relative; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden;
  border: 2px solid transparent; cursor: pointer;
  background: var(--bg-secondary);
  transition: border-color 0.15s, transform 0.15s;
}
.picker-item:hover { border-color: var(--accent-2); transform: translateY(-2px); }
.picker-item.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(41,151,255,0.25); }
.picker-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.picker-tag {
  position: absolute; bottom: 6px; left: 6px;
  font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;
  background: rgba(0,0,0,0.6); color: #fff; pointer-events: none;
}
.picker-sk .sk-rect { width: 100%; height: 100%; border-radius: 8px; background: var(--sk-base); }

.picker-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px; color: var(--text-muted); font-size: 0.85rem;
}
.picker-error {
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;
  padding: 24px 12px; color: #ef6b67; font-size: 0.86rem; text-align: center;
}
.picker-error button {
  padding: 5px 12px; border: 1px solid var(--border-hover); border-radius: 999px;
  background: var(--bg-card); color: var(--accent-ink); font: inherit; cursor: pointer;
}

.picker-footer {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px; border-top: 1px solid var(--glass-border); flex-shrink: 0;
}
.picker-done { font-size: 0.78rem; color: var(--text-muted); }

.mui-btn.outlined {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid var(--glass-border); border-radius: 8px;
  background: transparent; color: var(--text-primary); font-size: 0.8rem; cursor: pointer;
}
.mui-btn.outlined:hover { border-color: var(--accent-2); background: var(--accent-dim); }
.mui-btn:disabled { opacity: 0.55; cursor: not-allowed; }

@media (max-width: 768px) {
  .picker-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
  .picker-panel { max-height: calc(100vh - 24px); }
}
</style>
