<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import Layout from '../components/Layout.vue';

const router = useRouter();
const guilds = ref([]);
const loading = ref(true);

const userId = localStorage.getItem('userId');
const token = localStorage.getItem('token');

onMounted(async () => {
    if (!userId) {
        router.push('/login');
        return;
    }
    await fetchGuilds();
});

const fetchGuilds = async () => {
    try {
        const res = await axios.get('/api/dashboard/guilds', {
            headers: { 
                'x-user-id': userId,
                'x-discord-token': token // Backend might need actual OAuth token, but we are using our flow
                // Wait, in dashboardApi.js I used 'x-discord-token' or query 'token'.
                // But my Login callback puts the ACCESS TOKEN in 'token' query param.
                // So localStorage 'token' IS the Discord Access Token.
            }
        });
        guilds.value = res.data;
    } catch (e) {
        console.error(e);
        alert('Failed to fetch guilds');
    } finally {
        loading.value = false;
    }
};

const selectGuild = (id) => {
    router.push(`/guilds/${id}`);
};

const getIconUrl = (guild) => {
    if (guild.icon) {
        return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }
    return null;
};
</script>

<template>
  <Layout>
    <div class="flex flex-col gap-6">
        <h1 class="text-3xl font-bold">My Servers</h1>
        
        <div v-if="loading" class="flex justify-center p-12">
            <Icon icon="eos-icons:loading" class="text-4xl text-blue-500" />
        </div>

        <div v-else-if="guilds.length === 0" class="text-gray-400 text-center p-12 bg-gray-900 rounded-xl border border-gray-800">
            No servers found where you have "Manage Server" permissions.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="guild in guilds" :key="guild.id" 
                @click="selectGuild(guild.id)"
                class="bg-gray-900 p-4 rounded-xl border border-gray-800 hover:border-blue-500 hover:bg-gray-800/50 transition cursor-pointer flex items-center gap-4 group">
                
                <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                    <img v-if="getIconUrl(guild)" :src="getIconUrl(guild)" class="w-full h-full object-cover" />
                    <span v-else class="text-xl font-bold text-gray-500">{{ guild.name.substring(0, 2) }}</span>
                </div>

                <div class="overflow-hidden">
                    <h3 class="font-bold text-lg truncate group-hover:text-blue-400 transition">{{ guild.name }}</h3>
                    <p class="text-xs text-gray-500">ID: {{ guild.id }}</p>
                </div>

                <Icon icon="fa6-solid:chevron-right" class="ml-auto text-gray-600 group-hover:text-blue-500" />
            </div>
        </div>
    </div>
  </Layout>
</template>
