<script setup>
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import Card from './ui/Card.vue';
import Button from './ui/Button.vue';
import Input from './ui/Input.vue';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue']);

const editingIndex = ref(-1);
const editForm = ref({ trigger: '', response: '', matchMode: 'exact' });

const addTrigger = () => {
    editingIndex.value = -1;
    editForm.value = { trigger: '', response: '', matchMode: 'exact' };
};

const editTrigger = (index) => {
    editingIndex.value = index;
    editForm.value = { ...props.modelValue[index] };
};

const saveTrigger = () => {
    const newList = [...props.modelValue];
    if (editingIndex.value === -1) {
        newList.push({ ...editForm.value });
    } else {
        newList[editingIndex.value] = { ...editForm.value };
    }
    emit('update:modelValue', newList);
    cancelEdit();
};

const deleteTrigger = (index) => {
    if (!confirm('Are you sure?')) return;
    const newList = props.modelValue.filter((_, i) => i !== index);
    emit('update:modelValue', newList);
};

const cancelEdit = () => {
    editingIndex.value = -1;
    editForm.value = { trigger: '', response: '', matchMode: 'exact' };
};
</script>

<template>
  <div class="space-y-6">
    <!-- List -->
    <div v-if="editingIndex === -1" class="space-y-4">
        <div class="flex justify-between items-center">
             <h3 class="text-lg font-semibold">Triggers ({{ modelValue.length }})</h3>
             <Button size="sm" @click="addTrigger">
                <Icon icon="fa6-solid:plus" class="mr-2" /> New Trigger
             </Button>
        </div>

        <div v-if="modelValue.length === 0" class="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            No autoresponders configured.
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
            <div v-for="(item, i) in modelValue" :key="i" class="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition duration-200">
                <div>
                    <div class="font-bold text-primary flex items-center gap-2">
                        {{ item.trigger }}
                        <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{{ item.matchMode }}</span>
                    </div>
                    <div class="text-sm text-foreground/80 truncate max-w-[200px] md:max-w-md">{{ item.response }}</div>
                </div>
                <div class="flex gap-2">
                    <Button variant="ghost" size="icon" @click="editTrigger(i)">
                        <Icon icon="fa6-solid:pen" />
                    </Button>
                    <Button variant="ghost" size="icon" class="text-destructive hover:bg-destructive/10" @click="deleteTrigger(i)">
                        <Icon icon="fa6-solid:trash" />
                    </Button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Form -->
    <Card v-else class="p-6 space-y-4 border-primary/50">
        <h3 class="text-lg font-bold">{{ editingIndex === -1 ? 'New Trigger' : 'Edit Trigger' }}</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input v-model="editForm.trigger" label="Trigger Phrase" placeholder="!help" />
            <div>
                <label class="block text-sm font-medium mb-1">Match Mode</label>
                <select v-model="editForm.matchMode" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="exact">Exact Match</option>
                    <option value="contains">Contains</option>
                    <option value="startswith">Starts With</option>
                </select>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium mb-1">Response</label>
            <textarea 
                v-model="editForm.response"
                class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
                placeholder="Hello there!"
            ></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
            <Button variant="ghost" @click="cancelEdit">Cancel</Button>
            <Button @click="saveTrigger">Save Trigger</Button>
        </div>
    </Card>
  </div>
</template>
