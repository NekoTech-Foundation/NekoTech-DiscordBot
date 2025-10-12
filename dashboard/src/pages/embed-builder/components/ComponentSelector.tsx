import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHeading, 
    faAlignLeft, 
    faPalette, 
    faUser, 
    faList, 
    faImage, 
    faQuoteRight,
    faThumbTack,
    faLink
} from '@fortawesome/free-solid-svg-icons';

export type ComponentType = 
    | 'title'
    | 'description'
    | 'color'
    | 'author'
    | 'fields'
    | 'footer'
    | 'image'
    | 'thumbnail'
    | 'linkButtons';

interface ComponentOption {
    type: ComponentType;
    label: string;
    icon: any;
}

const componentOptions: ComponentOption[] = [
    { type: 'title', label: 'Title', icon: faHeading },
    { type: 'description', label: 'Description', icon: faAlignLeft },
    { type: 'color', label: 'Color', icon: faPalette },
    { type: 'author', label: 'Author', icon: faUser },
    { type: 'fields', label: 'Fields', icon: faList },
    { type: 'footer', label: 'Footer', icon: faQuoteRight },
    { type: 'image', label: 'Image', icon: faImage },
    { type: 'thumbnail', label: 'Thumbnail', icon: faThumbTack },
    { type: 'linkButtons', label: 'Link Buttons', icon: faLink }
];

interface ComponentSelectorProps {
    onSelect: (type: ComponentType) => void;
    activeComponents: ComponentType[];
}

const ComponentSelector: React.FC<ComponentSelectorProps> = ({ onSelect, activeComponents }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {componentOptions.map((option) => {
                const isActive = activeComponents.includes(option.type);
                return (
                    <button
                        key={option.type}
                        onClick={() => !isActive && onSelect(option.type)}
                        className={`flex items-center justify-center space-x-2 p-3 rounded-xl transition-all duration-200 ${
                            isActive 
                                ? 'bg-gray-700/30 cursor-not-allowed opacity-50' 
                                : 'bg-gray-800/50 hover:bg-gray-700/50 hover:border-blue-500/50 border border-gray-700/50'
                        }`}
                        disabled={isActive}
                    >
                        <FontAwesomeIcon icon={option.icon} className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-200">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default ComponentSelector; 