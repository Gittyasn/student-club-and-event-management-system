import { Box, Chip, Divider, IconButton, Paper, Stack, Typography, useTheme } from '@mui/material';
import { Group as GroupIcon, PushPin as PinIcon } from '@mui/icons-material';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../hooks/useChat';
import LoadingDots from './LoadingDots';
import MessageBubble from './chat/MessageBubble';
import MessageInput from './chat/MessageInput';
import UserList from './chat/UserList';

const ChatWindow = ({ chatType, referenceId, title }) => {
    const theme = useTheme();
    const { profile } = useAuthStore();
    const { chatRoom, messages, isLoading, sendMessage, togglePin, deleteMessage, uploadFile } = useChat(chatType, referenceId);
    const [replyTo, setReplyTo] = useState(null);
    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const isModerator = profile?.role === 'admin' || profile?.role === 'coordinator';
    const pinnedMessages = messages.filter((message) => message.is_pinned).slice(-3);

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
                <LoadingDots label="Loading chat..." minHeight="auto" />
            </Paper>
        );
    }

    if (!chatRoom && chatType !== 'broadcast') {
        return (
            <Paper elevation={3} sx={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                <Box sx={{ textAlign: 'center', px: 3 }}>
                    <Typography variant="h6" fontWeight={800} color="error" sx={{ mb: 0.75 }}>
                        Chat unavailable
                    </Typography>
                    <Typography color="text.secondary">
                        This conversation is not available for your account right now.
                    </Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={3}
            sx={{
                height: '72vh',
                maxWidth: chatType === 'broadcast' ? 980 : '100%',
                width: '100%',
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Box sx={{ px: 2.5, py: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {title || 'Community Chat'}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                            <Chip label={chatRoom || chatType === 'broadcast' ? 'Connected' : 'Unavailable'} size="small" color={chatRoom || chatType === 'broadcast' ? 'success' : 'error'} />
                            <Chip
                                label={chatType === 'broadcast' && !isModerator ? 'Read only' : 'Live chat'}
                                size="small"
                                color={chatType === 'broadcast' && !isModerator ? 'default' : 'primary'}
                                variant="outlined"
                            />
                        </Stack>
                    </Box>
                    {chatType !== 'broadcast' && (
                        <IconButton color="primary" onClick={() => setIsRosterOpen(true)}>
                            <GroupIcon />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {pinnedMessages.length > 0 ? (
                <>
                    <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                            <PinIcon sx={{ fontSize: 16 }} />
                            Pinned messages
                        </Typography>
                        <Stack spacing={1}>
                            {pinnedMessages.map((message) => (
                                <Paper key={message.id} elevation={0} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.25 }}>
                                        {message.profiles?.full_name || 'Unknown sender'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                        {message.content || 'Pinned attachment'}
                                    </Typography>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                    <Divider />
                </>
            ) : null}

            <UserList
                open={isRosterOpen}
                onClose={() => setIsRosterOpen(false)}
                chatType={chatType}
                referenceId={referenceId}
            />

            {/* Messages Area - Uses a flex-grow box with auto overflow */}
            <Box
                sx={{
                    flex: 1,
                    p: 2.5,
                    overflowY: 'auto',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.75)' : 'rgba(248,250,252,0.9)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {messages.length === 0 ? (
                    <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary', maxWidth: 320 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.75, color: 'text.primary' }}>
                            No messages yet
                        </Typography>
                        <Typography variant="body2">
                            Start the conversation, share a quick update, or pin an important note for everyone in this channel.
                        </Typography>
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
                    <Typography variant="caption" color="text.secondary">
                        Only admins can post in the broadcast channel. You can still read all updates here.
                    </Typography>
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
