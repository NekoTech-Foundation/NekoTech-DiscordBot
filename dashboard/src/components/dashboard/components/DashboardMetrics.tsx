import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTicket, faCircle, faClock, faSmile } from '@fortawesome/free-solid-svg-icons'

interface Metric {
    title: string
    value: string
    change?: number
    color: string
    tooltip?: string
}

interface DashboardMetricsProps {
    metrics: Metric[]
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
    const icons = {
        'Total Tickets': { icon: faTicket, color: 'pink' },
        'Open Tickets': { icon: faCircle, color: 'purple' },
        'Avg. Response Time': { icon: faClock, color: 'blue' },
        'Customer Satisfaction': { icon: faSmile, color: 'green' },
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((metric, index) => (
                <motion.div
                    key={metric.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-800/50"
                    title={metric.tooltip}
                >
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`bg-${icons[metric.title as keyof typeof icons].color}-500/10 p-2 sm:p-3 rounded-xl`}>
                            <FontAwesomeIcon 
                                icon={icons[metric.title as keyof typeof icons].icon}
                                className={`h-5 w-5 sm:h-6 sm:w-6 text-${icons[metric.title as keyof typeof icons].color}-500`}
                            />
                        </div>
                        <div>
                            <h3 className="text-gray-400 text-sm font-medium">{metric.title}</h3>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl sm:text-2xl font-semibold text-white">{metric.value}</p>
                                {metric.change !== undefined && metric.change !== 0 && (
                                    <span className={`text-xs font-medium ${metric.change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
} 