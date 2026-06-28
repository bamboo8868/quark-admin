// Membership tiers
export const membershipTiers = [
  {
    id: 'guest',
    name: '游客',
    nameEn: 'Guest',
    icon: '👤',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/50',
    borderColor: 'border-gray-600/30',
    gradientFrom: 'from-gray-600',
    gradientTo: 'to-gray-700',
    description: '免费注册即可成为游客，浏览全部游戏',
    features: [
      '浏览全部游戏列表',
      '查看游戏基本信息',
      '使用分类筛选与搜索',
    ],
    canViewAccounts: false,
  },
  {
    id: 'bronze',
    name: '青铜会员',
    nameEn: 'Bronze',
    icon: '🥉',
    color: 'text-amber-600',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-700/30',
    gradientFrom: 'from-amber-700',
    gradientTo: 'to-amber-900',
    description: '升级青铜会员，解锁部分游戏账号信息',
    features: [
      '包含游客全部权益',
      '查看部分游戏账号信息',
      '专属青铜会员标识',
      '可查看非D加密游戏'
    ],
    canViewAccounts: true,
    maxAccountViews: 10, // 最多查看10款游戏的账号
  },
  {
    id: 'gold',
    name: '黄金会员',
    nameEn: 'Gold',
    icon: '🥇',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-600/30',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-amber-600',
    description: '尊享黄金会员，无限查看全部游戏账号信息',
    features: [
      '包含青铜会员全部权益',
      '无限查看全部游戏账号信息',
      '专属黄金会员标识',
      '优先客服支持',
      '不限制D加密游戏'
    ],
    canViewAccounts: true,
    maxAccountViews: Infinity,
  },
]

// Current user state
import { ref, reactive } from 'vue'

export const currentUser = reactive({
  isLoggedIn: false,
  username: '',
  membership: 'guest', // 'guest' | 'bronze' | 'gold'
})

/**
 * Map numeric member_level from API to membership tier id
 */
export function memberLevelToTier(level) {
  const map = { 0: 'guest', 1: 'bronze', 2: 'gold' }
  return map[level] ?? 'guest'
}

/**
 * Hydrate currentUser from localStorage / sessionStorage on app start
 */
export function initCurrentUser() {
  const storage = localStorage.getItem('web_user')
    ? localStorage
    : sessionStorage.getItem('web_user')
      ? sessionStorage
      : null

  if (!storage) return

  try {
    const raw = storage.getItem('web_user')
    if (!raw) return
    const user = JSON.parse(raw)
    currentUser.isLoggedIn = true
    currentUser.username = user.username || ''
    currentUser.membership = memberLevelToTier(user.member_level)
  } catch {
    // Corrupted data — clean up
    storage.removeItem('web_user')
    storage.removeItem('web_token')
  }
}

/**
 * Clear user state and storage (logout)
 */
export function clearUser() {
  currentUser.isLoggedIn = false
  currentUser.username = ''
  currentUser.membership = 'guest'
  localStorage.removeItem('web_user')
  localStorage.removeItem('web_token')
  sessionStorage.removeItem('web_user')
  sessionStorage.removeItem('web_token')
}

export function getTier(tierId) {
  return membershipTiers.find(t => t.id === tierId) || membershipTiers[0]
}

// Track which game accounts the user has viewed (for bronze limit)
const viewedSet = ref(new Set())

export function canViewAccount(gameId) {
  const tier = getTier(currentUser.membership)
  if (!tier.canViewAccounts) return false
  if (tier.maxAccountViews === Infinity) return true
  return viewedSet.value.size < tier.maxAccountViews || viewedSet.value.has(gameId)
}

export function markAccountViewed(gameId) {
  viewedSet.value.add(gameId)
}

export const viewedCount = () => viewedSet.value.size
