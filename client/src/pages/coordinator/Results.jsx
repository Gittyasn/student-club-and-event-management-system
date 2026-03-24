import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Chip, Stack
} from '@mui/material';
import { Lock as LockIcon, LockOpen as UnlockIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { useEventResults, useLockResults, useUpdateResults } from '../../hooks/useResults';
import { useEventById } from '../../hooks/useEventById';
import RolePageHeader from '../../components/RolePageHeader';

const CoordinatorResults = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEventById(eventId);
  const { data: results, isLoading: resultsLoading } = useEventResults(eventId);
  const lockMutation = useLockResults(eventId);
  const updateMutation = useUpdateResults(eventId);
  const [editableResults, setEditableResults] = useState([]);

  if (eventLoading || resultsLoading) return <CircularProgress sx={{ display: 'block', m: '50px auto' }} />;

  const handleToggleLock = () => {
    lockMutation.mutate(!event.results_locked);
  };

  const handleEditField = (idx, field, value) => {
    const copy = [...(editableResults.length ? editableResults : results)];
    copy[idx] = { ...copy[idx], [field]: value };
    setEditableResults(copy);
  };

  const handleSave = () => {
    const toUpdate = (editableResults.length ? editableResults : results).map(r => ({ id: r.id, score: r.score, remarks: r.remarks, prize: r.prize }));
    updateMutation.mutate(toUpdate, {
      onSuccess: () => setEditableResults([])
    });
  };

  return (
    <Box sx={{ pb: 6 }}>
      <RolePageHeader
        kicker="Coordinator Suite"
        title="Results Management"
        subtitle="Lock, update, and publish competition outcomes."
      />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <TrophyIcon sx={{ fontSize: 28, color: 'warning.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Results: {event?.title}</Typography>
              <Chip
                icon={event?.results_locked ? <LockIcon /> : <UnlockIcon />}
                label={event?.results_locked ? 'Locked — No edits' : 'Unlocked — Editable'}
                color={event?.results_locked ? 'default' : 'primary'}
                size="small"
                variant="outlined"
              />
            </Box>
          </Stack>
        </Box>
        <Box>
          <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mr: 2 }}>Back</Button>
          <Button variant="contained" color={event?.results_locked ? 'secondary' : 'primary'} onClick={handleToggleLock} disabled={lockMutation.isPending}>
            {event?.results_locked ? 'Unlock Results' : 'Lock Results'}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Position</TableCell>
              <TableCell>Participant</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell>Prize</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(results || []).map((r, idx) => {
              const displayData = editableResults[idx] || r;
              return (
              <TableRow key={r.id}>
                <TableCell>
                  <Chip label={`#${r.position}`} variant="outlined" size="small" color={r.position === 1 ? 'warning' : r.position === 2 ? 'info' : 'default'} />
                </TableCell>
                <TableCell>{r.team?.team_name || r.profiles?.full_name || 'Unknown'}</TableCell>
                <TableCell align="right">
                  {event?.results_locked ? displayData.score : (
                    <TextField size="small" type="number" value={displayData.score || ''} onChange={(e) => handleEditField(idx, 'score', parseFloat(e.target.value) || e.target.value)} />
                  )}
                </TableCell>
                <TableCell>
                  {event?.results_locked ? (displayData.prize ? <Chip label={displayData.prize} size="small" color="primary" variant="outlined" /> : '—') : (
                    <TextField size="small" value={displayData.prize || ''} onChange={(e) => handleEditField(idx, 'prize', e.target.value)} />
                  )}
                </TableCell>
                <TableCell>
                  {event?.results_locked ? displayData.remarks || '—' : (
                    <TextField size="small" fullWidth multiline rows={2} value={displayData.remarks || ''} onChange={(e) => handleEditField(idx, 'remarks', e.target.value)} />
                  )}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </TableContainer>

      {!event?.results_locked && (
        <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => setEditableResults([])}>Reset Changes</Button>
          <Button variant="contained" color="success" onClick={handleSave} disabled={editableResults.length === 0 || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Edits'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CoordinatorResults;
