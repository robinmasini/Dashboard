export const UserRole = {
  FREELANCE: 'freelance',
  CLIENT: 'client',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]
