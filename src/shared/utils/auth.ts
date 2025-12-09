export type ClientInfo = {
  id: string
  name: string
  code: string
}

/**
 * Get client info from localStorage
 */
export function getClientInfo(): ClientInfo | null {
  try {
    const stored = localStorage.getItem('dashboard-client-info')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
