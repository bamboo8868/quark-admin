const API_BASE = import.meta.env.VITE_API_BASE || '/api'

/**
 * Helper: parse JSON response
 */
async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return await res.json()
}

// ==================== Auth ====================

/**
 * Web user login
 * @param {{ username: string, password: string }} params
 * @returns {Promise<{ code: number, message: string, data: any }>}
 */
export async function webLogin({ username, password }) {
  return await request('/web/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
}

/**
 * Web user registration
 * @param {{ username: string, email: string, password: string }} params
 * @returns {Promise<{ code: number, message: string, data: any }>}
 */
export async function webRegister({ username, email, password }) {
  return await request('/web/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  })
}

/**
 * Verify account exists (forgot password step 1)
 * @param {{ username: string, email: string }} params
 */
export async function webVerifyAccount({ username, email }) {
  return await request('/web/auth/verify-account', {
    method: 'POST',
    body: JSON.stringify({ username, email })
  })
}

/**
 * Reset password (forgot password step 2)
 * @param {{ username: string, email: string, newPassword: string }} params
 */
export async function webResetPassword({ username, email, newPassword }) {
  return await request('/web/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ username, email, newPassword })
  })
}

// ==================== Game Categories ====================

/**
 * Fetch visible game categories
 */
export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/web/game-categories`)
  const json = await res.json()
  return json.code === 0 ? json.data : []
}

/**
 * Fetch all game tags
 */
export async function fetchTags() {
  const res = await fetch(`${API_BASE}/web/game-tags`)
  const json = await res.json()
  return json.code === 0 ? json.data : []
}

/**
 * Fetch games list with filters and pagination
 * @param {Object} params - { page, limit, name, category_id, member_level }
 */
export async function fetchGames(params = {}) {
  const res = await fetch(`${API_BASE}/web/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const json = await res.json()
  return json.code === 0 ? json.data : { list: [], total: 0 }
}

/**
 * Fetch game detail by ID
 */
export async function fetchGameById(id) {
  const res = await fetch(`${API_BASE}/web/games/${id}`)
  const json = await res.json()
  return json.code === 0 ? json.data : null
}
