import { Box, TextField, IconButton, CircularProgress, Chip, Typography, FormControlLabel, Switch } from '@mui/material';
import {
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    Close as CloseIcon,
    Reply as ReplyIcon
} from '@mui/icons-material';
import { useState, useRef } from 'react';

const MessageInput = ({ onSend, onUpload, isModerator, replyTo, onCancelReply }) => {
    const [content, setContent] = useState('');
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleSend = async () => {
        if (!content.trim() && !selectedFile) return;

        let fileDetails = null;
        if (selectedFile) {
            setIsUploading(true);
            try {
                fileDetails = await onUpload(selectedFile);
            // eslint-disable-next-line no-unused-vars
            } catch (err) {
                setIsUploading(false);
                return; // Error handled by hook
            }
        }

        await onSend({
            content: content.trim(),
            isAnnouncement: isModerator ? isAnnouncement : false,
            parentId: replyTo?.id || null,
            fileDetails
        });

        setContent('');
        setSelectedFile(null);
        setIsUploading(false);
        setIsAnnouncement(false);
        if (onCancelReply) onCancelReply();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File is too large! Maximum allowed size is 5MB.");
                return;
            }
            setSelectedFile(file);
        }
    };

    return (
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>

            {/* Moderation & Context Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
                {/* Reply Context */}
                {replyTo ? (
                    <Chip
                        icon={<ReplyIcon fontSize="small" />}
                        label={`Replying to ${replyTo.profiles?.full_name}`}
                        onDelete={onCancelReply}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                ) : <Box />}

                {/* Announcement Toggle */}
                {isModerator && (
                    <FormControlLabel
                        control={<Switch size="small" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} color="warning" />}
                        label={<Typography variant="caption" sx={{ fontWeight: 'bold', color: 'warning.main' }}>Announcement</Typography>}
                    />
                )}
            </Box>

            {/* File Selected Indicator */}
            {selectedFile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, width: 'fit-content' }}>
                    <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>{selectedFile.name}</Typography>
                    <IconButton size="small" onClick={() => setSelectedFile(null)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}

            {/* Input Row */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf,.doc,.docx"
                />
                <IconButton color="default" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <AttachFileIcon />
                </IconButton>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyPress}
                    multiline
                    maxRows={4}
                    disabled={isUploading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'grey.50',
                            borderRadius: 3
                        }
                    }}
                />

                <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={(!content.trim() && !selectedFile) || isUploading}
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' },
                        width: 40, height: 40
                    }}
                >
                    {isUploading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
                </IconButton>
            </Box>
        </Box>
    );
};

export default MessageInput;
