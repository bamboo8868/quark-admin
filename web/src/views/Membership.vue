<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-14 md:h-16 max-w-[1920px] items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 md:gap-3">
            <div class="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-base md:text-lg font-bold shadow-lg shadow-violet-600/20">
              {{ siteConfig.siteLogo }}
            </div>
            <h1 class="text-lg md:text-xl font-bold tracking-tight">
              <span class="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{{ siteConfig.siteNameHighlight }}</span>
              <span class="text-gray-300">{{ siteConfig.siteNameNormal }}</span>
            </h1>
          </router-link>
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <router-link to="/" class="text-sm text-gray-400 hover:text-violet-400 transition">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </router-link>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-14">
      <!-- Title -->
      <div class="text-center mb-10 md:mb-14">
        <h2 class="text-2xl md:text-4xl font-bold">会员等级</h2>
        <p class="mt-2 md:mt-3 text-sm md:text-base text-gray-500">选择适合你的会员等级，解锁更多游戏权益</p>
      </div>

      <!-- Tier Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="tier in membershipTiers"
          :key="tier.id"
          :class="[
            'relative overflow-hidden rounded-2xl border p-6 md:p-8 transition',
            tier.borderColor,
            currentUser.membership === tier.id ? 'ring-2 ring-violet-500' : ''
          ]"
        >
          <!-- Current badge -->
          <div v-if="currentUser.membership === tier.id" class="absolute right-3 top-3 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold">当前</div>

          <div class="text-3xl mb-3">{{ tier.icon }}</div>
          <h3 :class="['text-xl font-bold', tier.color]">{{ tier.name }}</h3>
          <p class="mt-1 text-xs text-gray-500">{{ tier.nameEn }}</p>
          <p class="mt-3 text-sm text-gray-400 leading-relaxed">{{ tier.description }}</p>

          <!-- Features -->
          <ul class="mt-5 space-y-2">
            <li v-for="(feat, idx) in tier.features" :key="idx" class="flex items-start gap-2 text-sm text-gray-300">
              <svg class="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              {{ feat }}
            </li>
          </ul>

          <!-- Account limit info -->
          <div v-if="tier.canViewAccounts" class="mt-5 rounded-xl bg-gray-800/40 px-4 py-3 text-center">
            <span class="text-xs text-gray-400">可查看游戏账号</span>
            <div class="mt-1 text-lg font-bold" :class="tier.color">
              {{ tier.maxAccountViews === Infinity ? '无限' : tier.maxAccountViews + ' 款' }}
            </div>
          </div>

          <!-- Action button -->
          <button
            @click="selectTier(tier.id)"
            :class="[
              'mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition',
              currentUser.membership === tier.id
                ? 'bg-gray-800 text-gray-500 cursor-default'
                : 'bg-gradient-to-r ' + tier.gradientFrom + ' ' + tier.gradientTo + ' shadow-lg hover:opacity-90'
            ]"
            :disabled="currentUser.membership === tier.id"
          >
            {{ currentUser.membership === tier.id ? '当前等级' : (tier.id === 'guest' ? '免费加入' : '升级会员') }}
          </button>
        </div>
      </div>

      <!-- Mock login panel for testing -->
      <div class="mt-10 md:mt-14 rounded-2xl border border-gray-800/40 bg-gray-900/30 p-6 md:p-8">
        <h3 class="text-lg font-bold text-gray-200 mb-4">模拟登录（测试用）</h3>
        <p class="text-sm text-gray-500 mb-4">此面板仅用于前端测试，登录后可切换会员等级查看不同效果</p>
        <div class="flex flex-wrap gap-3">
          <template v-if="!currentUser.isLoggedIn">
            <input
              v-model="mockUsername"
              type="text"
              placeholder="输入用户名"
              class="rounded-xl border border-gray-700/50 bg-gray-900/50 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 w-40"
            />
            <button @click="mockLogin('guest')" class="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition">登录为游客</button>
            <button @click="mockLogin('bronze')" class="rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-4 py-2 text-sm font-bold text-amber-100 hover:opacity-90 transition">登录为青铜</button>
            <button @click="mockLogin('gold')" class="rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 text-sm font-bold text-yellow-100 hover:opacity-90 transition">登录为黄金</button>
          </template>
          <template v-else>
            <div class="flex items-center gap-3 text-sm">
              <span class="text-gray-400">当前身份：</span>
              <span :class="['font-bold', currentTier.color]">{{ currentTier.icon }} {{ currentUser.username }} ({{ currentTier.name }})</span>
            </div>
            <div class="flex gap-2 ml-auto">
              <button v-if="currentUser.membership !== 'bronze'" @click="switchMembership('bronze')" class="rounded-lg bg-amber-900/30 px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-amber-900/50 transition">切换青铜</button>
              <button v-if="currentUser.membership !== 'gold'" @click="switchMembership('gold')" class="rounded-lg bg-yellow-900/30 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-900/50 transition">切换黄金</button>
              <button @click="mockLogout" class="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition">退出登录</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { membershipTiers, currentUser, getTier } from '../config/membership.js'
import siteConfig from '../config/site.js'

const router = useRouter()
const mockUsername = ref('')

const currentTier = computed(() => getTier(currentUser.membership))

function mockLogin(tier) {
  const name = mockUsername.value.trim() || '测试用户'
  currentUser.isLoggedIn = true
  currentUser.username = name
  currentUser.membership = tier
  mockUsername.value = ''
}

function mockLogout() {
  currentUser.isLoggedIn = false
  currentUser.username = ''
  currentUser.membership = 'guest'
}

function switchMembership(tier) {
  currentUser.membership = tier
}

function selectTier(tierId) {
  if (currentUser.membership === tierId) return
  if (!currentUser.isLoggedIn) {
    router.push('/login')
    return
  }
  currentUser.membership = tierId
}
</script>
