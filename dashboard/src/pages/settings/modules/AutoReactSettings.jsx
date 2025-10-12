import React, { useState, useEffect } from 'react';
import api from '../../../lib/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSmile, faChevronDown, faPlus, faTimes, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import SelectMenu from '../../../components/ui/select-menu';
import { motion } from 'framer-motion';

const standardEmojis = [
  '👍', '👎', '❤️', '🎉', '🔥', '👀', '💯', '✅', '❌', '⭐',
  '🌟', '💪', '🙏', '🤔', '😄', '😊', '🙂', '😂', '😍', '😎',
  '😢', '😭', '😤', '😠', '🎮', '🎲', '🎯', '🎨', '🎭', '🎪'
];

const safeIncludes = (str, pattern) => {
  if (!str || typeof str !== 'string') return false;
  return str.includes(pattern);
};

const getEmojiDisplay = (emoji) => {
  if (!emoji) return null;
  
  if (safeIncludes(emoji, ':')) {
    try {
      const parts = emoji.split(':');
      const id = parts[2]?.replace('>', '') || '';
      const name = parts[1] || '';
      return {
        isCustom: true,
        url: `https://cdn.discordapp.com/emojis/${id}.png`,
        name: name
      };
    } catch (err) {
      console.error('Error parsing custom emoji:', err);
      return null;
    }
  }
  
  return {
    isCustom: false,
    emoji: emoji
  };
};

