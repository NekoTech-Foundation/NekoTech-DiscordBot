<script setup>
import Card from '../components/ui/Card.vue';
import Button from '../components/ui/Button.vue';
import { Icon } from '@iconify/vue';

const handleLogin = () => {
  window.location.href = '/api/dashboard/auth/login';
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <!-- Abstract Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-30"></div>
    </div>

    <Card class="w-full max-w-md p-6 border-border bg-card dark shadow-xl z-10">
      <div class="flex flex-col items-center text-center space-y-4">
        <div class="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Icon icon="fa6-solid:robot" class="text-3xl text-primary-foreground" />
        </div>
        
        <div class="space-y-1">
            <h1 class="text-3xl font-bold tracking-tight">NekoTech</h1>
            <p class="text-muted-foreground">Premium Whitelabel Management</p>
        </div>

        <div class="w-full pt-4">
            <Button 
                class="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white" 
                size="lg"
                @click="handleLogin"
            >
                <Icon icon="fa6-brands:discord" class="mr-2 text-xl" />
                Login with Discord
            </Button>
        </div>
      </div>
    </Card>
  </div>
</template>
