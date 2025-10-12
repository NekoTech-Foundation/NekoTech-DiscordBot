import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileAlt, faLock, faHandHolding, faSort } from '@fortawesome/free-solid-svg-icons'
import { userDataService } from '../../../utils/userDataService'
import { useEffect, useState } from 'react'
import moment from 'moment-timezone'
import TicketSortModal from './TicketSortModal'

declare global {
    interface Window {
        USER_DATA?: {
            id: string;
        };
    }
}

interface Ticket {
    id: string | number;
    typeName?: string;
    type: string;
    status: string;
    priority: string;
    creator: string;
    assignee: string | null;
    createdAt: string;
    claimed?: boolean;
    claimedBy?: string | null;
}

const formatDateTime = (timestamp: string | undefined | null): string => {
    if (!timestamp) return 'Unknown Date';
    
    const isoDate = moment(timestamp);
    if (isoDate.isValid()) {
        return isoDate.tz(window.DASHBOARD_CONFIG.TIMEZONE).format('MMM D, YYYY [at] h:mm A z');
    }
    
    const date = moment(timestamp, ['MMM D, YYYY, hh:mm A z', 'MMM D, YYYY, HH:mm z']);
    if (date.isValid()) {
        return date.tz(window.DASHBOARD_CONFIG.TIMEZONE).format('MMM D, YYYY [at] h:mm A z');
    }
    
    return timestamp;
};

interface CachedUserData {
    avatar: string;
    displayName: string;
}

interface UserDisplayData {
    avatar: string;
    displayName: string;
    isLoading?: boolean;
}

interface TicketListProps {
    tickets: Ticket[]
}

interface SortField {
    status: string;
    order: number;
}

