import { useState } from 'react'
import type { TicketFilters as ITicketFilters } from '../../types/ticket'
import TicketFilters from './components/TicketFilters'
import TicketsContent from './components/TicketsContent'

export default function TicketsPage() {
    const [filters, setFilters] = useState<ITicketFilters>({
        status: 'all',
        priority: 'all',
        type: 'all',
        search: '',
        sortBy: 'newest'
    })

    return (
        <div className="space-y-6">
            <TicketFilters filters={filters} setFilters={setFilters} />
            <TicketsContent filters={filters} />
        </div>
    )
} 