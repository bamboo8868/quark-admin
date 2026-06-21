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


        </div>
      </div>


      <!-- CDK Redemption Section -->
      <div class="mt-10 md:mt-14 rounded-2xl border border-violet-800/30 bg-gradient-to-br from-violet-950/40 to-indigo-950/30 p-6 md:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg">🎁</div>
          <div>
            <h3 class="text-lg font-bold text-gray-100">CDK兑换会员</h3>
            <p class="text-xs text-gray-500">输入CDK兑换码，立即升级您的会员等级</p>
          </div>
        </div>

        <!-- Not logged in -->
        <div v-if="!currentUser.isLoggedIn" class="rounded-xl bg-gray-800/30 px-6 py-8 text-center">
          <p class="text-sm text-gray-400 mb-4">请先登录后再兑换CDK</p>
          <router-link to="/login" class="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-bold shadow-lg hover:opacity-90 transition">前往登录</router-link>
        </div>

        <!-- Logged in: redeem form -->
        <template v-else>
          <!-- Current member info -->
          <div v-if="memberInfo" class="mb-5 flex items-center gap-4 rounded-xl bg-gray-800/30 px-5 py-3">
            <div class="text-sm text-gray-400">当前会员：</div>
            <div :class="['text-sm font-bold', currentTier.color]">{{ currentTier.icon }} {{ currentTier.name }}</div>
            <div v-if="memberInfo.member_expire_at" class="text-xs text-gray-500">
              到期：{{ formatDate(memberInfo.member_expire_at) }}
            </div>
          </div>

          <!-- Input -->
          <div class="flex gap-3">
            <input
              v-model="cdkCode"
              type="text"
              placeholder="请输入CDK兑换码，例如 XXXX-XXXX-XXXX-XXXX"
              class="flex-1 rounded-xl border border-gray-700/50 bg-gray-900/50 px-5 py-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 tracking-wider uppercase"
              @keyup.enter="handleRedeem"
            />
            <button
              @click="handleRedeem"
              :disabled="!cdkCode.trim() || redeeming"
              class="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 md:px-8 py-3 text-sm font-bold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {{ redeeming ? '兑换中...' : '立即兑换' }}
            </button>
          </div>

          <!-- Success result -->
          <div v-if="redeemResult" class="mt-5 rounded-xl border border-emerald-700/30 bg-emerald-950/30 px-5 py-4">
            <div class="flex items-center gap-2 text-emerald-400 font-bold mb-3">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              兑换成功！
            </div>
            <div class="grid gap-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-gray-400">会员等级：</span>
                <span class="font-bold text-emerald-300">{{ redeemResult.member_level_name }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400">开通时长：</span>
                <span class="font-bold text-gray-200">{{ redeemResult.duration_months }} 个月</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400">到期时间：</span>
                <span class="font-bold text-gray-200">{{ formatDate(redeemResult.member_expire_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="redeemError" class="mt-4 rounded-xl border border-red-800/30 bg-red-950/30 px-5 py-3 text-sm text-red-400">
            {{ redeemError }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { membershipTiers, currentUser, getTier, memberLevelToTier, clearUser } from '../config/membership.js'
import siteConfig from '../config/site.js'
import { redeemMemberCdk, fetchMyMemberInfo } from '../api/index.js'

const router = useRouter()
const mockUsername = ref('')

const currentTier = computed(() => getTier(currentUser.membership))

// CDK redemption state
const cdkCode = ref('')
const redeeming = ref(false)
const redeemResult = ref(null)
const redeemError = ref('')
const memberInfo = ref(null)

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Fetch member info on mount
onMounted(async () => {
  if (currentUser.isLoggedIn) {
    try {
      const resp = await fetchMyMemberInfo()
      if (resp && resp.code === 0 && resp.data) {
        memberInfo.value = resp.data
        // Sync membership tier from server
        currentUser.membership = memberLevelToTier(resp.data.member_level)
      }
    } catch {
      // ignore
    }
  }
})

// Redeem CDK
async function handleRedeem() {
  if (!cdkCode.value.trim() || redeeming.value) return

  redeeming.value = true
  redeemResult.value = null
  redeemError.value = ''

  try {
    const resp = await redeemMemberCdk(cdkCode.value.trim())
    if (resp && resp.code === 0 && resp.data) {
      redeemResult.value = resp.data
      cdkCode.value = ''
      // Update local membership
      currentUser.membership = memberLevelToTier(resp.data.member_level)
      // Refresh member info
      const infoResp = await fetchMyMemberInfo()
      if (infoResp && infoResp.code === 0) memberInfo.value = infoResp.data
    } else {
      redeemError.value = resp?.message || '兑换失败，请检查CDK码是否正确'
    }
  } catch (err) {
    redeemError.value = err.message || '兑换失败，请稍后重试'
  } finally {
    redeeming.value = false
  }
}

function mockLogin(tier) {
  const name = mockUsername.value.trim() || '测试用户'
  currentUser.isLoggedIn = true
  currentUser.username = name
  currentUser.membership = tier
  mockUsername.value = ''
}

function mockLogout() {
  clearUser()
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
