import { io } from 'socket.io-client';

declare global {
    interface Window {
        DASHBOARD_CONFIG: {
            API_URL: string;
            CLIENT_URL: string;
            TIMEZONE: string;
            DISCORD: {
                CLIENT_ID: string;
                REDIRECT_URI: string;
                GUILD_ID: string;
            };
            TICKETS: {
                TYPES: Record<string, any>;
            };
            PERMISSIONS: {
                Dashboard: {
                    Login: string[];
                    Usage: string[];
                    Settings: string[];
                };
            };
        }
    }
}

const getCurrentDomain = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const API_URL = window.DASHBOARD_CONFIG?.CLIENT_URL || getCurrentDomain();

const socket = io(API_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
    forceNew: true
});

let currentRoom: string | null = null;

socket.on('connect', () => {
    if (currentRoom) {
        socket.emit('join_ticket', currentRoom);
    }
});

socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect' || reason === 'transport close') {
        socket.connect();
    }
});

socket.on('connect_error', (error) => {
    setTimeout(() => {
        socket.connect();
    }, 1000);
});

socket.onAny((event, ...args) => {
});

socket.onAnyOutgoing((event, ...args) => {
});

const joinTicketRoom = (ticketId: string) => {
    if (currentRoom === ticketId) {
        return;
    }
    
    if (currentRoom) {
        socket.emit('leave_ticket', currentRoom);
    }
    
    socket.emit('join_ticket', ticketId);
    currentRoom = ticketId;
    
    socket.emit('get_ticket_messages', ticketId);
};

socket.on('ticketMessage', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('ticket_message', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('message', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('discord_message', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('discordMessage', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('discord', (data) => {
    socket.emit('message_received', { messageId: data?.message?.id });
});

socket.on('joined_room', (room) => {
});

socket.on('left_room', (room) => {
    if (currentRoom === room) {
        currentRoom = null;
    }
});

export { socket, joinTicketRoom }; 