import './assets/main.css'

import { registerSW } from 'virtual:pwa-register'
import { createApp } from 'vue'

import App from './App.vue'
import { pinia } from './stores/pinia'
import router from './router'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

// New service worker versions activate on their own; reload picks them up
registerSW({ immediate: true })
