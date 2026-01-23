<script setup>
import { Icon } from '@iconify/vue';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'fa6-solid:gauge-high' },
  { name: 'My Servers', path: '/guilds', icon: 'fa6-solid:server' },
];

const logout = () => {
    localStorage.clear();
    router.push('/login');
};
</script>

<template>
  <div class="h-screen w-64 bg-card border-r border-border flex flex-col">
    <!-- Brand -->
    <div class="p-6 flex items-center gap-3 border-b border-border">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
            <Icon icon="fa6-solid:robot" class="text-primary-foreground" />
        </div>
        <span class="font-bold text-lg text-foreground tracking-tight">NekoTech</span>
    </div>

    <!-- Menu -->
    <nav class="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        <div class="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
        </div>
        <router-link v-for="item in menuItems" :key="item.path" :to="item.path"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group"
            :class="route.path.startsWith(item.path) && item.path !== '/' || route.path === item.path ? 
                'bg-primary/10 text-primary font-medium' : 
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground'">
            <Icon :icon="item.icon" class="text-lg transition-transform group-hover:scale-110 duration-200" />
            <span>{{ item.name }}</span>
        </router-link>
    </nav>

    <!-- User & Logout -->
    <div class="p-4 border-t border-border mt-auto">
        <button @click="logout" 
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <Icon icon="majesticons:logout-line" class="text-lg" />
            <span class="font-medium">Logout</span>
        </button>
    </div>
  </div>
</template>
