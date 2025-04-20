import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, InputLabel, FormControl, IconButton, InputBase,
  Tooltip, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material';
import Header from '../../components/Header';
import { tokens } from '../../theme';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const Appointment = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [openStatsModal, setOpenStatsModal] = useState(false);
  const statsRef = useRef(null);

  const token = localStorage.getItem('jwt-token');

  useEffect(() => {
    const fetchAllAppointments = async () => {
      try {
        const response = await axios.get('http://localhost:5000/users/allappoint', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const appointmentsWithIds = response.data.appointments.map(appointment => ({
          id: appointment._id,
          ...appointment,
          studentUsername: appointment.student?.username || 'N/A',
          studentEmail: appointment.student?.email || 'N/A',
          psychiatristUsername: appointment.psychiatrist?.username || 'N/A',
          psychiatristEmail: appointment.psychiatrist?.email || 'N/A',
        }));
        setAppointments(appointmentsWithIds);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(err.response?.data?.message || 'Server error');
        setLoading(false);
      }
    };
    fetchAllAppointments();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const filtered = appointments
        .filter((appointment) => {
          return (
            (statusFilter === 'all' || appointment.status === statusFilter.toLowerCase()) &&
            (appointment.studentUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
              appointment.psychiatristUsername.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (dateFilter === 'all' ||
              (dateFilter === 'recent' && new Date(appointment.date) >= new Date()) ||
              (dateFilter === 'oldest' && new Date(appointment.date) < new Date()))
          );
        })
        .sort((a, b) => (dateFilter === 'recent' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));
      setFilteredAppointments(filtered);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  const handleDeleteAppointment = async () => {
    try {
      await axios.delete(`http://localhost:5000/users/appointments/${appointmentToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAppointments((prev) => prev.filter((a) => a.id !== appointmentToDelete));
      setOpenDeleteConfirmModal(false);
      toast.success('Appointment deleted successfully!');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete appointment.');
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    if (!newStatus) return;

    try {
      await axios.put(
        `http://localhost:5000/users/appointments/${appointmentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
      setEditingAppointmentId(null);
      toast.success('Status updated!');
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleOpenDeleteConfirm = (appointmentId) => {
    setAppointmentToDelete(appointmentId);
    setOpenDeleteConfirmModal(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirmModal(false);
    setAppointmentToDelete(null);
  };

  const handleOpenStatsModal = () => {
    setOpenStatsModal(true);
  };

  const handleCloseStatsModal = () => {
    setOpenStatsModal(false);
  };

  const calculateStatistics = () => {
    const total = appointments.length;
    const byStatus = {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      canceled: appointments.filter(a => a.status === 'canceled').length,
    };
    return { total, byStatus };
  };

  const columns = [
    { field: 'id', headerName: 'ID', flex: 1 },
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'time',
      headerName: 'Time',
      flex: 1,
      renderCell: (params) => `${params.row.startTime} - ${params.row.endTime}`,
    },
    {
      field: 'student',
      headerName: 'Student',
      flex: 1.5,
      renderCell: (params) => `${params.row.studentUsername} (${params.row.studentEmail})`,
    },
    {
      field: 'psychiatrist',
      headerName: 'Psychiatrist',
      flex: 1.5,
      renderCell: (params) => `${params.row.psychiatristUsername} (${params.row.psychiatristEmail})`,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        editingAppointmentId === params.row.id ? (
          <Select
            value={params.row.status || ''}
            onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
            size="small"
            sx={{
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
              borderRadius: '4px',
              height: '40px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#616161' : '#ccc' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#888' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#3f51b5',
                boxShadow: theme.palette.mode === 'dark' ? '0 0 8px #4caf50' : 'none',
              },
              '& .MuiSvgIcon-root': { color: theme.palette.mode === 'dark' ? '#fff' : '#000' },
            }}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
        ) : (
          <Typography
            sx={{
              fontSize: '1rem',
              padding: '6px 12px',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
            }}
          >
            {params.value || 'Unknown'}
          </Typography>
        )
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Change Status">
            <IconButton
              color="warning"
              onClick={() => {
                setEditingAppointmentId(params.row.id);
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Appointment">
            <IconButton
              color="error"
              onClick={() => handleOpenDeleteConfirm(params.row.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (loading)
    return (
      <Typography sx={{ textAlign: 'center', color: theme.palette.mode === 'dark' ? '#fff' : '#000', m: '20px' }}>
        Loading...
      </Typography>
    );
  if (error)
    return (
      <Typography sx={{ textAlign: 'center', color: '#f44336', m: '20px' }}>
        {error}
      </Typography>
    );

  const stats = calculateStatistics();

  // Data for Pie Chart (Distribution by Status)
  const pieData = {
    labels: ['Pending', 'Confirmed', 'Completed', 'Canceled'],
    datasets: [
      {
        label: 'Appointments by Status',
        data: [
          stats.byStatus?.pending || 0,
          stats.byStatus?.confirmed || 0,
          stats.byStatus?.completed || 0,
          stats.byStatus?.canceled || 0,
        ],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
        hoverOffset: 4,
      },
    ],
  };

  // Data for Bar Chart (Total and by Status)
  const barData = {
    labels: ['Total', 'Pending', 'Confirmed', 'Completed', 'Canceled'],
    datasets: [
      {
        label: 'Number of Appointments',
        data: [
          stats.total,
          stats.byStatus?.pending || 0,
          stats.byStatus?.confirmed || 0,
          stats.byStatus?.completed || 0,
          stats.byStatus?.canceled || 0,
        ],
        backgroundColor: [
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
        },
      },
      title: {
        display: true,
        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <Box m="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
        <Header title="APPOINTMENT MANAGEMENT" subtitle="List of Appointments" />
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box 
          display="flex" 
          backgroundColor={theme.palette.mode === 'dark' ? '#424242' : '#f5f5f5'} 
          borderRadius="3px" 
          p={1} 
          width="100%" 
          maxWidth="500px"
        >
          <InputBase
            sx={{ 
              ml: 2, 
              flex: 1, 
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              '&::placeholder': {
                color: theme.palette.mode === 'dark' ? '#bbb' : '#666',
              },
            }}
            placeholder="Search by Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton type="button" sx={{ p: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>
            <SearchIcon />
          </IconButton>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel 
            sx={{ 
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              '&.Mui-focused': { color: theme.palette.mode === 'dark' ? '#4caf50' : '#3f51b5' },
            }}
          >
            Filter by Status
          </InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              borderRadius: '8px',
              height: '48px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#616161' : '#ccc' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#888' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#3f51b5',
                boxShadow: theme.palette.mode === 'dark' ? '0 0 8px #4caf50' : 'none',
              },
              '& .MuiSvgIcon-root': { color: theme.palette.mode === 'dark' ? '#fff' : '#000' },
              '& .MuiSelect-select': { padding: '12px' },
            }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel 
            sx={{ 
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              '&.Mui-focused': { color: theme.palette.mode === 'dark' ? '#4caf50' : '#3f51b5' },
            }}
          >
            Filter by Date
          </InputLabel>
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{
              backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              borderRadius: '8px',
              height: '48px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#616161' : '#ccc' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#888' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                borderColor: theme.palette.mode === 'dark' ? '#4caf50' : '#3f51b5',
                boxShadow: theme.palette.mode === 'dark' ? '0 0 8px #4caf50' : 'none',
              },
              '& .MuiSvgIcon-root': { color: theme.palette.mode === 'dark' ? '#fff' : '#000' },
              '& .MuiSelect-select': { padding: '12px' },
            }}
          >
            <MenuItem value="all">All Dates</MenuItem>
            <MenuItem value="recent">Most Recent</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleOpenStatsModal}
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? '#66CDAA' : '#66CDAA',
            color: '#fff',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#66CDAA' : '#66CDAA',
            },
          }}
        >
          View Statistics
        </Button>
      </Box>

      <Box sx={{ height: 500, width: '100%', minWidth: '1200px' }}>
        <DataGrid 
          checkboxSelection 
          rows={filteredAppointments} 
          columns={columns} 
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.mode === 'dark' ? '#1f2a44' : '#f5f5f5',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
            },
            '& .MuiDataGrid-cell': {
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: theme.palette.mode === 'dark' ? '#1f2a44' : '#f5f5f5',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
            },
          }}
        />
      </Box>

      <Dialog
        open={openDeleteConfirmModal}
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            fontSize: '1.2rem', 
            fontWeight: '500',
            color: theme.palette.mode === 'dark' ? '#fff' : '#000',
          }}
        >
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography 
            sx={{ 
              fontSize: '1rem',
              color: theme.palette.mode === 'dark' ? '#fff' : '#000',
            }}
          >
            Are you sure you want to delete this appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDeleteConfirm} 
            sx={{ color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAppointment} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openStatsModal}
        onClose={handleCloseStatsModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            fontSize: '1.2rem', 
            fontWeight: '500',
            color: theme.palette.mode === 'dark' ? '#fff' : '#000',
          }}
        >
          Appointment Statistics
        </DialogTitle>
        <DialogContent>
          <Box ref={statsRef} sx={{ p: 2 }}>
            <Typography 
              sx={{ 
                fontSize: '1.1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                mb: 2
              }}
            >
              Total Appointments: {stats.total}
            </Typography>
            <Divider sx={{ mb: 2, backgroundColor: theme.palette.mode === 'dark' ? '#616161' : '#ccc' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ width: '45%', height: '300px' }}>
                <Typography 
                  sx={{ 
                    fontSize: '1rem',
                    color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    mb: 1
                  }}
                >
                  Distribution by Status (Pie Chart)
                </Typography>
                <Pie 
                  data={pieData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Appointments by Status',
                        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      },
                    },
                  }} 
                />
              </Box>
              <Box sx={{ width: '45%', height: '300px' }}>
                <Typography 
                  sx={{ 
                    fontSize: '1rem',
                    color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    mb: 1
                  }}
                >
                  Appointment Counts (Bar Chart)
                </Typography>
                <Bar 
                  data={barData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        display: true,
                        text: 'Appointment Counts',
                        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        },
                        grid: {
                          color: theme.palette.mode === 'dark' ? '#616161' : '#ccc',
                        },
                      },
                      x: {
                        ticks: {
                          color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        },
                        grid: {
                          color: theme.palette.mode === 'dark' ? '#616161' : '#ccc',
                        },
                      },
                    },
                  }} 
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 2, backgroundColor: theme.palette.mode === 'dark' ? '#616161' : '#ccc' }} />
            <Typography 
              sx={{ 
                fontSize: '1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                mb: 1
              }}
            >
              Pending: {stats.byStatus?.pending || 0}
            </Typography>
            <Typography 
              sx={{ 
                fontSize: '1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                mb: 1
              }}
            >
              Confirmed: {stats.byStatus?.confirmed || 0}
            </Typography>
            <Typography 
              sx={{ 
                fontSize: '1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                mb: 1
              }}
            >
              Completed: {stats.byStatus?.completed || 0}
            </Typography>
            <Typography 
              sx={{ 
                fontSize: '1rem',
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                mb: 1
              }}
            >
              Canceled: {stats.byStatus?.canceled || 0}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseStatsModal} 
            sx={{ color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default Appointment;