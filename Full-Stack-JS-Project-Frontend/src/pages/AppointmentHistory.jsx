import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import '../App.css';

const AppointmentHistory = () => {
    const [appointments, setAppointments] = useState([]);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingAppointmentId, setEditingAppointmentId] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchName, setSearchName] = useState('');

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const token = localStorage.getItem('jwt-token');
                if (!token) {
                    setError('You must be logged in to view your appointment history.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:5000/users/appointments/history', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    params: {
                        statusFilter,
                        searchName,
                    },
                });
                setAppointments(response.data.appointments);
                setRole(response.data.role);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching appointments:', err);
                setError(err.response?.data?.message || 'Server error');
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [statusFilter, searchName]);

    const handleDeleteAppointment = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            await axios.delete(
                `http://localhost:5000/users/appointments/${selectedAppointmentId}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            setAppointments((prevAppointments) =>
                prevAppointments.filter((appointment) => appointment._id !== selectedAppointmentId)
            );
            setShowModal(false);
            toast.success('Appointment deleted successfully!', { position: 'top-right', autoClose: 3000 });
        } catch (err) {
            console.error('Error deleting appointment:', err);
            toast.error(err.response?.data?.message || 'Error deleting appointment', { position: 'top-right', autoClose: 5000 });
        }
    };

    const openDeleteModal = (appointmentId) => {
        setSelectedAppointmentId(appointmentId);
        setShowModal(true);
    };

    const handleStatusChange = async (appointmentId) => {
        try {
            const token = localStorage.getItem('jwt-token');
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
            toast.success('Status updated successfully!', { position: 'top-right', autoClose: 3000 });
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Error updating status', { position: 'top-right', autoClose: 5000 });
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="appointment-history-container">
            <h2>Appointment History</h2>

            {/* Filter Controls with Blue Outline */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '5px',
                        border: '2px solid #007BFF', // Blue outline
                        outline: 'none',
                    }}
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                </select>
                <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder={role === 'psychiatrist' ? 'Search by student name' : role === 'student' ? 'Search by psychiatrist name' : 'Search by name...'}
                    style={{
                        padding: '8px',
                        borderRadius: '5px',
                        border: '2px solid #007BFF', // Blue outline
                        outline: 'none',
                        width: '200px',
                    }}
                />
            </div>

            {appointments.length === 0 ? (
                <p className="no-appointments">No appointments found.</p>
            ) : (
                <div className="appointments-list">
                    {appointments.map((appointment) => (
                        <div key={appointment._id} className="appointment-card">
                            {role === 'student' && (
                                <button
                                    className="delete-icon"
                                    onClick={() => openDeleteModal(appointment._id)}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                            <div className="appointment-details">
                                <p>
                                    <span className="label">Date:</span>{' '}
                                    {new Date(appointment.date).toLocaleDateString()}
                                </p>
                                <p>
                                    <span className="label">Time:</span>{' '}
                                    {appointment.startTime} - {appointment.endTime}
                                </p>
                                {role === 'student' ? (
                                    <>
                                        <p>
                                            <span className="label">Psychiatrist:</span>{' '}
                                            {appointment.psychiatrist?.username || 'Not specified'} (
                                            {appointment.psychiatrist?.email || 'Not specified'})
                                        </p>
                                        <p>
                                            <span className="label">Status:</span>{' '}
                                            {appointment.status || 'Not specified'}
                                        </p>
                                    </>
                                ) : role === 'psychiatrist' ? (
                                    <>
                                        <p>
                                            <span className="label">Student:</span>{' '}
                                            {appointment.student?.username || 'Not specified'} (
                                            {appointment.student?.email || 'Not specified'})
                                        </p>
                                        <div className="status-section">
                                            <span className="label">Status:</span>{' '}
                                            {editingAppointmentId === appointment._id ? (
                                                <div className="edit-status">
                                                    <select
                                                        value={newStatus}
                                                        onChange={(e) => setNewStatus(e.target.value)}
                                                    >
                                                        <option value="">Select a status</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="canceled">Canceled</option>
                                                    </select>
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => handleStatusChange(appointment._id)}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => setEditingAppointmentId(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`status ${appointment.status}`}>
                                                        {appointment.status || 'Not specified'}
                                                    </span>
                                                    <Button
                                                        variant="info"
                                                        onClick={() => {
                                                            setEditingAppointmentId(appointment._id);
                                                            setNewStatus(appointment.status || '');
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete this appointment?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAppointment}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AppointmentHistory;