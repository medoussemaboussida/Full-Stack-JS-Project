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

    useEffect(() => {
        axios.get('http://localhost:5000/users/psychiatrists')
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

    const handleViewAvailability = (psychiatrist) => {
        setSelectedPsychiatrist(psychiatrist);
        const formattedEvents = formatAvailabilitiesToEvents(psychiatrist.availability);
        setEvents(formattedEvents);
        setShowCalendarModal(true);
    };

    const handleBookAppointment = async (eventInfo) => {
        if (!eventInfo) {
            toast.error('Please select an availability slot from the calendar!');
            return;
        }

        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('You must be logged in to book an appointment!');
            return;
        }

        const bookingData = {
            psychiatristId: selectedPsychiatrist._id,
            day: new Date(eventInfo.start).toLocaleString('en-us', { weekday: 'long' }),
            startTime: eventInfo.start.toTimeString().slice(0, 5),
            endTime: eventInfo.end.toTimeString().slice(0, 5),
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

            // Mettre à jour les événements avec les nouvelles disponibilités
            const updatedAvailability = response.data.updatedAvailability;
            const updatedEvents = formatAvailabilitiesToEvents(updatedAvailability);
            setEvents(updatedEvents);

            // Mettre à jour la liste des psychiatres localement
            setPsychiatrists(prev =>
                prev.map(psy =>
                    psy._id === selectedPsychiatrist._id
                        ? { ...psy, availability: updatedAvailability }
                        : psy
                )
            );

            // Optionnel : Fermer le modal après la réservation
            // setShowCalendarModal(false);
        } catch (error) {
            toast.error(`Error booking appointment: ${error.response?.data?.message || error.message}`);
        }
    };

    const filterPsychiatrists = () => {
        if (!searchTerm.trim()) return psychiatrists;
        return psychiatrists.filter(psy =>
            psy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            psy.availability.some(slot =>
                slot.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    <div className="search-container text-center mb-4">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or availability (e.g., Monday, 10:00)"
                            className="search-input"
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
                                <div className="psychiatrist-card">
                                    <div className="psychiatrist-img">
                                        {psychiatrist.user_photo ? (
                                            <img
                                                src={`http://localhost:5000${psychiatrist.user_photo}`}
                                                alt={psychiatrist.username}
                                            />
                                        ) : (
                                            <div className="no-image">No Image</div>
                                        )}
                                    </div>
                                    <div className="psychiatrist-info">
                                        <h4>{psychiatrist.username}</h4>
                                        <p>Psychiatrist</p>
                                        <button
                                            className="view-availability-btn"
                                            onClick={() => handleViewAvailability(psychiatrist)}
                                            style={{
                                                backgroundColor: '#6CB4EE',
                                                color: 'white',
                                                padding: '8px 18px', // Slightly reduced padding for a compact look
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                opacity: 0.7, // Gives a "disabled-like" look
                                                position: 'relative',
                                                top: '-10px', // Moves the button up
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px', // Space between icon and text
                                                transition: 'all 0.3s ease', // Smooth transition for hover effects
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.opacity = '1'; // Full opacity on hover
                                                e.target.style.backgroundColor = '#5AA0D8'; // Slightly darker shade
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.opacity = '0.7'; // Back to "disabled-like" look
                                                e.target.style.backgroundColor = '#6CB4EE'; // Original color
                                            }}
                                        >
                                            <i className="far fa-clock" style={{ fontSize: '14px' }}></i> {/* Font Awesome clock icon */}
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
                            Click an event to book a 30-minute appointment
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
        </main>
    );
};

export default PsychiatristList;