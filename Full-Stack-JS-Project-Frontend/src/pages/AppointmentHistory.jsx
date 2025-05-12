import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import 'react-toastify/dist/ReactToastify.css';
import '../App.css';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { jsPDF } from 'jspdf';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

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
    const [showStatsModal, setShowStatsModal] = useState(false);

    // Références pour les graphiques
    const pieChartRef = useRef(null);
    const lineChartRef = useRef(null);

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

            if (startDate < today) return;

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

                if (eventStart >= today) {
                    eventsArray.push({
                        id: `${slotIndex}-${time}`,
                        title: slot.title || `Available - ${slot.day || new Date(slot.date).toLocaleDateString()}`,
                        start: eventStart.toISOString(),
                        end: eventEnd.toISOString(),
                    });
                }
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
        return hoursDiff < 24 && appointment.status === 'pending';
    };

    const getStatsData = () => {
        const statusCounts = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            canceled: 0
        };

        const dailyStats = {};
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyStats[dateStr] = 0;
        }

        appointments.forEach(appointment => {
            statusCounts[appointment.status]++;
            const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
            if (dailyStats.hasOwnProperty(appointmentDate)) {
                dailyStats[appointmentDate]++;
            }
        });

        return { statusCounts, dailyStats };
    };

    const pieChartData = () => {
        const { statusCounts } = getStatsData();
        return {
            labels: ['Pending', 'Confirmed', 'Completed', 'Canceled'],
            datasets: [{
                data: [
                    statusCounts.pending,
                    statusCounts.confirmed,
                    statusCounts.completed,
                    statusCounts.canceled
                ],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        };
    };

    const lineChartData = () => {
        const { dailyStats } = getStatsData();
        const labels = Object.keys(dailyStats);
        const data = Object.values(dailyStats);
        
        return {
            labels,
            datasets: [{
                label: 'Daily Appointments',
                data,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1,
            }]
        };
    };

    const pieChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Appointment Status Distribution' }
        }
    };

    const lineChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Appointments Over Last 30 Days' }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Number of Appointments' }
            },
            x: {
                title: { display: true, text: 'Date' }
            }
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const { statusCounts } = getStatsData();
        const today = new Date().toLocaleDateString();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = margin;

        // Fonction pour ajouter le contenu du PDF
        const addPDFContent = () => {
            // En-tête
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 123, 255);
            doc.text('Appointment Statistics Report', pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;

            // Date de génération
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Generated on: ${today}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;

            // Ajouter le Pie Chart (centré)
            if (pieChartRef.current) {
                try {
                    const pieCanvas = pieChartRef.current.canvas;
                    const pieImgData = pieCanvas.toDataURL('image/png');
                    doc.setFontSize(16);
                    doc.setTextColor(33, 37, 41);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Status Distribution (Pie Chart)', pageWidth / 2, yPos, { align: 'center' });
                    yPos += 10;
                    const pieWidth = 100;
                    const pieX = (pageWidth - pieWidth) / 2; // Centrer horizontalement
                    doc.addImage(pieImgData, 'PNG', pieX, yPos, pieWidth, 100);
                    yPos += 110;
                } catch (error) {
                    console.warn('Failed to add Pie Chart:', error);
                    doc.setFontSize(12);
                    doc.setTextColor(255, 0, 0);
                    doc.text('Error: Could not include Pie Chart', margin, yPos);
                    yPos += 10;
                }
            }

            // Distribution des statuts (texte)
            doc.setFontSize(16);
            doc.setTextColor(33, 37, 41);
            doc.setFont('helvetica', 'bold');
            doc.text('Status Distribution Details', margin, yPos);
            yPos += 10;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            Object.entries(statusCounts).forEach(([status, count]) => {
                const statusText = `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`;
                doc.text(statusText, margin + 10, yPos);
                const colorMap = {
                    pending: [255, 206, 86],
                    confirmed: [54, 162, 235],
                    completed: [75, 192, 192],
                    canceled: [255, 99, 132]
                };
                doc.setFillColor(...colorMap[status]);
                doc.rect(margin, yPos - 4, 5, 5, 'F');
                yPos += 10;
            });

            // Vérifier si une nouvelle page est nécessaire
            if (yPos > pageHeight - margin - 100) {
                doc.addPage();
                yPos = margin;
            }

            // Ajouter le Line Chart
            if (lineChartRef.current) {
                try {
                    const lineCanvas = lineChartRef.current.canvas;
                    const lineImgData = lineCanvas.toDataURL('image/png');
                    doc.setFontSize(16);
                    doc.setTextColor(33, 37, 41);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Appointments Over Last 30 Days (Line Chart)', margin, yPos);
                    yPos += 10;
                    doc.addImage(lineImgData, 'PNG', margin, yPos, 180, 90);
                    yPos += 100;
                } catch (error) {
                    console.warn('Failed to add Line Chart:', error);
                    doc.setFontSize(12);
                    doc.setTextColor(255, 0, 0);
                    doc.text('Error: Could not include Line Chart', margin, yPos);
                    yPos += 10;
                }
            }

            // Numérotation des pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
            }

            // Sauvegarder le PDF
            doc.save(`appointment_statistics_${today}.pdf`);
        };

        // Charger et ajouter le logo
        const logoImg = new Image();
        logoImg.src = '/assets/img/logo/logo.png';

        logoImg.onload = () => {
            try {
                doc.addImage(logoImg, 'PNG', margin, yPos, 20, 20);
                yPos += 50;
            } catch (error) {
                console.warn('Failed to load logo:', error);
            }
            addPDFContent();
        };

        logoImg.onerror = () => {
            console.warn('Logo failed to load, generating PDF without logo.');
            addPDFContent();
        };
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="appointment-history-container">
            <ToastContainer />
            <h2>Appointment History</h2>

            {role === 'psychiatrist' && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    marginBottom: '20px' 
                }}>
                    <Button
                        variant="primary"
                        onClick={() => setShowStatsModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius:'50px',
                            transition: 'transform 0.3s ease-in-out',
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        <span role="img" aria-label="chart">📊</span>
                        Statistics
                    </Button>
                </div>
            )}

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '50px', border: '2px solid #007BFF', outline: 'none',fontSize:'14px' }}
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
                    style={{ padding: '8px', borderRadius: '50px', border: '2px solid #007BFF', outline: 'none', width: '200px',fontSize:'14px' }}
                />
                <select
                    value={dateSort}
                    onChange={(e) => setDateSort(e.target.value)}
                    style={{ padding: '8px', borderRadius: '50px', border: '2px solid #007BFF', outline: 'none',fontSize:'14px' }}
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
                                                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}  style={{borderRadius:'50px'}}>
                                                        <option value="">Select a status</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="confirmed">Confirmed</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="canceled">Canceled</option>
                                                    </select>
                                                    <Button variant="primary" style={{borderRadius:'50px',fontSize:'14px'}} onClick={() => handleStatusChange(appointment._id)}>Save</Button>
                                                    <Button variant="secondary" style={{borderRadius:'50px',fontSize:'14px'}} onClick={() => setEditingAppointmentId(null)}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`status ${appointment.status}`}>{appointment.status || 'Not specified'}</span>
                                                    <Button variant="info" style={{borderRadius:'50px',fontSize:'14px'}} onClick={() => { setEditingAppointmentId(appointment._id); setNewStatus(appointment.status || ''); }}>Edit</Button>
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
                    <Button variant="secondary" style={{borderRadius:'50px',fontSize:'14px'}} onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="danger" style={{borderRadius:'50px',fontSize:'14px'}} onClick={handleDeleteAppointment}>Delete</Button>
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
                        borderRadius: '10px',
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
                        <button className='theme-btn'
                            onClick={() => setShowCalendarModal(false)}
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                padding: '10px 20px',
                                fontSize: '14px',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '50px',
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

            <Modal 
                show={showStatsModal} 
                onHide={() => setShowStatsModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Appointment Statistics</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ marginBottom: '30px' }}>
                        <h4>Status Distribution (Pie Chart)</h4>
                        <Pie 
                            data={pieChartData()}
                            options={pieChartOptions}
                            style={{ maxHeight: '400px' }}
                            ref={pieChartRef}
                        />
                    </div>
                    <div>
                        <h4>Total Appointments Over Time (Line Chart)</h4>
                        <Line 
                            data={lineChartData()}
                            options={lineChartOptions}
                            ref={lineChartRef}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="success"
                        onClick={exportToPDF}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'transform 0.3s ease-in-out',
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        <span role="img" aria-label="download">📥</span>
                        Export to PDF
                    </Button>
                    <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AppointmentHistory;