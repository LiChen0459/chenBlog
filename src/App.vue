<template>
  <div class="app">
    <!-- Fixed sidebar (hidden on admin routes) -->
    <aside v-if="showSidebar" class="sidebar">
      <!-- Avatar + Brand -->
      <router-link to="/" class="sidebar-brand">
        <div class="brand-avatar">
          <img src="/avatar.svg" alt="" />
        </div>
        <div class="brand-text">
          <span class="brand-name">Chen</span>
          <span class="brand-dot">.</span>
        </div>
      </router-link>

      <nav class="sidebar-nav">
        <router-link to="/">
          <Icon name="home" :size="16" />
          <span class="nav-label">首页</span>
        </router-link>
        <router-link to="/blog">
          <Icon name="file-text" :size="16" />
          <span class="nav-label">文章</span>
        </router-link>
        <router-link to="/moments">
          <Icon name="camera" :size="16" />
          <span class="nav-label">动态</span>
        </router-link>
      </nav>

      <button
        class="sidebar-theme-btn"
        :title="theme === 'light' ? '切换到深色' : '切换到浅色'"
        @click="toggleTheme"
      >
        <Icon :name="theme === 'light' ? 'moon' : 'sun'" :size="16" />
        <span class="theme-label">{{ theme === 'light' ? '深色' : '浅色' }}</span>
      </button>

      <div class="sidebar-footer">
        <p class="sidebar-copy">© {{ year }} Chen</p>
      </div>
    </aside>

    <!-- Main content area -->
    <main class="main-content" :class="{ 'no-sidebar': !showSidebar }">
      <div class="content-inner">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
      <div class="mobile-footer">
        <p>© {{ year }} Chen's Blog · keep writing, keep sharing</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'

/* ── Theme ── */
const stored = localStorage.getItem('blog-theme') || 'dark'
const theme = ref(stored)

function applyTheme(t) {
  theme.value = t
  localStorage.setItem('blog-theme', t)
  document.documentElement.setAttribute('data-theme', t)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: t }))
}

function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light')
}

provide('theme', theme)
provide('toggleTheme', toggleTheme)

/* ── Hide sidebar on admin routes ── */
const route = useRoute()
const showSidebar = computed(() => !route.path.startsWith('/desk'))

/* ── Year ── */
const year = new Date().getFullYear()

onMounted(() => {
  document.documentElement.setAttribute('data-theme', stored)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: stored }))
})
</script>
