// eslint-disable-next-line no-unused-vars
import { Box, Typography, Avatar, Paper, IconButton, Menu, MenuItem, Link, Chip, Tooltip, Button } from '@mui/material';
import { motion } from 'framer-motion';
import {
    MoreVert as MoreVertIcon,
    PushPin as PinIcon,
    Delete as DeleteIcon,
    Reply as ReplyIcon,
    InsertDriveFile as FileIcon,
    Campaign as AnnouncementIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const MessageBubble = ({ message, onReply, onPin, onDelete, isModerator }) => {
    const { user } = useAuthStore();
    const isMe = message.sender_id === user?.id;
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuClick = (e) => setAnchorEl(e.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    if (message.deleted) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', mb: 2 }}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.100', color: 'text.secondary', border: '1px dashed', borderColor: 'grey.300', fontStyle: 'italic', borderRadius: 2 }}>
                    This message was deleted.
                </Paper>
            </Box>
        );
    }

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                mb: 2,
                position: 'relative'
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 1.5, maxWidth: '85%' }}>
                {/* Avatar */}
                {!isMe && (
                    <Avatar src={message.profiles?.avatar_url} sx={{ width: 36, height: 36, bgcolor: 'secondary.main', mt: 1 }}>
                        {message.profiles?.full_name?.charAt(0) || <PersonIcon />}
                    </Avatar>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {/* Header: Name + Time + Badges */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {isMe ? 'You' : message.profiles?.full_name}
                        </Typography>
                        {message.profiles?.role === 'admin' && <Chip label="Admin" size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />}
                        {message.profiles?.role === 'coordinator' && <Chip label="Coordinator" size="small" color="info" sx={{ height: 16, fontSize: '0.6rem' }} />}
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {message.is_pinned && <PinIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                    </Box>

                    {/* Message Content Container */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isMe ? 'row-reverse' : 'row' }}>

                        {/* The Bubble */}
                        <Paper
                            elevation={message.is_announcement ? 4 : 1}
                            sx={{
                                p: 1.5,
                                bgcolor: message.is_announcement ? 'warning.light' : (isMe ? 'primary.main' : 'background.paper'),
                                color: message.is_announcement ? 'warning.contrastText' : (isMe ? 'primary.contrastText' : 'text.primary'),
                                borderRadius: 2.5,
                                borderTopRightRadius: isMe ? 0.5 : 2.5,
                                borderTopLeftRadius: isMe ? 2.5 : 0.5,
                                position: 'relative',
                                border: message.is_announcement ? '2px solid' : 'none',
                                borderColor: 'warning.main',
                                minWidth: 80
                            }}
                        >
                            {/* Announcement Badge */}
                            {message.is_announcement && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, opacity: 0.9 }}>
                                    <AnnouncementIcon fontSize="small" />
                                    <Typography variant="overline" sx={{ lineHeight: 1, fontWeight: 'bold' }}>Announcement</Typography>
                                </Box>
                            )}

                            {/* Parent Reply Reference */}
                            {message.parent_id && (
                                <Box sx={{
                                    mb: 1, p: 1, borderRadius: 1,
                                    bgcolor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)',
                                    borderLeft: '3px solid',
                                    borderColor: isMe ? 'white' : 'primary.main',
                                    fontSize: '0.8rem',
                                    opacity: 0.8
                                }}>
                                    Replying to someone... {/* Could fetch parent text if needed, doing simple for now */}
                                </Box>
                            )}

                            {/* Text Content */}
                            {message.content && (
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                    {message.content}
                                </Typography>
                            )}

                            {/* File Attachment */}
                            {message.file_url && (
                                <Box sx={{ mt: 1 }}>
                                    {message.file_type === 'image' ? (
                                        <Box
                                            component="img"
                                            src={message.file_url}
                                            alt={message.file_name}
                                            sx={{ maxWidth: 200, borderRadius: 1, cursor: 'pointer', transition: '0.2s', '&:hover': { opacity: 0.8 } }}
                                            onClick={() => window.open(message.file_url, '_blank')}
                                        />
                                    ) : (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<FileIcon />}
                                            href={message.file_url}
                                            target="_blank"
                                            sx={{
                                                bgcolor: isMe ? 'primary.dark' : 'grey.100',
                                                color: isMe ? 'white' : 'text.primary',
                                                '&:hover': { bgcolor: isMe ? 'rgba(0,0,0,0.2)' : 'grey.200' },
                                                textTransform: 'none'
                                            }}
                                        >
                                            {message.file_name?.length > 20 ? message.file_name.substring(0, 20) + '...' : message.file_name}
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Paper>

                        {/* Actions (Hover/Menu) */}
                        <Box className="msg-actions" sx={{ opacity: 0, transition: '0.2s' }}>
                            <Tooltip title="Reply">
                                <IconButton size="small" onClick={() => onReply(message)}><ReplyIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            {(isMe || isModerator) && (
                                <>
                                    <IconButton size="small" onClick={handleMenuClick}><MoreVertIcon fontSize="small" /></IconButton>
                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                                        {isModerator && (
                                            <MenuItem onClick={() => { onPin(message); handleMenuClose(); }}>
                                                <PinIcon fontSize="small" sx={{ mr: 1, color: message.is_pinned ? 'warning.main' : 'inherit' }} />
                                                {message.is_pinned ? 'Unpin' : 'Pin'} Message
                                            </MenuItem>
                                        )}
                                        <MenuItem onClick={() => { onDelete(message.id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                                            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}
                        </Box>

                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default MessageBubble;
