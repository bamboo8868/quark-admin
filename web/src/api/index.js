const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
