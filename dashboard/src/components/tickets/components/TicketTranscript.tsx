import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faArrowLeft, faPaperclip, faQuestionCircle, faCheckCircle, 
    faPaperPlane, faBars, faTicket, faUser, faClock, 
    faCircle, faExclamationCircle, faThumbsUp, faComments,
    faHandHolding, faLock, faQuestion, faAngleRight, faAngleDown,
    faTag, faHashtag
} from '@fortawesome/free-solid-svg-icons'
import { userDataService } from '../../../utils/userDataService'
import { motion, AnimatePresence } from 'framer-motion'
import moment from 'moment-timezone'
import { parse } from 'discord-markdown-parser'
import LoadingSpinner from '../../ui/LoadingSpinner'

declare global {
    interface Window {
        socket: any;
    }
}

interface Message {
    author: string
    authorId: string
    content: string
    timestamp: string
    attachments?: Array<{
        url?: string;
        name: string;
        contentType: string;
        binaryData?: string;
        width?: number;
        height?: number;
    }>;
    avatarUrl: string
    displayName?: string
}

interface GroupedMessage {
    author: string
    authorId: string
    displayName: string
    messages: {
        content: string
        timestamp: string
        attachments?: any[]
    }[]
    firstTimestamp: string
    avatarUrl: string
}

interface Question {
    question: string
    answer: string
}

interface TranscriptData {
    id: string
    type: string
    typeName?: string
    status: string
    priority: string
    creator: string
    creatorData?: {
        displayName: string
        avatar: string
    }
    claimer: string | null
    claimerData?: {
        displayName: string
        avatar: string
    }
    claimed?: boolean
    created: string
    closed: string | null
    rating: string
    feedback: string
    questions: Question[]
    messages: Message[]
    closeReason: string
    canSendMessages: boolean;
}

interface ImageViewerProps {
    src: string;
    alt: string;
    onClose: () => void;
}

interface LoadingState {
    fetch: boolean;
    claim: boolean;
    close: boolean;
}

interface UserNameProps {
    displayName: string;
    userId: string;
    tag?: string;
    className?: string;
}

const UserName = ({ displayName, userId, tag, className = "" }: UserNameProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [userTag, setUserTag] = useState<string | null>(tag || null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);
    const closeTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);
    
    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setShowTooltip(true);
    };
    
    const handleMouseLeave = () => {
        closeTimeoutRef.current = window.setTimeout(() => {
            setShowTooltip(false);
        }, 300);
    };

    useEffect(() => {
        if (!tag && showTooltip && !userTag && !loading) {
            setLoading(true);
            userDataService.getUserData(userId)
                .then(userData => {
                    if (userData) {
                        let discordTag = null;
                        
                        if (userData.displayName) {
                            discordTag = userData.displayName;
                            
                            if ((userData as any).tag) {
                                discordTag = (userData as any).tag;
                            } else if ((userData as any).username) {
                                discordTag = (userData as any).username;
                                
                                if ((userData as any).discriminator) {
                                    discordTag += `#${(userData as any).discriminator}`;
                                }
                            }
                        }
                        
                        if (discordTag) {
                            setUserTag(discordTag);
                        }
                    }
                })
                .catch(err => console.error("Error fetching user tag:", err))
                .finally(() => setLoading(false));
        }
    }, [userId, tag, showTooltip, userTag, loading]);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const copyToClipboard = (text: string) => {
        if (!text) return;
        
        navigator.clipboard.writeText(text)
            .then(() => setCopied(true))
            .catch(err => console.error('Failed to copy text: ', err));
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <span 
                ref={nameRef}
                className="font-semibold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {displayName}
            </span>
            
            {showTooltip && (
                <div 
                    ref={tooltipRef}
                    className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-auto"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={e => e.stopPropagation()}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg overflow-hidden bg-gray-950 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm border border-indigo-500/10"
                    >
                        <div className="px-3 py-2 backdrop-blur-md">
                            {loading ? (
                                <div className="flex items-center gap-2 py-1 px-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
                                </div>
                            ) : userTag ? (
                                <div>
                                    <div className="text-xs font-medium text-gray-400 mb-1 text-center">Discord Tag</div>
                                    <div className="bg-gray-900/60 rounded border border-indigo-500/10 px-3 py-1.5 text-sm font-mono text-white select-all text-center">
                                        {userTag}
                                    </div>
                                    
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => copyToClipboard(userTag)}
                                        className={`w-full mt-2 ${
                                            copied 
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                        } py-1 px-2 rounded text-xs transition-colors duration-200 flex items-center justify-center gap-1.5`}
                                    >
                                        <FontAwesomeIcon icon={copied ? faCheckCircle : faPaperclip} className="w-3 h-3" />
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 py-1">No tag available</div>
                            )}
                        </div>
                    </motion.div>
                    
                    {/* Arrow pointer */}
                    <div className="absolute h-2 w-2 bg-gray-950 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1 border-r border-b border-indigo-500/10"></div>
                </div>
            )}
        </div>
    );
};

