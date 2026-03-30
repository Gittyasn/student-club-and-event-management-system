import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Typography, Button, Chip, Grid, IconButton,
    Tooltip, Stack, LinearProgress, TextField,
    InputAdornment, ToggleButtonGroup, ToggleButton, Menu, MenuItem
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    QrCode as AttendanceIcon, RateReview as FeedbackIcon,
    EmojiEvents as ResultsIcon, WorkspacePremium as CertificateIcon,
    CheckCircle as SubmitIcon, Search, ViewModule, TableRows,
    MoreVert, Event as EventIcon, LocationOn, People,
    CalendarMonth, Visibility, Public, Lock,
    Flag as FinalizeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCoordinatorEvents } from '../../hooks/useCoordinatorEvents';
import { useEventMutations } from '../../hooks/useEventMutations';
import { useUpdateEventStatus } from '../../hooks/useEvents';
import LoadingDots from '../../components/LoadingDots';
import RolePageHeader from '../../components/RolePageHeader';

const EventsTable = lazy(() => import('./EventsTable'));

const statusConfig = {
    draft: { bg: '#6b728020', color: '#94a3b8', border: '#6b728030', label: 'Draft' },
    pending: { bg: '#f59e0b20', color: '#f59e0b', border: '#f59e0b30', label: 'Pending Approval' },
    approved: { bg: '#10b98120', color: '#10b981', border: '#10b98130', label: 'Approved' },
    registration_open: { bg: '#3b82f620', color: '#60a5fa', border: '#3b82f630', label: 'Reg. Open' },
    registration_closed: { bg: '#6366f120', color: '#818cf8', border: '#6366f130', label: 'Reg. Closed' },
    ongoing: { bg: '#ec489920', color: '#f472b6', border: '#ec489930', label: 'Ongoing Live' },
    completed: { bg: '#8b5cf620', color: '#a78bfa', border: '#8b5cf630', label: 'Completed' },
    cancelled: { bg: '#ef444420', color: '#ef4444', border: '#ef444430', label: 'Cancelled' },
    archived: { bg: '#47556920', color: '#64748b', border: '#47556930', label: 'Archived' },
    rejected: { bg: '#ef444420', color: '#ef4444', border: '#ef444430', label: 'Rejected' },
};

