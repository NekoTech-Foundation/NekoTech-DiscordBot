<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import Button from './ui/Button.vue';
import { Icon } from '@iconify/vue';

const props = defineProps(['userId']); // Pass userId prop if needed, or use localStorage

const content = ref('');
const loading = ref(true);
const saving = ref(false);
const originalContent = ref('');

const hasChanges = computed(() => content.value !== originalContent.value);

const fetchConfig = async () => {
    loading.value = true;
    try {
        const userId = localStorage.getItem('userId');
        const res = await axios.get('/api/dashboard/config', {
            headers: { 'x-user-id': userId }
        });
        content.value = res.data.content;
        originalContent.value = res.data.content;
    } catch (e) {
        alert('Failed to load config');
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const saveConfig = async () => {
    if (!confirm('Are you sure you want to save changes? Incorrect YAML config can crash your bot.')) return;
    
    saving.value = true;
    try {
        const userId = localStorage.getItem('userId');
        await axios.post('/api/dashboard/config', { content: content.value }, {
            headers: { 'x-user-id': userId }
        });
        originalContent.value = content.value;
        alert('Config saved! Please restart the instance to apply changes.');
    } catch (e) {
        alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
        saving.value = false;
    }
};

onMounted(fetchConfig);
</script>

<template>
  <div class="flex flex-col h-full bg-[#1e1e1e] rounded-lg border border-[#333] shadow-inner font-mono text-sm relative group">
    <!-- Toolbar -->
    <div class="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#333]">
        <div class="flex items-center gap-2 text-gray-400">
             <Icon icon="fa6-solid:file-code" />
             <span class="font-semibold">config.yml</span>
             <span v-if="hasChanges" class="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full ml-2">Unsaved Changes</span>
        </div>
        <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" @click="fetchConfig" :disabled="saving" title="Reset">
                <Icon icon="fa6-solid:rotate-left" />
            </Button>
            <Button size="sm" @click="saveConfig" :loading="saving" :disabled="!hasChanges">
                <Icon icon="fa6-solid:floppy-disk" class="mr-2" />
                Save Changes
            </Button>
        </div>
    </div>

    <!-- Editor Area -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-gray-500">
        <Icon icon="eos-icons:loading" class="text-3xl" />
    </div>

    <textarea 
        v-else 
        v-model="content" 
        class="flex-1 w-full h-full bg-[#1e1e1e] text-gray-300 p-4 resize-none focus:outline-none focus:ring-0 font-mono leading-relaxed scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent border-0"
        spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: #1e1e1e; 
}
::-webkit-scrollbar-thumb {
  background: #444; 
  border-radius: 5px;
  border: 2px solid #1e1e1e;
}
::-webkit-scrollbar-thumb:hover {
  background: #555; 
}
</style>
