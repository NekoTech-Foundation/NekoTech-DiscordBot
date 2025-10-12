import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faPaperPlane, faHashtag, faChevronDown, faSave, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ComponentSelector, { ComponentType } from './ComponentSelector';
import {
    TitleComponent,
    DescriptionComponent,
    ColorComponent,
    AuthorComponent,
    FieldsComponent,
    FooterComponent,
    ImageComponent,
    ThumbnailComponent,
    LinkButtonsComponent
} from './EmbedComponents';
import { parse } from 'discord-markdown-parser';

interface EmbedTemplateData {
    title?: string;
    description?: string;
    color?: number;
    author?: {
        name?: string;
        icon_url?: string;
    };
    thumbnail?: string | { url: string };
    image?: string | { url: string };
    footer?: {
        text?: string;
        icon_url?: string;
    };
    fields?: EmbedField[];
}

interface Template {
    _id: string;
    name: string;
    embedData: EmbedTemplateData;
    linkButtons: any[];
    claimed: boolean;
    claimedBy: string | null;
}

interface Channel {
    id: string;
    name: string;
    type: number;
    parent?: {
        id: string;
        name: string;
    };
}

interface CategoryGroup {
    id: string;
    name: string;
    channels: Channel[];
}

interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

interface LinkButton {
    label: string;
    url: string;
    emoji?: string;
}

interface EmbedData {
    title: string;
    description: string;
    color: string;
    author: {
        name: string;
        icon_url: string;
    };
    thumbnail: string;
    image: string;
    footer: {
        text: string;
        icon_url: string;
    };
    fields: EmbedField[];
    linkButtons: LinkButton[];
}

interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    author?: {
        name: string;
        icon_url?: string;
    };
    thumbnail?: {
        url: string;
    } | null;
    image?: {
        url: string;
    } | null;
    footer?: {
        text: string;
        icon_url?: string;
    };
    fields?: EmbedField[];
}

const defaultEmbed: EmbedData = {
    title: '',
    description: '',
    color: '#000000',
    author: {
        name: '',
        icon_url: ''
    },
    thumbnail: '',
    image: '',
    footer: {
        text: '',
        icon_url: ''
    },
    fields: [],
    linkButtons: []
};

const renderMarkdown = (content: string) => {
    const parsed = parse(content);
    
    const renderNode = (node: any, key: number): React.ReactNode => {
        if (typeof node === 'string') return node;
        
        let children;
        if (Array.isArray(node.content)) {
            children = node.content.map((child: any, i: number) => renderNode(child, i));
        } else if (typeof node.content === 'object' && node.content !== null) {
            children = renderNode(node.content, 0);
        } else {
            children = node.content;
        }

        switch (node.type) {
            case 'em':
                return <em key={key}>{children}</em>;
            case 'strong':
                return <strong key={key}>{children}</strong>;
            case 'underline':
                return <u key={key}>{children}</u>;
            case 'strike':
                return <s key={key}>{children}</s>;
            case 'inlineCode':
                return <code key={key} className="bg-[#2f3136] px-1 py-0.5 rounded text-[0.9em]">{children}</code>;
            case 'codeBlock':
                return (
                    <pre key={key} className="bg-[#2f3136] p-2 rounded mt-1 mb-1">
                        <code>{children}</code>
                    </pre>
                );
            default:
                return children;
        }
    };

    return parsed.map((node, i) => renderNode(node, i));
};

