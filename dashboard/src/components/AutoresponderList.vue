<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import Card from './ui/Card.vue';
import Button from './ui/Button.vue';
import ResponseModal from './ResponseModal.vue';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue']);

const showModal = ref(false);
const editingIndex = ref(-1);
const editData = ref(null);

const addTrigger = () => {
    editingIndex.value = -1;
    editData.value = null;
    showModal.value = true;
};

const editTrigger = (index) => {
    editingIndex.value = index;
    editData.value = { ...props.modelValue[index] };
    showModal.value = true;
};

const deleteTrigger = (index) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    const newList = props.modelValue.filter((_, i) => i !== index);
    emit('update:modelValue', newList);
};

const handleSave = (data) => {
    const newList = [...props.modelValue];
    if (editingIndex.value === -1) {
        newList.push(data);
    } else {
        newList[editingIndex.value] = data;
    }
    emit('update:modelValue', newList);
    showModal.value = false;
};
</script>

<template>
  <div class="space-y-6">
    <!-- List -->
    <div class="space-y-4">
        <!-- Toolbar -->
        <div class="flex justify-between items-center bg-[#2b2d31] p-4 rounded-xl border border-transparent">
             <div class="flex items-center gap-3">
                 <div class="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
                    <Icon icon="fa6-solid:robot" />
                 </div>
                 <div>
                     <h3 class="font-bold text-white">Auto Responders</h3>
                     <p class="text-xs text-gray-400">Manage automated replies.</p>
                 </div>
             </div>
             <Button size="sm" @click="addTrigger" class="bg-[#5865F2] hover:bg-[#4752c4] text-white">
                <Icon icon="fa6-solid:plus" class="mr-2" /> Add Response
             </Button>
        </div>

        <!-- Empty State -->
        <div v-if="modelValue.length === 0" class="text-center py-16 text-gray-500 bg-[#2b2d31] rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center gap-2">
            <Icon icon="fa6-solid:ghost" class="text-4xl opacity-50" />
            <p>No autoresponders configured yet.</p>
        </div>

        <!-- Grid Layout -->
        <div v-else class="grid grid-cols-1 gap-3">
            <div v-for="(item, i) in modelValue" :key="i" class="group flex items-center justify-between p-5 bg-[#2b2d31] rounded-xl border border-transparent hover:border-[#5865F2]/50 transition duration-200">
                <div class="flex-1 min-w-0 pr-4">
                    <div class="font-bold text-white flex items-center gap-2 mb-1">
                        <span class="truncate">{{ item.trigger }}</span>
                        <span v-if="item.wildcard" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">Wildcard</span>
                        <span v-if="item.reply" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">Reply</span>
                    </div>
                    <div class="text-sm text-gray-400 truncate">{{ item.response }}</div>
                </div>
                <div class="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="editTrigger(i)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e1f22] text-gray-400 hover:text-white hover:bg-[#5865F2] transition">
                        <Icon icon="fa6-solid:pen" class="text-xs" />
                    </button>
                    <button @click="deleteTrigger(i)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1e1f22] text-gray-400 hover:text-white hover:bg-red-500 transition">
                        <Icon icon="fa6-solid:trash" class="text-xs" />
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal -->
    <ResponseModal 
        :show="showModal"
        :editData="editData"
        @close="showModal = false"
        @save="handleSave"
    />
  </div>
</template>
