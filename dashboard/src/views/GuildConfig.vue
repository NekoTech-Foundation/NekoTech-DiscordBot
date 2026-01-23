<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import Layout from '../components/Layout.vue';
import Button from '../components/ui/Button.vue';
import Input from '../components/ui/Input.vue';
import Card from '../components/ui/Card.vue';
import EmbedEditor from '../components/EmbedEditor.vue';
import AutoresponderList from '../components/AutoresponderList.vue';

const route = useRoute();
const router = useRouter();
const guildId = route.params.id;
const userId = localStorage.getItem('userId');

const loading = ref(true);
const saving = ref(false);
const activeTab = ref('general');

const config = ref({
    prefix: 'k',
    language: 'vn',
    leveling: { enabled: true },
    welcome: { enabled: false, message: '', useEmbed: false, embed: {} },
    leave: { enabled: false, message: '', useEmbed: false, embed: {} },
    moderation: { logChannels: { ban: '', kick: '', timeout: '', voice: '', message: '' } },
    autoresponder: []
});

onMounted(async () => {
    try {
        const res = await axios.get(`/api/dashboard/guilds/${guildId}/config`, {
            headers: { 'x-user-id': userId }
        });
        
        // Merge defaults to avoid null errors
        const data = res.data;
        if (!data.moderation) data.moderation = { logChannels: {} };
        if (!data.autoresponder) data.autoresponder = [];
        if (!data.welcome.embed) data.welcome.embed = {};
        if (!data.leave.embed) data.leave.embed = {};

        config.value = data;
    } catch (e) {
        console.error(e);
        alert('Failed to load config');
        router.push('/guilds');
    } finally {
        loading.value = false;
    }
});

const saveConfig = async () => {
    saving.value = true;
    try {
        await axios.post(`/api/dashboard/guilds/${guildId}/config`, {
            config: config.value
        }, {
            headers: { 'x-user-id': userId }
        });
        alert('Configuration Saved!');
    } catch (e) {
        alert('Failed to save config: ' + e.message);
    } finally {
        saving.value = false;
    }
};

const tabs = [
    { id: 'general', label: 'General', icon: 'fa6-solid:gear' },
    { id: 'welcome', label: 'Welcome/Leave', icon: 'fa6-solid:door-open' },
    { id: 'moderation', label: 'Moderation', icon: 'fa6-solid:shield-halved' },
    { id: 'autoresponder', label: 'Autoresponder', icon: 'fa6-solid:robot' },
];
</script>

