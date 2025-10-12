import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faGripVertical } from '@fortawesome/free-solid-svg-icons';

interface SortField {
    status: string;
    order: number;
}

interface TicketSortModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sortOrder: SortField[]) => void;
    initialSortOrder?: SortField[];
}

const defaultSortFields: SortField[] = [
    { status: 'open', order: 1 },
    { status: 'closed', order: 2 },
    { status: 'deleted', order: 3 }
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'open':
            return 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30';
        case 'closed':
            return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30';
        case 'deleted':
            return 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30';
        default:
            return 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/30';
    }
};

export default function TicketSortModal({ isOpen, onClose, onSave, initialSortOrder }: TicketSortModalProps) {
    const [sortOrder, setSortOrder] = useState<SortField[]>(defaultSortFields);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);


    useEffect(() => {
        if (isOpen) {
            setSortOrder(initialSortOrder || defaultSortFields);
        }
    }, [isOpen, initialSortOrder]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.currentTarget.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('opacity-50');
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const items = Array.from(sortOrder);
        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(dropIndex, 0, draggedItem);

        const updatedItems = items.map((item, index) => ({
            ...item,
            order: index + 1
        }));

        setSortOrder(updatedItems);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleSave = () => {
        onSave(sortOrder);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900/95 rounded-xl shadow-2xl w-full max-w-md border border-gray-700/50 backdrop-blur-xl">
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Sort Tickets by Status</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <p className="text-gray-400 text-sm">
                        Drag and drop to reorder how ticket statuses are displayed.
                    </p>

                    <div className="space-y-2">
                        {sortOrder.map((field, index) => (
                            <div
                                key={field.status}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`flex items-center bg-gray-800/50 rounded-lg p-4 group border backdrop-blur-sm transition-all duration-200 ${
                                    draggedIndex === index 
                                        ? 'opacity-50 border-blue-500/50' 
                                        : dragOverIndex === index
                                        ? 'border-blue-500/50 scale-[1.02]'
                                        : 'border-gray-700/50 hover:border-gray-600/50'
                                }`}
                            >
                                <div 
                                    className="mr-3 text-gray-500 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing"
                                >
                                    <FontAwesomeIcon icon={faGripVertical} />
                                </div>
                                <div className="flex-grow flex items-center justify-between">
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${getStatusColor(field.status)}`}>
                                        {field.status}
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                        Order: {field.order}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all duration-200 ring-1 ring-blue-500/30 hover:ring-blue-500/50"
                        >
                            Save Sort Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 