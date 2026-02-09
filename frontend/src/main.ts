import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'

// Define routes
const routes = [
  {
    path: '/',
    name: 'welcome',
    component: () => import('./views/WelcomeView.vue')
  },
  {
    path: '/assessment',
    name: 'assessment',
    component: () => import('./views/AssessmentView.vue')
  },
  {
    path: '/result',
    name: 'result',
    component: () => import('./views/ResultView.vue')
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('./views/AdminView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
