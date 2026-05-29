<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-950">
    <!-- Background decoration -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-3xl"></div>
      <div class="absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl"></div>
    </div>

    <div class="relative z-10 mx-auto w-full max-w-md px-4 md:px-6">
      <!-- Back to home -->
      <router-link to="/" class="mb-6 md:mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        返回首页
      </router-link>

      <!-- Login Card -->
      <div class="overflow-hidden rounded-2xl border border-gray-800/40 bg-gray-900/50 shadow-2xl shadow-violet-600/5 backdrop-blur-sm">
        <!-- Header -->
        <div class="px-6 md:px-8 pt-8 pb-2 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/20">
            <svg class="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 6H3a1 1 0 00-1 1v4a1 1 0 001 1h1v5a2 2 0 002 2h12a2 2 0 002-2v-5h1a1 1 0 001-1V7a1 1 0 00-1-1zM8 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm4-1a1 1 0 110-2 1 1 0 010 2zm4 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">
            <span class="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{{ siteConfig.siteNameHighlight }}</span>
            <span class="text-gray-200">{{ siteConfig.siteNameNormal }}</span>
          </h1>
          <p class="mt-2 text-sm text-gray-500">登录您的{{ siteConfig.siteNameZh }}账户</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="px-6 md:px-8 pt-6 pb-8">
          <!-- Username -->
          <div class="mb-5">
            <label class="mb-2 block text-sm font-medium text-gray-300">用户名</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <input
                v-model="form.username"
                type="text"
                placeholder="请输入用户名"
                autocomplete="username"
                class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="mb-5">
            <label class="mb-2 block text-sm font-medium text-gray-300">密码</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
                class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-3 pl-10 pr-10 text-sm text-gray-200 placeholder-gray-500 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
              />
              <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-300 transition">
                <svg v-if="!showPassword" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
              </button>
            </div>
          </div>

          <!-- Remember & Forgot -->
          <div class="mb-6 flex items-center justify-between">
            <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" v-model="form.remember" class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-violet-600 focus:ring-violet-500/20" />
              记住我
            </label>
            <a href="#" class="text-sm text-violet-400 hover:text-violet-300 transition">忘记密码？</a>
          </div>

          <!-- Error Message -->
          <div v-if="errorMsg" class="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ errorMsg }}
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            {{ loading ? '登录中...' : '登 录' }}
          </button>

          <!-- Divider -->
          <div class="my-6 flex items-center gap-3">
            <div class="h-px flex-1 bg-gray-800/50"></div>
            <span class="text-xs text-gray-600">其他登录方式</span>
            <div class="h-px flex-1 bg-gray-800/50"></div>
          </div>

          <!-- Social Login -->
          <div class="flex justify-center gap-4">
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-violet-500/30 hover:text-violet-400 transition">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.38 1.5c-.054.217-.068.397-.018.536.044.122.145.2.285.2.1 0 .226-.032.376-.1l2.088-1.006a.94.94 0 01.668-.078 10.27 10.27 0 002.456.298c.18 0 .358-.005.536-.015a5.765 5.765 0 01-.288-1.802c0-3.556 3.39-6.441 7.573-6.441.237 0 .47.012.702.03C16.798 4.588 13.109 2.188 8.69 2.188zm5.395 16.617c-4.002 0-7.242-2.66-7.242-5.941 0-3.282 3.24-5.942 7.242-5.942 4.003 0 7.243 2.66 7.243 5.942 0 3.281-3.24 5.941-7.243 5.941z"/></svg>
            </button>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-green-500/30 hover:text-green-400 transition">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
            </button>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-sky-500/30 hover:text-sky-400 transition">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.85.38-1.78.64-2.73.76 1-.6 1.74-1.55 2.1-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.51-1.53-2.66 0-4.81 2.16-4.81 4.81 0 .38.04.75.13 1.1-4-.2-7.58-2.11-9.96-5.02-.42.72-.66 1.56-.66 2.46 0 1.68.85 3.16 2.14 4.02-.79-.02-1.53-.24-2.18-.6v.06c0 2.35 1.67 4.31 3.88 4.76-.4.1-.83.16-1.27.16-.31 0-.62-.03-.92-.08.63 1.96 2.45 3.39 4.61 3.43-1.69 1.32-3.83 2.1-6.15 2.1-.4 0-.8-.02-1.19-.07 2.19 1.4 4.78 2.22 7.57 2.22 9.07 0 14.02-7.52 14.02-14.02 0-.21 0-.42-.01-.63.96-.7 1.8-1.56 2.46-2.55z"/></svg>
            </button>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-red-500/30 hover:text-red-400 transition">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </button>
          </div>

          <!-- Register link -->
          <p class="mt-6 text-center text-sm text-gray-500">
            还没有账户？
            <router-link to="/register" class="font-medium text-violet-400 hover:text-violet-300 transition">立即注册</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import siteConfig from '../config/site.js'

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

function handleLogin() {
  errorMsg.value = ''
  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password.trim()) {
    errorMsg.value = '请输入密码'
    return
  }
  // Frontend only — no API call yet
  loading.value = true
  setTimeout(() => {
    loading.value = false
    errorMsg.value = '登录功能暂未接入后端，敬请期待'
  }, 1500)
}
</script>
