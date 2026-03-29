import { useState } from 'react';
import {
    Box, Typography, Paper, Button, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
    // eslint-disable-next-line no-unused-vars
    DialogContent, DialogActions, TextField, Chip,
    InputAdornment, Grid, useTheme
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    CategoryRounded as CategoryIcon, Search as SearchIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// eslint-disable-next-line no-unused-vars
import { toast } from 'sonner';
import {
    useClubCategories, useAddCategory, useUpdateCategory, useDeleteCategory
} from '../../hooks/useClubCategories';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingDots from '../../components/LoadingDots';

const categorySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
    description: z.string().max(200, 'Description too long').optional(),
});

const AdminClubCategories = () => {
    const theme = useTheme();
    const { data: categories = [], isLoading } = useClubCategories();
    const addCategory = useAddCategory();
    const updateCategory = useUpdateCategory();
    const deleteCategory = useDeleteCategory();

    const [openDialog, setOpenDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues: { name: '', description: '' }
    });

    const handleOpenDialog = (category = null) => {
        if (category) {
            setEditingCategory(category);
            reset({ name: category.name, description: category.description || '' });
        } else {
            setEditingCategory(null);
            reset({ name: '', description: '' });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingCategory(null);
        reset();
    };

    const onSubmit = async (data) => {
        try {
            if (editingCategory) {
                await updateCategory.mutateAsync({ id: editingCategory.id, updates: data });
            } else {
                await addCategory.mutateAsync(data);
            }
            handleCloseDialog();
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await deleteCategory.mutateAsync(deleteConfirm.id);
            setDeleteConfirm(null);
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            // Error handled by hook
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) return <LoadingDots minHeight="50vh" label="Loading club categories..." />;

    return (
        <Box sx={{ pb: 6 }}>
            {/* Header */}
            <Box sx={{
                mb: 4,
                p: { xs: 3, md: 4 },
                borderRadius: '24px',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
            }}>
                <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ p: 2, borderRadius: '20px', bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                        <CategoryIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: -1 }}>Club Categories</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            Define and manage structural classifications for clubs.
                        </Typography>
                    </Box>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        bgcolor: '#2563eb', color: 'white', fontWeight: 800, px: 3, py: 1.5, borderRadius: '12px',
                        '&:hover': { bgcolor: '#1d4ed8' }
                    }}
                >
                    New Category
                </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Categories', value: categories.length, color: '#3b82f6' },
                    { label: 'Visible Results', value: filteredCategories.length, color: '#10b981' },
                    { label: 'Search Active', value: searchQuery ? 'Yes' : 'No', color: '#f59e0b' },
                ].map((item) => (
                    <Grid item xs={12} sm={4} key={item.label}>
                        <Paper sx={{ p: 2.25, borderRadius: '18px', height: '100%' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                {item.label}
                            </Typography>
                            <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5, color: item.color }}>
                                {item.value}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Controls */}
            <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
                <TextField
                    placeholder="Search categories..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        width: 300,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.default', borderRadius: '10px',
                            color: 'text.primary',
                            '& fieldset': { borderColor: 'divider' }
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Data Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
                <Table>
                    <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Created</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <AnimatePresence>
                            {filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No categories found.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((category) => (
                                    <TableRow
                                        key={category.id}
                                        component={motion.tr}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                <Box sx={{ width: 10, height: 10, borderRadius: '999px', bgcolor: '#2563eb' }} />
                                                <Typography variant="body2" fontWeight={800} color="text.primary">{category.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {category.description || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(category.created_at).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <IconButton onClick={() => handleOpenDialog(category)} size="small" sx={{ color: '#60a5fa', bgcolor: 'rgba(96,165,250,0.1)' }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton onClick={() => setDeleteConfirm(category)} size="small" sx={{ color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} PaperProps={{ sx: { bgcolor: 'background.paper', backgroundImage: 'none', borderRadius: '20px', border: '1px solid', borderColor: 'divider', minWidth: 400 } }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {editingCategory ? 'Edit Category' : 'New Category'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Category Name"
                                        fullWidth
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        variant="outlined"
                                        InputProps={{ sx: { borderRadius: '12px' } }}
                                    />
                                )}
                            />
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Description"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                        variant="outlined"
                                        InputProps={{ sx: { borderRadius: '12px' } }}
                                    />
                                )}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 0 }}>
                        <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={addCategory.isPending || updateCategory.isPending}
                            sx={{ bgcolor: '#2563eb', color: 'white', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#1d4ed8' } }}
                        >
                            {addCategory.isPending || updateCategory.isPending ? 'Saving...' : 'Save Category'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider' } }}>
                <DialogTitle sx={{ color: '#ef4444', fontWeight: 800 }}>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete the category <strong>{deleteConfirm?.name}</strong>?
                        This will set the category to null for all associated clubs.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDeleteConfirm(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        disabled={deleteCategory.isPending}
                        sx={{ bgcolor: '#ef4444', color: 'white', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#dc2626' } }}
                    >
                        {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminClubCategories;
