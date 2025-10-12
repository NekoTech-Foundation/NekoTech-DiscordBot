import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTicket, faCircle, faClock, faSmile } from '@fortawesome/free-solid-svg-icons'
import { Ticket } from '../../../types/ticket'

function formatResponseTime(minutes: number): string {
    if (minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours === 0) return `${remainingMinutes}m`
    return `${hours}h ${remainingMinutes}m`
}

interface TicketStatsProps {
    tickets: Ticket[]
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

export default function TicketStats({ 
    tickets, 
    totalTickets, 
    openTickets, 
    avgResponseTime,
    satisfactionRate,
    weeklyChanges 
}: TicketStatsProps) {
    const stats = [
        {
            title: 'Total Tickets',
            value: String(totalTickets),
            change: weeklyChanges?.totalTickets,
            color: 'pink',
            icon: faTicket
        },
        {
            title: 'Open Tickets',
            value: String(openTickets),
            change: weeklyChanges?.openTickets,
            color: 'purple',
            icon: faCircle
        },
        {
            title: 'Avg. Response Time',
            value: formatResponseTime(avgResponseTime),
            change: weeklyChanges?.avgResponseTime,
            color: 'blue',
            icon: faClock
        },
        {
            title: 'Customer Satisfaction',
            value: `${satisfactionRate}%`,
            change: weeklyChanges?.satisfactionRate,
            color: 'green',
            icon: faSmile
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-800/50"
                >
                    <div className="flex items-center gap-4">
                        <div className={`bg-${stat.color}-500/10 p-3 rounded-xl`}>
                            <FontAwesomeIcon 
                                icon={stat.icon} 
                                className={`h-6 w-6 text-${stat.color}-500`} 
                            />
                        </div>
                        <div>
                            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
                            <p className="text-2xl font-semibold text-white">{stat.value}</p>
                            {stat.change !== undefined && stat.change !== 0 && (
                                <span className={`text-xs font-medium ${stat.change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stat.change > 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
} 