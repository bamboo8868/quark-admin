<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-950">
    <!-- Background decoration -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-3xl"></div>
      <div class="absolute -right-40 -bottom-40 h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl"></div>
    </div>

    <div class="relative z-10 mx-auto w-full max-w-md px-4 md:px-6">
      <!-- Back to login -->
      <router-link to="/login" class="mb-6 md:mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        返回登录
      </router-link>

      <!-- Card -->
      <div class="overflow-hidden rounded-2xl border border-gray-800/40 bg-gray-900/50 shadow-2xl shadow-violet-600/5 backdrop-blur-sm">
        <!-- Header -->
        <div class="px-6 md:px-8 pt-8 pb-2 text-center">
          <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/20">
            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">
            <span class="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{{ siteConfig.siteNameHighlight }}</span>
            <span class="text-gray-200">{{ siteConfig.siteNameNormal }}</span>
          </h1>
          <p class="mt-2 text-sm text-gray-500">重置您的账户密码</p>
        </div>

        <!-- Step Indicator -->
        <div class="px-6 md:px-8 pt-4">
          <div class="flex items-center gap-2">
            <div :class="['flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition', step >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-500']">1</div>
            <div :class="['h-0.5 flex-1 rounded-full transition', step >= 2 ? 'bg-violet-600' : 'bg-gray-800']"></div>
            <div :class="['flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition', step >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-500']">2</div>
            <div :class="['h-0.5 flex-1 rounded-full transition', step >= 3 ? 'bg-emerald-500' : 'bg-gray-800']"></div>
            <div :class="['flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition', step >= 3 ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500']">✓</div>
          </div>
          <p class="mt-2 text-center text-xs text-gray-500">
            {{ step === 1 ? '验证账户信息' : step === 2 ? '设置新密码' : '重置完成' }}
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="px-6 md:px-8 pt-5 pb-8">

          <!-- ==================== Step 1: Verify Account ==================== -->
          <template v-if="step === 1">
            <!-- Username -->
            <div class="mb-4">
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

            <!-- Email -->
            <div class="mb-5">
              <label class="mb-2 block text-sm font-medium text-gray-300">注册邮箱</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="请输入注册时使用的邮箱"
                  autocomplete="email"
                  class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>
            </div>
          </template>

          <!-- ==================== Step 2: New Password ==================== -->
          <template v-if="step === 2">
            <!-- Verified info -->
            <div class="mb-4 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              已验证账户：{{ form.username }} ({{ form.email }})
            </div>

            <!-- New Password -->
            <div class="mb-4">
              <label class="mb-2 block text-sm font-medium text-gray-300">新密码</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input
                  v-model="form.newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入新密码（至少6位）"
                  autocomplete="new-password"
                  class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-3 pl-10 pr-10 text-sm text-gray-200 placeholder-gray-500 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                />
                <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-300 transition">
                  <svg v-if="!showPassword" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                </button>
              </div>
              <!-- Password strength -->
              <div v-if="form.newPassword" class="mt-2 flex gap-1.5">
                <div :class="['h-1 flex-1 rounded-full transition', passwordStrength >= 1 ? 'bg-red-500' : 'bg-gray-800']"></div>
                <div :class="['h-1 flex-1 rounded-full transition', passwordStrength >= 2 ? 'bg-amber-500' : 'bg-gray-800']"></div>
                <div :class="['h-1 flex-1 rounded-full transition', passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-gray-800']"></div>
              </div>
              <p v-if="form.newPassword" class="mt-1 text-xs" :class="passwordStrengthColor">密码强度：{{ passwordStrengthText }}</p>
            </div>

            <!-- Confirm Password -->
            <div class="mb-5">
              <label class="mb-2 block text-sm font-medium text-gray-300">确认新密码</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  autocomplete="new-password"
                  class="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>
              <p v-if="form.confirmPassword && form.newPassword !== form.confirmPassword" class="mt-1 text-xs text-red-400">两次输入的密码不一致</p>
            </div>
          </template>

          <!-- ==================== Step 3: Success ==================== -->
          <template v-if="step === 3">
            <div class="py-4 text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <svg class="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 class="text-lg font-bold text-gray-200">密码重置成功</h2>
              <p class="mt-2 text-sm text-gray-500">您的密码已成功重置，请使用新密码登录</p>
            </div>
          </template>

          <!-- Error Message -->
          <div v-if="errorMsg" class="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ errorMsg }}
          </div>

          <!-- Submit / Next -->
          <button
            v-if="step < 3"
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            {{ step === 1 ? '验证账户' : '重置密码' }}
          </button>

          <!-- Go to login (step 3) -->
          <router-link
            v-if="step === 3"
            to="/login"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-violet-600/40"
          >
            前往登录
          </router-link>

          <!-- Back to login link -->
          <p class="mt-6 text-center text-sm text-gray-500">
            想起密码了？
            <router-link to="/login" class="font-medium text-violet-400 hover:text-violet-300 transition">返回登录</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import siteConfig from '../config/site.js'
import { webVerifyAccount, webResetPassword } from '../api/index.js'

const step = ref(1)
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

const form = reactive({
  username: '',
  email: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordStrength = computed(() => {
  const p = form.newPassword
  if (!p) return 0
  let score = 0
  if (p.length >= 6) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  return score
})

const passwordStrengthText = computed(() => ['', '弱', '中', '强'][passwordStrength.value])
const passwordStrengthColor = computed(() => ['', 'text-red-400', 'text-amber-400', 'text-emerald-400'][passwordStrength.value])

async function handleSubmit() {
  errorMsg.value = ''

  if (step.value === 1) {
    // Step 1: verify account
    if (!form.username.trim()) { errorMsg.value = '请输入用户名'; return }
    if (!form.email.trim()) { errorMsg.value = '请输入邮箱'; return }

    loading.value = true
    try {
      const res = await webVerifyAccount({ username: form.username, email: form.email })
      if (res.code === 0) {
        step.value = 2
      } else {
        errorMsg.value = res.message || '验证失败，请检查信息是否正确'
      }
    } catch {
      errorMsg.value = '网络异常，请检查连接后重试'
    } finally {
      loading.value = false
    }
  } else if (step.value === 2) {
    // Step 2: reset password
    if (!form.newPassword) { errorMsg.value = '请输入新密码'; return }
    if (form.newPassword.length < 6) { errorMsg.value = '密码至少6位'; return }
    if (form.newPassword !== form.confirmPassword) { errorMsg.value = '两次输入的密码不一致'; return }

    loading.value = true
    try {
      const res = await webResetPassword({
        username: form.username,
        email: form.email,
        newPassword: form.newPassword
      })
      if (res.code === 0) {
        step.value = 3
      } else {
        errorMsg.value = res.message || '重置失败，请重试'
      }
    } catch {
      errorMsg.value = '网络异常，请检查连接后重试'
    } finally {
      loading.value = false
    }
  }
}
</script>
