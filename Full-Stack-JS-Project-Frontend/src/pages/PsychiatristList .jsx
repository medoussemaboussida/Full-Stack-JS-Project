import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import '../App.css';

const PsychiatristList = () => {
    const [psychiatrists, setPsychiatrists] = useState([]);
    const [bookedAppointments, setBookedAppointments] = useState([]); // State for user's booked appointments
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedPsychiatristId, setSelectedPsychiatristId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('jwt-token');
                if (!token) {
                    console.warn('No token found, skipping appointment fetch.');
                    return;
                }

                // Fetch psychiatrists
                const psychiatristsResponse = await axios.get('http://localhost:5000/users/psychiatrists', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                let filteredPsychiatrists = psychiatristsResponse.data.filter(user =>
                    user.role === 'psychiatrist' && user.availability && user.availability.length > 0
                );

                // Fetch user's booked appointments
                const appointmentsResponse = await axios.get('http://localhost:5000/users/appointments/history', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const userBookedAppointments = appointmentsResponse.data.appointments || [];
                setBookedAppointments(userBookedAppointments);

                // Filter out slots booked by the user
                filteredPsychiatrists = filteredPsychiatrists.map(psychiatrist => ({
                    ...psychiatrist,
                    availability: psychiatrist.availability.filter(avail => 
                        !userBookedAppointments.some(appointment =>
                            appointment.psychiatrist === psychiatrist._id &&
                            appointment.day === avail.day &&
                            appointment.startTime === avail.startTime &&
                            appointment.endTime === avail.endTime
                        )
                    ),
                }));
                setPsychiatrists(filteredPsychiatrists);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    // Function to check if a slot is booked by the user (for safety)
    const isSlotBooked = (psychiatristId, slot) => {
        return bookedAppointments.some(appointment =>
            appointment.psychiatrist === psychiatristId &&
            appointment.day === slot.day &&
            appointment.startTime === slot.startTime &&
            appointment.endTime === slot.endTime
        );
    };

    // Function to handle booking
    const handleBookAppointment = async () => {
        if (!selectedSlot || !selectedPsychiatristId) {
            alert('Please select an availability slot first!');
            return;
        }

        const token = localStorage.getItem('jwt-token');
        if (!token) {
            alert('You must be logged in to book an appointment!');
            return;
        }

        const bookingData = {
            psychiatristId: selectedPsychiatristId,
            day: selectedSlot.day,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
        };
        console.log('Data sent:', bookingData);

        try {
            const response = await axios.post(
                'http://localhost:5000/users/appointments/book',
                bookingData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            console.log('Response:', response.data);
            alert('Appointment booked successfully!');
            // Refresh data after booking
            const fetchData = async () => {
                const token = localStorage.getItem('jwt-token');
                const psychiatristsResponse = await axios.get('http://localhost:5000/users/psychiatrists', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                let filteredPsychiatrists = psychiatristsResponse.data.filter(user =>
                    user.role === 'psychiatrist' && user.availability && user.availability.length > 0
                );
                const appointmentsResponse = await axios.get('http://localhost:5000/users/appointments/history', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const userBookedAppointments = appointmentsResponse.data.appointments || [];
                setBookedAppointments(userBookedAppointments);
                filteredPsychiatrists = filteredPsychiatrists.map(psychiatrist => ({
                    ...psychiatrist,
                    availability: psychiatrist.availability.filter(avail => 
                        !userBookedAppointments.some(appointment =>
                            appointment.psychiatrist === psychiatrist._id &&
                            appointment.day === avail.day &&
                            appointment.startTime === avail.startTime &&
                            appointment.endTime === avail.endTime
                        )
                    ),
                }));
                setPsychiatrists(filteredPsychiatrists);
            };
            await fetchData();
            // Reset selection after booking
            setSelectedSlot(null);
            setSelectedPsychiatristId(null);
        } catch (error) {
            console.error('Error:', error.response?.data || error.message);
            alert(`Error booking appointment: ${error.response?.data?.message || error.message}`);
        }
    };

    // Function to select a slot
    const selectSlot = (psychiatristId, slot) => {
        if (!isSlotBooked(psychiatristId, slot)) {
            setSelectedPsychiatristId(psychiatristId);
            setSelectedSlot(slot);
        } // No action if booked (shouldn't happen due to filtering)
    };

    return (
        <main className="main">
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
                    <Swiper
                        modules={[Navigation, Pagination]}
                        navigation
                        pagination={{ clickable: true, dynamicBullets: true }}
                        spaceBetween={20}
                        slidesPerView={1}
                        breakpoints={{
                            640: { slidesPerView: 1 },
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                        className="testimonial-slider"
                    >
                        {psychiatrists.length > 0 ? (
                            psychiatrists.map((psychiatrist, index) => (
                                <SwiperSlide key={index}>
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
                                            <strong>Availability :</strong>
                                            {psychiatrist.availability.length > 0 ? (
                                                <ul>
                                                    {psychiatrist.availability.map((avail, idx) => (
                                                        <li
                                                            key={idx}
                                                            onClick={() => selectSlot(psychiatrist._id, avail)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                backgroundColor:
                                                                    selectedSlot === avail && selectedPsychiatristId === psychiatrist._id
                                                                        ? '#e0f7fa'
                                                                        : 'transparent',
                                                                color: '#333',
                                                                padding: '5px',
                                                                margin: '2px 0',
                                                                borderRadius: '3px',
                                                            }}
                                                        >
                                                            {avail.day}: {avail.startTime} - {avail.endTime}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span>No availability</span>
                                            )}
                                            <button
                                                className="book-appointment-btn"
                                                onClick={handleBookAppointment}
                                                disabled={!selectedSlot || selectedPsychiatristId !== psychiatrist._id}
                                            >
                                                Book Appointment
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
        </main>
    );
};

export default PsychiatristList;