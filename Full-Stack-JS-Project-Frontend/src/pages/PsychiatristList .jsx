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
        return availabilities.map((slot, index) => {
            let startDate, endDate;

            if (slot.date) {
                startDate = new Date(slot.date);
                startDate.setHours(parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1]), 0, 0);
                endDate = new Date(slot.date);
                endDate.setHours(parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1]), 0, 0);
            } else {
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayIndex = daysOfWeek.indexOf(slot.day);
                if (dayIndex === -1) return null;
                const currentDate = new Date();
                startDate = new Date(currentDate);
                const daysToAdd = (dayIndex - currentDate.getDay() + 7) % 7;
                startDate.setDate(currentDate.getDate() + daysToAdd);
                startDate.setHours(parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1]), 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1]), 0, 0);
            }

            return {
                id: index,
                title: slot.title || `Available - ${slot.day}`,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            };
        }).filter(Boolean);
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
            await axios.post(
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
            setShowCalendarModal(false);
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
                                                    padding: '10px 20px',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                }}
                                            >
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
                            Click an event to book an appointment
                        </p>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            events={events}
                            eventClick={(info) => handleBookAppointment(info.event)}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            selectable={false} // Disable selection since we're using eventClick for booking
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