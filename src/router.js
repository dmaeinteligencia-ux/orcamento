import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/entrar', component: () => import('./views/Entrar.vue'), meta: { publica: true } },
    { path: '/', component: () => import('./views/Painel.vue'), meta: { titulo: 'Painel' } },
    { path: '/requisicoes', component: () => import('./views/Requisicoes.vue'), meta: { titulo: 'Requisições', abas: '1 e 2' } },
    { path: '/despesa', component: () => import('./views/Despesa.vue'), meta: { titulo: 'Despesa por ficha', abas: '5' } },
    { path: '/anexo2', component: () => import('./views/Anexo2.vue'), meta: { titulo: 'Anexo 02', abas: '5.1' } },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.publica && !auth.usuario) return '/entrar'
  if (to.path === '/entrar' && auth.usuario) return '/'
})

export default router
