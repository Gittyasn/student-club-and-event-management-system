import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    CalendarMonth,
    Close,
    Groups,
    HelpOutline,
    HowToReg,
    Send,
} from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const assistantFunctionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/chat-assistant` : null;

const buildContextFallback = (question, context) => {
    const lower = question.toLowerCase();
    const events = Array.isArray(context?.events) ? context.events : [];
    const clubs = Array.isArray(context?.clubs) ? context.clubs : [];

    const visibleEvents = events.filter((event) =>
        ['approved', 'registration_open', 'published', 'open'].includes(String(event?.status || '').toLowerCase())
    );
    const activeClubs = clubs.filter((club) =>
        ['active', 'approved'].includes(String(club?.status || '').toLowerCase())
    );

    if (lower.includes('event')) {
        if (visibleEvents.length > 0) {
            const topEvents = visibleEvents.slice(0, 3).map((event) => event.title).filter(Boolean).join(', ');
            return `Campus support is offline right now, but current event highlights include ${topEvents}. Open the Events page for details and registration.`;
        }
        return 'Campus support is offline right now. Check the Events page for the latest event information.';
    }

    if (lower.includes('club')) {
        if (activeClubs.length > 0) {
            const topClubs = activeClubs.slice(0, 4).map((club) => club.name).filter(Boolean).join(', ');
            return `Campus support is offline right now, but active clubs currently visible on the platform include ${topClubs}. Open the Clubs page to explore them.`;
        }
        return 'Campus support is offline right now. Check the Clubs page for the latest club information.';
    }

    if (lower.includes('register') || lower.includes('registration')) {
        return 'To register, open the Events or Browse Events page, choose an event with registration open, and use the Register action. If an event is full, you may be placed on the waitlist.';
    }

    if (lower.includes('attendance')) {
        return 'Attendance is usually marked by the event coordinator during or after the event. You can review updates in your attendance records.';
    }

    if (lower.includes('certificate')) {
        return 'Certificates become available after the event workflow is complete and certificate generation runs. Check the Certificates section in your dashboard.';
    }

    if (lower.includes('result') || lower.includes('rank')) {
        return 'Results and rankings appear after coordinators publish them. You can review them in your dashboard results page or the event results page.';
    }

    return 'Campus support is temporarily offline, but you can still use the Clubs, Events, Registrations, Attendance, Results, and Certificates sections directly.';
};

const diagnoseAssistantFailure = async (payload) => {
    if (!assistantFunctionUrl || !supabaseAnonKey) {
        return 'Campus support is not configured because Supabase environment values are missing in the client setup.';
    }

    try {
        const response = await fetch(assistantFunctionUrl, {
            method: 'POST',
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let errorBody = null;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = null;
        }

        if (response.status === 404) {
            return 'Campus support is not deployed in Supabase yet. Deploy the "chat-assistant" Edge Function to enable AI replies.';
        }

        const detailedMessage = errorBody?.error || errorBody?.message || '';

        if (detailedMessage.includes('OPENAI_API_KEY')) {
            return 'Campus support is deployed, but the OPENAI_API_KEY secret is missing in Supabase Edge Functions.';
        }

        if (detailedMessage) {
            return `Campus support is unavailable right now. ${detailedMessage}`;
        }

        if (!response.ok) {
            return `Campus support is unavailable right now. Edge Function returned status ${response.status}.`;
        }
    } catch {
        return 'Campus support could not reach the Supabase Edge Function endpoint.';
    }

    return 'Campus support is unavailable right now. Please try again shortly.';
};

const suggestedQuestions = [
    { text: 'Upcoming events?', icon: <CalendarMonth sx={{ fontSize: 16 }} /> },
    { text: 'Active clubs?', icon: <Groups sx={{ fontSize: 16 }} /> },
    { text: 'How do I register?', icon: <HowToReg sx={{ fontSize: 16 }} /> },
    { text: 'General campus help', icon: <HelpOutline sx={{ fontSize: 16 }} /> },
];

const CampusGuideLogo = ({ size = 22 }) => {
    return (
        <Box
            component={motion.div}
            animate={{
                y: [0, -1, 0],
                scale: [1, 1.015, 1],
                boxShadow: [
                    'inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 18px rgba(37,99,235,0.18)',
                    'inset 0 1px 1px rgba(255,255,255,0.4), 0 10px 22px rgba(124,58,237,0.22)',
                    'inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 18px rgba(37,99,235,0.18)',
                ],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            sx={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: `${Math.max(7, Math.round(size * 0.34))}px`,
                background: 'linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%)',
                border: '1px solid rgba(255,255,255,0.55)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 18px rgba(37,99,235,0.18)',
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            <Box
                component={motion.div}
                animate={{ scale: [0.98, 1.04, 0.98], opacity: [0.28, 0.42, 0.28] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 28% 28%, rgba(255,255,255,0.75), transparent 42%)',
                }}
            />
            <Box
                component="svg"
                viewBox="0 0 64 64"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
                <rect x="10" y="10" width="44" height="44" rx="16" fill="url(#campus-guide-badge)" />
                <g transform="translate(32 32)">
                    <path d="M0 -12L3.2 -3.2L12 0L3.2 3.2L0 12L-3.2 3.2L-12 0L-3.2 -3.2Z" fill="rgba(255,255,255,0.96)" />
                </g>
                <circle cx="43" cy="21" r="4.5" fill="#fbbf24" fillOpacity="0.95" />
                <defs>
                    <linearGradient id="campus-guide-badge" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#60a5fa" />
                        <stop offset="0.55" stopColor="#6366f1" />
                        <stop offset="1" stopColor="#7c3aed" />
                    </linearGradient>
                </defs>
            </Box>
        </Box>
    );
};

const CampusGuide = ({ triggerMode = 'floating' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello. I am the campus support assistant. I can help with events, clubs, registrations, attendance, certificates, and general campus questions.'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [contextData, setContextData] = useState(null);
    const scrollRef = useRef(null);
    const isTopbar = triggerMode === 'topbar';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen && !contextData) {
            const fetchContext = async () => {
                try {
                    const { data: events } = await supabase.from('events').select('title, description, status, event_type').limit(10);
                    const { data: clubs } = await supabase.from('clubs').select('name, description, status').limit(10);
                    setContextData({ events, clubs });
                } catch (error) {
                    console.error('Failed to fetch context from Supabase:', error);
                }
            };

            fetchContext();
        }
    }, [contextData, isOpen]);

    const handleSend = async (customMessage = null) => {
        const userMessage = (customMessage || input).trim();
        if (!userMessage) return;

        const nextMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(nextMessages);
        setInput('');
        setIsTyping(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat-assistant', {
                body: {
                    messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
                    context: contextData
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const reply = data?.choices?.[0]?.message?.content || "I couldn't process that request right now.";
            setMessages((previous) => [...previous, { role: 'assistant', content: reply }]);
        } catch (error) {
            console.error('Guide Error:', error);
            const diagnosticMessage = await diagnoseAssistantFailure({
                messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
                context: contextData,
            });
            const fallbackReply = buildContextFallback(userMessage, contextData);
            const shouldUseFallback = /quota|billing|OPENAI_API_KEY|not deployed|unavailable|could not reach/i.test(diagnosticMessage);

            setMessages((previous) => [
                ...previous,
                {
                    role: 'assistant',
                    content: shouldUseFallback
                        ? `${fallbackReply}\n\nNote: live AI replies are temporarily unavailable because ${diagnosticMessage.replace(/^Campus support is unavailable right now\.?\s*/i, '').trim() || 'the assistant service is degraded right now.'}`
                        : diagnosticMessage
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <Box
                component={motion.div}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                sx={isTopbar ? { zIndex: 1300 } : { position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}
            >
                <IconButton
                    onClick={() => setIsOpen((value) => !value)}
                    sx={{
                        width: isTopbar ? 40 : 62,
                        height: isTopbar ? 40 : 62,
                        borderRadius: isTopbar ? 2.5 : '50%',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)',
                        color: 'text.primary',
                        border: '1px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(37,99,235,0.14)',
                        boxShadow: isTopbar
                            ? '0 6px 20px rgba(15,23,42,0.12)'
                            : '0 18px 38px rgba(15,23,42,0.18)',
                        '&:hover': {
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.96)' : 'rgba(255,255,255,1)',
                            transform: 'translateY(-1px)',
                        },
                    }}
                    aria-label="Open campus support"
                >
                    {isOpen ? <Close /> : <CampusGuideLogo size={isTopbar ? 22 : 30} />}
                </IconButton>
            </Box>

            <AnimatePresence>
                {isOpen ? (
                    <Paper
                        component={motion.div}
                        initial={{ opacity: 0, y: isTopbar ? -12 : 24, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: isTopbar ? -12 : 24, scale: 0.97 }}
                        elevation={10}
                        sx={{
                            position: 'fixed',
                            top: isTopbar ? 88 : 'auto',
                            bottom: isTopbar ? 'auto' : 96,
                            right: { xs: 16, md: isTopbar ? 32 : 24 },
                            width: { xs: 'calc(100vw - 32px)', sm: 380 },
                            maxWidth: 380,
                            height: 600,
                            zIndex: 1400,
                            borderRadius: 4,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Box
                            sx={{
                                p: 2.5,
                                color: 'white',
                                background: 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                                    <CampusGuideLogo size={26} />
                                </Box>
                                <Box>
                                    <Typography fontWeight={900}>Campus Support</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.88 }}>
                                        Ask about events, clubs, attendance, results, or certificates
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                                <Close />
                            </IconButton>
                        </Box>

                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {suggestedQuestions.map((question) => (
                                    <Chip
                                        key={question.text}
                                        icon={question.icon}
                                        label={question.text}
                                        onClick={() => handleSend(question.text)}
                                        clickable
                                        variant="outlined"
                                        sx={{ fontWeight: 700 }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        <Box
                            ref={scrollRef}
                            sx={{
                                flex: 1,
                                overflowY: 'auto',
                                px: 2,
                                py: 2.5,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.75)' : 'rgba(248,250,252,0.95)',
                            }}
                        >
                            <Stack spacing={1.5}>
                                {messages.map((message, index) => (
                                    <Box
                                        key={`${message.role}-${index}`}
                                        component={motion.div}
                                        initial={{ opacity: 0, x: message.role === 'user' ? 16 : -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        sx={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
                                    >
                                        <Box
                                            sx={{
                                                maxWidth: '88%',
                                                px: 2,
                                                py: 1.5,
                                                borderRadius: 3,
                                                borderTopLeftRadius: message.role === 'assistant' ? 0.75 : 3,
                                                borderTopRightRadius: message.role === 'user' ? 0.75 : 3,
                                                bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                                                color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                                border: message.role === 'assistant' ? '1px solid' : 'none',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                {message.content}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}

                                {isTyping ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <Paper elevation={0} sx={{ px: 2, py: 1.25, borderRadius: 3, borderTopLeftRadius: 0.75, border: '1px solid', borderColor: 'divider' }}>
                                            <Stack direction="row" spacing={0.75}>
                                                {[0, 1, 2].map((value) => (
                                                    <Box
                                                        key={value}
                                                        component={motion.span}
                                                        animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                                                        transition={{ repeat: Infinity, duration: 1.1, delay: value * 0.15 }}
                                                        sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', display: 'block' }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Box>
                                ) : null}
                            </Stack>
                        </Box>

                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-end">
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={4}
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Ask about events, clubs, attendance, results, or certificates"
                                />
                                <IconButton
                                    color="primary"
                                    onClick={() => handleSend()}
                                    disabled={isTyping || !input.trim()}
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2.5,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                                    }}
                                >
                                    <Send fontSize="small" />
                                </IconButton>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block' }}>
                                Live replies depend on the campus AI service. If it is unavailable, you will still get a fallback answer based on current platform data.
                            </Typography>
                        </Box>
                    </Paper>
                ) : null}
            </AnimatePresence>
        </>
    );
};

export default CampusGuide;