const EmbedBuilder: React.FC = () => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<string>('');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [embed, setEmbed] = useState<EmbedData>(defaultEmbed);
    const [activeComponents, setActiveComponents] = useState<ComponentType[]>([]);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchChannels();
        fetchTemplates();
    }, []);

        const fetchChannels = async () => {
            try {
                const response = await axios.get('/api/channels');
                setChannels(response.data.filter((channel: Channel) => channel.type === 0 || channel.type === 5));
            } catch (error) {
                console.error('Error fetching channels:', error);
            }
        };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get('/api/templates');
            setTemplates(response.data);
            } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const groupedChannels = channels.reduce<CategoryGroup[]>((acc, channel) => {
        if (!channel.parent) {
            const noCategoryGroup = acc.find(g => g.id === 'no-category');
            if (noCategoryGroup) {
                noCategoryGroup.channels.push(channel);
            } else {
                acc.push({
                    id: 'no-category',
                    name: 'No Category',
                    channels: [channel]
                });
            }
        } else {
            const categoryGroup = acc.find(g => g.id === channel.parent?.id);
            if (categoryGroup) {
                categoryGroup.channels.push(channel);
            } else {
                acc.push({
                    id: channel.parent.id,
                    name: channel.parent.name,
                    channels: [channel]
                });
            }
        }
        return acc;
    }, []);

    const sortedGroups = groupedChannels.sort((a, b) => {
        if (a.id === 'no-category') return -1;
        if (b.id === 'no-category') return 1;
        return a.name.localeCompare(b.name);
    }).map(group => ({
        ...group,
        channels: group.channels.sort((a, b) => a.name.localeCompare(b.name))
    }));

    const handleChange = (path: string, value: string) => {
        const keys = path.split('.');
        setEmbed(prev => {
            const newEmbed = { ...prev };
            let current: any = newEmbed;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newEmbed;
        });
    };

    const addField = () => {
        setEmbed(prev => ({
            ...prev,
            fields: [...prev.fields, { name: '', value: '', inline: false }],
        }));
    };

    const removeField = (index: number) => {
        setEmbed(prev => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index),
        }));
    };

    const handleFieldChange = (index: number, key: keyof EmbedField, value: string | boolean) => {
        setEmbed(prev => ({
            ...prev,
            fields: prev.fields.map((field, i) =>
                i === index ? { ...field, [key]: value } : field
            ),
        }));
    };

    const addLinkButton = () => {
        const newButton = {
            label: '',
            url: '',
            emoji: ''
        };
        setEmbed(prev => ({
            ...prev,
            linkButtons: [...prev.linkButtons, newButton]
        }));
    };

    const removeLinkButton = (index: number) => {
        setEmbed(prev => ({
            ...prev,
            linkButtons: prev.linkButtons.filter((_, i) => i !== index)
        }));
    };

    const handleLinkButtonChange = (index: number, field: string, value: string) => {
        setEmbed(prev => ({
            ...prev,
            linkButtons: prev.linkButtons.map((button, i) => 
                i === index ? { ...button, [field]: value } : button
            )
        }));
    };

    const handleSend = async () => {
        if (!selectedChannel) {
            toast.error('Please select a channel');
            return;
        }

        if (!embed.title.trim() && !embed.description.trim()) {
            toast.error('Your embed must have at least a title or description');
            return;
        }

        setIsSending(true);

        let discordEmbed: DiscordEmbed = {
            title: embed.title.trim() || undefined,
            description: embed.description.trim() || undefined,
            color: parseInt(embed.color.replace('#', ''), 16),
            author: embed.author.name.trim() ? {
                name: embed.author.name.trim(),
                icon_url: embed.author.icon_url.trim() || undefined
            } : undefined,
            thumbnail: embed.thumbnail.trim() ? { url: embed.thumbnail.trim() } : null,
            image: embed.image.trim() ? { url: embed.image.trim() } : null,
            footer: embed.footer.text.trim() ? {
                text: embed.footer.text.trim(),
                icon_url: embed.footer.icon_url.trim() || undefined
            } : undefined,
            fields: embed.fields.length > 0 ? embed.fields.filter(field => 
                field.name.trim() !== '' && field.value.trim() !== ''
            ) : undefined
        };

        try {
            const response = await fetch(`/api/channels/${selectedChannel}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    embeds: [discordEmbed],
                    linkButtons: embed.linkButtons.filter(button => 
                        button.label.trim() !== '' && button.url.trim() !== ''
                    )
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send embed');
            }

            toast.success('Embed sent successfully! 🚀');
        } catch (error: any) {
            console.error('Error sending embed:', error);
            if (error.message.includes('BASE_TYPE_REQUIRED')) {
                toast.error('Your embed must have at least a title or description');
            } else {
                toast.error(error.message || 'Failed to send embed');
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleAddComponent = (type: ComponentType) => {
        setActiveComponents(prev => [...prev, type]);
    };

    const handleRemoveComponent = (type: ComponentType) => {
        setActiveComponents(prev => prev.filter(t => t !== type));

        setEmbed(prev => {
            const newEmbed = { ...prev };
            switch (type) {
                case 'title':
                    newEmbed.title = '';
                    break;
                case 'description':
                    newEmbed.description = '';
                    break;
                case 'color':
                    newEmbed.color = '#000000';
                    break;
                case 'author':
                    newEmbed.author = { name: '', icon_url: '' };
                    break;
                case 'fields':
                    newEmbed.fields = [];
                    break;
                case 'footer':
                    newEmbed.footer = { text: '', icon_url: '' };
                    break;
                case 'image':
                    newEmbed.image = '';
                    break;
                case 'thumbnail':
                    newEmbed.thumbnail = '';
                    break;
                case 'linkButtons':
                    newEmbed.linkButtons = [];
                    break;
            }
            return newEmbed;
        });
    };

    const handleSaveTemplate = async () => {
        if (!embed.title.trim() && !embed.description.trim()) {
            toast.error('Please add at least a title or description before saving the template');
            return;
        }

        try {
            const name = prompt('Enter a name for this template:');
            if (!name) return;

            const existingTemplate = templates.find(t => t.name === name);
            if (existingTemplate) {
                if (!confirm('A template with this name already exists. Do you want to overwrite it?')) {
                    return;
                }
            }

            const embedData = {
                title: embed.title.trim() || undefined,
                description: embed.description.trim() || undefined,
                color: embed.color ? parseInt(embed.color.replace('#', ''), 16) : undefined,
                author: embed.author.name.trim() ? {
                    name: embed.author.name.trim(),
                    icon_url: embed.author.icon_url.trim() || undefined
                } : undefined,
                thumbnail: embed.thumbnail.trim() ? {
                    url: embed.thumbnail.trim()
                } : undefined,
                image: embed.image.trim() ? {
                    url: embed.image.trim()
                } : undefined,
                footer: embed.footer.text.trim() ? {
                    text: embed.footer.text.trim(),
                    icon_url: embed.footer.icon_url.trim() || undefined
                } : undefined,
                fields: embed.fields.length > 0 ? embed.fields.filter(field => 
                    field.name.trim() !== '' && field.value.trim() !== ''
                ).map(field => ({
                    name: field.name.trim(),
                    value: field.value.trim(),
                    inline: field.inline
                })) : undefined
            };

            const linkButtons = embed.linkButtons.filter(button => 
                button.label.trim() !== '' && button.url.trim() !== ''
            ).map(button => ({
                label: button.label.trim(),
                url: button.url.trim(),
                emoji: button.emoji?.trim() || undefined
            }));

            const response = await axios.post('/api/templates', {
                name,
                embedData,
                linkButtons
            });

            await fetchTemplates();
            toast.success('Template saved successfully! 💾');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save template. Please try again.');
        }
    };

    const handleLoadTemplate = async (templateId: string) => {
        try {
            const template = templates.find(t => t._id === templateId);
            if (!template) return;

            const newEmbed: EmbedData = {
                title: template.embedData.title || '',
                description: template.embedData.description || '',
                color: template.embedData.color ? `#${template.embedData.color.toString(16).padStart(6, '0')}` : '#000000',
                author: {
                    name: template.embedData.author?.name || '',
                    icon_url: template.embedData.author?.icon_url || '',
                },
                thumbnail: typeof template.embedData.thumbnail === 'object' ? template.embedData.thumbnail.url || '' : template.embedData.thumbnail || '',
                image: typeof template.embedData.image === 'object' ? template.embedData.image.url || '' : template.embedData.image || '',
                footer: {
                    text: template.embedData.footer?.text || '',
                    icon_url: template.embedData.footer?.icon_url || '',
                },
                fields: template.embedData.fields || [],
                linkButtons: template.linkButtons || []
            };

            const newComponents: ComponentType[] = [];
            if (template.embedData.title) newComponents.push('title');
            if (template.embedData.description) newComponents.push('description');
            if (template.embedData.color) newComponents.push('color');
            if (template.embedData.author?.name) newComponents.push('author');
            if (template.embedData.fields && template.embedData.fields.length > 0) newComponents.push('fields');
            if (template.embedData.footer?.text) newComponents.push('footer');
            if (template.embedData.image) newComponents.push('image');
            if (template.embedData.thumbnail) newComponents.push('thumbnail');
            if (template.linkButtons && template.linkButtons.length > 0) newComponents.push('linkButtons');

            setActiveComponents(newComponents);
            setEmbed(newEmbed);
        } catch (error) {
            console.error('Error loading template:', error);
            alert('Failed to load template. Please try again.');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await axios.delete(`/api/templates/${templateId}`);
            await fetchTemplates();
            toast.success('Template deleted successfully! 🗑️');
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template. Please try again.');
        }
    };

    return (
            <div className="space-y-6">
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'rgb(17, 24, 39)',
                        color: '#fff',
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10B981',
                            secondary: 'white',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: 'white',
                        },
                    },
                }}
            />

            {/* Channel Selector */}
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-foreground">Discord Embed Builder</h2>
                        <p className="text-sm text-muted-foreground mt-1">Create and customize Discord embeds with a live preview. Send them directly to any text channel in your server.</p>
                    </div>
                </div>
                    <div className="relative">
                        <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 appearance-none hover:bg-secondary/80 cursor-pointer font-medium"
                        >
                            <option value="" className="bg-secondary text-muted-foreground">Select a channel...</option>
                            {sortedGroups.map(group => (
                                <optgroup 
                                    key={group.id} 
                                    label={group.name}
                                    className="bg-secondary font-medium text-foreground"
                                >
                                    {group.channels.map(channel => {
                                        let channelIcon = '💬';
                                        if (channel.type === 5) {
                                            channelIcon = '📢';
                                        } else if (channel.type === 2) {
                                            channelIcon = '🔊';
                                        }
                                        return (
                                            <option 
                                                key={channel.id} 
                                                value={channel.id}
                                                className="bg-secondary text-foreground py-2"
                                            >
                                                {channelIcon} {channel.name}
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FontAwesomeIcon icon={faHashtag} className="w-4 h-4 text-primary" />
                        </div>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Editor Section */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    {/* Component Selector */}
                    <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Components</h3>
                                <p className="text-sm text-muted-foreground mt-1">Add and customize your embed components</p>
                            </div>
                            <button
                                onClick={handleSaveTemplate}
                                className="flex items-center space-x-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                                <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                                <span>Save Template</span>
                            </button>
                        </div>
                        <ComponentSelector
                            onSelect={handleAddComponent}
                            activeComponents={activeComponents}
                        />
                    </div>

                    {/* Active Components */}
                            <div className="space-y-4">
                        {activeComponents.map(type => {
                            switch (type) {
                                case 'title':
                                    return (
                                        <TitleComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('title')}
                                        />
                                    );
                                case 'description':
                                    return (
                                        <DescriptionComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('description')}
                                        />
                                    );
                                case 'color':
                                    return (
                                        <ColorComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('color')}
                                        />
                                    );
                                case 'author':
                                    return (
                                        <AuthorComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('author')}
                                        />
                                    );
                                case 'fields':
                                    return (
                                        <FieldsComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('fields')}
                                            addField={addField}
                                            removeField={removeField}
                                            handleFieldChange={handleFieldChange}
                                        />
                                    );
                                case 'footer':
                                    return (
                                        <FooterComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('footer')}
                                        />
                                    );
                                case 'image':
                                    return (
                                        <ImageComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('image')}
                                        />
                                    );
                                case 'thumbnail':
                                    return (
                                        <ThumbnailComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('thumbnail')}
                                        />
                                    );
                                case 'linkButtons':
                                    return (
                                        <LinkButtonsComponent
                                            key={type}
                                            embed={embed}
                                            handleChange={handleChange}
                                            onRemove={() => handleRemoveComponent('linkButtons')}
                                            addLinkButton={addLinkButton}
                                            removeLinkButton={removeLinkButton}
                                            handleLinkButtonChange={handleLinkButtonChange}
                                        />
                                    );
                                default:
                                    return null;
                            }
                        })}
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={!selectedChannel || isSending}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl px-6 py-3 font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                    )}
                    <span>{isSending ? 'Sending...' : 'Send Embed'}</span>
                </button>
            </div>

            {/* Preview Section */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                    {/* Preview Card */}
                    <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border sticky top-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Preview</h3>
                                <p className="text-sm text-muted-foreground mt-1">Live preview of your embed</p>
                            </div>
                        </div>
                        
                        {/* Discord Message Preview */}
                        <div className="bg-[#313338] rounded-lg p-4 shadow-xl">
                            {/* Bot Message Header */}
                            <div className="flex items-center space-x-2 mb-2">
                                <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-medium">
                                    B
                                </div>
                                <div>
                                    <div className="text-white font-medium">Bot</div>
                                    <div className="text-[#989AA2] text-xs">Today at {new Date().toLocaleTimeString()}</div>
                                </div>
                            </div>

                            {/* Embed Container */}
                            <div className="mt-1">
                                <div className="flex">
                                    {/* Left Border */}
                                    <div className="flex-shrink-0 w-1 rounded-l-md" style={{ backgroundColor: embed.color || '#000000' }}></div>

                                    {/* Main Content */}
                                    <div className="flex-grow min-w-0 bg-[#2B2D31] rounded-r-md overflow-hidden">
                                        <div className="p-4 flex">
                                            {/* Text Content */}
                                            <div className="flex-grow min-w-0 pr-4">
                                                {/* Author */}
                                                {embed.author.name && (
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        {embed.author.icon_url && (
                                                            <img
                                                                src={embed.author.icon_url}
                                                                alt=""
                                                                className="w-6 h-6 rounded-full"
                                                            />
                                                        )}
                                                        <span className="text-[#ffffff] text-sm font-medium truncate">
                                                            {embed.author.name}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Title */}
                                                {embed.title && (
                                                    <h4 className="text-[#00a8fc] font-semibold mb-1 hover:underline cursor-pointer">
                                                        {embed.title}
                                                    </h4>
                                                )}

                                                {/* Description */}
                                                {embed.description && (
                                                    <div className="text-[#dbdee1] text-[0.95rem] leading-[1.375rem] break-words">
                                                        {embed.description.split('\n').map((line, i) => (
                                                            <React.Fragment key={i}>
                                                                {renderMarkdown(line)}
                                                                {i < embed.description.split('\n').length - 1 && <br />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Fields */}
                                                {embed.fields.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                        {embed.fields.map((field, index) => (
                                                            <div
                                                                key={index}
                                                                className={field.inline ? 'col-span-1' : 'col-span-full'}
                                                            >
                                                                <h5 className="text-[#ffffff] font-semibold text-sm mb-[2px]">
                                                                    {renderMarkdown(field.name)}
                                                                </h5>
                                                                <div className="text-[#dbdee1] text-sm break-words">
                                                                    {renderMarkdown(field.value)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Image */}
                                                {embed.image && (
                                                    <div className="mt-4 max-w-full">
                                                        <img
                                                            src={embed.image}
                                                            alt=""
                                                            className="rounded-md max-h-[300px] object-contain"
                                                        />
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                {embed.footer.text && (
                                                    <div className="flex items-center space-x-2 mt-2 pt-2">
                                                        {embed.footer.icon_url && (
                                                            <img
                                                                src={embed.footer.icon_url}
                                                                alt=""
                                                                className="w-5 h-5 rounded-full"
                                                            />
                                                        )}
                                                        <span className="text-[#989AA2] text-sm">
                                                            {embed.footer.text}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Thumbnail */}
                                            {embed.thumbnail && (
                                                <div className="flex-shrink-0 ml-4">
                                                    <img
                                                        src={embed.thumbnail}
                                                        alt=""
                                                        className="w-20 h-20 rounded-md object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Link Buttons */}
                                {embed.linkButtons.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {embed.linkButtons.map((button, index) => (
                                            <a
                                                key={index}
                                                href={button.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#4E505D] hover:bg-[#6D6F7B] rounded text-sm font-medium text-white transition-colors"
                                            >
                                                {button.emoji && <span>{button.emoji}</span>}
                                                <span>{button.label}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Templates Section */}
                    <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Saved Templates</h3>
                                <p className="text-sm text-muted-foreground mt-1">Load or manage your saved templates</p>
                </div>
            </div>
                        <div className="space-y-2">
                            {templates.length > 0 ? (
                                templates.map((template) => (
                                    <div
                                        key={template._id}
                                        className="flex items-center justify-between p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors group"
                                    >
                                        <button
                                            onClick={() => handleLoadTemplate(template._id)}
                                            className="flex items-center space-x-2 flex-1 text-left"
                                        >
                                            <FontAwesomeIcon icon={faFolderOpen} className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                            <span className="text-sm text-muted-foreground group-hover:text-foreground">{template.name}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTemplate(template._id)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            title="Delete Template"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No saved templates yet
                                        </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmbedBuilder; 