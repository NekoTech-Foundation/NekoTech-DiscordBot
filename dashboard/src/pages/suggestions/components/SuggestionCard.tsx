import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheck, 
  faTimes, 
  faClock, 
  faChevronDown, 
  faChevronUp,
  faUser,
  faSpinner,
  faTrash,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { Suggestion } from '../../../types/suggestions';

interface UserData {
  avatar: string;
  displayName: string;
  username: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (id: string, reason: string) => void;
  onDeny: (id: string, reason: string) => void;
  onDelete: (id: string) => void;
  userData?: UserData;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAccept, onDeny, onDelete, userData }) => {
  const [isActioning, setIsActioning] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (action: 'accept' | 'deny') => {
    setIsActioning(true);
    try {
      if (action === 'accept') {
        await onAccept(suggestion.uniqueId, actionReason);
      } else {
        await onDeny(suggestion.uniqueId, actionReason);
      }
    } finally {
      setIsActioning(false);
      setActionReason('');
    }
  };

  const formattedDate = new Date(suggestion.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const shouldTruncate = suggestion.text.length > 150;
  const truncatedText = shouldTruncate && !isExpanded 
    ? suggestion.text.slice(0, 150) + '...' 
    : suggestion.text;

  const getStatusColor = () => {
    switch (suggestion.status) {
      case 'Pending':
        return {
          border: 'border-indigo-500/30',
          hoverBorder: 'group-hover:border-indigo-500/50',
          ring: 'ring-indigo-500/20',
          hoverRing: 'group-hover:ring-indigo-500/40',
          bg: 'bg-indigo-500/10',
          hoverBg: 'hover:bg-indigo-500/20',
          text: 'text-indigo-400',
          hoverText: 'hover:text-indigo-300',
          shadow: 'shadow-indigo-500/10'
        };
      case 'Accepted':
        return {
          border: 'border-emerald-500/30',
          hoverBorder: 'group-hover:border-emerald-500/50',
          ring: 'ring-emerald-500/20',
          hoverRing: 'group-hover:ring-emerald-500/40',
          bg: 'bg-emerald-500/10',
          hoverBg: 'hover:bg-emerald-500/20',
          text: 'text-emerald-400',
          hoverText: 'hover:text-emerald-300',
          shadow: 'shadow-emerald-500/10'
        };
      case 'Denied':
        return {
          border: 'border-rose-500/30',
          hoverBorder: 'group-hover:border-rose-500/50',
          ring: 'ring-rose-500/20',
          hoverRing: 'group-hover:ring-rose-500/40',
          bg: 'bg-rose-500/10',
          hoverBg: 'hover:bg-rose-500/20',
          text: 'text-rose-400',
          hoverText: 'hover:text-rose-300',
          shadow: 'shadow-rose-500/10'
        };
      default:
        return {
          border: 'border-gray-700/50',
          hoverBorder: 'group-hover:border-gray-700/70',
          ring: 'ring-gray-700/20',
          hoverRing: 'group-hover:ring-gray-700/40',
          bg: 'bg-gray-700/10',
          hoverBg: 'hover:bg-gray-700/20',
          text: 'text-gray-400',
          hoverText: 'hover:text-gray-300',
          shadow: 'shadow-gray-700/10'
        };
    }
  };

  const colors = getStatusColor();

  return (
    <>
      <motion.div
        className={`relative h-full bg-gray-900/50 backdrop-blur-xl border rounded-xl overflow-hidden transition-all duration-300 group flex flex-col ${colors.border} ${colors.hoverBorder}`}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
        />

        <div className="relative p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              {!userData ? (
                <motion.div 
                  className="w-8 h-8 rounded-full bg-gray-700/50"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-gray-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </motion.div>
              ) : (
                <motion.div 
                  className="relative group/avatar"
                  whileHover={{ scale: 1.1 }}
                >
                  <img
                    src={userData.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                    alt={userData.displayName || 'User'}
                    className={`w-8 h-8 rounded-full ring-2 transition-all duration-200 ${colors.ring} ${colors.hoverRing}`}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-offset-gray-900"
                    initial={{ opacity: 0, scale: 1.2 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
              )}
              <div>
                <motion.div 
                  className="text-sm font-medium text-gray-200 truncate"
                  animate={{ opacity: userData ? 1 : 0.7 }}
                >
                  {!userData ? (
                    <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
                  ) : (
                    <span className="hover:text-blue-400 transition-colors duration-200">
                      {userData.displayName || 'Unknown User'}
                    </span>
                  )}
                </motion.div>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5">
                  <FontAwesomeIcon icon={faClock} className="text-gray-500 w-3 h-3" />
                  {formattedDate}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Delete suggestion"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>

          <motion.div
            className="flex-1"
            animate={{ height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-gray-300 text-sm leading-relaxed">
              {truncatedText}
            </p>
            {shouldTruncate && (
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full text-center py-1.5 mt-2 text-sm font-medium rounded-lg transition-all duration-200 ${colors.text} ${colors.hoverText} ${colors.bg} ${colors.hoverBg}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronUp : faChevronDown} 
                  className="w-3 h-3 ml-1.5" 
                />
              </motion.button>
            )}
          </motion.div>

          {suggestion.status === 'Pending' && (
            <motion.div 
              className="mt-3 pt-3 border-t border-gray-800/50"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col gap-2">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Enter reason (optional)..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-300 placeholder-gray-500 transition-all duration-200 group-hover:border-gray-600/50 group-hover:bg-gray-800/70"
                  />
                  <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/20 opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100" />
                </div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleAction('accept')}
                    disabled={isActioning}
                    className={`relative flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActioning ? 'opacity-50 cursor-not-allowed' : ''
                    } bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActioning ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCheck} className="mr-1.5" />
                        Accept
                      </>
                    )}
                    <motion.div
                      className="absolute inset-0 rounded-lg ring-2 ring-emerald-500/20 opacity-0"
                      initial={false}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </motion.button>
                  <motion.button
                    onClick={() => handleAction('deny')}
                    disabled={isActioning}
                    className={`relative flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActioning ? 'opacity-50 cursor-not-allowed' : ''
                    } bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActioning ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faTimes} className="mr-1.5" />
                        Deny
                      </>
                    )}
                    <motion.div
                      className="absolute inset-0 rounded-lg ring-2 ring-rose-500/20 opacity-0"
                      initial={false}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {suggestion.status !== 'Pending' && suggestion.reason && (
            <motion.div 
              className="mt-3 pt-3 border-t border-gray-800/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Reason:</span> {suggestion.reason}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-xl overflow-hidden shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 opacity-0 transition-opacity duration-300"
                initial={false}
                animate={{ opacity: 1 }}
              />

              <div className="relative p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl shadow-lg shadow-rose-500/10">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-100 mb-2">Delete Suggestion</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Are you sure you want to delete this suggestion? This action cannot be undone and will remove the suggestion from both the dashboard and Discord.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 rounded-lg transition-all duration-200 border border-gray-700/50 hover:border-gray-700/70"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      onDelete(suggestion.uniqueId);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 hover:border-rose-500/30 transition-all duration-200 shadow-lg shadow-rose-500/10"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SuggestionCard;