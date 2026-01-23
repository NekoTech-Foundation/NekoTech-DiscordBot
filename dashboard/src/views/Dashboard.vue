<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import Layout from '../components/Layout.vue';
import Card from '../components/ui/Card.vue';
import Button from '../components/ui/Button.vue';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const botStatus = ref('OFFLINE');
const subscription = ref(null);
const userId = ref(localStorage.getItem('userId'));
const token = ref(localStorage.getItem('token'));

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
</script>

<template>
  <Layout>
    <div v-if="loading" class="flex h-full items-center justify-center">
        <Icon icon="eos-icons:loading" class="text-4xl text-primary" />
    </div>

    <div v-else class="flex flex-col gap-6 max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-2">
            <div>
                <h1 class="text-3xl font-bold tracking-tight">Instance Control</h1>
                <p class="text-muted-foreground">Manage your Whitelabel Bot instance.</p>
            </div>
            <div class="px-4 py-2 bg-muted/50 rounded-lg border border-border text-sm font-mono text-muted-foreground">
                ID: {{ userId }}
            </div>
        </div>

        <!-- content grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
            <!-- Status Card -->
            <Card class="flex flex-col items-center justify-center gap-6 p-8">
                <div class="relative">
                    <div class="w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500"
                        :class="botStatus === 'ONLINE' ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-destructive bg-destructive/10'">
                        <Icon :icon="botStatus === 'ONLINE' ? 'fa6-solid:power-off' : 'fa6-solid:ban'" 
                            class="text-5xl transition-colors duration-300"
                            :class="botStatus === 'ONLINE' ? 'text-green-500' : 'text-destructive'" />
                    </div>
                </div>
                
                <div class="text-center">
                    <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Status</h2>
                    <p class="font-mono text-2xl font-bold" :class="botStatus === 'ONLINE' ? 'text-green-500' : 'text-destructive'">
                        {{ botStatus }}
                    </p>
                </div>
            </Card>

            <!-- Controls -->
            <Card class="md:col-span-2 flex flex-col justify-between">
                <div>
                     <h2 class="text-xl font-semibold flex items-center gap-2 mb-6">
                        <Icon icon="fa6-solid:gamepad" class="text-primary" /> Actions
                    </h2>
                    
                    <div class="grid grid-cols-3 gap-4">
                        <Button @click="sendAction('start')" variant="outline" class="h-24 flex flex-col gap-2 hover:border-green-500 hover:bg-green-500/10 hover:text-green-500 transition-all group">
                            <Icon icon="fa6-solid:play" class="text-3xl mb-1 group-hover:scale-110 transition-transform" />
                            Start
                        </Button>
                        <Button @click="sendAction('restart')" variant="outline" class="h-24 flex flex-col gap-2 hover:border-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-500 transition-all group">
                            <Icon icon="fa6-solid:rotate" class="text-3xl mb-1 group-hover:rotate-180 transition-transform duration-500" />
                            Restart
                        </Button>
                        <Button @click="sendAction('stop')" variant="outline" class="h-24 flex flex-col gap-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all group">
                            <Icon icon="fa6-solid:stop" class="text-3xl mb-1 group-hover:scale-110 transition-transform" />
                            Stop
                        </Button>
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-border">
                    <div class="bg-muted p-4 rounded-lg font-mono text-xs text-muted-foreground break-all">
                        <div class="flex justify-between border-b border-border/50 pb-2 mb-2">
                            <span>Subscription Expiry</span>
                            <span class="text-primary">{{ new Date(subscription?.expiryDate).toLocaleDateString() }}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span>Instance Path</span>
                            <span class="text-foreground/70">{{ subscription?.instancePath }}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  </Layout>
</template>
