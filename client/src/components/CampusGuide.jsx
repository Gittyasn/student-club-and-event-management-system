import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Calendar, Users, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../services/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const assistantFunctionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/chat-assistant` : null;

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

/**
 * CampusGuide Component
 * Campus support assistant connected to Supabase Edge Functions
 */
const CampusGuide = ({ triggerMode = 'floating' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello. I am the NextGen Edutech University campus assistant. I can help with events, clubs, registrations, and general campus questions.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [contextData, setContextData] = useState(null);
    const scrollRef = useRef(null);
    const isTopbar = triggerMode === 'topbar';

    const suggestedQuestions = [
        { text: 'Upcoming events?', icon: <Calendar className="w-3 h-3" /> },
        { text: 'Active clubs?', icon: <Users className="w-3 h-3" /> },
        { text: 'How to register?', icon: <MessageSquare className="w-3 h-3" /> },
        { text: 'General Campus help', icon: <HelpCircle className="w-3 h-3" /> }
    ];

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Fetch basic context data from Supabase once when opened
    useEffect(() => {
        if (isOpen && !contextData) {
            const fetchContext = async () => {
                try {
                    const { data: events } = await supabase.from('events').select('title, description, status, event_type').limit(10);
                    const { data: clubs } = await supabase.from('clubs').select('name, description, status').limit(10);
                    setContextData({ events, clubs });
                } catch (error) {
                    console.error("Failed to fetch context from Supabase:", error);
                }
            };
            fetchContext();
        }
    }, [isOpen, contextData]);

    const handleSend = async (customMsg = null) => {
        const userMsg = (customMsg || input).trim();
        if (!userMsg) return;

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            // Always route AI requests through the server-side edge function.
            const { data, error } = await supabase.functions.invoke('chat-assistant', {
                body: {
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    context: contextData
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const reply = data?.choices?.[0]?.message?.content || "I couldn't process that request right now.";
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            console.error("Guide Error:", error);
            const diagnosticMessage = await diagnoseAssistantFailure({
                messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                context: contextData,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: diagnosticMessage }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating FAB/Trigger */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: isTopbar ? 1.05 : 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={isTopbar ? "z-[1300]" : "fixed bottom-6 right-6 z-[9999]"}
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    className={isTopbar
                        ? "h-10 w-10 rounded-xl p-0 flex items-center justify-center bg-primary hover:bg-primary/90 transition-all border border-border/50 shadow-lg"
                        : "h-16 w-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-0 flex items-center justify-center bg-primary hover:bg-primary/90 transition-all border-0"}
                    aria-label="Open campus support desk"
                >
                    {isOpen
                        ? <X className={isTopbar ? "h-5 w-5 text-white" : "h-7 w-7 text-white"} />
                        : <HelpCircle className={isTopbar ? "h-5 w-5 text-white" : "h-7 w-7 text-white animate-pulse"} />}
                </Button>
            </motion.div>

            {/* Chat Interface */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: isTopbar ? -20 : 40, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: isTopbar ? -20 : 40, scale: 0.95, filter: 'blur(10px)' }}
                        className={isTopbar
                            ? "fixed top-24 right-4 md:right-8 w-[350px] md:w-[410px] h-[580px] bg-background/80 backdrop-blur-xl border border-border/60 shadow-2xl rounded-3xl z-[1400] overflow-hidden flex flex-col"
                            : "fixed bottom-24 right-6 w-[360px] md:w-[420px] h-[620px] bg-background/80 backdrop-blur-xl border border-border/60 shadow-2xl rounded-3xl z-[9999] overflow-hidden flex flex-col"}
                        style={{ boxShadow: '0 24px 80px -12px rgba(0, 0, 0, 0.25)' }}
                    >
                        {/* Header with Gradient */}
                        <div className="p-5 bg-gradient-to-r from-sky-700 via-blue-700 to-cyan-600 text-primary-foreground flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                    <MessageSquare className="h-5 w-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-base tracking-tight leading-none text-white">Campus Support Desk</h3>
                                    <p className="text-[10px] opacity-80 mt-1.5 uppercase tracking-widest font-black text-white/90">Online | NextGen Edutech University</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 h-9 w-9 rounded-xl">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages Area - Subtle Mesh Background */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]" ref={scrollRef}>
                            {messages.map((m, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[88%] p-4 rounded-[20px] text-[13.5px] leading-relaxed shadow-sm transition-all ${m.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                                        : 'bg-white dark:bg-slate-900/60 border border-border/50 text-foreground rounded-tl-none'
                                        }`}>
                                        {m.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-[20px] rounded-tl-none border border-border/30 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Suggested Questions Area */}
                        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-border/30 bg-background/40">
                            {suggestedQuestions.map((q, i) => (
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(var(--primary), 0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                    key={i}
                                    onClick={() => handleSend(q.text)}
                                    className="px-3 py-1.5 rounded-full border border-border/60 bg-white/50 dark:bg-slate-800/50 text-[11px] font-semibold flex items-center gap-2 hover:border-primary/50 transition-colors"
                                >
                                    {q.icon}
                                    {q.text}
                                </motion.button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-5 border-t border-border/40 bg-background/60 backdrop-blur-md">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-3"
                                autoComplete="off"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about events, clubs, attendance, or certificates"
                                    className="flex-1 focus-visible:ring-primary h-12 text-sm bg-background/50 border-border/60 rounded-xl"
                                    autoComplete="off"
                                />
                                <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-xl shadow-md hover:shadow-lg transition-all" disabled={isTyping}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                            <p className="text-[10px] text-muted-foreground mt-4 text-center uppercase tracking-[0.2em] font-black opacity-30 select-none">
                                Securely powered by NextGen Edutech University services
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CampusGuide;

