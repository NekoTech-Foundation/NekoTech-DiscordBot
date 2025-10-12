import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Suggestion } from '../../../types/suggestions';
import SuggestionCard from './SuggestionCard';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { userDataService } from '../../../utils/userDataService';

interface UserData {
  avatar: string;
  displayName: string;
  username: string;
}

interface SuggestionListProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  onAccept: (id: string, reason: string) => void;
  onDeny: (id: string, reason: string) => void;
  onDelete: (id: string) => void;
}

const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  isLoading,
  error,
  searchQuery,
  onAccept,
  onDeny,
  onDelete,
}) => {
  const [usersData, setUsersData] = useState<Record<string, UserData>>({});
  const [loadingUserIds, setLoadingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUsersData = async () => {
      const uniqueUserIds = [...new Set(suggestions.map(s => s.authorId))];
      
      const userIdsToFetch = uniqueUserIds.filter(id => 
        !usersData[id] && !loadingUserIds.has(id)
      );

      if (userIdsToFetch.length === 0) return;

      setLoadingUserIds(prev => new Set([...prev, ...userIdsToFetch]));

      const userDataPromises = userIdsToFetch.map(async (userId) => {
        try {
          const data = await userDataService.getUserData(userId);
          if (data) {
            return [userId, data] as const;
          }
          return null;
        } catch (error) {
          console.error(`Error fetching user data for ${userId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(userDataPromises);

      const newUsersData = { ...usersData };
      results.forEach(result => {
        if (result) {
          const [userId, data] = result;
          newUsersData[userId] = data;
        }
      });
      setUsersData(newUsersData);

      setLoadingUserIds(prev => {
        const next = new Set(prev);
        userIdsToFetch.forEach(id => next.delete(id));
        return next;
      });
    };

    fetchUsersData();
  }, [suggestions]);

  if (isLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="text-lg font-medium mb-2">Error loading suggestions</p>
          <p className="text-sm opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[300px] flex items-center justify-center text-center"
      >
        <div className="text-gray-400">
          <p className="text-lg font-medium mb-2">No suggestions found</p>
          <p className="text-sm opacity-75">
            {searchQuery
              ? `No suggestions matching "${searchQuery}"`
              : 'There are no suggestions to display'}
          </p>
        </div>
      </motion.div>
    );
  }

  const filledSuggestions = Array(15).fill(null).map((_, index) => suggestions[index] || null);

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      <AnimatePresence mode="popLayout">
        {filledSuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion?.uniqueId || `empty-${index}`}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            {suggestion ? (
              <SuggestionCard
                suggestion={suggestion}
                onAccept={onAccept}
                onDeny={onDeny}
                onDelete={onDelete}
                userData={usersData[suggestion.authorId]}
              />
            ) : (
              <div className="aspect-[4/3] rounded-xl bg-gray-900/20 border border-gray-800/20" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SuggestionList; 