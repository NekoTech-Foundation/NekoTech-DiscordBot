<script setup>
import Sidebar from './Sidebar.vue';
</script>

<template>
  <div class="flex h-screen bg-background text-foreground overflow-hidden">
    <Sidebar />
    <main class="flex-1 overflow-y-auto p-8 relative">
        <slot />
    </main>
  </div>
</template>
