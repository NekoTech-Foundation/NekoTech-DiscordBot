<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import axios from 'axios';
import { Icon } from '@iconify/vue';

const logs = ref('');
const autoScroll = ref(true);
const containerRef = ref(null);
let interval = null;
const userId = localStorage.getItem('userId');

const fetchLogs = async () => {
    try {
        const res = await axios.get('/api/dashboard/console', {
            headers: { 'x-user-id': userId }
        });
        
        if (res.data.logs !== logs.value) {
            logs.value = res.data.logs;
            if (autoScroll.value) {
                scrollToBottom();
            }
        }
    } catch (e) {
        console.error('Failed to fetch logs', e);
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        if (containerRef.value) {
            containerRef.value.scrollTop = containerRef.value.scrollHeight;
        }
    });
};

onMounted(() => {
    fetchLogs();
    interval = setInterval(fetchLogs, 2000);
});

onUnmounted(() => {
    clearInterval(interval);
});

</script>

<template>
  <div class="flex flex-col h-[400px] bg-[#1e1e1e] rounded-lg border border-[#333] shadow-inner overflow-hidden font-mono text-sm relative group">
    <!-- Header -->
    <div class="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#333]">
        <div class="flex items-center gap-2 text-gray-400">
             <Icon icon="fa6-solid:terminal" />
             <span class="font-semibold">Server Console</span>
        </div>
        <div class="flex items-center gap-2">
            <span class="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-xs text-green-500">Live</span>
        </div>
    </div>

    <!-- Terminal Output -->
    <div ref="containerRef" class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <pre class="whitespace-pre-wrap text-gray-300 leading-relaxed">{{ logs || 'Connecting to stream...' }}</pre>
    </div>

    <!-- Floating Actions (Optional, appear on hover/scroll check) -->
    <div class="absolute bottom-4 right-4 transition-opacity opacity-0 group-hover:opacity-100">
        <button 
            @click="autoScroll = !autoScroll"
            class="p-2 rounded bg-black/50 text-white hover:bg-black/80 backdrop-blur-sm border border-white/10 transition"
            :class="autoScroll ? 'text-green-400' : 'text-gray-400'"
            title="Toggle Auto-Scroll"
        >
            <Icon :icon="autoScroll ? 'fa6-solid:lock' : 'fa6-solid:lock-open'" />
        </button>
    </div>
  </div>
</template>

<style scoped>
/* Custom Scrollbar for Terminal feel */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #444; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555; 
}
</style>
