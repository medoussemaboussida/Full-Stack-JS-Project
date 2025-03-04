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

    useEffect(() => {
        axios.get('http://localhost:5000/users/psychiatrists')
            .then(response => {
                // Filtrer pour ne garder que les psychiatres ayant des disponibilités
                const filteredPsychiatrists = response.data.filter(user => 
                    user.role === 'psychiatrist' && user.availability && user.availability.length > 0
                );
                setPsychiatrists(filteredPsychiatrists);
            })
            .catch(error => {
                console.error('Error fetching psychiatrists:', error);
            });
    }, []);

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
                                                <div className="no-image">No Image</div> // Alternative sans image
                                            )}
                                        </div>
                                        <div className="psychiatrist-info">
                                            <h4>{psychiatrist.username}</h4>
                                            <p>Psychiatrist</p>
                                            <strong>Availability :</strong>
                                            {psychiatrist.availability.length > 0 ? (
                                                <ul>
                                                    {psychiatrist.availability.map((avail, idx) => (
                                                        <li key={idx}>
                                                            {avail.day}: {avail.startTime} - {avail.endTime}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span>No availability</span>
                                            )}
                                            {/* Ajout du bouton "Book Appointment" */}
                                            <button className="book-appointment-btn">Book Appointment</button>
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
