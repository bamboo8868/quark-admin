<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Top Navigation Bar -->
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
          <span class="text-gray-600">|</span>
          <span class="text-sm font-semibold text-violet-400">兑换会员</span>
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <router-link to="/" class="text-sm text-gray-400 hover:text-violet-400 transition">首页</router-link>
          <template v-if="currentUser.isLoggedIn">
            <span class="text-sm text-gray-400 hidden md:block">{{ currentUser.username }}</span>
            <button @click="handleLogout" class="text-xs text-gray-500 hover:text-red-400 transition">退出</button>
          </template>
          <template v-else>
            <router-link to="/login" class="text-sm text-gray-400 hover:text-violet-400 transition">登录</router-link>
            <router-link to="/register" class="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition">注册</router-link>
          </template>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[1200px] px-4 md:px-6 py-6 md:py-10">

      <!-- CDK Redeem Section -->
      <section class="mb-10">
        <div class="rounded-2xl border border-gray-800/40 bg-gray-900/30 p-6 md:p-8">
          <div class="flex items-center gap-3 mb-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">CDK 兑换会员</h2>
              <p class="text-sm text-gray-500">输入 CDK 码即可兑换游戏会员，立即体验！</p>
            </div>
          </div>

          <!-- Redeem Form -->
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <input
                v-model="cdkCode"
                type="text"
                placeholder="请输入 CDK 码"
                class="w-full rounded-xl border border-gray-700/50 bg-gray-900/50 px-4 py-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 font-mono tracking-wider"
                @keyup.enter="handleRedeem"
              />
            </div>
            <button
              @click="handleRedeem"
              :disabled="redeeming || !cdkCode.trim()"
              class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
            >
              <svg v-if="redeeming" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              {{ redeeming ? '兑换中...' : '立即兑换' }}
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="redeemError" class="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ redeemError }}
          </div>

          <!-- Success Result -->
          <div v-if="redeemResult" class="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
            <div class="flex items-center gap-2 mb-4">
              <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="text-sm font-semibold text-green-400">兑换成功！</span>
              <span class="ml-2 rounded-lg bg-violet-600/20 px-2 py-0.5 text-xs text-violet-300">{{ redeemResult.game_name }}</span>
            </div>
            <div class="space-y-3">
              <!-- Account -->
              <div class="flex items-center gap-3 rounded-lg bg-gray-800/40 px-4 py-3">
                <span class="text-xs text-gray-500 w-16 shrink-0">游戏账号</span>
                <span class="font-mono text-sm text-gray-200 flex-1">{{ redeemResult.account }}</span>
                <button @click="copyText(redeemResult.account)" class="shrink-0 text-gray-500 hover:text-violet-400 transition" title="复制账号">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
              <!-- Password -->
              <div class="flex items-center gap-3 rounded-lg bg-gray-800/40 px-4 py-3">
                <span class="text-xs text-gray-500 w-16 shrink-0">游戏密码</span>
                <span class="font-mono text-sm text-gray-200 flex-1">{{ showResultPassword ? redeemResult.password : '••••••••' }}</span>
                <button @click="showResultPassword = !showResultPassword" class="shrink-0 text-gray-500 hover:text-violet-400 transition" title="显示/隐藏密码">
                  <svg v-if="!showResultPassword" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                </button>
                <button @click="copyText(redeemResult.password)" class="shrink-0 text-gray-500 hover:text-violet-400 transition" title="复制密码">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
              <!-- Rent Info -->
              <div class="flex items-center gap-3 rounded-lg bg-gray-800/40 px-4 py-3">
                <span class="text-xs text-gray-500 w-16 shrink-0">租期信息</span>
                <span class="text-sm text-gray-300">{{ redeemResult.rent_hours }} 小时</span>
                <span class="text-xs text-gray-500">到期：</span>
                <span class="text-sm text-amber-400">{{ formatTime(redeemResult.rent_expire_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Available Rent Games -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">可兑换游戏</h2>
              <p class="text-sm text-gray-500">选择心仪游戏，使用 CDK 立即兑换</p>
            </div>
          </div>
          <span class="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-1.5">{{ rentGames.length }} 款游戏</span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <svg class="h-6 w-6 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
        </div>

        <!-- Games Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="game in rentGames"
            :key="game.id"
            class="group overflow-hidden rounded-2xl border border-gray-800/40 bg-gray-900/30 hover:border-violet-500/30 hover:bg-gray-900/60 transition"
          >
            <!-- Cover -->
            <div class="relative aspect-[16/9] overflow-hidden">
              <img
                :src="game.cover"
                :alt="game.name"
                class="h-full w-full object-cover duration-300 group-hover:scale-105"
                loading="lazy"
                @error="handleImgError"
              />
              <!-- Platform badge -->
              <div class="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                {{ game.platform }}
              </div>
              <!-- Account count badge -->
              <div :class="[
                'absolute right-2 top-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur-sm',
                game.available_accounts > 0 ? 'bg-emerald-600/80 text-white' : 'bg-gray-700/80 text-gray-300'
              ]">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                {{ game.available_accounts }}/{{ game.total_accounts }} 可用
              </div>
            </div>
            <!-- Info -->
            <div class="p-4">
              <h3 class="truncate text-sm font-bold text-gray-100 group-hover:text-violet-300 mb-1">{{ game.name }}</h3>
              <p class="text-xs text-gray-500 line-clamp-2 mb-3">{{ game.description }}</p>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-baseline gap-1">
                  <span class="text-lg font-bold text-violet-400">¥{{ game.price }}</span>
                  <span class="text-xs text-gray-500">/天</span>
                </div>
                <span :class="[
                  'rounded-lg px-2 py-1 text-xs font-semibold',
                  game.available_accounts > 0
                    ? 'bg-emerald-600/15 text-emerald-400'
                    : 'bg-gray-700/30 text-gray-500'
                ]">
                  {{ game.available_accounts > 0 ? '可兑换' : '已满' }}
                </span>
              </div>
              <button
                @click="openAccountModal(game)"
                class="w-full rounded-lg border py-2 text-xs font-semibold transition"
                :class="game.available_accounts > 0 
                  ? 'bg-violet-600/10 border-violet-500/20 text-violet-400 hover:bg-violet-600/20 hover:border-violet-500/40' 
                  : 'bg-gray-800/30 border-gray-700/30 text-gray-500 hover:bg-gray-800/50'"
              >
                {{ game.available_accounts > 0 ? `查看游戏账号 (${game.available_accounts})` : '暂无账号' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && rentGames.length === 0" class="flex flex-col items-center justify-center py-16">
          <div class="text-5xl mb-4">🎮</div>
          <p class="text-gray-500">暂无可兑换游戏，敬请期待</p>
        </div>
      </section>

      <!-- Rental History (logged-in users only) -->
      <section v-if="currentUser.isLoggedIn">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-600">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">兑换记录</h2>
            <p class="text-sm text-gray-500">查看您的 CDK 兑换历史</p>
          </div>
        </div>

        <div v-if="loadingHistory" class="flex items-center justify-center py-10">
          <svg class="h-5 w-5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
        </div>

        <div v-else-if="rentalHistory.length === 0" class="rounded-xl border border-gray-800/40 bg-gray-900/20 py-10 text-center">
          <p class="text-gray-500 text-sm">暂无兑换记录</p>
        </div>

        <div v-else class="overflow-hidden rounded-xl border border-gray-800/40">
          <table class="w-full text-sm">
            <thead class="bg-gray-900/60">
              <tr class="text-left text-xs text-gray-500">
                <th class="px-4 py-3 font-medium">游戏</th>
                <th class="px-4 py-3 font-medium hidden sm:table-cell">平台</th>
                <th class="px-4 py-3 font-medium">账号</th>
                <th class="px-4 py-3 font-medium hidden md:table-cell">CDK</th>
                <th class="px-4 py-3 font-medium">租期</th>
                <th class="px-4 py-3 font-medium">兑换时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800/40">
              <tr v-for="item in rentalHistory" :key="item.id" class="hover:bg-gray-900/30 transition">
                <td class="px-4 py-3 text-gray-200">{{ item.game_name }}</td>
                <td class="px-4 py-3 text-gray-400 hidden sm:table-cell">{{ item.game_platform }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-gray-300">{{ item.account }}</span>
                    <button @click="copyText(item.account)" class="text-gray-600 hover:text-violet-400 transition" title="复制">
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500 hidden md:table-cell">{{ item.cdk_code }}</td>
                <td class="px-4 py-3 text-amber-400">{{ item.rent_hours }}h</td>
                <td class="px-4 py-3 text-gray-500">{{ formatTime(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Login prompt for non-logged users -->
      <section v-else>
        <div class="rounded-xl border border-dashed border-gray-700/50 bg-gray-900/20 py-10 text-center">
          <svg class="mx-auto h-10 w-10 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <p class="text-gray-500 text-sm mb-4">登录后即可兑换 CDK 并查看兑换记录</p>
          <router-link to="/login" class="inline-flex rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition">
            立即登录
          </router-link>
        </div>
      </section>

    </div>

    <!-- Game Account Modal -->
    <div
      v-if="showAccountModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      @click.self="closeAccountModal"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeAccountModal"></div>
      
      <!-- Modal Content -->
      <div class="relative w-full max-w-lg rounded-2xl border border-gray-800/40 bg-gray-900 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-800/40 px-6 py-4">
          <div class="flex items-center gap-3">
            <img v-if="selectedGame?.cover" :src="selectedGame.cover" :alt="selectedGame?.name" class="h-10 w-14 rounded-lg object-cover" @error="(e) => e.target.style.display='none'" />
            <div>
              <h3 class="text-lg font-bold text-white">{{ selectedGame?.name }}</h3>
              <p class="text-xs text-gray-500">{{ selectedGame?.platform }} · 可用账号 {{ gameAccounts.length }} 个</p>
            </div>
          </div>
          <button @click="closeAccountModal" class="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="max-h-[400px] overflow-y-auto p-6">
          <!-- Loading -->
          <div v-if="loadingAccounts" class="flex items-center justify-center py-10">
            <svg class="h-6 w-6 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
          </div>

          <!-- Empty -->
          <div v-else-if="gameAccounts.length === 0" class="py-10 text-center">
            <p class="text-gray-500 text-sm">暂无可用账号</p>
          </div>

          <!-- Account List -->
          <div v-else class="space-y-3">
            <div
              v-for="(account, index) in gameAccounts"
              :key="account.id"
              class="flex items-center justify-between rounded-xl border border-gray-800/40 bg-gray-800/20 px-4 py-3 hover:border-violet-500/30 transition"
            >
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-400">{{ index + 1 }}</span>
                <div>
                  <p class="font-mono text-sm text-gray-200">{{ account.account }}</p>
                  <p class="text-xs text-gray-500">{{ account.platform || selectedGame?.platform }}</p>
                </div>
              </div>
              <button
                @click="copyText(account.account)"
                class="rounded-lg bg-gray-700/50 p-2 text-gray-400 hover:bg-violet-600/20 hover:text-violet-400 transition"
                title="复制账号"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-800/40 px-6 py-4">
          <p class="text-xs text-gray-500 text-center">输入 CDK 码即可兑换账号，立即体验游戏！</p>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div
      v-if="toastMsg"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-violet-600/90 px-5 py-2.5 text-sm text-white shadow-xl backdrop-blur-sm animate-bounce-in"
    >
      {{ toastMsg }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import siteConfig from '../config/site.js'
import { currentUser, clearUser } from '../config/membership.js'
import { fetchRentGames, fetchGameAccounts, redeemRentCdk, fetchMyRentals } from '../api/index.js'

const rentGames = ref([])
const loading = ref(false)
const cdkCode = ref('')
const redeeming = ref(false)
const redeemError = ref('')
const redeemResult = ref(null)
const showResultPassword = ref(false)
const rentalHistory = ref([])
const loadingHistory = ref(false)
const toastMsg = ref('')

// Account modal state
const showAccountModal = ref(false)
const selectedGame = ref(null)
const gameAccounts = ref([])
const loadingAccounts = ref(false)

async function loadRentGames() {
  loading.value = true
  try {
    rentGames.value = await fetchRentGames()
  } catch (e) {
    console.error('Failed to load rent games:', e)
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  if (!currentUser.isLoggedIn) return
  loadingHistory.value = true
  try {
    const res = await fetchMyRentals()
    if (res.code === 0) {
      rentalHistory.value = res.data || []
    }
  } catch (e) {
    console.error('Failed to load rental history:', e)
  } finally {
    loadingHistory.value = false
  }
}

async function handleRedeem() {
  redeemError.value = ''
  redeemResult.value = null
  showResultPassword.value = false

  if (!currentUser.isLoggedIn) {
    redeemError.value = '请先登录后再兑换 CDK'
    return
  }
  if (!cdkCode.value.trim()) {
    redeemError.value = '请输入 CDK 码'
    return
  }

  redeeming.value = true
  try {
    const res = await redeemRentCdk(cdkCode.value.trim())
    if (res.code === 401) {
      redeemError.value = '登录已过期，请重新登录'
      return
    }
    if (res.code === 0) {
      redeemResult.value = res.data
      cdkCode.value = ''
      // Reload games and history
      await Promise.all([loadRentGames(), loadHistory()])
    } else {
      redeemError.value = res.message || '兑换失败，请重试'
    }
  } catch (e) {
    redeemError.value = '网络异常，请检查连接后重试'
  } finally {
    redeeming.value = false
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板')
  }).catch(() => {})
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2000)
}

function formatTime(str) {
  if (!str) return '-'
  const d = new Date(str)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" fill="%231e1b2e"><rect width="460" height="215"/><text x="50%" y="50%" fill="%236b7280" font-size="24" text-anchor="middle" dy=".3em">🎮</text></svg>'
  )
}

function handleLogout() {
  clearUser()
}

async function openAccountModal(game) {
  selectedGame.value = game
  showAccountModal.value = true
  loadingAccounts.value = true
  gameAccounts.value = []
  try {
    gameAccounts.value = await fetchGameAccounts(game.id)
  } catch (e) {
    console.error('Failed to load game accounts:', e)
  } finally {
    loadingAccounts.value = false
  }
}

function closeAccountModal() {
  showAccountModal.value = false
  selectedGame.value = null
  gameAccounts.value = []
}

onMounted(() => {
  loadRentGames()
  loadHistory()
})
</script>