function AutoReactSettings() {
  const [reactions, setReactions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverData, setServerData] = useState({
    emojis: [],
    roles: [],
    channels: []
  });
  const [newReaction, setNewReaction] = useState({
    keyword: '',
    emoji: '',
    whitelistRoles: [],
    whitelistChannels: []
  });

  useEffect(() => {
    if (isExpanded) {
      fetchServerData();
      fetchReactions();
    }
  }, [isExpanded]);

  const fetchServerData = async () => {
    try {
      const response = await api.get('/settings/server-data');
      setServerData(response.data);
    } catch (err) {
      setError('Failed to fetch server data');
      console.error(err);
    }
  };

  const fetchReactions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings/auto-reacts');
      setReactions(data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching auto reacts:', error);
      setError('Failed to load auto reacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReaction = async (e) => {
    e.preventDefault();

    const isDuplicate = reactions.some(reaction => 
      reaction.keyword.toLowerCase() === newReaction.keyword.toLowerCase()
    );

    if (isDuplicate) {
      setError('A reaction with this keyword already exists');
      return;
    }

    try {
      setLoading(true);
      
      const { data } = await api.post('/settings/auto-reacts', newReaction);
      setReactions([...reactions, data]);
      setShowAddModal(false);
      setNewReaction({
        keyword: '',
        emoji: '',
        whitelistRoles: [],
        whitelistChannels: []
      });
      setError('');
    } catch (error) {
      console.error('Error saving auto react:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save auto react';
      setError(errorMessage);
      
      if (error.response?.status === 403) {
        setError('You do not have permission to create auto reacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReaction = async (id) => {
    if (!window.confirm('Are you sure you want to remove this auto react?')) {
      return;
    }

    try {
      setLoading(true);
      
      await api.delete(`/settings/auto-reacts/${id}`);

      setReactions(reactions.filter(react => react._id !== id));
      setError('');
    } catch (error) {
      console.error('Error removing auto react:', error);
      const errorMessage = error.response?.data?.error || 'Failed to remove auto react';
      setError(errorMessage);
      
      if (error.response?.status === 403) {
        setError('You do not have permission to remove auto reacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEmoji = (emoji) => {
    const display = getEmojiDisplay(emoji);
    if (!display) return null;

    return display.isCustom ? (
      <img 
        src={display.url}
        alt={display.name}
        className="w-6 h-6"
      />
    ) : (
      <span className="text-2xl">{display.emoji}</span>
    );
  };

  const standardEmojiOptions = standardEmojis.map(emoji => ({
    value: emoji,
    label: emoji,
    displayElement: (
      <div className="flex items-center space-x-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-gray-400 text-sm">Emoji</span>
      </div>
    )
  }));

  const customEmojiOptions = serverData.emojis?.map(emoji => ({
    value: emoji.isStandard ? emoji.name : `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
    label: emoji.name,
    displayElement: (
      <div className="flex items-center space-x-2">
        {emoji.isStandard ? (
          <span className="text-xl">{emoji.name}</span>
        ) : (
          <img 
            src={emoji.imageURL ? (typeof emoji.imageURL === 'function' ? emoji.imageURL() : emoji.imageURL) : `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`} 
            alt={emoji.name} 
            className="w-5 h-5" 
          />
        )}
        <span className="text-gray-400 text-sm">{emoji.name}</span>
      </div>
    )
  })) || [];

  const allEmojiOptions = [
    ...standardEmojiOptions,
    ...customEmojiOptions
  ];

  const roleOptions = serverData.roles?.map(role => ({
    value: role.id,
    label: role.name,
    icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
  })) || [];

  const channelOptions = serverData.channels?.map(channel => ({
    value: channel.id,
    label: `#${channel.name}`,
    parent: channel.parent
  })) || [];

  const groupedChannelOptions = channelOptions.reduce((acc, channel) => {
    const parent = channel.parent || 'No Category';
    if (!acc[parent]) {
      acc[parent] = [];
    }
    acc[parent].push(channel);
    return acc;
  }, {});

  const flatChannelOptions = Object.entries(groupedChannelOptions).flatMap(([category, channels]) => [
    { value: category, label: category, isCategory: true, disabled: true },
    ...channels
  ]);

  if (loading && isExpanded) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-secondary/30 transition-colors duration-200 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FontAwesomeIcon icon={faSmile} className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Auto Reactions</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Loading...</span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
        {isExpanded && (
          <div className="mt-6">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:bg-secondary/30 transition-colors duration-200 rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <FontAwesomeIcon icon={faSmile} className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Auto Reactions</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{reactions.length} reactions</span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="mt-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end mb-6">
              <motion.button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:from-primary/90 hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Reaction</span>
              </motion.button>
            </div>

            <div className="space-y-4">
              {reactions.length === 0 ? (
                <div className="bg-secondary/30 border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground text-center">No auto reactions configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reactions.map((reaction) => (
                    <motion.div
                      key={reaction._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-secondary/30 border border-border rounded-xl overflow-hidden hover:bg-secondary/50 transition-colors duration-200"
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            {renderEmoji(reaction.emoji)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{reaction.keyword}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {reaction.whitelistRoles.length > 0 && (
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                                  {reaction.whitelistRoles.length} role{reaction.whitelistRoles.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {reaction.whitelistChannels.length > 0 && (
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                                  {reaction.whitelistChannels.length} channel{reaction.whitelistChannels.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => handleRemoveReaction(reaction._id)}
                          className="text-destructive hover:text-destructive/80 focus:outline-none focus:text-destructive/80 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Reaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <FontAwesomeIcon icon={faSmile} className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground">Add Auto Reaction</h3>
                    </div>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleAddReaction} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Keyword
                      <span className="text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={newReaction.keyword}
                      onChange={(e) => setNewReaction({ ...newReaction, keyword: e.target.value })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Message that triggers this reaction"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The bot will react when this word or phrase appears in a message
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Emoji
                      <span className="text-destructive ml-1">*</span>
                    </label>
                    <select
                      value={newReaction.emoji}
                      onChange={(e) => setNewReaction({ ...newReaction, emoji: e.target.value })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="">Select an emoji</option>
                      {allEmojiOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Whitelist Roles</label>
                    <select
                      multiple
                      value={newReaction.whitelistRoles}
                      onChange={(e) => setNewReaction({
                        ...newReaction,
                        whitelistRoles: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      size={4}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Hold Ctrl/Cmd to select multiple roles. Leave empty to allow all roles.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Whitelist Channels</label>
                    <select
                      multiple
                      value={newReaction.whitelistChannels}
                      onChange={(e) => setNewReaction({
                        ...newReaction,
                        whitelistChannels: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      size={4}
                    >
                      {Object.entries(groupedChannelOptions).map(([category, channels]) => (
                        <optgroup key={category} label={category}>
                          {channels.map((channel) => (
                            <option key={channel.value} value={channel.value}>
                              {channel.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Hold Ctrl/Cmd to select multiple channels. Leave empty to allow all channels.
                    </p>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:from-primary/80 hover:to-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      <span>Add Reaction</span>
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AutoReactSettings; 