import { useParams } from 'react-router-dom'
import TicketTranscript from '../../components/tickets/components/TicketTranscript'

export default function TranscriptPage() {
    const { id } = useParams<{ id: string }>()

    if (!id) {
        return <div className="text-center text-red-500">Invalid ticket ID</div>
    }

    return <TicketTranscript ticketId={id} />
} 