const EventCard = ({ event, onDelete, onSubmit, navigate, index }) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const status = event.approval_status === 'rejected' ? 'rejected' : (event.status || 'draft');
    const config = statusConfig[status] || statusConfig.draft;

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            sx={{
                borderRadius: '18px', overflow: 'hidden', height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                border: `1.5px solid ${config.border}`,
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
                '&:hover': { boxShadow: `0 8px 32px -8px ${config.color}30` }
            }}
        >
            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${config.color}, ${config.color}60, transparent)` }} />

            <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minWidth: 0 }}>
                        <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${config.color}30, ${config.color}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${config.border}` }}>
                            <EventIcon sx={{ fontSize: 20, color: config.color }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={800} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.3 }}>
                                {event.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Chip label={config.label} size="small"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: config.bg, color: config.color, border: `1px solid ${config.border}` }} />
                                {event.visibility === 'public' ? (
                                    <Tooltip title="Public Visibility"><Public sx={{ fontSize: 14, color: 'text.secondary' }} /></Tooltip>
                                ) : (
                                    <Tooltip title="Restricted Visibility"><Lock sx={{ fontSize: 14, color: 'text.secondary' }} /></Tooltip>
                                )}
                            </Box>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }} sx={{ ml: 1 }}>
                        <MoreVert sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                <Stack spacing={0.8} sx={{ mb: 2 }}>
                    {[
                        { icon: <CalendarMonth sx={{ fontSize: 14 }} />, label: event.start_time ? new Date(event.start_time).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                        { icon: <LocationOn sx={{ fontSize: 14 }} />, label: event.mode === 'online' ? 'Virtual (Link)' : (event.location || '—') },
                        { icon: <People sx={{ fontSize: 14 }} />, label: `${event.registrationsCount || 0} / ${event.max_participants} registered` },
                    ].map((row, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: 'text.disabled', display: 'flex' }}>{row.icon}</Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.label}
                            </Typography>
                        </Box>
                    ))}

                    {event.rejection_reason && event.approval_status === 'rejected' && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: '#ef444415', borderRadius: '10px', border: '1px solid #ef444430' }}>
                            <Typography variant="caption" fontWeight={800} sx={{ color: '#ef4444', display: 'block', mb: 0.5 }}>REJECTION REASON:</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>&quot;{event.rejection_reason}&quot;</Typography>
                        </Box>
                    )}
                </Stack>

                {Number(event.budget_requested) > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Requested Budget</Typography>
                            <Typography variant="caption" fontWeight={800} sx={{ color: '#10b981' }}>₹{Number(event.budget_requested).toLocaleString()}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={100} sx={{ height: 5, bgcolor: '#10b98115', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {status === 'draft' || status === 'rejected' ? (
                        <>
                            <Button size="small" variant="outlined" startIcon={<EditIcon />}
                                onClick={() => navigate(`/coordinator/events/${event.id}/edit`)}
                                sx={{ fontSize: '0.7rem', py: 0.5, flex: 1 }}>{status === 'rejected' ? 'Fix & Resubmit' : 'Edit Draft'}</Button>
                            <Button size="small" variant="contained" color="primary" startIcon={<SubmitIcon />}
                                onClick={() => onSubmit(event.id)}
                                sx={{ fontSize: '0.7rem', py: 0.5, flex: 1 }}>Submit</Button>
                        </>
                    ) : status === 'pending' ? (
                        <Button size="small" variant="outlined" disabled sx={{ fontSize: '0.7rem', py: 0.5, flex: 1, color: '#f59e0b', borderColor: '#f59e0b30' }}>Archived under Review</Button>
                    ) : (
                        <>
                            <Button size="small" variant="outlined" startIcon={<People />}
                                onClick={() => navigate(`/coordinator/events/${event.id}/registrations`)}
                                sx={{ fontSize: '0.7rem', py: 0.5, flex: 1 }}>Regs</Button>
                            <Button size="small" variant="outlined" startIcon={<AttendanceIcon />}
                                onClick={() => navigate(`/coordinator/events/${event.id}/attendance`)}
                                sx={{ fontSize: '0.7rem', py: 0.5, flex: 1 }}>Attendance</Button>
                        </>
                    )}
                </Box>
            </Box>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/registrations`); }}>
                    <Visibility sx={{ fontSize: 16, mr: 1.5 }} /> Registrations
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/attendance`); }}>
                    <AttendanceIcon sx={{ fontSize: 16, mr: 1.5 }} /> Attendance
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/results`); }}>
                    <ResultsIcon sx={{ fontSize: 16, mr: 1.5 }} /> Results
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/feedback`); }}>
                    <FeedbackIcon sx={{ fontSize: 16, mr: 1.5 }} /> Feedback
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/completion`); }}>
                    <FinalizeIcon sx={{ fontSize: 16, mr: 1.5, color: '#f472b6' }} /> Completion Wizard
                </MenuItem>
                {event.certificate_enabled && (
                    <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/certificates`); }}>
                        <CertificateIcon sx={{ fontSize: 16, mr: 1.5 }} /> Certificates
                    </MenuItem>
                )}
                <MenuItem onClick={() => { setMenuAnchor(null); navigate(`/coordinator/events/${event.id}/edit`); }}>
                    <EditIcon sx={{ fontSize: 16, mr: 1.5 }} /> Edit Settings
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); onDelete(event.id); }} sx={{ color: '#ef4444' }}>
                    <DeleteIcon sx={{ fontSize: 16, mr: 1.5 }} /> Deep Delete
                </MenuItem>
            </Menu>
        </Box>
    );
};