export default function TicketList({ tickets: initialTickets = [] }: TicketListProps) {
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
    const [userDisplayData, setUserDisplayData] = useState<Record<string, UserDisplayData>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [supportPermissions, setSupportPermissions] = useState<Record<string, boolean>>({});
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [isSortModalOpen, setIsSortModalOpen] = useState(false);
    const [statusOrder, setStatusOrder] = useState<SortField[]>([
        { status: 'open', order: 1 },
        { status: 'closed', order: 2 },
        { status: 'deleted', order: 3 }
    ]);

    useEffect(() => {
        setTickets(initialTickets);
        
        const loadPermissions = async () => {
            setIsLoadingPermissions(true);
            const uniqueTypes = Array.from(new Set(initialTickets.map(ticket => ticket.type)));
            const permissions: Record<string, boolean> = {};

            try {
                const permissionPromises = uniqueTypes.map(async (type) => {
                    try {
                        const response = await fetch(`/api/tickets/permissions/${type}`);
                        if (response.ok) {
                            const { hasSupport } = await response.json();
                            permissions[type] = hasSupport;
                        }
                    } catch (error) {
                        console.error(`Error checking permissions for type ${type}:`, error);
                        permissions[type] = false;
                    }
                });

                await Promise.all(permissionPromises);
                setSupportPermissions(permissions);
            } catch (error) {
                console.error('Error checking support permissions:', error);
            } finally {
                setIsLoadingPermissions(false);
            }
        };

        loadPermissions();
    }, [initialTickets]);

    useEffect(() => {
        const loadUserData = async () => {
            if (!tickets.length) return;

            const uniqueUsers = Array.from(new Set([
                ...tickets.map(ticket => ticket.creator),
                ...tickets.map(ticket => ticket.assignee).filter((assignee): assignee is string => assignee !== null)
            ]));

            const userDataPromises = uniqueUsers.map(async (userId) => {
                const data = await userDataService.getUserData(userId);
                return [userId, data] as const;
            });

            const userData = await Promise.all(userDataPromises);
            const initialData: Record<string, UserDisplayData> = Object.fromEntries(
                userData.map(([userId, data]) => [
                    userId,
                    {
                        avatar: data.avatar,
                        displayName: data.displayName
                    }
                ])
            );

            setUserDisplayData(initialData);
            userDataService.prefetchUsers(uniqueUsers);
        };

        loadUserData();

        const handleUserUpdate = (event: CustomEvent<{ userId: string; userData: CachedUserData }>) => {
            const { userId, userData } = event.detail;
            setUserDisplayData(prev => ({
                ...prev,
                [userId]: {
                    avatar: userData.avatar,
                    displayName: userData.displayName
                }
            }));
        };

        window.addEventListener('userDataUpdated', handleUserUpdate as EventListener);
        return () => {
            window.removeEventListener('userDataUpdated', handleUserUpdate as EventListener);
        };
    }, [tickets]);

    useEffect(() => {
        loadUserSortPreferences();
    }, []);

    const loadUserSortPreferences = async () => {
        try {
            const response = await fetch('/api/user/settings');
            if (response.ok) {
                const { ticketPreferences } = await response.json();
                if (ticketPreferences?.statusOrder) {
                    setStatusOrder(ticketPreferences.statusOrder);
                    applySort(initialTickets, ticketPreferences.statusOrder);
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    };

    const saveUserSortPreferences = async (newStatusOrder: SortField[]) => {
        try {
            await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ticketPreferences: {
                        statusOrder: newStatusOrder
                    }
                })
            });
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    };

    const applySort = (ticketsToSort: Ticket[], order: SortField[]) => {
        const statusOrderMap = new Map(order.map(item => [item.status, item.order]));
        
        const sortedTickets = [...ticketsToSort].sort((a, b) => {
            const orderA = statusOrderMap.get(a.status) || 999;
            const orderB = statusOrderMap.get(b.status) || 999;
            return orderA - orderB;
        });

        setTickets(sortedTickets);
    };

    const handleSortSave = async (newStatusOrder: SortField[]) => {
        setStatusOrder(newStatusOrder);
        applySort(tickets, newStatusOrder);
        await saveUserSortPreferences(newStatusOrder);
    };

    const handleClaimTicket = async (ticketId: string | number) => {
        try {
            setLoading(prev => ({ ...prev, [`claim-${ticketId}`]: true }));
            const response = await fetch(`/api/tickets/claim/${ticketId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to claim ticket');
            }

            const result = await response.json();

            setTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId
                        ? {
                            ...ticket,
                            claimed: result.ticket.claimed,
                            claimedBy: result.ticket.claimedBy,
                            assignee: result.ticket.assignee
                        }
                        : ticket
                )
            );

            if (result.ticket.claimedBy && !userDisplayData[result.ticket.claimedBy]) {
                const userData = await userDataService.getUserData(result.ticket.claimedBy);
                setUserDisplayData(prev => ({
                    ...prev,
                    [result.ticket.claimedBy]: {
                        avatar: userData.avatar,
                        displayName: userData.displayName
                    }
                }));
            }
        } catch (error) {
            console.error('Error claiming ticket:', error);
            alert(error instanceof Error ? error.message : 'Failed to claim ticket');
        } finally {
            setLoading(prev => ({ ...prev, [`claim-${ticketId}`]: false }));
        }
    };

    const handleCloseTicket = async (ticketId: string | number) => {
        try {
            const reason = prompt('Enter a reason for closing the ticket (optional):');
            if (reason !== null) {
                setLoading(prev => ({ ...prev, [`close-${ticketId}`]: true }));

                alert('The ticket will now be closed.');

                setTickets(prevTickets => 
                    prevTickets.map(ticket => 
                        ticket.id === ticketId
                            ? { ...ticket, status: 'closing' }
                            : ticket
                    )
                );

                const response = await fetch(`/api/tickets/close/${ticketId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to close ticket');
                }

                setTickets(prevTickets => 
                    prevTickets.map(ticket => 
                        ticket.id === ticketId
                            ? { 
                                ...ticket, 
                                status: 'closed',
                                statusStyle: 'bg-red-500/15 text-red-300 border border-red-500/30'
                            }
                            : ticket
                    )
                );
            }
        } catch (error) {
            console.error('Error closing ticket:', error);
            alert(error instanceof Error ? error.message : 'Failed to close ticket');
            
            setTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId
                        ? { 
                            ...ticket, 
                            status: 'open',
                            statusStyle: 'bg-green-500/15 text-green-300 border border-green-500/30'
                        }
                        : ticket
                )
            );
        } finally {
            setLoading(prev => ({ ...prev, [`close-${ticketId}`]: false }));
        }
    };

    if (!tickets?.length) {
        return (
            <div className="text-center py-8 text-gray-400">
                No tickets found
            </div>
        );
    }

    const getNumericId = (id: string | number) => {
        if (typeof id === 'number') return id;
        return id.toString().replace('#', '');
    };

    if (isLoadingPermissions) {
        return (
            <div className="overflow-x-auto rounded-xl border border-border bg-card/20 backdrop-blur-xl shadow-xl shadow-black/10 scrollbar-thin scrollbar-thumb-muted scrollbar-track-secondary/50">
                <div className="min-w-[800px]">
                    <table className="w-full divide-y divide-border table-fixed lg:table-auto">
                        <thead>
                            <tr className="bg-secondary/50 backdrop-blur-sm">
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[8%]">ID</th>
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[12%]">Type</th>
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Created By</th>
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">Status</th>
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">Priority</th>
                                <th scope="col" className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[12%]">Created</th>
                                <th scope="col" className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Claimed By</th>
                                <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[23%] sm:w-[20%]">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {[...Array(10)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="h-4 w-10 bg-secondary/50 rounded"></div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="h-6 w-16 sm:w-24 bg-secondary/50 rounded-md"></div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary/50"></div>
                                            <div className="h-4 w-16 sm:w-24 bg-secondary/50 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="h-6 w-12 sm:w-16 bg-secondary/50 rounded-full"></div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="h-6 w-12 sm:w-16 bg-secondary/50 rounded-full"></div>
                                    </td>
                                    <td className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="h-4 w-16 sm:w-32 bg-secondary/50 rounded"></div>
                                    </td>
                                    <td className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary/50"></div>
                                            <div className="h-4 w-16 sm:w-24 bg-secondary/50 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4">
                                        <div className="flex flex-wrap items-center justify-end sm:justify-start gap-2">
                                            <div className="h-[30px] w-[32px] sm:w-[64px] rounded-lg bg-primary/10 border border-primary/30"></div>
                                            <div className="h-[30px] w-[32px] sm:w-[64px] rounded-lg bg-primary/10 border border-primary/30"></div>
                                            <div className="h-[30px] w-[32px] sm:w-[64px] rounded-lg bg-destructive/10 border border-destructive/30"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/20 backdrop-blur-xl shadow-xl shadow-black/10 scrollbar-thin scrollbar-thumb-muted scrollbar-track-secondary/50">
            <div className="min-w-[800px]">
                <table className="w-full divide-y divide-border table-fixed lg:table-auto">
                    <thead>
                        <tr className="bg-secondary/50 backdrop-blur-sm">
                            <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[8%]">ID</th>
                            <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[12%]">Type</th>
                            <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Created By</th>
                            <th 
                                scope="col" 
                                className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-white transition-colors duration-200 select-none group w-[10%]"
                                onClick={() => setIsSortModalOpen(true)}
                            >
                                <div className="flex items-center gap-2">
                                    <span>Status</span>
                                    <FontAwesomeIcon 
                                        icon={faSort} 
                                        className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" 
                                    />
                                </div>
                            </th>
                            <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[10%]">Priority</th>
                            <th scope="col" className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[12%]">Created</th>
                            <th scope="col" className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[15%]">Claimed By</th>
                            <th scope="col" className="px-2 sm:px-4 lg:px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[23%] sm:w-[20%]">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tickets.map((ticket) => {
                            const numericId = getNumericId(ticket.id);
                            const userData = userDisplayData[ticket.creator] || userDataService.getDefaultUserData(ticket.creator);
                            return (
                                <tr
                                    key={numericId}
                                    className="group hover:bg-secondary/40 transition-all duration-300 ease-in-out"
                                >
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <Link
                                            to={`/tickets/${numericId}/transcript`}
                                            className="text-primary hover:text-primary/80 transition-all duration-200 font-medium group-hover:scale-105 inline-flex items-center gap-1.5"
                                        >
                                            <span className="text-muted-foreground">#</span>{numericId}
                                        </Link>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 text-sm text-foreground whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/50 text-foreground group-hover:bg-secondary/70 transition-all duration-200 backdrop-blur-sm text-xs sm:text-sm">
                                            {ticket.typeName || ticket.type}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <img
                                                src={userData.avatar}
                                                alt={userData.displayName}
                                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full ring-2 ring-border group-hover:ring-primary/50 transition-all duration-200 object-cover"
                                            />
                                            <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate">
                                                {userData.displayName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                            ticket.status === 'open' ? 'bg-green-400/10 text-green-400 ring-1 ring-green-400/30 group-hover:bg-green-400/20 group-hover:ring-green-400/50' :
                                            ticket.status === 'closed' ? 'bg-red-400/10 text-red-400 ring-1 ring-red-400/30 group-hover:bg-red-400/20 group-hover:ring-red-400/50' :
                                            'bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/30 group-hover:bg-yellow-400/20 group-hover:ring-yellow-400/50'
                                        }`}>
                                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                            ticket.priority === 'high' ? 'bg-rose-400/10 text-rose-400 ring-1 ring-rose-400/30 group-hover:bg-rose-400/20 group-hover:ring-rose-400/50' :
                                            ticket.priority === 'medium' ? 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30 group-hover:bg-amber-400/20 group-hover:ring-amber-400/50' :
                                            'bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/30 group-hover:bg-teal-400/20 group-hover:ring-teal-400/50'
                                        }`}>
                                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                        <span className="group-hover:text-foreground transition-colors duration-200">
                                            {formatDateTime(ticket.createdAt)}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        {ticket.assignee ? (
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <img
                                                    src={userDisplayData[ticket.assignee]?.avatar || userDataService.getDefaultUserData(ticket.assignee).avatar}
                                                    alt={userDisplayData[ticket.assignee]?.displayName || 'Unknown User'}
                                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full ring-2 ring-border group-hover:ring-primary/50 transition-all duration-200 object-cover"
                                                />
                                                <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate">
                                                    {userDisplayData[ticket.assignee]?.displayName || 'Unknown User'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground ring-1 ring-border group-hover:bg-muted/80 group-hover:ring-border/80 transition-all duration-200">
                                                Unclaimed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4">
                                        <div className="flex flex-wrap items-center justify-end sm:justify-start gap-2">
                                            <Link
                                                to={`/tickets/${numericId}/transcript`}
                                                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium rounded-lg text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all duration-200"
                                                title="View Transcript"
                                            >
                                                <FontAwesomeIcon icon={faFileAlt} className="w-3.5 h-3.5 mr-1.5 sm:mr-2" />
                                                <span className="hidden xs:inline">View</span>
                                            </Link>
                                            {ticket.status === 'open' && supportPermissions[ticket.type] && (
                                                <>
                                                    <button
                                                        onClick={() => handleClaimTicket(numericId)}
                                                        disabled={loading[`claim-${numericId}`]}
                                                        className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                                            ticket.claimed
                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                                                                : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                                                        }`}
                                                        title={ticket.claimed ? 'Unclaim this ticket' : 'Claim this ticket'}
                                                    >
                                                        <FontAwesomeIcon 
                                                            icon={faHandHolding} 
                                                            className={`w-3.5 h-3.5 mr-1.5 sm:mr-2 ${loading[`claim-${numericId}`] ? 'animate-pulse' : ''}`} 
                                                        />
                                                        <span className="hidden xs:inline">{ticket.claimed ? 'Unclaim' : 'Claim'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleCloseTicket(numericId)}
                                                        disabled={loading[`close-${numericId}`]}
                                                        className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-all duration-200"
                                                        title="Close Ticket"
                                                    >
                                                        <FontAwesomeIcon 
                                                            icon={faLock} 
                                                            className={`w-3.5 h-3.5 mr-1.5 sm:mr-2 ${loading[`close-${numericId}`] ? 'animate-pulse' : ''}`} 
                                                        />
                                                        <span className="hidden xs:inline">Close</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TicketSortModal
                isOpen={isSortModalOpen}
                onClose={() => setIsSortModalOpen(false)}
                onSave={handleSortSave}
                initialSortOrder={statusOrder}
            />
        </div>
    );
}