import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '../App.css';

const PsychiatristList = () => {
    const [psychiatrists, setPsychiatrists] = useState([]);
    const [selectedPsychiatrist, setSelectedPsychiatrist] = useState(null);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [appointments, setAppointments] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Fetch current user ID
    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            axios.get('http://localhost:5000/users/me', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(response => {
                    setCurrentUserId(response.data._id);
                })
                .catch(error => {
                    console.error('Error fetching user:', error);
                });
        }
    }, []);

    // Fetch psychiatrists
    useEffect(() => {
        axios.get('http://localhost:5000/users/psychiatrists', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('jwt-token')}`,
            },
        })
            .then(response => {
                const filteredPsychiatrists = response.data.filter(user =>
                    user.role === 'psychiatrist' && user.availability && user.availability.length > 0
                );
                setPsychiatrists(filteredPsychiatrists);
            })
            .catch(error => {
                console.error('Error fetching psychiatrists:', error);
                toast.error('Error fetching psychiatrists: ' + error.message);
            });
    }, []);

    // Fetch appointments for the selected psychiatrist
    useEffect(() => {
        if (selectedPsychiatrist) {
            axios.get(`http://localhost:5000/users/appointments/psychiatrist/${selectedPsychiatrist._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('jwt-token')}`,
                },
            })
                .then(response => {
                    setAppointments(response.data);
                    const formattedEvents = formatAvailabilitiesToEvents(selectedPsychiatrist.availability, response.data);
                    setEvents(formattedEvents);
                })
                .catch(error => {
                    console.error('Error fetching appointments:', error);
                    toast.error('Error fetching appointments: ' + error.message);
                });
        }
    }, [selectedPsychiatrist]);

    const formatAvailabilitiesToEvents = (availabilities, appointments = []) => {
        const eventsArray = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Step 1: Generate events from availability (available slots)
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

                if (eventStart < today) continue;

                // Check if this slot is already booked by comparing with appointments
                const matchingAppointment = appointments.find(apt => {
                    const aptStart = new Date(apt.date);
                    const [aptStartHour, aptStartMinute] = apt.startTime.split(':').map(Number);
                    aptStart.setHours(aptStartHour, aptStartMinute, 0, 0);
                    return aptStart.getTime() === eventStart.getTime();
                });

                if (matchingAppointment) {
                    // Skip this slot since it will be handled by the appointments loop below
                    continue;
                }

                const startTimeStr = eventStart.toTimeString().slice(0, 5);
                const endTimeStr = eventEnd.toTimeString().slice(0, 5);
                const title = `${startTimeStr} - ${endTimeStr} - Available`;

                eventsArray.push({
                    id: `avail-${slotIndex}-${time}`,
                    title,
                    start: eventStart.toISOString(),
                    end: eventEnd.toISOString(),
                    backgroundColor: '#3788d8', // Blue for available
                    borderColor: '#3788d8',
                    extendedProps: {
                        slotIndex,
                        originalSlot: slot,
                        status: 'Available',
                        studentId: null,
                    },
                });
            }
        });

        // Step 2: Generate events from appointments (booked slots)
        appointments.forEach((appointment, aptIndex) => {
            const eventStart = new Date(appointment.date);
            const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
            eventStart.setHours(startHour, startMinute, 0, 0);

            const eventEnd = new Date(appointment.date);
            const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
            eventEnd.setHours(endHour, endMinute, 0, 0);

            if (eventStart < today) return;

            let status = appointment.status; // Use the status from the appointment
            let backgroundColor = '#d3d3d3'; // Grey for booked/pending
            let studentId = appointment.student;

            // For the booking user, show the actual status; for others, show "Booked"
            if (studentId !== currentUserId) {
                status = 'Booked';
            } else {
                // Capitalize the status for display (e.g., "pending" → "Pending")
                status = status.charAt(0).toUpperCase() + status.slice(1);
            }

            const startTimeStr = eventStart.toTimeString().slice(0, 5);
            const endTimeStr = eventEnd.toTimeString().slice(0, 5);
            const title = `${startTimeStr} - ${endTimeStr} - ${status}`;

            eventsArray.push({
                id: `apt-${aptIndex}`,
                title,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                backgroundColor,
                borderColor: backgroundColor,
                extendedProps: {
                    slotIndex: null,
                    originalSlot: null,
                    status,
                    studentId,
                },
            });
        });

        return eventsArray;
    };

    const handleViewAvailability = (psychiatrist) => {
        setSelectedPsychiatrist(psychiatrist);
        setShowCalendarModal(true);
    };

    const handleBookAppointment = async (eventInfo) => {
        if (!eventInfo) {
            toast.error('Please select an availability slot from the calendar!');
            return;
        }

        const { status, studentId } = eventInfo.extendedProps;
        if (status !== 'Available') {
            toast.error('This slot is not available for booking!');
            return;
        }

        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('You must be logged in to book an appointment!');
            return;
        }

        const eventStart = new Date(eventInfo.start);
        const eventEnd = new Date(eventInfo.end);

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const bookingData = {
            psychiatristId: selectedPsychiatrist._id,
            date: formatDate(eventStart),
            startTime: eventStart.toTimeString().slice(0, 5),
            endTime: eventEnd.toTimeString().slice(0, 5),
        };

        try {
            const response = await axios.post(
                'http://localhost:5000/users/appointments/book',
                bookingData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success('Appointment booked successfully!');
            // Update appointments state
            setAppointments(prev => [...prev, response.data.appointment]);
            // Update psychiatrists state with the new availability
            setPsychiatrists(prev =>
                prev.map(psy =>
                    psy._id === selectedPsychiatrist._id
                        ? { ...psy, availability: response.data.updatedAvailability }
                        : psy
                )
            );
            // Refresh events
            const updatedEvents = formatAvailabilitiesToEvents(response.data.updatedAvailability, [...appointments, response.data.appointment]);
            setEvents(updatedEvents);
        } catch (error) {
            toast.error(`Error booking appointment: ${error.response?.data?.message || error.message}`);
        }
    };

    const filterPsychiatrists = () => {
        if (!searchTerm.trim()) return psychiatrists;
        return psychiatrists.filter(psy =>
            psy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            psy.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            psy.availability.some(slot =>
                slot.day?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                slot.startTime.toLowerCase().includes(searchTerm.toLowerCase()) ||
                slot.endTime.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    };

    return (
        <main className="main">
            <ToastContainer />
            <div className="testimonial-area pt-80 pb-60">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-7 mx-auto">
                            <div className="site-heading text-center">
                                <span className="site-title-tagline">
                                    <i className="far fa-hand-heart"></i> Psychiatrists
                                </span>
                                <h2 className="site-title">
                                    Our Available <span>Psychiatrists</span>
                                </h2>
                            </div>
                        </div>
                    </div>
                    <div className="search-container text-center mb-4" style={{
                        margin: '30px 0'
                    }}>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, description, or availability (e.g., Monday, 10:00)"
                            className="search-input"
                            style={{
                                width: '60%',
                                maxWidth: '500px',
                                padding: '12px 20px',
                                fontSize: '16px',
                                borderRadius: '25px',
                                border: '2px solid #6CB4EE',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#5AA0D8';
                                e.target.style.boxShadow = '0 2px 8px rgba(90,160,216,0.3)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#6CB4EE';
                                e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                            }}
                        />
                    </div>
                    <Swiper
                        modules={[Navigation, Pagination]}
                        navigation
                        pagination={{ clickable: true, dynamicBullets: true }}
                        spaceBetween={20}
                        slidesPerView={1}
                        breakpoints={{
                            640: { slidesPerView: 1 },
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 }
                        }}
                        className="testimonial-slider"
                    >
                        {filterPsychiatrists().length > 0 ? (
                            filterPsychiatrists().map((psychiatrist) => (
                                <SwiperSlide key={psychiatrist._id}>
                                    <div className="psychiatrist-card" style={{ padding: '20px', textAlign: 'center' }}>
                                        <div className="psychiatrist-img">
                                            {psychiatrist.user_photo ? (
                                                <img
                                                    src={`http://localhost:5000${psychiatrist.user_photo}`}
                                                    alt={psychiatrist.username}
                                                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto' }}
                                                />
                                            ) : (
                                                <div className="no-image" style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="psychiatrist-info">
                                            <h4 style={{ margin: '10px 0', fontSize: '1.5rem' }}>{psychiatrist.username}</h4>
                                            <p style={{ margin: '5px 0', color: '#555', fontWeight: 'bold' }}>Psychiatrist</p>
                                            <p style={{ margin: '10px 0', color: '#666', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                {psychiatrist.description || 'No description available.'}
                                            </p>
                                            <button
                                                className="view-availability-btn"
                                                onClick={() => handleViewAvailability(psychiatrist)}
                                                style={{
                                                    backgroundColor: '#6CB4EE',
                                                    color: 'white',
                                                    padding: '8px 18px',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    cursor: 'pointer',
                                                    opacity: 0.7,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.3s ease',
                                                    margin: '10px auto 0',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.opacity = '1';
                                                    e.target.style.backgroundColor = '#5AA0D8';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.opacity = '0.7';
                                                    e.target.style.backgroundColor = '#6CB4EE';
                                                }}
                                            >
                                                <i className="far fa-clock" style={{ fontSize: '14px' }}></i>
                                                View Availability
                                            </button>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))
                        ) : (
                            <div className="text-center text-gray-500">No psychiatrists found.</div>
                        )}
                    </Swiper>
                </div>
            </div>

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
                            {selectedPsychiatrist.username}'s Availability
                        </h3>
                        <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>
                            Click an available slot to book a 30-minute appointment
                        </p>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            events={events}
                            eventClick={(info) => handleBookAppointment(info.event)}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            slotDuration="00:30:00"
                            slotLabelInterval="00:30"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            selectable={false}
                            eventContent={(eventInfo) => {
                                return (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        color: eventInfo.event.extendedProps.status === 'Available' ? 'white' : '#333',
                                    }}>
                                        {eventInfo.event.title}
                                    </div>
                                );
                            }}
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
        </main>
    );
};

export default PsychiatristList;