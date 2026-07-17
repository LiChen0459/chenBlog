<template>
  <div class="app">
    <!-- Fixed sidebar (hidden on admin routes) -->
    <aside v-if="showSidebar" class="sidebar">
      <!-- Avatar + Brand -->
      <router-link to="/" class="sidebar-brand">
        <div class="brand-avatar">
          <img src="https://q.qlogo.cn/headimg_dl?dst_uin=197675469&spec=640&img_type=jpg" alt="" />
        </div>
        <div class="brand-text">
          <span class="brand-name">Chen</span>
          <span class="brand-dot">.</span>
        </div>
      </router-link>

      <nav class="sidebar-nav">
        <router-link to="/">
          <span class="nav-label">首页</span>
        </router-link>
        <router-link to="/blog">
          <span class="nav-label">文章</span>
        </router-link>
        <router-link to="/moments">
          <span class="nav-label">动态</span>
        </router-link>
      </nav>

      <button class="sidebar-theme-btn" @click="toggleTheme">
        <svg v-if="theme === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
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
