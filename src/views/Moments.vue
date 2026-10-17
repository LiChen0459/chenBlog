<template>
  <div class="moments-page">
    <span class="section-tag">&lt;moments&gt;</span>
    <div class="section-head">
      <h2>动态</h2>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Unlock: hidden moments are revealed with the access password -->
    <div v-if="!loading && !unlocked && hiddenCount > 0" class="unlock-bar">
      <button class="unlock-toggle" @click="showUnlock = !showUnlock" :aria-expanded="showUnlock">
        <Icon name="lock" :size="15" />
        <span>有 {{ hiddenCount }} 条隐藏动态</span>
        <span class="unlock-cta">{{ showUnlock ? '收起' : '输入密码查看' }}</span>
      </button>
      <form v-if="showUnlock" class="unlock-form" @submit.prevent="unlock">
        <div class="unlock-input-wrap">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="输入访问密码"
            autocomplete="current-password"
            aria-label="访问密码"
            @input="unlockError = ''"
          />
          <button
            type="button"
            class="unlock-eye"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="15" />
          </button>
        </div>
        <button type="submit" class="unlock-submit" :disabled="unlocking || !password">
          <Icon v-if="unlocking" name="loader" :size="14" class="spin" />
          <span>{{ unlocking ? '验证中…' : '解锁' }}</span>
        </button>
      </form>
      <p v-if="unlockError" class="unlock-error">
        <Icon name="x" :size="13" />
        {{ unlockError }}
      </p>
    </div>

    <div v-else-if="!loading && unlocked" class="unlock-bar unlocked">
      <span class="unlock-note">
        <Icon name="unlock" :size="15" />
        已解锁 · 显示全部动态
      </span>
      <button class="unlock-ghost" @click="relock">
        <Icon name="lock" :size="13" />
        重新隐藏
      </button>
    </div>

    <!-- Tag filter -->
    <div class="tag-bar" v-if="allTags.length">
      <span class="tag-pill" :class="{ active: !activeTag }" @click="activeTag = null">全部</span>
      <span
        v-for="t in allTags" :key="t" class="tag-pill"
        :class="{ active: activeTag === t }" @click="activeTag = activeTag === t ? null : t"
      >{{ t }}</span>
    </div>

    <div v-if="loading" class="timeline sk-loading" aria-hidden="true">
      <div class="timeline-group">
        <div class="timeline-date">&nbsp;</div>
        <div v-for="n in 3" :key="`sk-${n}`" class="sk-card">
          <div class="sk-line w30" />
          <div class="sk-line w90" />
          <div class="sk-line w45" />
        </div>
      </div>
    </div>

    <div v-else-if="filteredMoments.length" class="timeline">
      <div
        v-for="(group, date) in grouped"
        :key="date"
        class="timeline-group animate-card"
      >
        <div class="timeline-date">{{ date }}</div>
        <div
          v-for="m in group"
          :key="m.id"
          class="moment-card"
          :class="{ 'is-hidden': m.hidden }"
        >
          <span class="moment-time">
            <Icon name="clock" :size="12" />
            {{ m.time }}
          </span>
          <span v-if="m.hidden" class="hidden-flag" title="这条动态已被隐藏">
            <Icon name="lock" :size="11" /> 已隐藏
          </span>
          <p>{{ m.content }}</p>
          <MomentGallery :images="m.images" @open="openLightbox($event, m)" />
          <div class="tag-pills" v-if="m.tags?.length">
            <span class="tag-pill" v-for="t in m.tags" :key="t">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <Icon name="camera" :size="26" />
      <span>{{ activeTag ? `没有「${activeTag}」标签的动态` : '还没有动态' }}</span>
    </div>

    <Lightbox
      :open="lb.open"
      :images="lb.images"
      :start="lb.start"
      @close="lb.open = false"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onActivated } from 'vue'
import Icon from '../components/Icon.vue'
import MomentGallery from '../components/MomentGallery.vue'
import Lightbox from '../components/Lightbox.vue'
import { getMoments, getHiddenMomentCount, unlockMoments } from '../api/moments.js'
import { moments as staticMoments } from '../data/posts.js'
import { momentImages } from '../utils/moment.js'
import { setSeo } from '../utils/seo.js'

const UNLOCK_KEY = 'moments_unlock_token'

const moments = ref([])
const activeTag = ref(null)
const loading = ref(true)

const unlocked = ref(false)
const hiddenCount = ref(0)
const showUnlock = ref(false)
const showPassword = ref(false)
const password = ref('')
const unlockError = ref('')
const unlocking = ref(false)

const allTags = computed(() => [...new Set(moments.value.flatMap(m => m.tags || []))].sort())
const filteredMoments = computed(() =>
  activeTag.value ? moments.value.filter(m => (m.tags || []).includes(activeTag.value)) : moments.value
)
const grouped = computed(() => {
  const map = {}
  for (const m of filteredMoments.value) {
    if (!map[m.date]) map[m.date] = []
    map[m.date].push(m)
  }
  return map
})

const lb = reactive({ open: false, images: [], start: 0 })
function openLightbox(index, moment) {
  lb.images = momentImages(moment)
  lb.start = index
  lb.open = true
}

const normalise = (m) => ({ ...m, images: momentImages(m) })

async function loadMoments(unlockToken = '') {
  const list = await getMoments(undefined, unlockToken)
  moments.value = (list || []).map(normalise)
}

async function refreshHiddenCount() {
  try {
    hiddenCount.value = await getHiddenMomentCount()
  } catch {
    hiddenCount.value = 0
  }
}

async function unlock() {
  const pwd = password.value.trim()
  if (!pwd) return
  unlocking.value = true
  unlockError.value = ''
  try {
    const { token } = await unlockMoments(pwd)
    sessionStorage.setItem(UNLOCK_KEY, token)
    unlocked.value = true
    showUnlock.value = false
    password.value = ''
    hiddenCount.value = 0
    await loadMoments(token)
  } catch (e) {
    unlockError.value = e.status === 401 ? '密码不正确' : (e.message || '验证失败，请稍后重试')
  } finally {
    unlocking.value = false
  }
}

function relock() {
  sessionStorage.removeItem(UNLOCK_KEY)
  unlocked.value = false
  loadMoments().catch(() => {})
  refreshHiddenCount()
}

onMounted(async () => {
  setSeo({ title: '动态', description: '碎片化的想法与日常，像朋友圈一样。', path: '/moments' })
  const saved = sessionStorage.getItem(UNLOCK_KEY) || ''
  try {
    const [list, count] = await Promise.all([
      getMoments(undefined, saved).catch(() => null),
      getHiddenMomentCount().catch(() => 0),
    ])

    moments.value = list ? list.map(normalise) : staticMoments.map(normalise)
    hiddenCount.value = count

    // A stored token is only treated as valid if it actually revealed something —
    // an expired token silently comes back without the hidden entries.
    if (saved && count > 0 && moments.value.some(m => m.hidden)) {
      unlocked.value = true
    } else if (saved) {
      sessionStorage.removeItem(UNLOCK_KEY)
    }
  } finally {
    loading.value = false
  }
})

onActivated(() => {
  setSeo({ title: '动态', description: '碎片化的想法与日常，像朋友圈一样。', path: '/moments' })
})
</script>
