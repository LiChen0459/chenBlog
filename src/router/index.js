import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('../views/Blog.vue'),
  },
  {
    path: '/blog/:id',
    name: 'BlogDetail',
    component: () => import('../views/BlogDetail.vue'),
  },
  {
    path: '/moments',
    name: 'Moments',
    component: () => import('../views/Moments.vue'),
  },
  {
    // 归档：时间线 + 分类 + 标签
    path: '/archive',
    name: 'Archive',
    component: () => import('../views/Archive.vue'),
  },
  {
    // 分类支持层级路径：/category/技术 与 /category/技术/前端
    path: '/category/:pathMatch(.*)*',
    name: 'Category',
    component: () => import('../views/Category.vue'),
  },
  {
    path: '/tag/:name',
    name: 'Tag',
    component: () => import('../views/Tag.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
  },
  {
    // 独立页面：关于我、友情链接等（不按时间排序）
    path: '/page/:slug',
    name: 'Page',
    component: () => import('../views/PageView.vue'),
  },
  {
    path: '/guestbook',
    name: 'Guestbook',
    component: () => import('../views/Guestbook.vue'),
  },
  {
    path: '/desk',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
  },
  {
    path: '/desk/write',
    name: 'Write',
    component: () => import('../views/admin/Write.vue'),
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Browser back/forward (popstate): restore where the user actually was.
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})
