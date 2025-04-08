import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, useTheme, Button, MenuItem, Select, InputLabel, FormControl, TextField } from '@mui/material';
import { Modal as BootstrapModal } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

const Appointment = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 5;

  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchAllAppointments = async () => {
      try {
        const response = await axios.get('http://localhost:5000/users/allappoint');
        setAppointments(response.data.appointments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(err.response?.data?.message || 'Server error');
        setLoading(false);
      }
    };
    fetchAllAppointments();
  }, []);

  const handleDeleteAppointment = async () => {
    try {
      const token = localStorage.getItem('jwt-token');
      if (!token) {
        toast.error('You must be logged in to delete appointments.');
        return;
      }

      await axios.delete(`http://localhost:5000/users/appointments/${selectedAppointmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setAppointments((prev) => prev.filter((a) => a._id !== selectedAppointmentId));
      setShowModal(false);
      toast.success('Appointment deleted successfully!');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete appointment.');
    }
  };

  const handleStatusChange = async (appointmentId) => {
    try {
      const token = localStorage.getItem('jwt-token');
      if (!token) {
        toast.error('You must be logged in to update status.');
        return;
      }

      await axios.put(
        `http://localhost:5000/users/appointments/${appointmentId}/status`,
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setAppointments((prev) =>
        prev.map((a) => (a._id === appointmentId ? { ...a, status: newStatus } : a))
      );
      setEditingAppointmentId(null);
      toast.success('Status updated!');
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const openDeleteModal = (id) => {
    setSelectedAppointmentId(id);
    setShowModal(true);
  };

  // Pagination logic
  const filteredAppointments = appointments
    .filter((appointment) => {
      return (
        (statusFilter === 'All' || appointment.status === statusFilter.toLowerCase()) &&
        (appointment.student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.psychiatrist.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (dateFilter === 'all' ||
          (dateFilter === 'recent' && new Date(appointment.date) >= new Date()) ||
          (dateFilter === 'oldest' && new Date(appointment.date) < new Date()))
      );
    })
    .sort((a, b) => (dateFilter === 'recent' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));

  const indexOfLast = currentPage * appointmentsPerPage;
  const indexOfFirst = indexOfLast - appointmentsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  const paginate = (page) => setCurrentPage(page);

  if (loading)
    return <Typography sx={{ textAlign: 'center', color: colors.grey[100], m: '20px' }}>Loading...</Typography>;
  if (error)
    return <Typography sx={{ textAlign: 'center', color: colors.redAccent[500], m: '20px' }}>{error}</Typography>;

  return (
    <Box display="flex" flexDirection="column" height="100vh">
      <Header title="APPOINTMENT MANAGEMENT" subtitle="List of Appointments" />

      <Box p={2}>
        <Box display="flex" gap={2}>
          <TextField
            label="Search by Name"
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ backgroundColor: colors.primary[400] }}
          />
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel sx={{ color: colors.grey[100] }}>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Filter by Status"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[400],
                '& .MuiSvgIcon-root': { color: colors.grey[100] },
              }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel sx={{ color: colors.grey[100] }}>Filter by Date</InputLabel>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              label="Filter by Date"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[400],
                '& .MuiSvgIcon-root': { color: colors.grey[100] },
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="recent">Most Recent</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box mt={2} flex={1} overflow="auto" pr={2}>
        {currentAppointments.length === 0 ? (
          <Typography textAlign="center" color={colors.grey[100]}>
            No appointments found.
          </Typography>
        ) : (
          currentAppointments.map((appointment) => (
            <Box
              key={appointment._id}
              bgcolor="#141B2D"
              p={2}
              borderRadius={2}
              mb={2}
              boxShadow={3}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h5" color={colors.grey[100]}>
                    <strong>DATE:</strong> {new Date(appointment.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="h5" color={colors.grey[100]} mt={1}>
                    <strong>TIME:</strong> {appointment.startTime} - {appointment.endTime}
                  </Typography>
                  <Typography variant="h5" color={colors.grey[100]} mt={1}>
                    <strong>STUDENT:</strong> {appointment.student?.username || 'N/A'} ({appointment.student?.email || 'N/A'})
                  </Typography>
                  <Typography variant="h5" color={colors.grey[100]} mt={1}>
                    <strong>PSYCHIATRIST:</strong> {appointment.psychiatrist?.username || 'N/A'} ({appointment.psychiatrist?.email || 'N/A'})
                  </Typography>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                  {editingAppointmentId === appointment._id ? (
                    <Box display="flex" gap={1}>
                      <Select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        size="small"
                        sx={{
                          backgroundColor: colors.primary[400],
                          color: colors.grey[100],
                        }}
                      >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="canceled">Canceled</MenuItem>
                      </Select>
                      <Button variant="contained" size="small" onClick={() => handleStatusChange(appointment._id)}>
                        Save
                      </Button>
                      <Button variant="contained" size="small" onClick={() => setEditingAppointmentId(null)}>
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Box display="flex" gap={1}>
                      <Typography
                        sx={{
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          backgroundColor:
                            appointment.status === 'pending'
                              ? '#FFC107'
                              : appointment.status === 'confirmed'
                              ? '#28A745'
                              : appointment.status === 'completed'
                              ? '#17A2B8'
                              : appointment.status === 'canceled'
                              ? '#DC3545'
                              : '#666',
                          color: '#fff',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {appointment.status || 'Unknown'}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingAppointmentId(appointment._id);
                          setNewStatus(appointment.status || '');
                        }}
                      >
                        Change Status
                      </Button>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => openDeleteModal(appointment._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Pagination */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '200px',
          right: 0,
          bgcolor: '#141B2D',
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </Button>
        {Array.from({ length: totalPages }, (_, i) => (
          <Button
            key={i}
            variant={currentPage === i + 1 ? 'contained' : 'outlined'}
            onClick={() => paginate(i + 1)}
          >
            {i + 1}
          </Button>
        ))}
        <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </Button>
      </Box>

      {/* Delete Modal */}
      <BootstrapModal show={showModal} onHide={() => setShowModal(false)} centered>
        <Box p={3} bgcolor="#1C2526" color={colors.grey[100]} borderRadius={2}>
          <Typography variant="h6" gutterBottom>Confirm Deletion</Typography>
          <Typography mb={2}>Are you sure you want to delete this appointment?</Typography>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteAppointment}>
              Delete
            </Button>
          </Box>
        </Box>
      </BootstrapModal>

      <ToastContainer />
    </Box>
  );
};

export default Appointment;