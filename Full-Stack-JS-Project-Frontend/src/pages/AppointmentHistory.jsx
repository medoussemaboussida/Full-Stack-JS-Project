import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import 'react-toastify/dist/ReactToastify.css';
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
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [selectedPsychiatrist, setSelectedPsychiatrist] = useState(null);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchName, setSearchName] = useState('');
    const [userId, setUserId] = useState(null);
    const [dateSort, setDateSort] = useState('recent');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('jwt-token');
                if (!token) {
                    setError('You must be logged in to view your appointment history.');
                    setLoading(false);
                    return;
                }

                const appointmentResponse = await axios.get('http://localhost:5000/users/appointments/history', { 
                                       headers: { 'Authorization': `Bearer ${token}` },
                    params: { statusFilter, searchName },
                });
                let fetchedAppointments = appointmentResponse.data.appointments;

                fetchedAppointments.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateSort === 'recent' ? dateB - dateA : dateA - dateB;
                });

                setAppointments(fetchedAppointments);
                setRole(appointmentResponse.data.role);
                setUserId(appointmentResponse.data.userId);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.response?.data?.message || 'Server error');
                setLoading(false);
            }
        };

        fetchData();
    }, [statusFilter, searchName, dateSort]);

    const handleDeleteAppointment = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            await axios.delete(`http://localhost:5000/users/appointments/${selectedAppointmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            setAppointments((prevAppointments) =>
                prevAppointments.filter((appointment) => appointment._id !== selectedAppointmentId)
            );
            setShowModal(false);
            toast.success('Appointment successfully deleted!', { position: 'top-right', autoClose: 3000 });
        } catch (err) {
            console.error('Error deleting appointment:', err);
            toast.error(err.response?.data?.message || 'Failed to delete appointment', { position: 'top-right', autoClose: 5000 });
        }
    };

    const handleStatusChange = async (appointmentId) => {
        try {
            const token = localStorage.getItem('jwt-token');
            const response = await axios.put(
                `http://localhost:5000/users/appointments/${appointmentId}/status`,
                { status: newStatus },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment._id === appointmentId ? { ...appointment, status: newStatus } : appointment
                )
            );
            setEditingAppointmentId(null);
            toast.success('Appointment status updated successfully!', { position: 'top-right', autoClose: 3000 });
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status', { position: 'top-right', autoClose: 5000 });
        }
    };

    const openDeleteModal = (appointmentId) => {
        setSelectedAppointmentId(appointmentId);
        setShowModal(true);
    };

    const handleUpdateTime = async (appointment) => {
        try {
            const token = localStorage.getItem('jwt-token');
            const response = await axios.get(`http://localhost:5000/users/psychiatrists/${appointment.psychiatrist._id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const psychiatrist = response.data;
            setSelectedPsychiatrist(psychiatrist);
            setSelectedAppointmentId(appointment._id);
            const formattedEvents = formatAvailabilitiesToEvents(psychiatrist.availability);
            setCalendarEvents(formattedEvents);
            setShowCalendarModal(true);
        } catch (err) {
            console.error('Error fetching psychiatrist availability:', err);
            toast.error('Error fetching availability: ' + (err.response?.data?.message || err.message), {
                position: 'top-right',
                autoClose: 5000,
            });
        }
    };

    const formatAvailabilitiesToEvents = (availabilities) => {
        const eventsArray = [];
        availabilities.forEach((slot, slotIndex) => {
            let startDate;
            if (slot.date) {
                startDate = new Date(slot.date);
            } else {
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayIndex = daysOfWeek.indexOf(slot.day);
                if (dayIndex === -1) return;
                const currentDate = new Date();
                startDate = new Date(currentDate);
                const daysToAdd = (dayIndex - currentDate.getDay() + 7) % 7;
                startDate.setDate(currentDate.getDate() + daysToAdd);
            }

            const startHour = parseInt(slot.startTime.split(':')[0]);
            const startMinute = parseInt(slot.startTime.split(':')[1]);
            const endHour = parseInt(slot.endTime.split(':')[0]);
            const endMinute = parseInt(slot.endTime.split(':')[1]);

            const startTotalMinutes = startHour * 60 + startMinute;
            let endTotalMinutes = endHour * 60 + endMinute;

            if (endTotalMinutes <= startTotalMinutes) {
                endTotalMinutes += 24 * 60;
            }

            for (let time = startTotalMinutes; time < endTotalMinutes; time += 30) {
                const slotStartHour = Math.floor(time / 60);
                const slotStartMinute = time % 60;
                const slotEndHour = Math.floor((time + 30) / 60);
                const slotEndMinute = (time + 30) % 60;

                const eventStart = new Date(startDate);
                eventStart.setHours(slotStartHour % 24, slotStartMinute, 0, 0);

                const eventEnd = new Date(startDate);
                eventEnd.setHours(slotEndHour % 24, slotEndMinute, 0, 0);

                if (slotEndHour >= 24) {
                    eventEnd.setDate(eventEnd.getDate() + 1);
                }

                eventsArray.push({
                    id: `${slotIndex}-${time}`,
                    title: slot.title || `Available - ${slot.day}`,
                    start: eventStart.toISOString(),
                    end: eventEnd.toISOString(),
                });
            }
        });
        return eventsArray;
    };

    const handleTimeChange = async (eventInfo) => {
        if (!eventInfo) {
            toast.error('Please select a new time slot!', { position: 'top-right', autoClose: 5000 });
            return;
        }

        const token = localStorage.getItem('jwt-token');
        const updatedData = {
            date: eventInfo.start.toISOString().split('T')[0],
            startTime: eventInfo.start.toTimeString().slice(0, 5),
            endTime: eventInfo.end.toTimeString().slice(0, 5),
        };

        try {
            await axios.put(
                `http://localhost:5000/users/appointments/${selectedAppointmentId}`,
                updatedData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment._id === selectedAppointmentId ? { ...appointment, ...updatedData } : appointment
                )
            );
            setShowCalendarModal(false);
            toast.success('Appointment time updated successfully!', { position: 'top-right', autoClose: 3000 });
        } catch (err) {
            console.error('Error updating appointment time:', err);
            toast.error(err.response?.data?.message || 'Failed to update appointment time', {
                position: 'top-right',
                autoClose: 5000,
            });
        }
    };

    const isNewAppointment = (appointment) => {
        const now = new Date();
        const appointmentDate = new Date(appointment.date);
        const timeDiff = now - appointmentDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff < 24 && appointment.status === 'pending'; // New if within 24 hours and pending
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="appointment-history-container">
            <ToastContainer />
            <h2>Appointment History</h2>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '2px solid #007BFF', outline: 'none' }}
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
                    style={{ padding: '8px', borderRadius: '5px', border: '2px solid #007BFF', outline: 'none', width: '200px' }}
                />
                <select
                    value={dateSort}
                    onChange={(e) => setDateSort(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '2px solid #007BFF', outline: 'none' }}
                >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                </select>
            </div>

            {appointments.length === 0 ? (
                <p className="no-appointments">No appointments found.</p>
            ) : (
                <div className="appointments-list">
                    {appointments.map((appointment) => (
                        <div key={appointment._id} className="appointment-card" style={{ position: 'relative' }}>
                            {role === 'student' && (appointment.status === 'pending' || appointment.status === 'canceled') && (
                                <>
                                    <button className="delete-icon" onClick={() => openDeleteModal(appointment._id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                    {appointment.status === 'pending' && (
                                        <button
                                            className="update-icon"
                                            onClick={() => handleUpdateTime(appointment)}
                                            style={{ position: 'absolute', top: '10px', right: '40px', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-pencil-alt" style={{ color: '#007BFF' }}></i>
                                        </button>
                                    )}
                                </>
                            )}
                            {role === 'psychiatrist' && isNewAppointment(appointment) && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '12px',
                                    }}
                                >
                                    New
                                </span>
                            )}
                            <div className="appointment-details">
                                <p><span className="label">Date:</span> {new Date(appointment.date).toLocaleDateString()}</p>
                                <p><span className="label">Time:</span> {appointment.startTime} - {appointment.endTime}</p>
                                {role === 'student' ? (
                                    <>
                                        <p><span className="label">Psychiatrist:</span> {appointment.psychiatrist?.username || 'Not specified'} ({appointment.psychiatrist?.email || 'Not specified'})</p>
                                        <p><span className="label">Status:</span> {appointment.status || 'Not specified'}</p>
                                    </>
                                ) : role === 'psychiatrist' ? (
                                    <>
                                        <p><span className="label">Student:</span> {appointment.student?.username || 'Not specified'} ({appointment.student?.email || 'Not specified'})</p>
                                        <div className="status-section">
                                            <span className="label">Status:</span>{' '}
                                            {editingAppointmentId === appointment._id ? (
                                                <div className="edit-status">
                                                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                                        <option value="">Select a status</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="canceled">Canceled</option>
                                                    </select>
                                                    <Button variant="primary" onClick={() => handleStatusChange(appointment._id)}>Save</Button>
                                                    <Button variant="secondary" onClick={() => setEditingAppointmentId(null)}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`status ${appointment.status}`}>{appointment.status || 'Not specified'}</span>
                                                    <Button variant="info" onClick={() => { setEditingAppointmentId(appointment._id); setNewStatus(appointment.status || ''); }}>Edit</Button>
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
                <Modal.Body>Are you sure you want to delete this appointment?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteAppointment}>Delete</Button>
                </Modal.Footer>
            </Modal>

            {showCalendarModal && selectedPsychiatrist && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '1000px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                    }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>
                            Update Time - {selectedPsychiatrist.username}'s Availability
                        </h3>
                        <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>
                            Click a time slot to update your appointment
                        </p>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            events={calendarEvents}
                            eventClick={(info) => handleTimeChange(info.event)}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            slotDuration="00:30:00"
                            slotLabelInterval="00:30"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            selectable={false}
                        />
                        <button
                            onClick={() => setShowCalendarModal(false)}
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                padding: '10px 20px',
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '5px',
                                marginTop: '20px',
                                display: 'block',
                                marginLeft: 'auto',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentHistory;