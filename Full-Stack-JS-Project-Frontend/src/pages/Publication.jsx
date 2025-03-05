import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

function Publication() {
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const blogPosts = [
        { img: '/assets/img/blog/01.jpg', date: '10 Jan', title: 'There are many variations of passages orem available.', author: 'Alicia Davis', comments: '2.5k' },
        { img: '/assets/img/blog/02.jpg', date: '11 Jan', title: 'Generator internet repeat tend word chunk necessary.', author: 'Alicia Davis', comments: '1.2k' },
        { img: '/assets/img/blog/03.jpg', date: '12 Jan', title: 'Survived only five centuries but also the leap into.', author: 'Alicia Davis', comments: '2.8k' },
        { img: '/assets/img/blog/01.jpg', date: '10 Jan', title: 'There are many variations of passages orem available.', author: 'Alicia Davis', comments: '2.5k' },
        { img: '/assets/img/blog/02.jpg', date: '11 Jan', title: 'Generator internet repeat tend word chunk necessary.', author: 'Alicia Davis', comments: '1.2k' },
        { img: '/assets/img/blog/03.jpg', date: '12 Jan', title: 'Survived only five centuries but also the leap into.', author: 'Alicia Davis', comments: '2.8k' }
    ];

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
                            setUserRole(data.role); // Récupère le rôle à partir de la réponse API
                        } else {
                            console.error('Failed to fetch user:', data.message);
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    } finally {
                        setIsLoading(false);
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
                        <h2 className="breadcrumb-title">Volunteer Single</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Volunteer Single</li>
                        </ul>
                    </div>
                </div>

                {/* Blog Area */}
                <div style={{ padding: '100px 0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <span style={{ fontSize: '16px', color: '#0ea5e6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                                    <i className="far fa-hand-heart"></i> Our Blog
                                </span>
                                <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '10px 0 0' }}>
                                    Our Latest News & <span style={{ color: '#0ea5e6' }}>Blog</span>
                                </h2>
                            </div>
                            {userRole === 'psychiatrist' && (
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
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {blogPosts.map((post, index) => (
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
                                        <img src={post.img} alt="Thumb" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
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
                                            <strong>{post.date.split(' ')[0]}</strong>
                                            <span style={{ display: 'block', fontSize: '12px' }}>{post.date.split(' ')[1]}</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                                            <span>
                                                <i className="far fa-user-circle" style={{ marginRight: '5px' }}></i>
                                                By {post.author}
                                            </span>
                                            <span>
                                                <i className="far fa-comments" style={{ marginRight: '5px' }}></i>
                                                {post.comments} Comments
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px', lineHeight: '1.4' }}>
                                            <a href="/blog-single" style={{ color: '#333', textDecoration: 'none' }}>{post.title}</a>
                                        </h4>
                                        <a
                                            href="/blog-single"
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
                                            onMouseEnter={(e) => e.target.style.background = '#164da6'}
                                            onMouseLeave={(e) => e.target.style.background = '#0ea5e6'}
                                        >
                                            Read More <i className="fas fa-circle-arrow-right" style={{ marginLeft: '5px' }}></i>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
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