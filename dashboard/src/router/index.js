import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import Guilds from '../views/Guilds.vue';
import GuildConfig from '../views/GuildConfig.vue';

const routes = [
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard },
    { path: '/guilds', component: Guilds },
    { path: '/guilds/:id', component: GuildConfig },
    { path: '/', redirect: '/dashboard' },
];

const router = createRouter({
    history: createWebHistory('/dashboard/'),
    routes,
});

export default router;