const MyEvents = () => {
    const navigate = useNavigate();
    const { data: events, isLoading, isCoordinatorClubMissing } = useCoordinatorEvents();
    const { deleteEvent } = useEventMutations();
    const updateEventStatus = useUpdateEventStatus();
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [filterStatus, setFilterStatus] = useState('all');

    const handleDelete = (id) => {
        if (window.confirm('Delete this event? This cannot be undone.')) deleteEvent.mutate(id);
    };
    const handleSubmit = (id) => {
        if (window.confirm('Submit this event for admin review?')) {
            updateEventStatus.mutate({ id, status: 'pending' });
        }
    };

    const filtered = (events || []).filter(e => {
        const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase());
        const displayStatus = e.approval_status === 'rejected' ? 'rejected' : e.status;
        const matchStatus = filterStatus === 'all' || displayStatus === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: events?.length || 0,
        active: events?.filter(e => ['approved', 'registration_open', 'ongoing'].includes(e.status)).length || 0,
        pending: events?.filter(e => e.status === 'pending').length || 0,
        draft: events?.filter(e => e.status === 'draft').length || 0,
    };

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="My Events"
                subtitle="Manage submissions, approvals, and participant activity."
                accent="#10b981"
            />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '20px',
                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: '0 16px 48px -12px rgba(16,185,129,0.3)'
                }}
            >
                {['#10b981', '#3b82f6'].map((c, i) => (
                    <Box key={i} component={motion.div}
                        animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 + i * 2, ease: 'easeInOut', delay: i }}
                        sx={{ position: 'absolute', borderRadius: '50%', width: 180 + i * 60, height: 180 + i * 60, background: `radial-gradient(circle, ${c}50, transparent 70%)`, top: i === 0 ? '-60px' : 'auto', bottom: i === 1 ? '-40px' : 'auto', right: i === 0 ? '-60px' : 'auto', left: i === 1 ? '30%' : 'auto', filter: 'blur(30px)', zIndex: 0 }}
                    />
                ))}
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ color: 'white', letterSpacing: -1 }}>Mission Control</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, mt: 0.5 }}>Manage execution pipelines and lifecycle states for all club directives.</Typography>
                    </Box>
                    <Button variant="contained" size="large" startIcon={<AddIcon />}
                        onClick={() => navigate('/coordinator/events/create')}
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', fontWeight: 800, backdropFilter: 'blur(20px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                        Synthesize New Event
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Events', value: isLoading ? '—' : stats.total, color: '#3b82f6' },
                    { label: 'Active Pipeline', value: isLoading ? '—' : stats.active, color: '#10b981' },
                    { label: 'Pending Auth', value: isLoading ? '—' : stats.pending, color: '#f59e0b' },
                    { label: 'Draft Stage', value: isLoading ? '—' : stats.draft, color: '#94a3b8' },
                ].map((s, i) => (
                    <Grid item xs={6} sm={3} key={s.label}>
                        <Box component={motion.div} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.07 }}
                            sx={{ p: 2.5, borderRadius: '14px', textAlign: 'center', background: `linear-gradient(135deg, ${s.color}15, ${s.color}05)`, border: `2px solid ${s.color}25` }}>
                            <Typography variant="h3" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>{s.label}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" placeholder="Scan by event signature..." value={search} onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
                    disabled={isLoading}
                    sx={{ flex: 1, minWidth: 200 }} />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['all', 'draft', 'pending', 'approved', 'rejected', 'registration_open', 'completed'].map(f => (
                        <Chip key={f} label={statusConfig[f]?.label || 'All Nodes'} onClick={() => setFilterStatus(f)} size="small"
                            disabled={isLoading}
                            sx={{ fontWeight: 700, cursor: isLoading ? 'default' : 'pointer', bgcolor: filterStatus === f ? '#3b82f6' : 'transparent', color: filterStatus === f ? 'white' : 'text.secondary', border: `1px solid ${filterStatus === f ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, opacity: isLoading ? 0.7 : 1 }} />
                    ))}
                </Box>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} disabled={isLoading}
                    sx={{ '& .MuiToggleButton-root': { border: '1px solid rgba(255,255,255,0.1)', color: 'text.secondary', '&.Mui-selected': { bgcolor: '#3b82f620', color: '#60a5fa', borderColor: '#3b82f640' } } }}>
                    <ToggleButton value="cards"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
                    <ToggleButton value="table"><TableRows sx={{ fontSize: 18 }} /></ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <AnimatePresence>
                {isLoading ? (
                    <Box key="loading" sx={{ py: 8, textAlign: 'center' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                            <EventIcon sx={{ fontSize: 48, color: '#10b981' }} />
                        </motion.div>
                        <Typography color="text.secondary" fontWeight={700} sx={{ mt: 2 }}>Loading your events...</Typography>
                    </Box>
                ) : isCoordinatorClubMissing ? (
                    <Box key="no-club" sx={{ py: 10, textAlign: 'center', opacity: 0.7 }}>
                        <EventIcon sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h6" fontWeight={700}>No coordinator club found</Typography>
                        <Typography color="text.secondary">This account is not linked to a club yet, so events cannot be loaded.</Typography>
                    </Box>
                ) : viewMode === 'cards' ? (
                    <Box key="cards">
                        {filtered.length === 0 ? (
                            <Box sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
                                <EventIcon sx={{ fontSize: 64, mb: 2 }} />
                                <Typography variant="h6" fontWeight={700}>No events yet</Typography>
                                <Typography color="text.secondary">Create your first event to start planning registrations and attendance.</Typography>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/coordinator/events/create')} sx={{ mt: 3, fontWeight: 700 }}>
                                    Create Event
                                </Button>
                            </Box>
                        ) : (
                            <Grid container spacing={2.5}>
                                {filtered.map((event, i) => (
                                    <Grid item xs={12} sm={6} md={4} key={event.id}>
                                        <EventCard event={event} onDelete={handleDelete} onSubmit={handleSubmit} navigate={navigate} index={i} />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                ) : (
                    <Box key="table">
                        <Suspense fallback={<LoadingDots label="Loading table view..." minHeight="160px" />}>
                            <EventsTable
                                rows={filtered}
                                isLoading={isLoading}
                                statusConfig={statusConfig}
                                navigate={navigate}
                                onSubmit={handleSubmit}
                                onDelete={handleDelete}
                            />
                        </Suspense>
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default MyEvents;
