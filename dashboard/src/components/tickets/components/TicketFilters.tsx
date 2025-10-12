import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import type { TicketFilters as ITicketFilters } from '../../../types/ticket'
import { ticketService } from '../../../services/ticketService'

interface TicketFiltersProps {
    filters: ITicketFilters
    setFilters: Dispatch<SetStateAction<ITicketFilters>>
}

interface FilterOptions {
    types: Array<{ id: string, name: string }>
    priorities: string[]
    statuses: string[]
}

export default function TicketFilters({ filters, setFilters }: TicketFiltersProps) {
    const [options, setOptions] = useState<FilterOptions | null>(null)

    useEffect(() => {
        async function fetchFilterOptions() {
            try {
                const filterOptions = await ticketService.getFilterOptions()
                setOptions(filterOptions)
            } catch (error) {
                console.error('Failed to fetch filter options:', error)
            }
        }

        fetchFilterOptions()
    }, [])

    if (!options) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
                <option value="all">All Status</option>
                {options.statuses.map(status => (
                    <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                ))}
            </select>

            <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
                <option value="all">All Priorities</option>
                {options.priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                ))}
            </select>

            <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
                <option value="all">All Types</option>
                {options.types.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                ))}
            </select>

            <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
            </select>
        </div>
    )
} 