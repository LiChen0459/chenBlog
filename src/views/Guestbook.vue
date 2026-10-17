<template>
  <div class="guestbook-page">
    <span class="section-tag">&lt;guestbook&gt;</span>
    <div class="section-head">
      <h2>留言板</h2>
      <span v-if="!loading && total" class="section-count">{{ total }} 条留言</span>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Compose -->
    <form class="gb-form" @submit.prevent="submit">
      <div class="gb-form-row">
        <input
          v-model="form.nickname"
          class="gb-input"
          type="text"
          maxlength="20"
          placeholder="昵称（可留空）"
          aria-label="昵称"
        />
      </div>
      <div class="gb-form-row">
        <textarea
          v-model="form.content"
          class="gb-textarea"
          maxlength="500"
          rows="3"
          placeholder="说点什么吧…（500 字以内）"
          aria-label="留言内容"
          @input="formError = ''"
        ></textarea>
      </div>
      <!-- Honeypot: invisible to humans, bots fill it and get silently dropped. -->
      <input
        v-model="form.website"
        class="gb-honeypot"
        type="text"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
      />
      <div class="gb-form-foot">
        <span class="gb-counter">{{ form.content.length }}/500</span>
        <button class="gb-submit" type="submit" :disabled="submitting || !form.content.trim()">
          <Icon v-if="submitting" name="loader" :size="14" class="spin" />
          <Icon v-else name="send" :size="14" />
          <span>{{ submitting ? '提交中…' : '留言' }}</span>
        </button>
      </div>
      <p v-if="formError" class="gb-error">
        <Icon name="alert-circle" :size="14" />
        {{ formError }}
      </p>
    </form>

    <div v-if="loading" class="sk-loading" aria-hidden="true">
      <div class="sk-line w30" />
      <div class="sk-line w90" />
      <div class="sk-line w70" />
    </div>

    <div v-else-if="messages.length" class="gb-list">
      <article v-for="m in messages" :key="m.id" class="gb-item animate-card">
        <div class="gb-avatar" aria-hidden="true">{{ (m.nickname || '匿')[0] }}</div>
        <div class="gb-body">
          <div class="gb-meta">
            <span class="gb-nickname">{{ m.nickname || '匿名' }}</span>
            <time class="gb-time" :title="m.created_at">{{ relativeTime(m.created_at) }}</time>
          </div>
          <p class="gb-content">{{ m.content }}</p>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <Icon name="message" :size="26" />
      <span>还没有留言，来抢沙发～</span>
    </div>

    <div v-if="!loading && hasMore" class="load-more-wrap">
      <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
        <Icon v-if="loadingMore" name="loader" :size="14" class="spin" />
        <Icon v-else name="chevron-down" :size="14" />
        <span>{{ loadingMore ? '加载中…' : '加载更多留言' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onActivated } from 'vue'
import Icon from '../components/Icon.vue'
import { getMessages, postMessage } from '../api/messages.js'

const messages = ref([])
const total = ref(0)
const hasMore = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const submitting = ref(false)
const formError = ref('')

const form = reactive({ nickname: '', content: '', website: '' })

function relativeTime(iso) {
  const then = new Date(iso).getTime()
  if (!then) return ''
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toISOString().slice(0, 10)
}

async function fetchPage(offset = 0) {
  const res = await getMessages({ offset })
  if (offset) messages.value = [...messages.value, ...res.items]
  else messages.value = res.items
  total.value = res.total
  hasMore.value = res.hasMore
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await fetchPage(messages.value.length)
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

async function submit() {
  const content = form.content.trim()
  if (!content) return
  submitting.value = true
  formError.value = ''
  try {
    await postMessage({
      nickname: form.nickname.trim(),
      content,
      website: form.website,
    })
    form.content = ''
    form.nickname = ''
    form.website = ''
    await fetchPage(0) // newest first — the new message lands on top
  } catch (e) {
    formError.value = e.message || '留言失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    await fetchPage(0)
  } catch {
    messages.value = []
  } finally {
    loading.value = false
  }
})

onActivated(() => {
  document.title = "留言板 — Chen's Blog"
})
</script>
