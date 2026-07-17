import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(router)
app.mount('#app')

// Hide loading screen
const loader = document.getElementById('app-loading')
if (loader) {
  loader.classList.add('hide')
  setTimeout(() => loader.remove(), 500)
}
