import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import Membership from './views/Membership.vue'
import siteConfig from './config/site.js'
import { initCurrentUser } from './config/membership.js'
import './assets/main.css'

document.title = `${siteConfig.siteNameEn} - ${siteConfig.siteNameZh}`

// Hydrate logged-in user from storage before rendering
initCurrentUser()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/category/:id', component: Home, props: true },
    { path: '/membership', component: Membership },
    { path: '/login', component: Login },
    { path: '/register', component: Register }
  ]
})

createApp(App).use(router).mount('#app')
