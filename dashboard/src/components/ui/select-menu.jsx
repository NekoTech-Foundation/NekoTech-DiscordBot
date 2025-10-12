import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

function SelectMenu({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select option', 
  multiple = false,
  className = '',
  maxHeight = '15rem'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option) => {
    if (multiple) {
      const newValue = Array.isArray(value) ? value : [];
      const index = newValue.indexOf(option.value);
      if (index === -1) {
        onChange([...newValue, option.value]);
      } else {
        onChange(newValue.filter(v => v !== option.value));
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  const getDisplayValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return placeholder;
    }

    if (multiple) {
      const selectedOptions = options.filter(option => value.includes(option.value));
      return selectedOptions.length > 0 
        ? `${selectedOptions.length} selected`
        : placeholder;
    }

    const selectedOption = options.find(option => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={value ? 'text-gray-100' : 'text-gray-500'}>
          {getDisplayValue()}
        </span>
        <FontAwesomeIcon 
          icon={faChevronDown} 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="overflow-auto" style={{ maxHeight }}>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors duration-200 ${
                  isSelected(option.value) ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {option.icon && (
                    <span className="flex-shrink-0">
                      {typeof option.icon === 'string' ? (
                        <img src={option.icon} alt="" className="w-5 h-5 rounded" />
                      ) : (
                        option.icon
                      )}
                    </span>
                  )}
                  <span>{option.displayElement || option.label}</span>
                </div>
                {isSelected(option.value) && (
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectMenu; 