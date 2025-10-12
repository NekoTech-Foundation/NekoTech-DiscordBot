import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../../lib/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faChevronDown, faPlus, faCode, faFont, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

function AutoResponseSettings() {
  const [responses, setResponses] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [responseType, setResponseType] = useState('text');
  const [currentResponse, setCurrentResponse] = useState({
    trigger: '',
    type: 'text',
    content: '',
    embed: {
      title: '',
      description: '',
      color: '#5865F2',
      author: {
        name: '',
        icon_url: ''
      },
      footer: {
        text: '',
        icon_url: ''
      },
      thumbnail: '',
      image: '',
      timestamp: false
    }
  });

  useEffect(() => {
  }, [responseType, currentResponse]);

  useEffect(() => {
    fetchResponses();
  }, []);

  useEffect(() => {
    if (currentResponse.type !== responseType) {
      console.log('Syncing responseType with currentResponse.type');
      setResponseType(currentResponse.type);
    }
  }, [currentResponse.type]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings/auto-responses');
      setResponses(data);
      setError('');
    } catch (error) {
      console.error('Error fetching auto responses:', error);
      setError('Failed to load auto responses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isDuplicate = responses.some(response => 
      response.trigger.toLowerCase() === currentResponse.trigger.toLowerCase() &&
      (!isEditing || response._id !== currentResponse._id)
    );

    if (isDuplicate) {
      setError('A response with this trigger already exists');
      return;
    }

    try {
      setLoading(true);
      
      const cleanEmbed = {
        title: currentResponse.embed.title?.trim() || '',
        description: currentResponse.embed.description?.trim() || '',
        color: currentResponse.embed.color || '#5865F2',
        fields: currentResponse.embed.fields || []
      };
      
      if (currentResponse.embed.author?.name?.trim()) {
        cleanEmbed.author = {
          name: currentResponse.embed.author.name.trim(),
          icon_url: currentResponse.embed.author.icon_url?.trim() || null
        };
      }

      if (currentResponse.embed.footer?.text?.trim()) {
        cleanEmbed.footer = {
          text: currentResponse.embed.footer.text.trim(),
          icon_url: currentResponse.embed.footer.icon_url?.trim() || null
        };
      }

      if (currentResponse.embed.thumbnail?.trim()) {
        cleanEmbed.thumbnail = { url: currentResponse.embed.thumbnail.trim() };
      }
      if (currentResponse.embed.image?.trim()) {
        cleanEmbed.image = { url: currentResponse.embed.image.trim() };
      }

      if (currentResponse.embed.timestamp) {
        cleanEmbed.timestamp = true;
      }

      const responseData = {
        trigger: currentResponse.trigger.trim(),
        type: responseType,
        responseType: responseType.toUpperCase(),
        ...(responseType === 'text' ? { 
          content: currentResponse.content?.trim() || ''
        } : { 
          embed: cleanEmbed 
        })
      };

      console.log('Saving response data:', JSON.stringify(responseData, null, 2));

      if (isEditing) {
        const { data } = await api.put(`/settings/auto-responses/${currentResponse._id}`, responseData);
        setResponses(responses.map(response => 
          response._id === currentResponse._id ? data : response
        ));
      } else {
        const { data } = await api.post('/settings/auto-responses', responseData);
        setResponses([...responses, data]);
      }
      
      resetForm();
      setError('');
    } catch (error) {
      console.error('Error saving auto response:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save auto response';
      setError(errorMessage);
      
      if (error.response?.status === 403) {
        setError('You do not have permission to create auto responses');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveResponse = async (responseId) => {
    if (!window.confirm('Are you sure you want to remove this auto response?')) {
      return;
    }

    try {
      setLoading(true);
      
      await api.delete(`/settings/auto-responses/${responseId}`);

      setResponses(responses.filter(response => response._id !== responseId));
      setError('');
    } catch (error) {
      console.error('Error removing auto response:', error);
      const errorMessage = error.response?.data?.error || 'Failed to remove auto response';
      setError(errorMessage);
      
      if (error.response?.status === 403) {
        setError('You do not have permission to remove auto responses');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentResponse({
      trigger: '',
      type: 'text',
      content: '',
      embed: {
        title: '',
        description: '',
        color: '#5865F2',
        author: {
          name: '',
          icon_url: ''
        },
        footer: {
          text: '',
          icon_url: ''
        },
        thumbnail: '',
        image: '',
        timestamp: false
      }
    });
    setResponseType('text');
    setIsEditing(false);
  };

  const startEdit = (response) => {
    console.log('Starting edit with response (full object):', JSON.stringify(response, null, 2));
    
    const type = response.type === 'embed' || response.responseType === 'EMBED' ? 'embed' : 'text';
    console.log('Setting type to:', type);
    
    const formattedResponse = {
        _id: response._id,
        trigger: response.trigger,
        type: type,
        content: response.content || '',
        embed: response.embed ? {
            title: response.embed.title || '',
            description: response.embed.description || '',
            color: response.embed.color || '#5865F2',
            author: {
                name: response.embed.author?.name || '',
                icon_url: response.embed.author?.icon_url || ''
            },
            footer: {
                text: response.embed.footer?.text || '',
                icon_url: response.embed.footer?.icon_url || ''
            },
            thumbnail: response.embed.thumbnail?.url || '',
            image: response.embed.image?.url || '',
            timestamp: response.embed.timestamp || false,
            fields: response.embed.fields || []
        } : {
            title: '',
            description: '',
            color: '#5865F2',
            author: { name: '', icon_url: '' },
            footer: { text: '', icon_url: '' },
            thumbnail: '',
            image: '',
            timestamp: false,
            fields: []
        }
    };

    console.log('Setting formatted response:', JSON.stringify(formattedResponse, null, 2));
    
    setResponseType(type);
    setCurrentResponse(formattedResponse);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

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
              <FontAwesomeIcon icon={faRobot} className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Auto Responses</h2>
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
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
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
              <FontAwesomeIcon icon={faRobot} className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Auto Responses</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{responses.length} responses</span>
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
                onClick={handleAddNew}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Response</span>
              </motion.button>
            </div>

            <div className="space-y-4">
              {responses.length === 0 ? (
                <div className="bg-secondary/30 border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground text-center">No auto responses configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map((response) => (
                    <motion.div 
                      key={response._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-secondary/30 border border-border rounded-xl overflow-hidden hover:bg-secondary/50 transition-colors duration-200"
                    >
                      <div className="p-4 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${response.type === 'text' ? 'bg-primary/10' : 'bg-secondary/50'}`}>
                            <FontAwesomeIcon 
                              icon={response.type === 'text' ? faFont : faCode} 
                              className={`w-4 h-4 ${response.type === 'text' ? 'text-primary' : 'text-foreground'}`}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{response.trigger}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <motion.button
                            onClick={() => startEdit(response)}
                            className="text-primary hover:text-primary/80 focus:outline-none focus:text-primary/80 transition-colors duration-200 text-sm opacity-0 group-hover:opacity-100"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Edit
                          </motion.button>
                          <motion.button
                            onClick={() => handleRemoveResponse(response._id)}
                            className="text-destructive hover:text-destructive/80 focus:outline-none focus:text-destructive/80 transition-colors duration-200 text-sm opacity-0 group-hover:opacity-100"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Remove
                          </motion.button>
                        </div>
                      </div>
                      <div className="p-4">
                        {response.type === 'text' ? (
                          <p className="text-sm text-foreground">{response.content}</p>
                        ) : (
                          <div className="space-y-3">
                            {response.embed.title && (
                              <p className="text-sm font-medium text-foreground">{response.embed.title}</p>
                            )}
                            {response.embed.description && (
                              <p className="text-sm text-muted-foreground">{response.embed.description}</p>
                            )}
                            {response.embed.fields?.map((field, index) => (
                              <div key={index} className="pl-3 border-l-2 border-border mt-2">
                                <p className="text-sm font-medium text-foreground">{field.name}</p>
                                <p className="text-sm text-muted-foreground">{field.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowModal(false)}
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
                        <FontAwesomeIcon icon={faRobot} className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground">
                        {isEditing ? 'Edit Auto Response' : 'Add Auto Response'}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Trigger
                      <span className="text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentResponse.trigger}
                      onChange={(e) => setCurrentResponse({ ...currentResponse, trigger: e.target.value })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Message that triggers this response"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The bot will respond when this word or phrase appears in a message
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setResponseType('text')}
                      className={`flex-1 p-3 rounded-xl border ${
                        responseType === 'text'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-border/60 text-muted-foreground'
                      } transition-colors duration-200 focus:outline-none`}
                    >
                      <FontAwesomeIcon icon={faFont} className="w-4 h-4 mb-2" />
                      <p className="text-sm font-medium">Text Response</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseType('embed')}
                      className={`flex-1 p-3 rounded-xl border ${
                        responseType === 'embed'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-border/60 text-muted-foreground'
                      } transition-colors duration-200 focus:outline-none`}
                    >
                      <FontAwesomeIcon icon={faCode} className="w-4 h-4 mb-2" />
                      <p className="text-sm font-medium">Embed Response</p>
                    </button>
                  </div>

                  {responseType === 'text' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Response Message
                        <span className="text-destructive ml-1">*</span>
                      </label>
                      <textarea
                        value={currentResponse.content}
                        onChange={(e) => setCurrentResponse({ ...currentResponse, content: e.target.value })}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter your response message"
                        rows={4}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Title</label>
                          <input
                            type="text"
                            value={currentResponse.embed.title}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: { ...currentResponse.embed, title: e.target.value }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Embed title"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Color</label>
                          <input
                            type="color"
                            value={currentResponse.embed.color}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: { ...currentResponse.embed, color: e.target.value }
                            })}
                            className="w-full h-[38px] bg-secondary/50 border border-border rounded-xl px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Description</label>
                        <textarea
                          value={currentResponse.embed.description}
                          onChange={(e) => setCurrentResponse({
                            ...currentResponse,
                            embed: { ...currentResponse.embed, description: e.target.value }
                          })}
                          className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Embed description"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Author Name</label>
                          <input
                            type="text"
                            value={currentResponse.embed.author.name}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: {
                                ...currentResponse.embed,
                                author: { ...currentResponse.embed.author, name: e.target.value }
                              }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Author name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Author Icon URL</label>
                          <input
                            type="text"
                            value={currentResponse.embed.author.icon_url}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: {
                                ...currentResponse.embed,
                                author: { ...currentResponse.embed.author, icon_url: e.target.value }
                              }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://example.com/icon.png"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Footer Text</label>
                          <input
                            type="text"
                            value={currentResponse.embed.footer.text}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: {
                                ...currentResponse.embed,
                                footer: { ...currentResponse.embed.footer, text: e.target.value }
                              }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Footer text"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Footer Icon URL</label>
                          <input
                            type="text"
                            value={currentResponse.embed.footer.icon_url}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: {
                                ...currentResponse.embed,
                                footer: { ...currentResponse.embed.footer, icon_url: e.target.value }
                              }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://example.com/icon.png"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Thumbnail URL</label>
                          <input
                            type="url"
                            value={currentResponse.embed.thumbnail}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: { ...currentResponse.embed, thumbnail: e.target.value }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://example.com/thumbnail.png"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">Image URL</label>
                          <input
                            type="url"
                            value={currentResponse.embed.image}
                            onChange={(e) => setCurrentResponse({
                              ...currentResponse,
                              embed: { ...currentResponse.embed, image: e.target.value }
                            })}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://example.com/image.png"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={currentResponse.embed.timestamp}
                          onChange={(e) => setCurrentResponse({
                            ...currentResponse,
                            embed: { ...currentResponse.embed, timestamp: e.target.checked }
                          })}
                          className="rounded border-border bg-secondary/50 text-primary focus:ring-primary"
                        />
                        <label className="text-sm text-foreground">Include timestamp</label>
                      </div>
                    </div>
                  )}

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
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
                      <FontAwesomeIcon icon={isEditing ? faSave : faPlus} className="w-4 h-4" />
                      <span>{isEditing ? 'Save Changes' : 'Add Response'}</span>
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

export default AutoResponseSettings; 