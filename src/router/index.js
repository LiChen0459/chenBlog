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
  scrollBehavior() {
    return { top: 0 }
  },
})
