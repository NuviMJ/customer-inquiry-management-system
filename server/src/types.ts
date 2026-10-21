export type Role = 'staff' | 'manager'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}
