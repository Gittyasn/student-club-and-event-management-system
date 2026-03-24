import { Box, Paper, Typography, CircularProgress, IconButton } from '@mui/material';
import { Group as GroupIcon } from '@mui/icons-material';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../hooks/useChat';
import MessageBubble from './chat/MessageBubble';
import MessageInput from './chat/MessageInput';
import UserList from './chat/UserList';

const ChatWindow = ({ chatType, referenceId, title }) => {
    const { profile } = useAuthStore();
    const { chatRoom, messages, isLoading, sendMessage, togglePin, deleteMessage, uploadFile } = useChat(chatType, referenceId);
    const [replyTo, setReplyTo] = useState(null);
    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const isModerator = profile?.role === 'admin' || profile?.role === 'coordinator';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (msgData) => {
        await sendMessage.mutateAsync(msgData);
    };

    const handlePin = async (msg) => {
        await togglePin.mutateAsync({ messageId: msg.id, isPinned: !msg.is_pinned });
    };

    const handleDelete = async (msgId) => {
        if (confirm("Are you sure you want to delete this message?")) {
            await deleteMessage.mutateAsync(msgId);
        }
    };

    if (isLoading) {
        return (
            <Paper elevation={3} sx={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                <CircularProgress />
            </Paper>
        );
    }

    if (!chatRoom && chatType !== 'broadcast') {
        return (
            <Paper elevation={3} sx={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                <Typography color="error">Chat room unavailable or access denied.</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={3} sx={{ height: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            {/* Header */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{title || 'Community Chat'}</Typography>
                {chatType !== 'broadcast' && (
                    <IconButton color="primary" onClick={() => setIsRosterOpen(true)}>
                        <GroupIcon />
                    </IconButton>
                )}
            </Box>

            <UserList
                open={isRosterOpen}
                onClose={() => setIsRosterOpen(false)}
                chatType={chatType}
                referenceId={referenceId}
            />

            {/* Messages Area - Uses a flex-grow box with auto overflow */}
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 ? (
                    <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1">No messages yet.</Typography>
                        <Typography variant="caption">Be the first to say something!</Typography>
                    </Box>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            onReply={setReplyTo}
                            onPin={handlePin}
                            onDelete={handleDelete}
                            isModerator={isModerator}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            {chatType === 'broadcast' && !isModerator ? (
                <Box sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Only admins can post in the Broadcast channel.</Typography>
                </Box>
            ) : (
                <MessageInput
                    onSend={handleSend}
                    onUpload={uploadFile}
                    isModerator={isModerator}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                />
            )}
        </Paper>
    );
};

export default ChatWindow;
