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
            <router-link to="/forgot-password" class="text-sm text-violet-400 hover:text-violet-300 transition">忘记密码？</router-link>
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
import { useRouter } from 'vue-router'
import siteConfig from '../config/site.js'
import { webLogin } from '../api/index.js'
import { currentUser, memberLevelToTier } from '../config/membership.js'

const router = useRouter()

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password.trim()) {
    errorMsg.value = '请输入密码'
    return
  }

  loading.value = true
  try {
    const res = await webLogin({ username: form.username, password: form.password })
    if (res.code === 0) {
      // Persist token
      const storage = form.remember ? localStorage : sessionStorage
      storage.setItem('web_token', res.data.accessToken)
      storage.setItem('web_user', JSON.stringify({
        id: res.data.id,
        username: res.data.username,
        nickname: res.data.nickname,
        avatar: res.data.avatar,
        member_level: res.data.member_level
      }))
      // Update reactive state immediately so header reflects login without refresh
      currentUser.isLoggedIn = true
      currentUser.username = res.data.username
      currentUser.membership = memberLevelToTier(res.data.member_level)
      router.push('/')
    } else {
      errorMsg.value = res.message || '登录失败，请重试'
    }
  } catch (err) {
    errorMsg.value = '网络异常，请检查连接后重试'
  } finally {
    loading.value = false
  }
}
</script>
