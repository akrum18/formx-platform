export interface Finish {
  id: string
  name: string
  type: string
  costPerSqIn: number
  leadTimeDays: number
  description: string
  active: boolean
}

export type CreateFinishData = Omit<Finish, "id">
export type UpdateFinishData = Partial<Finish>