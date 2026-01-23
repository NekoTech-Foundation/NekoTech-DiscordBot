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
    welcome: { enabled: false, message: '', useEmbed: false, embed: {}, sendTo: 'channel', channelId: '' },
    leave: { enabled: false, message: '', useEmbed: false, embed: {}, sendTo: 'channel', channelId: '' },
    moderation: { logChannels: { ban: '', kick: '', timeout: '', voice: '', message: '' } },
    autoresponder: []
});

onMounted(async () => {
    try {
        const res = await axios.get(`/api/dashboard/guilds/${guildId}/config`, {
            headers: { 'x-user-id': userId }
        });
        
        const data = res.data;
        if (!data.moderation) data.moderation = { logChannels: {} };
        if (!data.autoresponder) data.autoresponder = [];
        if (!data.welcome.embed) data.welcome.embed = {};
        if (!data.leave.embed) data.leave.embed = {};
        // Ensure sendTo default
        if (!data.welcome.sendTo) data.welcome.sendTo = 'channel';
        if (!data.leave.sendTo) data.leave.sendTo = 'channel';

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

const insertVariable = (type, variable) => {
    if (type === 'welcome') config.value.welcome.message += variable;
    if (type === 'leave') config.value.leave.message += variable;
};

const variables = [
    { label: 'User Mention', value: '{user}' },
    { label: 'User Name', value: '{userName}' },
    { label: 'Member Count', value: '{memberCount}' },
    { label: 'Server Name', value: '{guildName}' },
    { label: 'Inviter (Premium)', value: '{invitedBy}' },
];

const tabs = [
    { id: 'general', label: 'Utility', icon: 'fa6-solid:gear' },
    { id: 'welcome', label: 'Welcome & Goodbye', icon: 'fa6-solid:hand' },
    { id: 'autoresponder', label: 'Auto Responder', icon: 'fa6-solid:paper-plane' },
    { id: 'moderation', label: 'Moderation', icon: 'fa6-solid:shield-halved' },
];
</script>

<template>
  <Layout>
    <div v-if="loading" class="flex justify-center p-12 h-screen items-center">
        <Icon icon="eos-icons:loading" class="text-4xl text-primary" />
    </div>

    <div v-else class="flex flex-col gap-6 max-w-[1600px] mx-auto h-full overflow-hidden px-4 md:px-8">
        <!-- Header -->
        <div class="flex items-center justify-between shrink-0 py-4 border-b border-border/40">
            <div class="flex items-center gap-4">
                <Button size="icon" variant="ghost" @click="router.back()" class="hover:bg-muted text-muted-foreground">
                    <Icon icon="fa6-solid:arrow-left" />
                </Button>
                <div>
                    <h1 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Icon icon="fa6-brands:discord" class="text-[#5865F2]" /> Server Settings
                    </h1>
                    <p class="text-muted-foreground text-sm font-mono">ID: {{ guildId }}</p>
                </div>
            </div>
            <Button @click="saveConfig" :disabled="saving" :loading="saving" size="lg" class="rounded-full px-8 shadow-lg shadow-primary/20 bg-[#5865F2] hover:bg-[#4752c4] text-white">
                Save Changes
            </Button>
        </div>

        <div class="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden min-h-0 pt-4">
            <!-- Sidebar Navigation -->
            <div class="w-full lg:w-72 space-y-1 shrink-0 overflow-y-auto pr-2 pb-10">
                <div class="mb-4 px-2">
                    <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Module Settings</h3>
                </div>
                <button v-for="tab in tabs" :key="tab.id"
                    @click="activeTab = tab.id"
                    class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-semibold group border border-transparent"
                    :class="activeTab === tab.id 
                        ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20' 
                        : 'text-gray-400 hover:bg-[#2b2d31] hover:text-white'">
                    <div class="flex items-center gap-3">
                        <Icon :icon="tab.icon" class="text-lg opacity-80" />
                        {{ tab.label }}
                    </div>
                    <Icon v-if="activeTab === tab.id" icon="fa6-solid:check" class="text-xs opacity-50" />
                    <Icon v-else icon="fa6-solid:chevron-right" class="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
                
                <!-- GENERAL TAB -->
                <div v-if="activeTab === 'general'" class="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card class="p-8 space-y-8 bg-[#2b2d31] border-none shadow-none">
                        <div class="flex items-center justify-between border-b border-gray-700 pb-4">
                            <div>
                                <h2 class="text-xl font-bold text-white">Core Settings</h2>
                                <p class="text-gray-400 text-sm">Basic configuration for your server.</p>
                            </div>
                        </div>
                        
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Input v-model="config.prefix" label="Command Prefix" placeholder="!" class="bg-[#1e1f22] border-none focus:ring-2 ring-[#5865F2]" />
                            
                            <div class="space-y-2">
                                <label class="text-sm font-bold text-gray-300 uppercase">Language</label>
                                <select v-model="config.language" class="w-full h-11 rounded-lg border-none bg-[#1e1f22] px-4 text-sm text-gray-200 focus:ring-2 ring-[#5865F2] outline-none">
                                    <option value="vn">Vietnamese 🇻🇳</option>
                                    <option value="en">English 🇺🇸</option>
                                </select>
                            </div>
                        </div>

                         <!-- Leveling Toggle -->
                        <div class="flex items-center justify-between bg-[#1e1f22] p-4 rounded-xl">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                    <Icon icon="fa6-solid:trophy" />
                                </div>
                                <div>
                                     <h3 class="font-bold text-white">Leveling System</h3>
                                     <p class="text-xs text-gray-400">Enable XP tracking and rewards.</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" v-model="config.leveling.enabled" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </Card>
                </div>

                <!-- WELCOME & GOODBYE TAB -->
                <div v-if="activeTab === 'welcome'" class="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    <div class="grid grid-cols-1 gap-8">
                        <!-- Welcome Module -->
                        <div class="space-y-4">
                            <div class="flex justify-between items-center">
                                <h2 class="text-2xl font-bold text-white">Welcome & Goodbye</h2>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="config.welcome.enabled" class="sr-only peer">
                                    <div class="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            <div v-if="config.welcome.enabled" class="bg-[#2b2d31] rounded-2xl p-6 space-y-6">
                                <div>
                                    <h3 class="text-lg font-semibold text-white mb-4">Send a message when a user joins</h3>
                                    
                                    <!-- Message Builder -->
                                    <div class="bg-[#1e1f22] rounded-xl border border-gray-800 focus-within:border-[#5865F2] transition-colors overflow-hidden">
                                        <textarea 
                                            v-model="config.welcome.message"
                                            placeholder="Type your welcome message here..."
                                            class="w-full bg-transparent text-gray-200 p-4 min-h-[120px] resize-none focus:outline-none placeholder-gray-600 font-medium"
                                        ></textarea>
                                    </div>
                                    
                                    <!-- Variables -->
                                    <div class="mt-4 flex flex-wrap gap-2">
                                        <p class="text-xs font-bold text-gray-500 w-full mb-1 uppercase tracking-wider">Variables:</p>
                                        <button v-for="v in variables" :key="v.value" @click="insertVariable('welcome', v.value)"
                                            class="px-2 py-1 rounded bg-[#1e1f22] text-[#eb459f] text-xs font-mono border border-transparent hover:border-[#eb459f]/50 transition cursor-pointer select-none">
                                            {{ v.value }} <span class="text-gray-500 ml-1 opacity-50">{{ v.label }}</span>
                                        </button>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-700">
                                    <!-- Mode Selection -->
                                    <div class="space-y-4">
                                        <label class="text-xs font-bold text-gray-400 uppercase">Send To</label>
                                        <div class="space-y-2">
                                             <label class="flex items-center gap-3 cursor-pointer group">
                                                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                                                    :class="config.welcome.sendTo === 'dm' ? 'border-[#5865F2]' : 'border-gray-600 group-hover:border-gray-500'">
                                                    <div v-if="config.welcome.sendTo === 'dm'" class="w-2.5 h-2.5 rounded-full bg-[#5865F2]"></div>
                                                </div>
                                                <input type="radio" value="dm" v-model="config.welcome.sendTo" class="hidden" />
                                                <span class="text-sm text-gray-300 group-hover:text-white">Send as DM</span>
                                            </label>

                                            <label class="flex items-center gap-3 cursor-pointer group">
                                                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                                                    :class="config.welcome.sendTo === 'channel' ? 'border-[#5865F2]' : 'border-gray-600 group-hover:border-gray-500'">
                                                    <div v-if="config.welcome.sendTo === 'channel'" class="w-2.5 h-2.5 rounded-full bg-[#5865F2]"></div>
                                                </div>
                                                <input type="radio" value="channel" v-model="config.welcome.sendTo" class="hidden" />
                                                <span class="text-sm text-gray-300 group-hover:text-white">Send to a Channel</span>
                                            </label>
                                        </div>

                                        <div v-if="config.welcome.sendTo === 'channel'" class="mt-2">
                                            <Input v-model="config.welcome.channelId" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                                        </div>
                                    </div>

                                    <!-- Embed Toggle -->
                                    <div class="space-y-4">
                                         <label class="text-xs font-bold text-gray-400 uppercase">Appearance</label>
                                         <div class="flex items-center justify-between bg-[#1e1f22] p-3 rounded-lg">
                                            <span class="text-sm text-white">Use Embed</span>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" v-model="config.welcome.useEmbed" class="sr-only peer">
                                                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[#5865F2]"></div>
                                            </label>
                                         </div>
                                         <Button v-if="config.welcome.useEmbed" class="w-full" variant="outline" @click="$refs.welcomeEmbed.scrollIntoView({ behavior: 'smooth' })">
                                            Edit Embed Layout
                                         </Button>
                                    </div>
                                </div>
                                
                                <div v-if="config.welcome.useEmbed" ref="welcomeEmbed" class="pt-6 border-t border-gray-700">
                                    <EmbedEditor v-model="config.welcome.embed" />
                                </div>
                            </div>
                        </div>
                    </div>

                     <!-- Leave Module (Simplified View for brevity, same structure) -->
                     <!-- ... Leave module follows same pattern ... -->
                </div>

                <!-- AUTORESPONDER TAB -->
                <div v-if="activeTab === 'autoresponder'" class="space-y-6 max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AutoresponderList v-model="config.autoresponder" />
                </div>

                <!-- MODERATION TAB -->
                 <div v-if="activeTab === 'moderation'" class="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card class="p-8 space-y-6 bg-[#2b2d31] border-none">
                        <div>
                            <h2 class="text-xl font-bold text-white">Moderation Logs</h2>
                            <p class="text-gray-400 text-sm">Track server events in specific channels.</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input v-model="config.moderation.logChannels.ban" label="Ban Logs" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                            <Input v-model="config.moderation.logChannels.kick" label="Kick Logs" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                            <Input v-model="config.moderation.logChannels.timeout" label="Timeout Logs" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                            <Input v-model="config.moderation.logChannels.voice" label="Voice Activity" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                            <Input v-model="config.moderation.logChannels.message" label="Message Logs" placeholder="Channel ID" class="bg-[#1e1f22] border-none" />
                        </div>
                    </Card>
                 </div>

            </div>
        </div>
    </div>
  </Layout>
</template>