const ImageViewer = ({ src, alt, onClose }: ImageViewerProps) => {
    const [loading, setLoading] = useState(true);
    const [zoomed, setZoomed] = useState(false);
    
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="relative max-w-[95vw] max-h-[95vh]"
                onClick={e => e.stopPropagation()}
            >
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="absolute -top-4 -right-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full p-2 transition-all duration-200 shadow-lg z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </motion.button>
                
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                
                <motion.img
                    src={src}
                    alt={alt}
                    className={`rounded-lg max-w-full max-h-[90vh] object-contain shadow-2xl transition-all cursor-zoom-in ${zoomed ? 'scale-150' : ''}`}
                    style={{ margin: 'auto' }}
                    onClick={() => setZoomed(!zoomed)}
                    onLoad={() => setLoading(false)}
                    layoutId={`image-${src}`}
                />
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
                    Click to {zoomed ? 'zoom out' : 'zoom in'}
                </div>
            </div>
        </motion.div>
    );
};

function groupMessages(messages: Message[]): GroupedMessage[] {
    return messages.reduce((groups: GroupedMessage[], message) => {
        const lastGroup = groups[groups.length - 1]

        if (lastGroup && lastGroup.authorId === message.authorId) {
            lastGroup.messages.push({
                content: message.content,
                timestamp: message.timestamp,
                attachments: message.attachments
            })
            return groups
        } else {
            groups.push({
                author: message.author,
                authorId: message.authorId,
                displayName: message.displayName || message.author,
                avatarUrl: message.avatarUrl,
                messages: [{
                    content: message.content,
                    timestamp: message.timestamp,
                    attachments: message.attachments
                }],
                firstTimestamp: message.timestamp
            })
            return groups
        }
    }, [])
}

