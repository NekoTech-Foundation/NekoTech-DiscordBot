<script setup>
defineProps({
    title: String,
    description: String
});
</script>

<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <div v-if="title || description" class="flex flex-col space-y-1.5 p-6">
        <h3 v-if="title" class="text-2xl font-semibold leading-none tracking-tight">{{ title }}</h3>
        <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div class="p-6 pt-0">
        <slot />
    </div>
  </div>
</template>
