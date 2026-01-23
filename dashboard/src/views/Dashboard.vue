<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import Layout from '../components/Layout.vue';
import Card from '../components/ui/Card.vue';
import Button from '../components/ui/Button.vue';
import Console from '../components/Console.vue';
import ConfigEditor from '../components/ConfigEditor.vue';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const botStatus = ref('OFFLINE');
const subscription = ref(null);
const userId = ref(localStorage.getItem('userId'));
const token = ref(localStorage.getItem('token'));
const activeTab = ref('overview');

onMounted(async () => {
    // Auth Callback Check
    if (route.query.userId && route.query.token) {
        userId.value = route.query.userId;
        token.value = route.query.token;
        localStorage.setItem('userId', userId.value);
        localStorage.setItem('token', token.value);
        router.replace('/dashboard');
    }

    if (!userId.value) {
        router.push('/login');
        return;
    }

    await fetchStatus();
    loading.value = false;
});

const fetchStatus = async () => {
    try {
        const res = await axios.get('/api/dashboard/status', {
            headers: { 'x-user-id': userId.value }
        });
        botStatus.value = res.data.status;
        subscription.value = res.data.subscription;
    } catch (e) {
        console.error(e);
        if (e.response && e.response.status === 403) {
            router.push('/login');
        }
    }
};

const sendAction = async (action) => {
    try {
        await axios.post('/api/dashboard/action', { action }, {
            headers: { 'x-user-id': userId.value }
        });
        await fetchStatus();
        setTimeout(fetchStatus, 2000);
    } catch (e) {
        alert('Action failed: ' + e.message);
    }
};

const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa6-solid:gauge-high' },
    { id: 'config', label: 'Configuration', icon: 'fa6-solid:sliders' },
    { id: 'deploy', label: 'Deployment', icon: 'fa6-solid:rocket', disabled: true },
];
</script>

<template>
  <Layout>
    <div v-if="loading" class="flex h-full items-center justify-center">
        <Icon icon="eos-icons:loading" class="text-4xl text-primary" />
    </div>

    <div v-else class="flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <!-- Header -->
        <div class="flex justify-between items-center mb-2 shrink-0">
            <div>
                <h1 class="text-3xl font-bold tracking-tight">Control Panel</h1>
                <p class="text-muted-foreground">Managing Whitelabel Instance</p>
            </div>
            <div class="px-4 py-2 bg-muted/50 rounded-lg border border-border text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Icon icon="fa6-solid:fingerprint" />
                ID: {{ userId }}
            </div>
        </div>

        <div class="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
            <!-- Sidebar Navigation -->
            <div class="w-full md:w-64 space-y-1 shrink-0">
                <Card class="p-2 h-full bg-[#1e1e24]/50 border-border/50 backdrop-blur">
                    <div class="space-y-1">
                        <h3 class="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</h3>
                        <button v-for="tab in tabs" :key="tab.id"
                            @click="!tab.disabled && (activeTab = tab.id)"
                            :disabled="tab.disabled"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium border border-transparent"
                            :class="[
                                activeTab === tab.id 
                                    ? 'bg-primary text-primary-foreground shadow-md border-primary/20' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                tab.disabled ? 'opacity-50 cursor-not-allowed' : ''
                            ]">
                            <Icon :icon="tab.icon" class="text-lg" />
                            {{ tab.label }}
                            <span v-if="tab.disabled" class="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">SOON</span>
                        </button>
                    </div>
                </Card>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-hidden flex flex-col min-h-0">
                
                <!-- OVERVIEW TAB -->
                <div v-if="activeTab === 'overview'" class="flex flex-col gap-6 h-full overflow-y-auto pr-1">
                     <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                        <!-- Status Card -->
                        <Card class="flex flex-col items-center justify-center gap-6 p-8 relative overflow-hidden group">
                             <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                             
                             <div class="relative z-10">
                                <div class="w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 bg-background"
                                    :class="botStatus === 'ONLINE' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'border-destructive shadow-sm'">
                                    <Icon :icon="botStatus === 'ONLINE' ? 'fa6-solid:power-off' : 'fa6-solid:ban'" 
                                        class="text-4xl transition-colors duration-300"
                                        :class="botStatus === 'ONLINE' ? 'text-green-500' : 'text-destructive'" />
                                </div>
                            </div>
                            
                            <div class="text-center z-10">
                                <h2 class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</h2>
                                <p class="font-mono text-xl font-bold" :class="botStatus === 'ONLINE' ? 'text-green-500' : 'text-destructive'">
                                    {{ botStatus }}
                                </p>
                            </div>
                        </Card>

                        <!-- Actions -->
                        <Card class="lg:col-span-2 p-6 flex flex-col justify-between">
                            <div>
                                <h2 class="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <Icon icon="fa6-solid:bolt" class="text-yellow-500" /> Power Controls
                                </h2>
                                <div class="grid grid-cols-3 gap-4">
                                    <Button @click="sendAction('start')" variant="outline" class="h-20 flex flex-col gap-2 border-border/50 hover:border-green-500 hover:bg-green-500/10 hover:text-green-500 transition-all group">
                                        <Icon icon="fa6-solid:play" class="text-2xl group-hover:scale-110 transition-transform" />
                                        Start
                                    </Button>
                                    <Button @click="sendAction('restart')" variant="outline" class="h-20 flex flex-col gap-2 border-border/50 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-500 transition-all group">
                                        <Icon icon="fa6-solid:rotate" class="text-2xl group-hover:rotate-180 transition-transform duration-500" />
                                        Restart
                                    </Button>
                                    <Button @click="sendAction('stop')" variant="outline" class="h-20 flex flex-col gap-2 border-border/50 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all group">
                                        <Icon icon="fa6-solid:stop" class="text-2xl group-hover:scale-110 transition-transform" />
                                        Stop
                                    </Button>
                                </div>
                            </div>
                            
                            <div class="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                                <span>Expiry: <span class="text-foreground">{{ new Date(subscription?.expiryDate).toLocaleDateString() }}</span></span>
                                <span class="font-mono truncate max-w-[200px]">{{ subscription?.instancePath }}</span>
                            </div>
                        </Card>
                    </div>

                    <!-- Console -->
                    <div class="flex-1 min-h-[400px]">
                        <Console />
                    </div>
                </div>

                <!-- CONFIG TAB -->
                <div v-if="activeTab === 'config'" class="h-full">
                    <ConfigEditor :userId="userId" />
                </div>
            </div>
        </div>
    </div>
  </Layout>
</template>
