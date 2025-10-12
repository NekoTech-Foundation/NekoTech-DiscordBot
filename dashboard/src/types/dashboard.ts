export interface RecentTicket {
  id: string | number
  status: 'open' | 'closed' | 'pending'
  type: string
  typeName?: string
  creator: string
  date: string
  priority?: string
  assignee?: string
} 