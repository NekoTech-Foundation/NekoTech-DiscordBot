export interface Ticket {
    id: string | number
    title: string
    description: string
    status: 'open' | 'closed' | 'pending' | 'deleted'
    priority: 'low' | 'medium' | 'high'
    type: string
    typeName?: string
    creator: string
    assignee?: string
    createdAt: string
    updatedAt: string
    firstResponseAt?: string
    responses?: TicketResponse[]
}

export interface TicketResponse {
    id: string | number
    content: string
    responderId: string
    createdAt: string
}

export interface RecentTicket {
    id: string | number
    status: 'open' | 'closed' | 'pending' | 'deleted'
    priority: 'low' | 'medium' | 'high'
    type: string
    typeName?: string
    creator: string
    date: string
    assignee?: string
}

export interface TicketStats {
    totalTickets: number
    openTickets: number
    avgResponseTime: number
    satisfactionRate: number
    weeklyChanges?: {
        totalTickets: number
        openTickets: number
        avgResponseTime: number
        satisfactionRate: number
    }
}

export interface TicketFilters {
    status: string
    priority: string
    type: string
    search: string
    sortBy: string
}

export interface TicketPagination {
    currentPage: number
    totalPages: number
    totalItems: number
}

export interface DayChartData {
    hour: number;
    count: number;
    types: Record<string, number>;
}

export interface WeekChartData {
    day: string;
    count: number;
}

export interface MonthChartData {
    date: string;
    count: number;
}

export interface YearChartData {
    month: string;
    count: number;
}

export interface ChartData {
    '1D': DayChartData[];
    '1W': WeekChartData[];
    '1M': MonthChartData[];
    '3M': YearChartData[];
    '1Y': YearChartData[];
}

export interface DashboardData {
    totalTickets: number;
    openTickets: number;
    avgResponseTime: number;
    satisfactionRate: number;
    weeklyChanges?: {
        totalTickets: number;
        openTickets: number;
        avgResponseTime: number;
        satisfactionRate: number;
    };
    recentTickets: Array<{
        id: string | number;
        status: 'open' | 'closed' | 'pending' | 'deleted';
        creator: string;
        date: string;
        type: string;
        priority: string;
        claimed: boolean;
        claimedBy: string | null;
        rating: string;
    }>;
    chartData: ChartData;
    ticketTypeDistribution: Array<{ _id: string; count: number }>;
} 