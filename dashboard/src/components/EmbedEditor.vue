<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import Card from './ui/Card.vue';
import Input from './ui/Input.vue';
import Button from './ui/Button.vue';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({
            title: '',
            description: '',
            color: '#00ff00',
            image: '',
            thumbnail: '',
            footer: ''
        })
    }
});

const emit = defineEmits(['update:modelValue']);

// Local proxy to avoid direct prop mutation
const embed = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const update = (field, value) => {
    emit('update:modelValue', { ...props.modelValue, [field]: value });
};

</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Editor -->
    <div class="space-y-4">
        <Input :modelValue="embed.title" @update:modelValue="update('title', $event)" label="Title" placeholder="Welcome Message" />
        
        <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea 
                :value="embed.description"
                @input="update('description', $event.target.value)"
                class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                placeholder="Welcome {user}!"
            ></textarea>
            <p class="text-xs text-muted-foreground mt-1">Variables: {user}, {guildName}, {memberCount}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <Input :modelValue="embed.color" @update:modelValue="update('color', $event)" label="Color (Hex)" type="color" class="h-10" />
            <Input :modelValue="embed.footer" @update:modelValue="update('footer', $event)" label="Footer Text" />
        </div>

        <div class="space-y-4">
            <Input :modelValue="embed.image" @update:modelValue="update('image', $event)" label="Image URL" placeholder="https://..." />
            <Input :modelValue="embed.thumbnail" @update:modelValue="update('thumbnail', $event)" label="Thumbnail URL" placeholder="https://..." />
        </div>
    </div>

    <!-- Preview -->
    <div class="bg-gray-800 rounded-lg p-6 font-sans text-gray-100">
        <h3 class="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Preview</h3>
        
        <div class="flex gap-4">
             <!-- Avatar/SideColor line -->
            <div class="w-1 rounded-full shrink-0" :style="{ backgroundColor: embed.color || '#3b82f6' }"></div>

            <div class="flex-1 space-y-2">
                <div v-if="embed.title" class="font-bold text-lg">{{ embed.title }}</div>
                <div v-if="embed.description" class="text-sm whitespace-pre-wrap text-gray-300">{{ embed.description || 'Embed description...' }}</div>
                
                <img v-if="embed.image" :src="embed.image" class="w-full rounded-md mt-2 max-h-64 object-cover" />
                <img v-if="embed.thumbnail" :src="embed.thumbnail" class="w-16 h-16 rounded mb-2 absolute top-4 right-4" style="position: static; float: right;" />
                
                <div v-if="embed.footer" class="text-xs text-gray-500 mt-2 flex items-center gap-2">
                     {{ embed.footer }}
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
