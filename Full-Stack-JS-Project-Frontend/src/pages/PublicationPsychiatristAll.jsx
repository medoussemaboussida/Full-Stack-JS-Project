import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom'; // Ajout de Link pour la navigation

// Fonction pour supprimer les balises HTML et retourner uniquement le texte
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

function PublicationPsychiatristAll() {
    const [isLoading, setIsLoading] = useState(true);
    const [publications, setPublications] = useState([]);

    // Fonction pour récupérer les publications de l'utilisateur connecté depuis l'API
    const fetchMyPublications = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) {
                throw new Error('No token found');
            }

            console.log('Fetching my publications from API...');
            const response = await fetch('http://localhost:5000/users/myPublications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Ajout du token dans les headers
                },
            });
            const data = await response.json();
            console.log('API Response:', data); // Log pour voir la réponse brute

            if (response.ok) {
                setPublications(data); // Met à jour l'état avec les données
                console.log('Publications updated:', data);
            } else {
                console.error('Failed to fetch publications:', data.message);
            }
        } catch (error) {
            console.error('Error fetching publications:', error);
        } finally {
            setIsLoading(false); // Fin du chargement
        }
    };

    // Fonction pour supprimer une publication
    const handleDelete = async (publicationId) => {
        if (window.confirm('Are you sure you want to delete this publication?')) {
            try {
                const token = localStorage.getItem('jwt-token');
                const response = await fetch(`http://localhost:5000/users/publication/${publicationId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    setPublications(publications.filter(post => post._id !== publicationId));
                    console.log(`Publication ${publicationId} deleted successfully`);
                } else {
                    const data = await response.json();
                    console.error('Failed to delete publication:', data.message);
                }
            } catch (error) {
                console.error('Error deleting publication:', error);
            }
        }
    };

    useEffect(() => {
        fetchMyPublications();
    }, []);

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
    }

    return (
        <div>
            <main className="main">
                {/* breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Publications</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">My Publications</li>
                        </ul>
                    </div>
                </div>
                {/* breadcrumb end */}

                {/* donation-area */}
                <div className="donation-area bg py-120">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-7 mx-auto">
                                <div className="site-heading text-center">
                                    <span className="site-title-tagline"><i className="far fa-newspaper"></i> Publication</span>
                                    <h2 className="site-title">My <span>Publications</span></h2>
                                </div>
                            </div>
                        </div>
                        <div className="row g-4">
                            {publications.length > 0 ? (
                                publications.map((post, index) => (
                                    <div className="col-lg-4" key={index}>
                                        <div className="donation-item">
                                            <div className="donation-img">
                                                <img
                                                    src={post.imagePublication ? `http://localhost:5000${post.imagePublication}` : 'assets/img/donation/01.jpg'}
                                                    alt={stripHtmlTags(post.titrePublication)}
                                                />
                                                <div className="donation-date">
                                                    <span className="donation-date-day">{new Date(post.datePublication).getDate()}</span>
                                                    <span className="donation-date-month">
                                                        {new Date(post.datePublication).toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="donation-content">
                                                <h4 className="donation-title">
                                                    <Link to={`/PublicationDetailPsy/${post._id}`}>
                                                        {stripHtmlTags(post.titrePublication)}
                                                    </Link>
                                                </h4>
                                                <p className="donation-text">
                                                    {stripHtmlTags(post.description).length > 100
                                                        ? `${stripHtmlTags(post.description).substring(0, 100)}...`
                                                        : stripHtmlTags(post.description)}
                                                </p>
                                                <div className="donation-footer">
                                                    <Link to={`/PublicationDetailPsy/${post._id}`} className="theme-btn">
                                                        View <i className="fas fa-circle-arrow-right"></i>
                                                    </Link>
                                                    <Link to={`/EditPublication/${post._id}`} className="theme-btn" style={{ marginLeft: '10px', backgroundColor: '#28a745' }}>
                                                        Edit <i className="fas fa-edit"></i>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(post._id)}
                                                        className="theme-btn"
                                                        style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}
                                                    >
                                                        Delete <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-12 text-center">
                                    <p>No publications available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* donation-area end */}
            </main>
        </div>
    );
}

export default PublicationPsychiatristAll;