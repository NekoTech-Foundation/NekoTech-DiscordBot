interface TicketFilters {
    limit?: number;
    [key: string]: any;
}

interface TicketService {
    getDashboardData(): Promise<{
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
            status: 'open' | 'closed' | 'pending';
            creator: string;
            date: string;
            type: string;
            priority: string;
            claimed: boolean;
            claimedBy: string | null;
            rating: string;
        }>;
        chartData: {
            '1D': Array<any>;
            '1W': Array<any>;
            '1M': Array<any>;
            '3M': Array<any>;
            '1Y': Array<any>;
        };
        timeMetrics?: {
            older?: { total: number; open: number };
            month?: { total: number; open: number };
            week?: { total: number; open: number };
        };
        ticketTypeDistribution: Array<{ _id: string; count: number }>;
    }>;

    getTickets(filters: TicketFilters, page?: number): Promise<{
        tickets: Array<any>;
        total: number;
        page: number;
        filters: any;
    }>;

    getFilterOptions(): Promise<any>;

    getTicket(id: string | number): Promise<any>;

    createTicket(ticketData: any): Promise<any>;

    updateTicket(id: string | number, updateData: any): Promise<any>;

    deleteTicket(id: string | number): Promise<any>;

    closeTicket(id: string | number): Promise<any>;
}

declare const ticketService: TicketService;

export { ticketService };
export default ticketService; 