import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, useTheme, Button } from '@mui/material';
import { Modal as BootstrapModal } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import VisibilityIcon from '@mui/icons-material/Visibility';

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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const appointmentsPerPage = 5;

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
                toast.error('You must be logged in to delete appointments.', {
                    position: 'top-right',
                    autoClose: 5000,
                });
                return;
            }

            await axios.delete(`http://localhost:5000/users/appointments/${selectedAppointmentId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            setAppointments((prevAppointments) =>
                prevAppointments.filter((appointment) => appointment._id !== selectedAppointmentId)
            );
            setShowModal(false);
            toast.success('Appointment deleted successfully!', {
                position: 'top-right',
                autoClose: 3000,
            });
        } catch (err) {
            console.error('Error deleting appointment:', err);
            toast.error(err.response?.data?.message || 'Failed to delete appointment.', {
                position: 'top-right',
                autoClose: 5000,
            });
        }
    };

    const openDeleteModal = (appointmentId) => {
        setSelectedAppointmentId(appointmentId);
        setShowModal(true);
    };

    const handleStatusChange = async (appointmentId) => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) {
                toast.error('You must be logged in to update status.', {
                    position: 'top-right',
                    autoClose: 5000,
                });
                return;
            }

            await axios.put(
                `http://localhost:5000/users/appointments/${appointmentId}/status`,
                { status: newStatus },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment._id === appointmentId ? { ...appointment, status: newStatus } : appointment
                )
            );
            setEditingAppointmentId(null);
            toast.success('Status updated successfully!', {
                position: 'top-right',
                autoClose: 3000,
            });
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status.', {
                position: 'top-right',
                autoClose: 5000,
            });
        }
    };

    // Pagination logic
    const indexOfLastAppointment = currentPage * appointmentsPerPage;
    const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
    const currentAppointments = appointments.slice(indexOfFirstAppointment, indexOfLastAppointment);
    const totalPages = Math.ceil(appointments.length / appointmentsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <Typography sx={{ textAlign: 'center', color: colors.grey[100], m: '20px' }}>Loading...</Typography>;
    if (error) return <Typography sx={{ textAlign: 'center', color: colors.redAccent[500], m: '20px' }}>{error}</Typography>;

    return (
        <Box display="flex" flexDirection="column" height="100vh">
            <Header title="APPOINTMENT MANAGEMENT" subtitle="List of Appointments" />
            <Box
                mt={4}
                mb={4} // Add margin to avoid overlap with pagination
                sx={{
                    flex: 1,
                    overflowY: 'auto', // Scrollable appointment list
                    pr: 2, // Padding for scrollbar
                }}
            >
                {currentAppointments.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: colors.grey[100], m: '20px' }}>
                        No appointments found.
                    </Typography>
                ) : (
                    currentAppointments.map((appointment) => (
                        <Box
                            key={appointment._id}
                            bgcolor="#141B2D" // Dark background matching the image
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
                                        <strong>STUDENT:</strong> {appointment.student?.username || 'Not specified'} (
                                        {appointment.student?.email || 'Not specified'})
                                    </Typography>
                                    <Typography variant="h5" color={colors.grey[100]} mt={1}>
                                        <strong>PSYCHIATRIST:</strong> {appointment.psychiatrist?.username || 'Not specified'} (
                                        {appointment.psychiatrist?.email || 'Not specified'})
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6" color={colors.grey[100]} mr={2}>
                                        <strong>STATUS:</strong>{' '}
                                        {editingAppointmentId === appointment._id ? (
                                            <Box display="flex" gap={1} alignItems="center">
                                                <select
                                                    value={newStatus}
                                                    onChange={(e) => setNewStatus(e.target.value)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: '4px',
                                                        border: 'none',
                                                        backgroundColor: colors.grey[700],
                                                        color: colors.grey[100],
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    <option value="">Select a status</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="canceled">Canceled</option>
                                                </select>
                                                <Button
                                                    variant="contained"
                                                    sx={{
                                                        bgcolor: '#1976d2', // Blue color for Save
                                                        color: '#fff',
                                                        fontSize: '12px',
                                                        padding: '5px 10px',
                                                    }}
                                                    onClick={() => handleStatusChange(appointment._id)}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    sx={{
                                                        bgcolor: colors.grey[700],
                                                        color: colors.grey[100],
                                                        fontSize: '12px',
                                                        padding: '5px 10px',
                                                    }}
                                                    onClick={() => setEditingAppointmentId(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </Box>
                                        ) : (
                                            <>
                                                <span
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        backgroundColor:
                                                            appointment.status === 'pending' ? '#FFC107' : // Yellow
                                                            appointment.status === 'confirmed' ? '#28A745' : // Green
                                                            appointment.status === 'completed' ? '#17A2B8' : // Cyan
                                                            appointment.status === 'canceled' ? '#DC3545' : '#666', // Red
                                                        marginRight: '10px',
                                                    }}
                                                >
                                                    {appointment.status || 'Not specified'}
                                                </span>
                                                <Button
                                                    variant="contained"
                                                    sx={{
                                                        bgcolor: '#1976d2', // Blue color for Edit
                                                        color: '#fff',
                                                        fontSize: '12px',
                                                        padding: '5px 10px',
                                                    }}
                                                    startIcon={<VisibilityIcon />}
                                                    onClick={() => {
                                                        setEditingAppointmentId(appointment._id);
                                                        setNewStatus(appointment.status || '');
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            </>
                                        )}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        sx={{
                                            bgcolor: '#DC3545', // Red color for Delete
                                            color: '#fff',
                                            fontSize: '12px',
                                            padding: '5px 10px',
                                        }}
                                        onClick={() => openDeleteModal(appointment._id)}
                                    >
                                        Delete
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* Fixed Pagination */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: '200px', // Adjust based on sidebar width
                    right: 0,
                    bgcolor: '#141B2D', // Match the background of the content
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 1,
                    boxShadow: '0 -2px 5px rgba(0, 0, 0, 0.2)',
                }}
            >
                <Button
                    variant="contained"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    sx={{
                        bgcolor: colors.grey[700],
                        color: colors.grey[100],
                        fontSize: '12px',
                        padding: '5px 10px',
                        textTransform: 'uppercase',
                    }}
                >
                    Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                        key={i + 1}
                        variant={currentPage === i + 1 ? 'contained' : 'outlined'}
                        onClick={() => paginate(i + 1)}
                        sx={{
                            bgcolor: currentPage === i + 1 ? '#1976d2' : colors.grey[800],
                            color: currentPage === i + 1 ? '#fff' : colors.grey[100],
                            borderColor: colors.grey[700],
                            fontSize: '12px',
                            padding: '5px 10px',
                            minWidth: '40px',
                        }}
                    >
                        {i + 1}
                    </Button>
                ))}
                <Button
                    variant="contained"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    sx={{
                        bgcolor: colors.grey[700],
                        color: colors.grey[100],
                        fontSize: '12px',
                        padding: '5px 10px',
                        textTransform: 'uppercase',
                    }}
                >
                    Next
                </Button>
            </Box>

            {/* Delete Confirmation Modal */}
            <BootstrapModal show={showModal} onHide={() => setShowModal(false)}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: '#1C2526',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '60%',
                        maxHeight: '80%',
                        overflowY: 'auto',
                    }}
                >
                    <Typography variant="h5" mb={2} color={colors.grey[100]}>
                        Confirm Deletion
                    </Typography>
                    <Typography variant="body1" color={colors.grey[100]}>
                        Are you sure you want to delete this appointment?
                    </Typography>
                    <Box display="flex" justifyContent="center" gap={2} mt={2}>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: colors.grey[700], color: colors.grey[100] }}
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: '#DC3545', color: '#fff' }}
                            onClick={handleDeleteAppointment}
                        >
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