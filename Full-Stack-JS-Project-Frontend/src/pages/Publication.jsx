import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

// Fonction pour supprimer les balises HTML et retourner uniquement le texte
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

function Publication() {
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [publications, setPublications] = useState([]);

    // Fonction pour récupérer les publications depuis l'API
    const fetchPublications = async () => {
        try {
            console.log('Fetching publications from API...');
            const response = await fetch('http://localhost:5000/users/allPublication', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
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
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const fetchUser = async () => {
                    try {
                        const response = await fetch(`http://localhost:5000/users/session/${decoded.id}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const data = await response.json();
                        if (response.ok) {
                            setUserRole(data.role); // Récupère le rôle
                            console.log('User Role:', data.role);
                        } else {
                            console.error('Failed to fetch user:', data.message);
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    } finally {
                        setIsLoading(false); // Fin du chargement
                    }
                };
                fetchUser();
            } catch (error) {
                console.error('Invalid token:', error);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }

        // Récupérer les publications au chargement
        fetchPublications();
    }, []);

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
    }

    return (
        <div>
            {/* Main Content */}
            <main style={{ padding: '20px', backgroundColor: '#f9f9f9' }}>
                {/* Breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Publications</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Publications</li>
                        </ul>
                    </div>
                </div>

                {/* Blog Area */}
                <div style={{ padding: '100px 0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <span style={{ fontSize: '16px', color: '#0ea5e6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                                    <i className="far fa-hand-heart"></i> Our Publications
                                </span>
                                <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '10px 0 0' }}>
                                    Latest Publications & <span style={{ color: '#0ea5e6' }}>Updates</span>
                                </h2>
                            </div>
                            {userRole === 'psychiatrist' && (
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {/* Bouton Add Publication */}
                                    <a
                                        href="/AddPublication"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            background: '#0ea5e6',
                                            color: '#fff',
                                            padding: '12px 24px',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            transition: 'background 0.3s ease',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#164da6'}
                                        onMouseLeave={(e) => e.target.style.background = '#0ea5e6'}
                                    >
                                        <i className="fas fa-plus" style={{ marginRight: '8px' }}></i> Add Publication
                                    </a>
                                    {/* Bouton My Publications */}
                                    <a
                                        href="/MyPublication" // Remplacez par l'URL souhaitée
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            background: '#28a745', // Vert pour différencier
                                            color: '#fff',
                                            padding: '12px 24px',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            transition: 'background 0.3s ease',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#218838'}
                                        onMouseLeave={(e) => e.target.style.background = '#28a745'}
                                    >
                                        <i className="fas fa-book" style={{ marginRight: '8px' }}></i> My Publication
                                    </a>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {publications.length > 0 ? (
                                publications.map((post, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={post.imagePublication ? `http://localhost:5000${post.imagePublication}` : '/assets/img/blog/01.jpg'}
                                                alt="Publication"
                                                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                top: '10px',
                                                left: '10px',
                                                background: '#0ea5e6',
                                                color: '#fff',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                textAlign: 'center'
                                            }}>
                                                <strong>{new Date(post.datePublication).getDate()}</strong>
                                                <span style={{ display: 'block', fontSize: '12px' }}>
                                                    {new Date(post.datePublication).toLocaleString('default', { month: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                                                <span>
                                                    <i className="far fa-user-circle" style={{ marginRight: '5px' }}></i>
                                                    By {post.author_id?.username || 'Unknown'}
                                                </span>
                                                <span>
                                                    <i className="far fa-comments" style={{ marginRight: '5px' }}></i>
                                                    {post.comments ? `${post.comments} Comments` : 'No Comments'}
                                                </span>
                                            </div>
                                            <h4 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px', lineHeight: '1.4' }}>
                                                <a href={`/publication/${post._id}`} style={{ color: '#333', textDecoration: 'none' }}>
                                                    {stripHtmlTags(post.titrePublication)}
                                                </a>
                                            </h4>
                                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                                                {stripHtmlTags(post.description).length > 100 
                                                    ? `${stripHtmlTags(post.description).substring(0, 100)}...` 
                                                    : stripHtmlTags(post.description)}
                                            </p>
                                            <a
                                                href={`/publication/${post._id}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: '#0ea5e6',
                                                    color: '#fff',
                                                    padding: '10px 20px',
                                                    borderRadius: '5px',
                                                    textDecoration: 'none',
                                                    transition: 'background 0.3s ease'
                                                }}
                                                onMouse awardsEnter={(e) => e.target.style.background = '#164da6'}
                                                onMouseLeave={(e) => e.target.style.background = '#0ea5e6'}
                                            >
                                                Read More <i className="fas fa-circle-arrow-right" style={{ marginLeft: '5px' }}></i>
                                            </a>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', gridColumn: 'span 3' }}>
                                    <p>No publications available.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination (statique pour l'instant) */}
                        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
                            <ul style={{ display: 'flex', listStyle: 'none', padding: 0, gap: '10px' }}>
                                <li>
                                    <a
                                        href="#"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            background: '#fff',
                                            color: '#333',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            transition: 'background 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f1f1'}
                                        onMouseLeave={(e) => e.target.style.background = '#fff'}
                                    >
                                        <i className="fas fa-arrow-left"></i>
                                    </a>
                                </li>
                                {[1, 2, 3].map((page) => (
                                    <li key={page}>
                                        <a
                                            href="#"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '40px',
                                                height: '40px',
                                                background: page === 1 ? '#0ea5e6' : '#fff',
                                                color: page === 1 ? '#fff' : '#333',
                                                borderRadius: '5px',
                                                textDecoration: 'none',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                transition: 'background 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = page === 1 ? '#164da6' : '#f1f1f1'}
                                            onMouseLeave={(e) => e.target.style.background = page === 1 ? '#0ea5e6' : '#fff'}
                                        >
                                            {page}
                                        </a>
                                    </li>
                                ))}
                                <li>
                                    <a
                                        href="#"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            background: '#fff',
                                            color: '#333',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            transition: 'background 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f1f1f1'}
                                        onMouseLeave={(e) => e.target.style.background = '#fff'}
                                    >
                                        <i className="fas fa-arrow-right"></i>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Scroll Top */}
            <a
                href="#"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: '#0ea5e6',
                    color: '#fff',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    transition: 'background 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#45a049'}
                onMouseLeave={(e) => e.target.style.background = '#0ea5e6'}
            >
                <i className="far fa-arrow-up"></i>
            </a>
        </div>
    );
}

export default Publication;