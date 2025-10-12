export interface Suggestion {
  uniqueId: string;
  text: string;
  upvotes: number;
  downvotes: number;
  status: 'Pending' | 'Accepted' | 'Denied';
  reason?: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  guildId: string;
} 