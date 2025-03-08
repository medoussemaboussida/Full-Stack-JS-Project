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
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedPsychiatristId, setSelectedPsychiatristId] = useState(null);
    const [availabilityPage, setAvailabilityPage] = useState({});
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term

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

    const handleBookAppointment = async () => {
        if (!selectedSlot || !selectedPsychiatristId) {
            alert("Please select an availability slot first!");
            return;
        }

        const token = localStorage.getItem("jwt-token");
        if (!token) {
            alert("You must be logged in to book an appointment!");
            return;
        }

        const bookingData = {
            psychiatristId: selectedPsychiatristId,
            day: selectedSlot.day,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
        };

        try {
            await axios.post(
                'http://localhost:5000/users/appointments/book',
                bookingData,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            alert("Appointment booked successfully!");
        } catch (error) {
            alert(`Error booking appointment: ${error.response?.data?.message || error.message}`);
        }
    };

    const selectSlot = (psychiatristId, slot) => {
        setSelectedPsychiatristId(psychiatristId);
        setSelectedSlot(slot);
    };

    const handleAvailabilityPagination = (psychiatristId, direction, total) => {
        setAvailabilityPage((prev) => {
            const currentPage = prev[psychiatristId] || 0;
            let newPage = direction === "next" ? currentPage + 1 : currentPage - 1;
            const maxPage = Math.ceil(total / 3) - 1;

            if (newPage < 0) newPage = 0;
            if (newPage > maxPage) newPage = maxPage;

            return { ...prev, [psychiatristId]: newPage };
        });
    };

    // Filter availability based on search term
    const filterAvailability = (availability) => {
        if (!searchTerm.trim()) return availability; // Return all if no search term
        return availability.filter(slot =>
            slot.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
            slot.startTime.toLowerCase().includes(searchTerm.toLowerCase()) ||
            slot.endTime.toLowerCase().includes(searchTerm.toLowerCase())
        );
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
                    <div className="search-container text-center mb-4">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search availability (e.g., Monday, 10:00)"
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
                        {psychiatrists.length > 0 ? (
                            psychiatrists.map((psychiatrist) => {
                                const filteredAvailability = filterAvailability(psychiatrist.availability);
                                const page = availabilityPage[psychiatrist._id] || 0;
                                const paginatedAvailability = filteredAvailability.slice(page * 3, (page + 1) * 3);
                                const hasNext = (page + 1) * 3 < filteredAvailability.length;
                                const hasPrev = page > 0;

                                return (
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
                                                <strong>Availability:</strong>
                                                {paginatedAvailability.length > 0 ? (
                                                    <ul>
                                                        {paginatedAvailability.map((avail, idx) => (
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
                                                    <span>No matching availability</span>
                                                )}
                                                <div className="pagination-buttons">
                                                    {hasPrev && (
                                                        <button
                                                            onClick={() => handleAvailabilityPagination(psychiatrist._id, "prev", filteredAvailability.length)}
                                                        >
                                                            ←
                                                        </button>
                                                    )}
                                                    {hasNext && (
                                                        <button
                                                            onClick={() => handleAvailabilityPagination(psychiatrist._id, "next", filteredAvailability.length)}
                                                        >
                                                            →
                                                        </button>
                                                    )}
                                                </div>
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
                                );
                            })
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