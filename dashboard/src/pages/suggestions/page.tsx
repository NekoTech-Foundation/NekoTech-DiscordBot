import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faClock, 
  faCheck, 
  faTimes, 
  faMagnifyingGlass,
  faChevronLeft,
  faChevronRight,
  faFilter
} from "@fortawesome/free-solid-svg-icons";
import { Suggestion } from '../../types/suggestions';
import SuggestionList from './components/SuggestionList';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'denied'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/suggestions');
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (id: string, reason: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/suggestions/${id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || 'No reason provided' }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept suggestion');
      }

      setSuggestions((prev) =>
        prev.map((s) =>
          s.uniqueId === id
            ? { ...s, status: 'Accepted', reason: reason.trim() || 'No reason provided', updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept suggestion');
    }
  };

  const handleDeny = async (id: string, reason: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/suggestions/${id}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || 'No reason provided' }),
      });

      if (!response.ok) {
        throw new Error('Failed to deny suggestion');
      }

      setSuggestions((prev) =>
        prev.map((s) =>
          s.uniqueId === id
            ? { ...s, status: 'Denied', reason: reason.trim() || 'No reason provided', updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny suggestion');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete suggestion');
      }

      setSuggestions((prev) => prev.filter((s) => s.uniqueId !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete suggestion');
    }
  };

  const filteredSuggestions = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return suggestions.filter(suggestion => {
      if (!suggestion) return false;
      
      const matchesSearch = (
        (suggestion.text?.toLowerCase() || '').includes(searchLower) ||
        (suggestion.authorId?.toLowerCase() || '').includes(searchLower)
      );

      const matchesStatus = 
        (activeTab === 'pending' && suggestion.status === 'Pending') ||
        (activeTab === 'accepted' && suggestion.status === 'Accepted') ||
        (activeTab === 'denied' && suggestion.status === 'Denied');

      return matchesSearch && matchesStatus;
    });
  }, [suggestions, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredSuggestions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSuggestions = filteredSuggestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pageNumbers.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      end = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
    }

    if (start > 2) pageNumbers.push('...');
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    if (end < totalPages - 1) pageNumbers.push('...');
    
    if (totalPages > 1) pageNumbers.push(totalPages);

    return pageNumbers;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-2 sm:px-0">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-border overflow-hidden"
      >
        {/* Header with Tabs and Search */}
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 border-b border-border">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
            <motion.button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Pending</span>
              {activeTab === 'pending' && (
                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-primary/20 rounded-full">
                  {suggestions.filter(s => s.status === 'Pending').length}
                </span>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => setActiveTab('accepted')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'accepted'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Accepted</span>
              {activeTab === 'accepted' && (
                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-emerald-500/20 rounded-full">
                  {suggestions.filter(s => s.status === 'Accepted').length}
                </span>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => setActiveTab('denied')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'denied'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Denied</span>
              {activeTab === 'denied' && (
                <span className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs bg-rose-500/20 rounded-full">
                  {suggestions.filter(s => s.status === 'Denied').length}
                </span>
              )}
            </motion.button>
          </div>

          {/* Search */}
          <div className="flex-1 flex justify-end">
            <div className="relative w-full sm:max-w-md group">
              <input
                type="text"
                placeholder="Search suggestions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg pl-9 sm:pl-10 pr-4 py-1.5 sm:py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200 group-hover:border-border/80 group-hover:bg-secondary/80"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-200 group-hover:text-muted-foreground/80"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border"
            >
              <div className="m-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </div>
                <p className="flex-1">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            <SuggestionList
              suggestions={paginatedSuggestions}
              isLoading={isLoading}
              error={error}
              onAccept={handleAccept}
              onDeny={handleDeny}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />

            {/* Pagination */}
            {!isLoading && filteredSuggestions.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 px-3 sm:px-4 border-t border-border">
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Showing <span className="font-medium text-foreground">{Math.min(startIndex + 1, filteredSuggestions.length)}</span> to <span className="font-medium text-foreground">{Math.min(startIndex + ITEMS_PER_PAGE, filteredSuggestions.length)}</span> of <span className="font-medium text-foreground">{filteredSuggestions.length}</span> suggestions
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2">
                  <motion.button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                      currentPage === 1
                        ? 'text-foreground cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                    whileHover={currentPage !== 1 ? { scale: 1.05 } : undefined}
                    whileTap={currentPage !== 1 ? { scale: 0.95 } : undefined}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </motion.button>

                  <div className="flex gap-1.5 sm:gap-2">
                    {getPageNumbers().map((pageNum, index) => (
                      <React.Fragment key={index}>
                        {pageNum === '...' ? (
                          <span className="px-1.5 sm:px-2 text-muted-foreground">...</span>
                        ) : (
                          <motion.button
                            onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                            className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? `${
                                    activeTab === 'accepted' 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                                      : activeTab === 'denied' 
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                                      : 'bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/10'
                                  }`
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {pageNum}
                          </motion.button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <motion.button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                      currentPage === totalPages
                        ? 'text-foreground cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                    whileHover={currentPage !== totalPages ? { scale: 1.05 } : undefined}
                    whileTap={currentPage !== totalPages ? { scale: 0.95 } : undefined}
                  >
                    <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 