<template>
  <Layout>
    <div v-if="loading" class="flex justify-center p-12">
        <Icon icon="eos-icons:loading" class="text-4xl text-primary" />
    </div>

    <div v-else class="flex flex-col gap-6 max-w-6xl mx-auto h-full overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between shrink-0">
            <div class="flex items-center gap-4">
                <Button size="icon" variant="outline" @click="router.back()">
                    <Icon icon="fa6-solid:arrow-left" />
                </Button>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">Server Configuration</h1>
                    <p class="text-muted-foreground text-sm">Managing Guild ID: {{ guildId }}</p>
                </div>
            </div>
            <Button @click="saveConfig" :disabled="saving" :loading="saving">
                <Icon icon="fa6-solid:floppy-disk" class="mr-2" />
                Save Changes
            </Button>
        </div>

        <div class="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden min-h-0">
            <!-- Sidebar Navigation -->
            <div class="w-full md:w-64 space-y-1 shrink-0 overflow-y-auto">
                <button v-for="tab in tabs" :key="tab.id"
                    @click="activeTab = tab.id"
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium"
                    :class="activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'">
                    <Icon :icon="tab.icon" class="text-lg" />
                    {{ tab.label }}
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto pr-2 pb-12">
                
                <!-- GENERAL TAB -->
                <div v-if="activeTab === 'general'" class="space-y-6">
                    <Card class="p-6 space-y-4">
                        <h2 class="text-lg font-semibold border-b border-border pb-2">Core Settings</h2>
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input v-model="config.prefix" label="Command Prefix" />
                            <div>
                                <label class="block text-sm font-medium mb-1">Language</label>
                                <select v-model="config.language" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="vn">Vietnamese</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card class="p-6 flex items-center justify-between">
                        <div>
                             <h2 class="text-lg font-semibold">Leveling System</h2>
                             <p class="text-sm text-muted-foreground">Enable XP tracking and level up messages.</p>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" v-model="config.leveling.enabled" class="toggle toggle-primary h-6 w-11 rounded-full bg-input checked:bg-primary transition-colors cursor-pointer relative appearance-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                        </div>
                    </Card>
                </div>

                <!-- WELCOME/LEAVE TAB -->
                <div v-if="activeTab === 'welcome'" class="space-y-8">
                    <!-- Welcome Section -->
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold flex items-center gap-2">
                                <Icon icon="fa6-solid:door-open" class="text-green-500" /> Welcome
                            </h2>
                            <label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                Enable <input type="checkbox" v-model="config.welcome.enabled" class="w-4 h-4 ml-2 accent-primary" />
                            </label>
                        </div>

                        <Card v-if="config.welcome.enabled" class="p-6 space-y-4">
                            <Input v-model="config.welcome.channelId" label="Channel ID" placeholder="123456789..." />
                            
                            <div class="flex items-center gap-2 mb-2">
                                <label class="text-sm font-medium">Use Embed?</label>
                                <input type="checkbox" v-model="config.welcome.useEmbed" class="accent-primary" />
                            </div>

                            <div v-if="config.welcome.useEmbed">
                                <EmbedEditor v-model="config.welcome.embed" />
                            </div>
                            <div v-else>
                                <label class="block text-sm font-medium mb-1">Text Message</label>
                                <textarea v-model="config.welcome.message" class="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"></textarea>
                            </div>
                        </Card>
                    </div>

                    <!-- Leave Section -->
                    <div class="space-y-4 pt-6 border-t border-border">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold flex items-center gap-2">
                                <Icon icon="fa6-solid:door-closed" class="text-red-500" /> Leave
                            </h2>
                            <label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                Enable <input type="checkbox" v-model="config.leave.enabled" class="w-4 h-4 ml-2 accent-primary" />
                            </label>
                        </div>

                         <Card v-if="config.leave.enabled" class="p-6 space-y-4">
                            <Input v-model="config.leave.channelId" label="Channel ID" placeholder="123456789..." />
                            
                            <div class="flex items-center gap-2 mb-2">
                                <label class="text-sm font-medium">Use Embed?</label>
                                <input type="checkbox" v-model="config.leave.useEmbed" class="accent-primary" />
                            </div>

                            <div v-if="config.leave.useEmbed">
                                <EmbedEditor v-model="config.leave.embed" />
                            </div>
                            <div v-else>
                                <label class="block text-sm font-medium mb-1">Text Message</label>
                                <textarea v-model="config.leave.message" class="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"></textarea>
                            </div>
                        </Card>
                    </div>
                </div>

                <!-- MODERATION TAB -->
                 <div v-if="activeTab === 'moderation'" class="space-y-6">
                    <Card class="p-6 space-y-4">
                        <h2 class="text-lg font-semibold border-b border-border pb-2">Log Channels</h2>
                        <p class="text-sm text-muted-foreground">Specify Channel IDs where moderation logs should be sent.</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input v-model="config.moderation.logChannels.ban" label="Ban Logs" placeholder="Channel ID" />
                            <Input v-model="config.moderation.logChannels.kick" label="Kick Logs" placeholder="Channel ID" />
                            <Input v-model="config.moderation.logChannels.timeout" label="Timeout Logs" placeholder="Channel ID" />
                            <Input v-model="config.moderation.logChannels.voice" label="Voice Activity" placeholder="Channel ID" />
                            <Input v-model="config.moderation.logChannels.message" label="Message Deletes/Edits" placeholder="Channel ID" />
                        </div>
                    </Card>
                 </div>

                 <!-- AUTORESPONDER TAB -->
                 <div v-if="activeTab === 'autoresponder'" class="space-y-6">
                    <AutoresponderList v-model="config.autoresponder" />
                 </div>

            </div>
        </div>
    </div>
  </Layout>
</template>
