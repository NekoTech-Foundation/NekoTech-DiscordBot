<script setup>
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';
import Button from './ui/Button.vue';

const props = defineProps({
    show: Boolean,
    editData: Object
});

const emit = defineEmits(['close', 'save']);

const formData = ref({
    trigger: '',
    response: '',
    wildcard: false,
    reply: false
});

// Watch for edit data or reset
import { watch } from 'vue';
watch(() => props.show, (newVal) => {
    if (newVal) {
        if (props.editData) {
            formData.value = { ...props.editData };
        } else {
            formData.value = { trigger: '', response: '', wildcard: false, reply: false };
        }
    }
});

const save = () => {
    if (!formData.value.trigger || !formData.value.response) return;
    emit('save', { ...formData.value });
};

const insertVariable = (variable) => {
    formData.value.response += variable;
};

const variables = [
    { label: 'User Mention', value: '[user]' },
    { label: 'User Name', value: '[userName]' },
    { label: 'Invites', value: '[invites] (Premium)' }
];
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-[#1e1e24] w-full max-w-2xl rounded-xl border border-[#333] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[#333] flex justify-between items-center bg-[#23232a]">
            <h2 class="text-lg font-bold text-white uppercase tracking-wider">
                {{ editData ? 'Edit Response' : 'Add Response' }}
            </h2>
            <button @click="$emit('close')" class="text-gray-400 hover:text-white transition">
                <Icon icon="fa6-solid:xmark" class="text-xl" />
            </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-6">
            
            <!-- Trigger -->
            <div class="space-y-2">
                <label class="text-xs font-bold text-gray-400 uppercase">Trigger</label>
                <input 
                    v-model="formData.trigger"
                    type="text" 
                    placeholder="Trigger" 
                    class="w-full bg-[#15151a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition"
                />
                
                <div class="flex gap-6 mt-2">
                     <label class="flex items-center gap-2 cursor-pointer group">
                        <div class="w-4 h-4 border border-[#444] rounded flex items-center justify-center bg-[#15151a] group-hover:border-white/50 transition"
                            :class="formData.wildcard ? 'bg-primary border-primary' : ''">
                             <Icon v-if="formData.wildcard" icon="fa6-solid:check" class="text-white text-xs" />
                        </div>
                        <input type="checkbox" v-model="formData.wildcard" class="hidden" />
                        <span class="text-sm text-gray-400 group-hover:text-white transition">Wildcard (Contains)</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer group">
                         <div class="w-4 h-4 border border-[#444] rounded flex items-center justify-center bg-[#15151a] group-hover:border-white/50 transition"
                            :class="formData.reply ? 'bg-primary border-primary' : ''">
                             <Icon v-if="formData.reply" icon="fa6-solid:check" class="text-white text-xs" />
                        </div>
                        <input type="checkbox" v-model="formData.reply" class="hidden" />
                        <span class="text-sm text-gray-400 group-hover:text-white transition">Send as a reply</span>
                    </label>
                </div>
            </div>

            <!-- Response -->
            <div class="space-y-2">
                <label class="text-xs font-bold text-gray-400 uppercase">Response</label>
                <div class="relative">
                    <textarea 
                        v-model="formData.response"
                        rows="5"
                        placeholder="Response message..." 
                        class="w-full bg-[#15151a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition resize-none"
                    ></textarea>
                </div>
            </div>

             <!-- Variables -->
            <div class="space-y-2">
                 <label class="text-xs font-bold text-gray-400 uppercase">Variables</label>
                 <div class="flex flex-wrap gap-2">
                    <button 
                        v-for="v in variables" 
                        :key="v.value"
                        @click="insertVariable(v.value)"
                        class="px-3 py-1 bg-[#2a2a35] hover:bg-[#333] rounded text-xs text-primary font-mono transition border border-transparent hover:border-primary/30"
                    >
                        {{ v.value }}
                    </button>
                    <span class="text-xs text-gray-500 py-1 ml-2">Click to insert</span>
                 </div>
            </div>

        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-[#333] bg-[#23232a] flex justify-end gap-3">
             <Button variant="outline" @click="$emit('close')" class="border-[#444] hover:bg-[#333] text-gray-300">
                Cancel
            </Button>
            <Button @click="save" class="px-8 font-bold">
                {{ editData ? 'Save Changes' : 'Add Response' }}
            </Button>
        </div>
    </div>
  </div>
</template>
