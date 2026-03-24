import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Button,
    // eslint-disable-next-line no-unused-vars
    IconButton,
    InputAdornment,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    // eslint-disable-next-line no-unused-vars
    CircularProgress,
    Chip,
    Stack
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

const fetchCategories = async () => {
    const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
};

const AdminEventCategories = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const { data: categories, isLoading } = useQuery({
        queryKey: ['eventCategories', 'admin'],
        queryFn: fetchCategories
    });

    const createMutation = useMutation({
        mutationFn: async (newData) => {
            const { error } = await supabase.from('event_categories').insert([newData]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['eventCategories']);
            toast.success('Category established.');
            setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message)
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { error } = await supabase.from('event_categories').update(updates).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['eventCategories']);
            toast.success('Category re-calibrated.');
            setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('event_categories').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['eventCategories']);
            toast.success('Category eradicated.');
        },
        // eslint-disable-next-line no-unused-vars
        onError: (err) => toast.error("Failed to delete. This category might be bound to existing events.")
    });

    const handleOpenDialog = (cat = null) => {
        if (cat) {
            setEditingCategory(cat.id);
            setFormData({ name: cat.name, description: cat.description || '' });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', description: '' });
        }
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return toast.error('Taxonomy name is structural and cannot be empty.');
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory, updates: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        { field: 'name', headerName: 'Taxonomy Designation', flex: 1, renderCell: p => <Typography fontWeight={800}>{p.value}</Typography> },
        { field: 'description', headerName: 'Structural Description', flex: 2, renderCell: p => <Typography variant="body2" color="text.secondary">{p.value || 'No description matrix'}</Typography> },
        {
            field: 'events_count',
            headerName: 'Utilization',
            width: 120,
            renderCell: () => <Chip label="Tracking..." size="small" variant="outlined" sx={{ borderStyle: 'dashed' }} /> // Simplified for MVP
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Overrides',
            width: 120,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<EditIcon color="primary" />}
                    label="Edit"
                    onClick={() => handleOpenDialog(params.row)}
                    key="edit"
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon color="error" />}
                    label="Delete"
                    onClick={() => window.confirm('Eradicate this category?') && deleteMutation.mutate(params.id)}
                    key="delete"
                />
            ]
        }
    ];

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{
                mb: 4, p: 4, borderRadius: '20px',
                background: 'linear-gradient(135deg, #38bdf820 0%, #a855f715 100%)',
                border: '1px solid #38bdf830',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3
            }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1.5 }}>
                        Event Taxonomy Core
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                        Manage global structural templates for standardizing campus events.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 900, px: 3, '&:hover': { bgcolor: '#0284c7' } }}
                >
                    Synthesize Category
                </Button>
            </Box>

            <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Scan taxonomy registers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: '12px', bgcolor: 'background.default' }
                    }}
                />
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', height: 600 }}>
                <DataGrid
                    rows={filtered}
                    columns={columns}
                    loading={isLoading}
                    disableRowSelectionOnClick
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Paper>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CategoryIcon color="primary" /> {editingCategory ? 'Recalibrate Category' : 'Inject New Category'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Taxonomy Designation"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            variant="filled"
                            InputProps={{ sx: { borderRadius: '8px' } }}
                        />
                        <TextField
                            fullWidth
                            label="Structural Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            variant="filled"
                            multiline
                            rows={3}
                            InputProps={{ sx: { borderRadius: '8px' } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        sx={{ fontWeight: 800, borderRadius: '8px', px: 3, boxShadow: 'none' }}
                    >
                        {createMutation.isPending || updateMutation.isPending ? 'Committing...' : 'Commit Protocol'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminEventCategories;
