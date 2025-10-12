import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../../../lib/api/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faChevronDown, faPlus, faTimes, faEdit, faTrash, faGripLines, faStar, faExternalLinkAlt, faCompass, faPencil } from '@fortawesome/free-solid-svg-icons';

function NavigationSettings() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [customItems, setCustomItems] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', href: '', isExternal: false });
    const [error, setError] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [categories, setCategories] = useState({
        navigation: 'Navigation',
        custom: 'Custom Links',
        addons: 'Addons'
    });
    const [editingCategory, setEditingCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/settings/dashboard/navigation');
            const { customNavItems, navCategories } = response.data;
            
            if (customNavItems) {
                setCustomItems(customNavItems);
            }
            
            if (navCategories) {
                setCategories(navCategories);
            }
        } catch (e) {
            console.error('Failed to load navigation settings:', e);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const saveItems = async (items) => {
        try {
            await api.post('/settings/dashboard/navigation/items', { items });
            setCustomItems(items);
        } catch (e) {
            console.error('Failed to save navigation items:', e);
            setError('Failed to save items');
        }
    };

    const saveCategories = async (newCategories) => {
        try {
            await api.post('/settings/dashboard/navigation/categories', { categories: newCategories });
            setCategories(newCategories);
        } catch (e) {
            console.error('Failed to save categories:', e);
            setError('Failed to save categories');
        }
    };

    const isValidUrl = (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const formatInternalPath = (path) => {
        if (path.startsWith('*/')) {
            path = path.substring(2);
        }
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        return path;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.href) {
            setError('Both name and URL are required');
            return;
        }

        let finalHref = newItem.href.trim();
        let isExternal = false;

        if (finalHref.startsWith('http://') || finalHref.startsWith('https://')) {
            if (!isValidUrl(finalHref)) {
                setError('Please enter a valid URL');
                return;
            }
            isExternal = true;
        } else {
            if (!finalHref.startsWith('/') && !finalHref.startsWith('*/')) {
                setError('Internal links must start with / or */ (e.g., /dashboard or */settings)');
                return;
            }
            finalHref = formatInternalPath(finalHref);
        }

        const newItemWithId = { 
            ...newItem, 
            href: finalHref, 
            isExternal,
            icon: isExternal ? faExternalLinkAlt : faStar,
            id: Date.now().toString()
        };

        try {
            const items = [...customItems, newItemWithId];
            await saveItems(items);
            setNewItem({ name: '', href: '', isExternal: false });
            setError('');
        } catch (e) {
            setError('Failed to add item');
        }
    };

    const handleRemoveItem = async (index) => {
        try {
            const items = customItems.filter((_, i) => i !== index);
            await saveItems(items);
        } catch (e) {
            setError('Failed to remove item');
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.currentTarget.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
        setDraggedItem(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const items = [...customItems];
        const draggedItemContent = items[draggedItem];
        items.splice(draggedItem, 1);
        items.splice(index, 0, draggedItemContent);

        saveItems(items);
        setDraggedItem(index);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
    };

    const handleSaveCategory = async (category, value) => {
        if (!value.trim()) return;
        try {
            const newCategories = { ...categories, [category]: value.trim() };
            await saveCategories(newCategories);
            setEditingCategory(null);
        } catch (e) {
            setError('Failed to save category');
        }
    };

    const clearAllItems = async () => {
        try {
            await api.delete('/settings/dashboard/navigation/items');
            setCustomItems([]);
        } catch (e) {
            console.error('Failed to clear navigation items:', e);
            setError('Failed to clear items');
        }
    };

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
                        <FontAwesomeIcon icon={faCompass} className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Navigation Items</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{customItems.length} items</span>
                    <svg
                        className={`w-4 h-4 text-muted-foreground transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="mt-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-foreground">Category Names</h3>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(categories).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl"
                                        >
                                            {editingCategory === key ? (
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => setCategories({ ...categories, [key]: e.target.value })}
                                                    onBlur={() => handleSaveCategory(key, value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveCategory(key, value);
                                                        }
                                                    }}
                                                    className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-foreground">{value}</span>
                                                    <button
                                                        onClick={() => handleEditCategory(key)}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter item name"
                                    />
                                    <p className="mt-2 text-xs text-muted-foreground">This will appear in the navigation menu</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">URL</label>
                                    <input
                                        type="text"
                                        value={newItem.href}
                                        onChange={(e) => setNewItem({ ...newItem, href: e.target.value })}
                                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="e.g., */settings or https://..."
                                    />
                                    <p className="mt-2 text-xs text-muted-foreground">Use */ for internal pages or full URLs for external links</p>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        type="button"
                                        onClick={clearAllItems}
                                        className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                                    >
                                        Clear All Items
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:from-primary/90 hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 flex items-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                                        <span>Add Item</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-foreground">Current Items</h3>
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
                                    Drag to reorder
                                </span>
                            </div>
                            {customItems.length === 0 ? (
                                <div className="bg-secondary/30 border border-border rounded-xl p-4">
                                    <p className="text-sm text-muted-foreground text-center">No custom navigation items added yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {customItems.map((item, index) => (
                                        <motion.div
                                            key={item.id || index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.1 }}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            className="group bg-secondary/30 border border-border rounded-xl overflow-hidden hover:bg-secondary/50 transition-colors duration-200"
                                        >
                                            <div className="p-4 flex items-center gap-3">
                                                <FontAwesomeIcon 
                                                    icon={faGripLines} 
                                                    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-move" 
                                                />
                                                <FontAwesomeIcon 
                                                    icon={item.isExternal ? faExternalLinkAlt : faStar} 
                                                    className="w-5 h-5 text-muted-foreground" 
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove Item"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default NavigationSettings; 