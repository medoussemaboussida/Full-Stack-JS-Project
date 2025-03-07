import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import '../App.css';

const PsychiatristList = () => {
    const [psychiatrists, setPsychiatrists] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null); // État pour le créneau sélectionné
    const [selectedPsychiatristId, setSelectedPsychiatristId] = useState(null); // État pour l'ID du psychiatre sélectionné

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
            });
    }, []);

    // Fonction pour gérer la réservation
    const handleBookAppointment = async () => {
        if (!selectedSlot || !selectedPsychiatristId) {
            alert("Please select an availability slot first!");
            return;
        }
    
        const token = localStorage.getItem("jwt-token");
        console.log('Token:', token);
        if (!token) {
            alert("You must be logged in to book an appointment!");
            return;
        }
    
        const bookingData = {
            psychiatristId: selectedPsychiatristId,
            day: selectedSlot.day, // Changé de "date" à "day"
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
        };
        console.log('Données envoyées:', bookingData);
    
        try {
            const response = await axios.post(
                'http://localhost:5000/users/appointments/book',
                bookingData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            console.log('Réponse:', response.data);
            alert("Appointment booked successfully!");
        } catch (error) {
            console.error('Erreur:', error.response?.data || error.message);
            alert(`Error booking appointment: ${error.response?.data?.message || error.message}`);
        }
    };
    // Fonction pour sélectionner un créneau
    const selectSlot = (psychiatristId, slot) => {
        setSelectedPsychiatristId(psychiatristId);
        setSelectedSlot(slot);
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
                            1024: { slidesPerView: 3 }
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
                                                                cursor: "pointer",
                                                                backgroundColor:
                                                                    selectedSlot === avail && selectedPsychiatristId === psychiatrist._id
                                                                        ? "#e0f7fa"
                                                                        : "transparent",
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