const MessagePreview = ({ message, sending }: { message: string; sending: boolean }) => {
    if (!message.trim()) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="px-6 py-4 border-t border-indigo-500/10 bg-gray-900/50 backdrop-blur-xl"
        >
            <div className="flex gap-4">
                <div className="flex-shrink-0">
                    <motion.div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/5"
                        animate={sending ? {
                            scale: [1, 1.1, 1],
                            borderColor: ['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0.5)', 'rgba(99, 102, 241, 0.3)']
                        } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <FontAwesomeIcon 
                            icon={faPaperPlane} 
                            className={`w-4 h-4 text-indigo-400 transition-transform ${sending ? 'rotate-12' : ''}`} 
                        />
                    </motion.div>
                </div>
                <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-400">Message Preview</span>
                            {sending && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                                    <span className="text-xs text-indigo-400 font-medium">Sending...</span>
                                </motion.div>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded-full">
                            {message.length} characters
                        </div>
                    </div>
                    <motion.div
                        className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 backdrop-blur-xl border border-indigo-500/20 rounded-xl p-4 relative overflow-hidden group shadow-inner"
                        animate={sending ? {
                            boxShadow: ['0 0 0 rgba(99, 102, 241, 0)', '0 0 20px rgba(99, 102, 241, 0.2)', '0 0 0 rgba(99, 102, 241, 0)']
                        } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <p className="text-gray-300 whitespace-pre-wrap break-words text-sm leading-relaxed relative">
                            {message}
                        </p>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

const MessageContent = ({ content }: { content: string }) => {
    const processContent = (text: string) => {
        const escapeHtml = (unsafe: string) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        const escapedText = escapeHtml(text);
 
        let processedText = escapedText;
        
        processedText = processedText.replace(/&lt;@!?(\d+)&gt;/g, (match, userId) => {
            return `<span class="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md hover:bg-blue-500/20 transition-colors cursor-pointer" data-user-id="${userId}">@user-${userId}</span>`;
        });
        
        processedText = processedText.replace(/&lt;#(\d+)&gt;/g, (match, channelId) => {
            return `<span class="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md hover:bg-blue-500/20 transition-colors cursor-pointer">#channel-${channelId}</span>`;
        });
        
        processedText = processedText.replace(/&lt;@&amp;(\d+)&gt;/g, (match, roleId) => {
            return `<span class="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md hover:bg-blue-500/20 transition-colors cursor-pointer">@role-${roleId}</span>`;
        });
        
        processedText = processedText.replace(/@user-(\d+)/g, (match, userId) => {
            return `<span class="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md hover:bg-blue-500/20 transition-colors cursor-pointer" data-user-id="${userId}">@user-${userId}</span>`;
        });
        
        const withBold = processedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        
        const withItalic = withBold.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
        
        const withStrikethrough = withItalic.replace(/~~(.*?)~~/g, '<del class="text-gray-400">$1</del>');
        
        const withUnderline = withStrikethrough.replace(/__(.*?)__/g, '<u>$1</u>');
        
        const withCodeBlocks = withUnderline.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800/80 p-3 rounded-lg my-2 overflow-x-auto shadow-inner"><code class="font-mono text-blue-300">$1</code></pre>');
        
        const withInlineCode = withCodeBlocks.replace(/`([^`]+)`/g, '<code class="bg-gray-800/80 px-1.5 py-0.5 rounded text-sm font-mono text-blue-300">$1</code>');
        
        const withBlockQuotes = withInlineCode.replace(/^&gt; (.*?)$/gm, '<blockquote class="border-l-4 border-blue-500/50 pl-3 my-2 italic text-gray-400 bg-blue-500/5 py-1 pr-2 rounded-r-lg">$1</blockquote>');
        
        const withLinks = withBlockQuotes.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">$1</a>');
        
        const withLineBreaks = withLinks.replace(/\n/g, '<br>');
        
        return withLineBreaks;
    };

    useEffect(() => {
        const userMentions = document.querySelectorAll('[data-user-id]');
        
        userMentions.forEach(async (element) => {
            const userId = element.getAttribute('data-user-id');
            if (!userId) return;
            
            try {
                const userData = await userDataService.getUserData(userId);
                if (userData && userData.displayName) {
                    element.textContent = `@${userData.displayName}`;
                }
            } catch (error) {
                console.error('Error loading user data for mention:', error);
            }
        });
    }, [content]);

    return (
        <div 
            className="whitespace-pre-wrap break-words text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processContent(content) }}
            style={{ whiteSpace: 'pre-wrap' }}
        />
    );
};

const formatDateTime = (timestamp: string) => {
    if (!timestamp) return 'Unknown Date';
    const parsedDate = moment.tz(timestamp, [
        'MMM D, YYYY [at] h:mm A z',
        'MMM D, YYYY, hh:mm A z',
        'MMM D, YYYY, HH:mm z',
        'YYYY-MM-DD HH:mm:ss.SSSSZ'
    ], window.DASHBOARD_CONFIG.TIMEZONE);
    
    if (parsedDate.isValid()) {
        return parsedDate.format('MMM D, YYYY [at] h:mm A z');
    }
    
    const isoDate = moment.tz(timestamp, window.DASHBOARD_CONFIG.TIMEZONE);
    if (isoDate.isValid()) {
        return isoDate.format('MMM D, YYYY [at] h:mm A z');
    }
    
    return timestamp;
};

const MessageGroup = ({ group, isLast }: { group: GroupedMessage; isLast: boolean }) => {
    return (
        <motion.div 
            className={`flex gap-4 px-6 py-6 hover:bg-indigo-500/5 transition-colors duration-200 ${isLast ? 'rounded-b-xl' : 'border-b border-indigo-500/10'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <div className="flex-shrink-0">
                <motion.div 
                    className="relative group"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                    <img
                        src={group.avatarUrl || getAvatarUrl(group.authorId, group.author, null)}
                        alt={group.displayName}
                        className="w-10 h-10 rounded-full ring-2 ring-indigo-500/20 object-cover transition-all duration-200 group-hover:ring-indigo-500/50"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900"></div>
                </motion.div>
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-2.5">
                    <UserName 
                        displayName={group.displayName} 
                        userId={group.authorId} 
                    />
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
                        {formatDateTime(group.firstTimestamp)}
                    </span>
                </div>
                <div className="space-y-3.5">
                    {group.messages.map((message, index) => (
                        <motion.div 
                            key={index} 
                            className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 backdrop-blur-sm px-4 py-3.5 rounded-xl border border-indigo-500/10 shadow-sm hover:shadow-md hover:shadow-indigo-500/5 hover:border-indigo-500/20 transition-all duration-200"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, type: "spring" }}
                        >
                            <div className="whitespace-pre-wrap break-words text-gray-200 leading-relaxed">
                                <MessageContent content={message.content} />
                            </div>
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {message.attachments.map((attachment, attIndex) => (
                                        <AttachmentDisplay key={attIndex} attachment={attachment} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

const getAvatarUrl = (userId: string, username: string, customUrl: string | null) => {
    if (customUrl) return customUrl;
    const discriminator = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/avatars/${userId}/${discriminator}.png`;
}

const AttachmentDisplay = ({ attachment }: { 
    attachment: { 
        url?: string; 
        name: string; 
        contentType?: string;
        binaryData?: string;
        width?: number;
        height?: number;
    } 
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

    if (attachment.contentType?.startsWith('image/')) {
        const imageSrc = attachment.binaryData 
            ? `data:${attachment.contentType};base64,${attachment.binaryData}`
            : attachment.url;

        return (
            <motion.div 
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <motion.img
                    layoutId={`image-${imageSrc}`}
                    src={imageSrc}
                    alt={attachment.name}
                    className="max-w-full h-auto rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-indigo-500/10"
                    onLoad={() => setImageLoading(false)}
                    onClick={() => setSelectedImage({ src: imageSrc!, alt: attachment.name })}
                    style={{
                        maxWidth: "min(100%, 500px)",
                        maxHeight: "400px",
                        objectFit: "contain"
                    }}
                />
                {imageLoading && (
                    <div className="flex items-center justify-center p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-end justify-start p-3">
                    <span className="text-xs text-white bg-black/70 px-2.5 py-1.5 rounded-md backdrop-blur-sm">
                        {attachment.name}
                    </span>
                </div>
                <AnimatePresence>
                    {selectedImage && (
                        <ImageViewer 
                            src={selectedImage.src} 
                            alt={selectedImage.alt} 
                            onClose={() => setSelectedImage(null)} 
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    if (attachment.url) {
        return (
            <motion.a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-indigo-500/5 to-blue-500/5 hover:from-indigo-500/10 hover:to-blue-500/10 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 text-sm text-gray-300 hover:text-white group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <FontAwesomeIcon icon={faPaperclip} className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                <span className="truncate max-w-[300px]">{attachment.name}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 group-hover:bg-blue-500/20">
                    Download
                </span>
            </motion.a>
        );
    }

    return (
        <div className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gray-800/50 rounded-lg border border-indigo-500/10 text-sm text-gray-300">
            <FontAwesomeIcon icon={faPaperclip} className="w-4 h-4 text-gray-400" />
            <span className="truncate max-w-[300px]">{attachment.name}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700/30 text-gray-400 ring-1 ring-gray-700/30">
                Unavailable
            </span>
        </div>
    );
}

export default function TicketTranscript({ ticketId }: { ticketId: string }) {
    const [data, setData] = useState<TranscriptData | null>(null)
    const [loading, setLoading] = useState<LoadingState>({
        fetch: false,
        claim: false,
        close: false
    })
    const [error, setError] = useState<string | null>(null)
    const [supportPermissions, setSupportPermissions] = useState<Record<string, boolean>>({})
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [sendingEnabled, setSendingEnabled] = useState(true)
    const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>({})
    const [retryCount, setRetryCount] = useState(0)
    const maxRetries = 3
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [data?.messages, message])

    const fetchTicketData = async () => {
        try {
            setLoading({ fetch: true, claim: false, close: false });
            const response = await fetch(`/api/tickets/${ticketId}/transcript`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch ticket data');
            }

            setData(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching ticket data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch ticket data');
        } finally {
            setLoading({ fetch: false, claim: false, close: false });
        }
    };

    useEffect(() => {
        fetchTicketData();
        let isMounted = true;

        async function fetchTranscript() {
            try {
                const response = await fetch(`/api/tickets/${ticketId}/transcript`);
                if (!response.ok) {
                    if (response.status === 403) {
                        setError("You don't have permission to view this ticket transcript");
                        return;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                const creatorData = await userDataService.getUserData(result.creator);
                
                let claimerData;
                if (result.claimer && result.claimer !== 'Unclaimed') {
                    claimerData = await userDataService.getUserData(result.claimer);
                }
                
                const enhancedMessages = await Promise.all(
                    result.messages.map(async (msg: Message) => {
                        const userData = await userDataService.getUserData(msg.authorId);
                        return {
                            ...msg,
                            displayName: userData?.displayName || msg.author,
                            avatarUrl: userData?.avatar || getAvatarUrl(msg.authorId, msg.author, null)
                        };
                    })
                );

                if (isMounted) {
                    setData({
                        ...result,
                        creatorData: creatorData || undefined,
                        claimerData: claimerData || undefined,
                        claimed: Boolean(result.claimer) && result.claimer !== 'Unclaimed',
                        messages: enhancedMessages
                    });
                    
                    if (enhancedMessages.length > lastMessageCount) {
                        setLastMessageCount(enhancedMessages.length);
                        scrollToBottom();
                    }
                    
                    setLoading({ fetch: false, claim: false, close: false });
                }
            } catch (error) {
                console.error('Failed to load transcript:', error);
                if (isMounted) {
                    setError('Failed to load transcript. Please try again later.');
                    setLoading({ fetch: false, claim: false, close: false });
                }
            }
        }

        fetchTranscript();

        const pollInterval = setInterval(fetchTranscript, 3000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [ticketId]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [message])

    useEffect(() => {
        const handleUserDataUpdate = (event: CustomEvent<{ userId: string; userData: any }>) => {
            const { userId, userData } = event.detail;
            
            setData(prevData => {
                if (!prevData) return prevData;
                
                let updatedData = { ...prevData };
                let hasChanges = false;

                if (prevData.creator === userId) {
                    updatedData.creatorData = {
                        displayName: userData.displayName,
                        avatar: userData.avatar
                    };
                    hasChanges = true;
                }
                
                const updatedMessages = prevData.messages.map(msg => {
                    if (msg.authorId === userId) {
                        hasChanges = true;
                        return {
                            ...msg,
                            displayName: userData.displayName,
                            avatarUrl: userData.avatar
                        };
                    }
                    return msg;
                });
                
                if (hasChanges) {
                    updatedData.messages = updatedMessages;
                    return updatedData;
                }
                
                return prevData;
            });
        };

        window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
        
        return () => {
            window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
        };
    }, []);

    const sendMessage = async () => {
        if (!message.trim() || !sendingEnabled) return;

        setSending(true);
        setSendingEnabled(false);
        const messageContent = message;
        
        try {
            const response = await fetch(`/api/tickets/${ticketId}/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: messageContent }),
            });

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }

            const responseData = await response.json();

            setMessage('');
            setRetryCount(0);
            
            const currentUser = await userDataService.getCurrentUser();
            const newMessage: Message = {
                author: responseData.message?.author || currentUser?.displayName || 'You',
                authorId: responseData.message?.authorId || currentUser?.id || 'local',
                content: messageContent,
                timestamp: moment().tz(window.DASHBOARD_CONFIG.TIMEZONE).format(),
                avatarUrl: responseData.message?.avatarUrl || currentUser?.avatar || '/default-avatar.png',
                displayName: responseData.message?.displayName || currentUser?.displayName || 'You'
            };

            setData(prev => {
                if (!prev) return prev;
                const newMessages = [...prev.messages, newMessage];
                setLastMessageCount(newMessages.length);
                return {
                    ...prev,
                    messages: newMessages
                };
            });
        } catch (error) {
            if (retryCount < maxRetries) {
                setRetryCount(prev => prev + 1);
                setTimeout(() => {
                    setSendingEnabled(true);
                }, 2000);
            }
        } finally {
            setSending(false);
            setTimeout(() => setSendingEnabled(true), 500);
        }
    };

    const handleImageLoad = (attachmentUrl: string) => {
        setImageLoading(prev => ({
            ...prev,
            [attachmentUrl]: false
        }));
    };

    const handleClaimTicket = async () => {
        try {
            setLoading({ fetch: false, claim: true, close: false });
            const response = await fetch(`/api/tickets/claim/${ticketId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to claim ticket');
            }

            const result = await response.json();
            
            setData(prevData => {
                if (!prevData) return prevData;
                
                if (result.action === 'unclaimed') {
                    return {
                        ...prevData,
                        claimed: false,
                        claimer: null,
                        claimerData: undefined,
                        status: prevData.status,
                        canSendMessages: prevData.canSendMessages
                    };
                }
                
                return {
                    ...prevData,
                    claimed: true,
                    claimer: result.ticket.claimedBy,
                    status: prevData.status,
                    canSendMessages: prevData.canSendMessages
                };
            });
        } catch (error) {
            console.error('Error claiming ticket:', error);
            alert(error instanceof Error ? error.message : 'Failed to claim ticket');
        } finally {
            setLoading({ fetch: false, claim: false, close: false });
        }
    };

    useEffect(() => {
    }, [data]);

    const handleCloseTicket = async () => {
        try {
            const reason = prompt('Enter a reason for closing the ticket (optional):');
            if (reason !== null) {
                setLoading({ fetch: false, claim: false, close: true });

                const response = await fetch(`/api/tickets/close/${ticketId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to close ticket');
                }

                setData(prevData => {
                    if (!prevData) return prevData;
                    return {
                        ...prevData,
                        status: 'closed',
                        closed: new Date().toISOString(),
                        closeReason: reason || ''
                    };
                });
            }
        } catch (error) {
            console.error('Error closing ticket:', error);
            alert(error instanceof Error ? error.message : 'Failed to close ticket');
        } finally {
            setLoading({ fetch: false, claim: false, close: false });
        }
    };

    useEffect(() => {
        const checkSupportPermissions = async () => {
            if (!data?.type) return;
            try {
                const response = await fetch(`/api/tickets/permissions/${data.type}`);
                if (response.ok) {
                    const { hasSupport } = await response.json();
                    setSupportPermissions(prev => ({ ...prev, [data.type]: hasSupport }));
                }
            } catch (error) {
                console.error('Error checking support permissions:', error);
            }
        };

        checkSupportPermissions();
    }, [data?.type]);

    useEffect(() => {
        if (data?.status === 'open' && supportPermissions[data?.type]) {
        }
    }, [data?.claimed, data?.claimer, data?.status, data?.type, loading.claim, supportPermissions]);

    const loadClaimerData = async () => {
        if (data?.claimer) {
            try {
                if (data.claimer === 'Unclaimed') {
                    setData(prevData => {
                        if (!prevData) return prevData;
                        return {
                            ...prevData,
                            claimed: false,
                            claimerData: undefined
                        };
                    });
                    return;
                }

                const userData = await userDataService.getUserData(data.claimer);
                
                if (userData) {
                    setData(prevData => {
                        if (!prevData) return prevData;
                        return {
                            ...prevData,
                            claimed: Boolean(data.claimer) && data.claimer !== 'Unclaimed',
                            claimerData: {
                                displayName: userData.displayName,
                                avatar: userData.avatar
                            }
                        };
                    });
                } else {
                    setData(prevData => {
                        if (!prevData) return prevData;
                        return {
                            ...prevData,
                            claimed: false,
                            claimerData: undefined
                        };
                    });
                }
            } catch (error) {
                console.error('Error loading claimer data:', error);
                setData(prevData => {
                    if (!prevData) return prevData;
                    return {
                        ...prevData,
                        claimed: false,
                        claimerData: undefined
                    };
                });
            }
        } else {
            setData(prevData => {
                if (!prevData) return prevData;
                return {
                    ...prevData,
                    claimed: false,
                    claimerData: undefined
                };
            });
        }
    };

    useEffect(() => {
    }, [data?.claimer, data?.claimerData]);

    if (loading.fetch) return <LoadingSpinner />

    if (error) return (
        <div className="h-full p-4">
            <div className="max-w-[2000px] mx-auto">
                <div className="flex items-center mb-6">
                    <Link
                        to="/tickets"
                        className="p-2 hover:bg-secondary rounded-lg transition-colors duration-200 flex items-center gap-2 text-foreground"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
                        <span>Back to Tickets</span>
                    </Link>
                </div>
                <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 text-center">
                    {error}
                </div>
            </div>
        </div>
    )

    if (!data) return <div className="flex items-center justify-center h-full text-destructive">Failed to load transcript</div>

    const groupedMessages = groupMessages(data.messages)

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-xl border-b border-border shadow-xl">
                <div className="max-w-[1920px] mx-auto px-4 py-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <Link
                                to="/tickets"
                                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                            >
                                <FontAwesomeIcon 
                                    icon={faArrowLeft} 
                                    className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
                                />
                                <span className="text-sm font-medium">Back to Tickets</span>
                            </Link>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                                    <FontAwesomeIcon icon={faTicket} className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-foreground">
                                        Ticket #{data?.id}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                            data?.status === 'open' 
                                                ? 'bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/30' 
                                                : data?.status === 'closed'
                                                ? 'bg-rose-400/10 text-rose-400 ring-1 ring-rose-400/30'
                                                : 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30'
                                        }`}>
                                            <FontAwesomeIcon icon={faCircle} className="w-2 h-2" />
                                            {data?.status?.charAt(0).toUpperCase() + data?.status?.slice(1)}
                                        </span>
                                        {data?.status === 'open' && supportPermissions[data?.type] && (
                                            <>
                                                <button
                                                    onClick={handleClaimTicket}
                                                    disabled={loading.claim}
                                                    className={`inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
                                                        Boolean(data.claimer) && data.claimer !== 'Unclaimed'
                                                            ? 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30 hover:bg-amber-400/20'
                                                            : 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20'
                                                    }`}
                                                    title={Boolean(data.claimer) && data.claimer !== 'Unclaimed' ? 'Unclaim this ticket' : 'Claim this ticket'}
                                                >
                                                    <FontAwesomeIcon 
                                                        icon={faHandHolding} 
                                                        className={`w-3.5 h-3.5 mr-2 ${loading.claim ? 'animate-pulse' : ''}`} 
                                                    />
                                                    {loading.claim ? 'Processing...' : (Boolean(data.claimer) && data.claimer !== 'Unclaimed' ? 'Unclaim' : 'Claim')}
                                                </button>
                                                <button
                                                    onClick={handleCloseTicket}
                                                    disabled={loading.close}
                                                    className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/20 transition-all duration-200"
                                                    title="Close Ticket"
                                                >
                                                    <FontAwesomeIcon 
                                                        icon={faLock} 
                                                        className={`w-3.5 h-3.5 mr-2 ${loading.close ? 'animate-pulse' : ''}`} 
                                                    />
                                                    {loading.close ? 'Processing...' : 'Close'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-grid-white/[0.02] bg-[length:20px_20px]">
                <div className="max-w-[1920px] mx-auto px-4 py-8">
                    <div className="grid grid-cols-12 gap-8">
                        {/* Main Content */}
                        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
                            <div className="space-y-8">
                                {/* Questions Panel - Show on mobile */}
                                {data?.questions && data.questions.length > 0 && (
                                    <motion.div 
                                        className="lg:hidden bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-xl">
                                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                                <FontAwesomeIcon icon={faQuestion} className="w-4 h-4 text-primary" />
                                                <span className="text-foreground">Ticket Questions</span>
                                            </h2>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {data.questions.map((q, index) => (
                                                <motion.div 
                                                    key={index}
                                                    className="p-4"
                                                    initial={false}
                                                >
                                                    <button 
                                                        onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                                                        className="w-full flex items-start justify-between gap-3 text-left"
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 mt-1">
                                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                    <FontAwesomeIcon 
                                                                        icon={faQuestionCircle} 
                                                                        className="w-4 h-4 text-primary" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-foreground">{q.question}</div>
                                                                {expandedQuestion === index && (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="mt-3 bg-secondary/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-border text-muted-foreground"
                                                                    >
                                                                        {q.answer}
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <FontAwesomeIcon 
                                                            icon={expandedQuestion === index ? faAngleDown : faAngleRight}
                                                            className="w-5 h-5 text-muted-foreground mt-1"
                                                        />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Messages Panel */}
                                <motion.div 
                                    className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10 relative"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="relative">
                                        <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-xl">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faComments} className="w-4 h-4 text-primary" />
                                                    <span className="text-foreground">Conversation</span>
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {groupedMessages.map((group, index) => (
                                                <MessageGroup key={`${group.authorId}-${index}`} group={group} isLast={index === groupedMessages.length - 1} />
                                            ))}
                                            {message.trim() && (
                                                <MessagePreview message={message} sending={sending} />
                                            )}
                                        </div>

                                        {/* Message Input */}
                                        {data.canSendMessages && data.status === 'open' && (
                                            <div className="sticky bottom-0 p-5 border-t border-border bg-card/95 backdrop-blur-xl">
                                                <div className="flex gap-4">
                                                    <div className="flex-grow relative">
                                                        <textarea
                                                            ref={textareaRef}
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    if (message.trim() && sendingEnabled) {
                                                                        sendMessage();
                                                                    }
                                                                }
                                                            }}
                                                            placeholder="Type your message... (Shift + Enter for new line)"
                                                            className="w-full bg-secondary border border-border focus:border-primary/40 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 text-sm min-h-[44px]"
                                                            rows={1}
                                                            style={{
                                                                resize: 'none',
                                                                maxHeight: '200px'
                                                            }}
                                                        />
                                                        {message.length > 0 && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 5 }}
                                                                className="absolute right-3 bottom-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary ring-1 ring-primary/30"
                                                            >
                                                                {message.length} chars
                                                            </motion.div>
                                                        )}
                                                        
                                                        <div className="absolute left-3 bottom-2.5 text-xs text-muted-foreground">
                                                            <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground text-[10px]">Shift</kbd>
                                                            <span className="mx-0.5">+</span>
                                                            <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground text-[10px]">Enter</kbd>
                                                            <span className="ml-1">for new line</span>
                                                        </div>
                                                    </div>
                                                    <motion.button
                                                        onClick={sendMessage}
                                                        disabled={!message.trim() || !sendingEnabled || sending}
                                                        className={`px-4 py-2 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                                            message.trim() && sendingEnabled && !sending
                                                                ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg shadow-primary/20'
                                                                : 'bg-secondary text-muted-foreground cursor-not-allowed'
                                                        }`}
                                                        whileHover={message.trim() && sendingEnabled && !sending ? { scale: 1.05 } : {}}
                                                        whileTap={message.trim() && sendingEnabled && !sending ? { scale: 0.95 } : {}}
                                                    >
                                                        <FontAwesomeIcon 
                                                            icon={faPaperPlane} 
                                                            className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`}
                                                        />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-8">
                            {/* Questions Panel */}
                            {data?.questions && data.questions.length > 0 && (
                                <motion.div 
                                    className="hidden lg:block bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="px-6 py-4 border-b border-border bg-card/70 backdrop-blur-xl">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                                <FontAwesomeIcon icon={faQuestion} className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="text-foreground">Ticket Questions</span>
                                        </h2>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {data.questions.map((q, index) => (
                                            <motion.div 
                                                key={index}
                                                className="p-4 hover:bg-primary/5 transition-colors duration-200"
                                                initial={false}
                                            >
                                                <button 
                                                    onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                                                    className="w-full flex items-start justify-between gap-3 text-left"
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="flex-shrink-0 mt-1">
                                                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                <FontAwesomeIcon 
                                                                    icon={faQuestionCircle} 
                                                                    className="w-4 h-4 text-primary" 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{q.question}</div>
                                                            {expandedQuestion === index && (
                                                                <motion.div 
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="mt-3 bg-secondary/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-border text-muted-foreground"
                                                                >
                                                                    {q.answer}
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <FontAwesomeIcon 
                                                        icon={expandedQuestion === index ? faAngleDown : faAngleRight}
                                                        className="w-5 h-5 text-muted-foreground mt-1"
                                                    />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Ticket Info */}
                            <motion.div 
                                className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="px-6 py-4 border-b border-border bg-card/70">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <div className="bg-primary/10 p-1.5 rounded-lg">
                                            <FontAwesomeIcon icon={faTicket} className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-foreground">Ticket Details</span>
                                    </h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="flex flex-col space-y-1.5">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <FontAwesomeIcon icon={faBars} className="w-3.5 h-3.5 text-primary" />
                                            <span>Type</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary ring-1 ring-primary/30">
                                                {data.typeName || data.type}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-1.5">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <FontAwesomeIcon icon={faExclamationCircle} className="w-3.5 h-3.5 text-primary" />
                                            <span>Priority</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                                                data.priority === 'high' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' :
                                                data.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' :
                                                'bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30'
                                            }`}>
                                                {data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-1.5">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5 text-primary" />
                                            <span>Created By</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-secondary/5 p-2 rounded-xl">
                                            <div className="relative">
                                                <img
                                                    src={data.creatorData?.avatar || getAvatarUrl(data.creator, data.creator, null)}
                                                    alt={data.creatorData?.displayName || data.creator}
                                                    className="w-8 h-8 rounded-full ring-2 ring-border object-cover"
                                                />
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
                                            </div>
                                            <UserName 
                                                displayName={data.creatorData?.displayName || data.creator} 
                                                userId={data.creator}
                                                className="text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-1.5">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 text-primary" />
                                            <span>Created</span>
                                        </div>
                                        <div className="flex items-center bg-secondary/5 p-2 rounded-xl">
                                            <span className="text-sm text-foreground">
                                                {formatDateTime(data.created)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {data.claimed && data.claimer && (
                                        <div className="flex flex-col space-y-1.5">
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <FontAwesomeIcon icon={faHandHolding} className="w-3.5 h-3.5 text-primary" />
                                                <span>Claimed By</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-secondary/5 p-2 rounded-xl">
                                                <div className="relative">
                                                    <img
                                                        src={data.claimerData?.avatar || getAvatarUrl(data.claimer, data.claimer, null)}
                                                        alt={data.claimerData?.displayName || data.claimer}
                                                        className="w-8 h-8 rounded-full ring-2 ring-border object-cover"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
                                                </div>
                                                <UserName 
                                                    displayName={data.claimerData?.displayName || data.claimer} 
                                                    userId={data.claimer}
                                                    className="text-sm font-medium"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {data.closed && (
                                        <div className="flex flex-col space-y-1.5">
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5 text-destructive" />
                                                <span>Closed</span>
                                            </div>
                                            <div className="flex items-center bg-destructive/5 p-2 rounded-xl">
                                                <span className="text-sm text-foreground">
                                                    {formatDateTime(data.closed)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Rating & Feedback */}
                            {(data.rating !== 'No Rating' || data.feedback) && (
                                <motion.div 
                                    className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="px-6 py-4 border-b border-border bg-card/70">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                                <FontAwesomeIcon icon={faThumbsUp} className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="text-foreground">Feedback</span>
                                        </h2>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        {data.rating !== 'No Rating' && (
                                            <div className="flex flex-col space-y-1.5">
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faThumbsUp} className="w-3.5 h-3.5 text-primary" />
                                                    <span>Rating</span>
                                                </div>
                                                <div className="bg-primary/5 px-3 py-2.5 rounded-xl border border-primary/10">
                                                    <span className="text-sm text-foreground">
                                                        {data.rating}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {data.feedback && (
                                            <div className="flex flex-col space-y-1.5">
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faComments} className="w-3.5 h-3.5 text-primary" />
                                                    <span>Comment</span>
                                                </div>
                                                <div className="bg-primary/5 px-3 py-2.5 rounded-xl border border-primary/10">
                                                    <span className="text-sm text-foreground">
                                                        {data.feedback}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Close Reason */}
                            {data.closeReason && (
                                <motion.div 
                                    className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="px-6 py-4 border-b border-border bg-card/70">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <div className="bg-destructive/10 p-1.5 rounded-lg">
                                                <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-destructive" />
                                            </div>
                                            <span className="text-foreground">Close Reason</span>
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        <div className="bg-destructive/5 px-3.5 py-3 rounded-xl border border-destructive/10 text-foreground text-sm">
                                            {data.closeReason}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Participants */}
                            <motion.div 
                                className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="px-6 py-4 border-b border-border bg-card/70">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <div className="bg-primary/10 p-1.5 rounded-lg">
                                            <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-foreground">Participants</span>
                                        <div className="ml-auto bg-primary/10 px-2 py-0.5 rounded-full text-xs font-medium text-primary">
                                            {Array.from(new Set(data.messages.map(msg => msg.authorId))).length}
                                        </div>
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {Array.from(new Set(data.messages.map(msg => msg.authorId))).map((authorId) => {
                                        const message = data.messages.find(msg => msg.authorId === authorId);
                                        if (!message) return null;
                                        
                                        const messageCount = data.messages.filter(msg => msg.authorId === authorId).length;
                                        
                                        return (
                                            <div key={authorId} className="flex items-center gap-3 p-3.5 bg-secondary/10 rounded-xl border border-border hover:bg-secondary/20 transition-all duration-200 group">
                                                <div className="relative">
                                                    <img
                                                        src={message.avatarUrl}
                                                        alt={message.displayName || message.author}
                                                        className="w-10 h-10 rounded-full ring-2 ring-border object-cover group-hover:ring-primary/40 transition-all duration-200"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <UserName 
                                                        displayName={message.displayName || message.author} 
                                                        userId={message.authorId}
                                                        className="block truncate"
                                                    />
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {message.authorId}
                                                    </p>
                                                </div>
                                                <div className="bg-primary/10 px-2 py-0.5 rounded-full text-xs font-medium text-primary whitespace-nowrap">
                                                    {messageCount} message{messageCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
            {selectedImage && (
                <ImageViewer
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
}