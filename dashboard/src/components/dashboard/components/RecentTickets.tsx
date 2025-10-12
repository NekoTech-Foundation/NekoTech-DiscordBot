import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { userDataService } from '../../../utils/userDataService'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileAlt, faTicket, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import moment from 'moment-timezone'

interface UserDisplayData {
    avatar: string
    displayName: string
}

interface RecentTicketsProps {
    tickets: Array<{
        id: string | number
        typeName?: string
        type: string
        status: string
        priority: string
        date: string
        creator: string
        createdAt?: string
    }>
}

const formatDateTime = (timestamp: string | undefined | null): string => {
    if (!timestamp) return 'Unknown Date';
    
    const isoDate = moment(timestamp);
    if (isoDate.isValid()) {
        return isoDate.tz(window.DASHBOARD_CONFIG?.TIMEZONE || 'UTC').format('MMM D, YYYY [at] h:mm A z');
    }
    
    const date = moment(timestamp, ['MMM D, YYYY, hh:mm A z', 'MMM D, YYYY, HH:mm z']);
    if (date.isValid()) {
        return date.tz(window.DASHBOARD_CONFIG?.TIMEZONE || 'UTC').format('MMM D, YYYY [at] h:mm A z');
    }
    
    return timestamp;
};

export default function RecentTickets({ tickets = [] }: RecentTicketsProps) {
    const [userDisplayData, setUserDisplayData] = useState<Record<string, UserDisplayData>>({})
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadUserData = async () => {
            if (!tickets.length) {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            const uniqueCreators = Array.from(new Set(tickets.map(ticket => ticket.creator)))

            const initialData: Record<string, UserDisplayData> = {}
            for (const creator of uniqueCreators) {
                const data = await userDataService.getUserData(creator)
                initialData[creator] = {
                    avatar: data.avatar,
                    displayName: data.displayName
                }
            }
            setUserDisplayData(initialData)
            setIsLoading(false)

            userDataService.prefetchUsers(uniqueCreators)
        }

        loadUserData()

        const handleUserUpdate = (event: CustomEvent<{ userId: string; userData: { avatar: string; displayName: string } }>) => {
            const { userId, userData } = event.detail
            setUserDisplayData(prev => ({
                ...prev,
                [userId]: {
                    avatar: userData.avatar,
                    displayName: userData.displayName
                }
            }))
        }

        window.addEventListener('userDataUpdated', handleUserUpdate as EventListener)
        return () => {
            window.removeEventListener('userDataUpdated', handleUserUpdate as EventListener)
        }
    }, [tickets])

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                duration: 0.4,
                staggerChildren: 0.05
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                type: "spring", 
                stiffness: 300, 
                damping: 24 
            }
        }
    }

    const getNumericId = (id: string | number) => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
            const match = id.match(/\d+/);
            if (match) return match[0];
        }
        return id;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="overflow-hidden rounded-xl border border-border bg-card/20 backdrop-blur-xl shadow-xl shadow-black/10 relative"
        >
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:20px_20px] pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
                            <FontAwesomeIcon icon={faTicket} className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Recent Tickets</h3>
                    </div>
                    <Link
                        to="/tickets"
                        className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full bg-gradient-to-r from-primary/80 to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                    >
                        View All
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3 ml-2" />
                    </Link>
                </div>

                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-t-primary border-r-transparent border-b-primary/30 border-l-transparent animate-spin mb-4"></div>
                            <p className="text-muted-foreground text-sm">Loading tickets...</p>
                        </motion.div>
                    ) : tickets.length === 0 ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center py-16 text-center px-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 ring-1 ring-border">
                                <FontAwesomeIcon icon={faTicket} className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <h4 className="text-foreground text-base font-medium mb-1">No Recent Tickets</h4>
                            <p className="text-muted-foreground text-sm max-w-md">You don't have any tickets to display at the moment. New tickets will appear here when they are created.</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="table"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0 }}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-border">
                                <thead>
                                    <tr className="bg-secondary/50 backdrop-blur-sm">
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created By</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {tickets.map((ticket, index) => {
                                        const numericId = getNumericId(ticket.id);
                                        const userData = userDisplayData[ticket.creator] || userDataService.getDefaultUserData(ticket.creator);
                                        return (
                                            <motion.tr
                                                key={ticket.id}
                                                variants={itemVariants}
                                                custom={index}
                                                className="group hover:bg-secondary/40 transition-all duration-300 ease-in-out"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link
                                                        to={`/tickets/${numericId}/transcript`}
                                                        className="text-primary hover:text-primary/80 transition-all duration-200 font-medium group-hover:scale-105 inline-flex items-center gap-1.5"
                                                    >
                                                        <span className="text-muted-foreground">#</span>{numericId}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary/50 text-foreground group-hover:bg-secondary/70 transition-all duration-200 backdrop-blur-sm ring-1 ring-border group-hover:ring-border/80">
                                                        {ticket.typeName || ticket.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={userData.avatar}
                                                            alt={userData.displayName}
                                                            className="w-8 h-8 rounded-full ring-2 ring-border group-hover:ring-primary/50 transition-all duration-200 object-cover"
                                                        />
                                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                                                            {userData.displayName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                                        ticket.status === 'open' ? 'bg-green-400/10 text-green-400 ring-1 ring-green-400/30 group-hover:bg-green-400/20 group-hover:ring-green-400/50' :
                                                        ticket.status === 'closed' ? 'bg-red-400/10 text-red-400 ring-1 ring-red-400/30 group-hover:bg-red-400/20 group-hover:ring-red-400/50' :
                                                        'bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/30 group-hover:bg-yellow-400/20 group-hover:ring-yellow-400/50'
                                                    }`}>
                                                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                                        ticket.priority === 'high' ? 'bg-rose-400/10 text-rose-400 ring-1 ring-rose-400/30 group-hover:bg-rose-400/20 group-hover:ring-rose-400/50' :
                                                        ticket.priority === 'medium' ? 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30 group-hover:bg-amber-400/20 group-hover:ring-amber-400/50' :
                                                        'bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/30 group-hover:bg-teal-400/20 group-hover:ring-teal-400/50'
                                                    }`}>
                                                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                                    <span className="group-hover:text-foreground transition-colors duration-200">
                                                        {ticket.createdAt ? formatDateTime(ticket.createdAt) : ticket.date}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-all duration-200">
                                                        <Link
                                                            to={`/tickets/${numericId}/transcript`}
                                                            className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full bg-gradient-to-r from-primary/80 to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                                                            title="View Transcript"
                                                        >
                                                            <FontAwesomeIcon icon={faFileAlt} className="w-3.5 h-3.5 mr-2" />
                                                            View
                                                        </Link>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
