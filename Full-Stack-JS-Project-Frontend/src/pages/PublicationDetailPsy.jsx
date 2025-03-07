import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Fonction pour supprimer les balises HTML et retourner uniquement le texte
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

function PublicationDetailPsy() {
    const { id } = useParams(); // Récupère l'ID de la publication depuis l'URL
    const [publication, setPublication] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fonction pour récupérer les détails d'une publication spécifique
    const fetchPublicationDetail = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) {
                throw new Error('No token found');
            }

            console.log(`Fetching publication details for ID: ${id}`);
            const response = await fetch(`http://localhost:5000/users/publication/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            console.log('API Response:', data);

            if (response.ok) {
                setPublication(data);
            } else {
                console.error('Failed to fetch publication:', data.message);
            }
        } catch (error) {
            console.error('Error fetching publication:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPublicationDetail();
    }, [id]);

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
    }

    if (!publication) {
        return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Publication not found</div>;
    }

    return (
        <div>
            {/* Main Content */}
            <main className="main">
                {/* Breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Publication Details</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Publication Details</li>
                        </ul>
                    </div>
                </div>
                {/* Breadcrumb End */}

                {/* Blog Single Section */}
                <div className="blog-single py-120">
                    <div className="container">
                        <div className="row g-4">
                            {/* Blog Content */}
                            <div className="col-lg-8">
                                <div className="blog-single-wrap">
                                    <div className="blog-single-content">
                                        {/* Blog Thumbnail */}
                                        <div className="blog-thumb-img">
                                            <img
                                                src={publication.imagePublication ? `http://localhost:5000${publication.imagePublication}` : 'assets/img/blog/single.jpg'}
                                                alt={stripHtmlTags(publication.titrePublication)}
                                            />
                                        </div>

                                        {/* Blog Info */}
                                        <div className="blog-info">
                                            {/* Blog Meta */}
                                            <div className="blog-meta">
                                                <div className="blog-meta-left">
                                                    <ul>
                                                        <li><i className="far fa-user"></i>{publication.author_id?.username || 'Unknown'}</li>
                                                        <li><i className="far fa-calendar"></i>{new Date(publication.datePublication).toLocaleDateString()}</li>
                                                    </ul>
                                                </div>
                                                <div className="blog-meta-right">
                                                    <a href="#" className="share-link"><i className="far fa-share-alt"></i>Share</a>
                                                </div>
                                            </div>

                                            {/* Blog Details */}
                                            <div className="blog-details">
                                                <h3 className="blog-details-title mb-20">{stripHtmlTags(publication.titrePublication)}</h3>
                                                <p className="mb-20">{stripHtmlTags(publication.description)}</p>

                                                {/* Tags */}
                                                <div className="blog-details-tag pb-20">
                                                    <h5>Tags : </h5>
                                                    <ul>
                                                        {publication.tag && publication.tag.length > 0 ? (
                                                            publication.tag.map((tag, index) => (
                                                                <li key={index}><a href="#">{tag}</a></li>
                                                            ))
                                                        ) : (
                                                            <li>No tags available</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Blog Author */}
                                            <div className="blog-author">
                                                <div className="blog-author-img">
                                                    <img src="assets/img/blog/author.jpg" alt="" />
                                                </div>
                                                <div className="author-info">
                                                    <h6>Author</h6>
                                                    <h3 className="author-name">{publication.author_id?.username || 'Shelly Frederick'}</h3>
                                                    <p>It is a long established fact that a reader will be distracted by the abcd readable content of a page when looking at its layout that more less.</p>
                                                    <div className="author-social">
                                                        <a href="#"><i className="fab fa-facebook-f"></i></a>
                                                        <a href="#"><i className="fab fa-x-twitter"></i></a>
                                                        <a href="#"><i className="fab fa-instagram"></i></a>
                                                        <a href="#"><i className="fab fa-whatsapp"></i></a>
                                                        <a href="#"><i className="fab fa-youtube"></i></a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Blog Comments */}
                                            <div className="blog-comment">
                                                <h3>Comments (20)</h3>
                                                <div className="blog-comment-wrap">
                                                    <div className="blog-comment-item">
                                                        <img src="assets/img/blog/com-1.jpg" alt="thumb" />
                                                        <div className="blog-comment-content">
                                                            <h5>Rosa Fossum</h5>
                                                            <span><i className="far fa-clock"></i> Jan 23, 2025</span>
                                                            <p>There are many variations of passages the majority have suffered in some injected humour or randomised words which don't look even slightly believable.</p>
                                                            <a href="#"><i className="far fa-reply"></i> Reply</a>
                                                        </div>
                                                    </div>
                                                    <div className="blog-comment-item reply">
                                                        <img src="assets/img/blog/com-2.jpg" alt="thumb" />
                                                        <div className="blog-comment-content">
                                                            <h5>Timothy Stone</h5>
                                                            <span><i className="far fa-clock"></i> Jan 23, 2025</span>
                                                            <p>There are many variations of passages the majority have suffered in some injected humour or randomised words which don't look even slightly believable.</p>
                                                            <a href="#"><i className="far fa-reply"></i> Reply</a>
                                                        </div>
                                                    </div>
                                                    <div className="blog-comment-item">
                                                        <img src="assets/img/blog/com-3.jpg" alt="thumb" />
                                                        <div className="blog-comment-content">
                                                            <h5>Stacey Anthony</h5>
                                                            <span><i className="far fa-clock"></i> Jan 23, 2025</span>
                                                            <p>There are many variations of passages the majority have suffered in some injected humour or randomised words which don't look even slightly believable.</p>
                                                            <a href="#"><i className="far fa-reply"></i> Reply</a>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Comment Form */}
                                                <div className="blog-comment-form">
                                                    <h3>Leave A Comment</h3>
                                                    <form action="#">
                                                        <div className="row">
                                                            <div className="col-md-6">
                                                                <div className="form-group">
                                                                    <div className="form-icon">
                                                                        <i className="far fa-user-tie"></i>
                                                                        <input type="text" className="form-control" name="name" placeholder="Your Name*" required />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="form-group">
                                                                    <div className="form-icon">
                                                                        <i className="far fa-envelope"></i>
                                                                        <input type="email" className="form-control" name="email" placeholder="Your Email*" required />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-12">
                                                                <div className="form-group">
                                                                    <div className="form-icon">
                                                                        <i className="far fa-pen"></i>
                                                                        <textarea name="message" cols="30" rows="5" className="form-control" placeholder="Your Comment*" required></textarea>
                                                                    </div>
                                                                </div>
                                                                <button type="submit" className="theme-btn">Post Comment <i className="far fa-paper-plane"></i></button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="col-lg-4">
                                <aside className="blog-sidebar">
                                    {/* Search Widget */}
                                    <div className="widget search">
                                        <h5 className="widget-title">Search</h5>
                                        <div className="search-form">
                                            <form action="#">
                                                <div className="form-group">
                                                    <input type="text" className="form-control" placeholder="Search Here..." />
                                                    <button type="submit"><i className="far fa-search"></i></button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    {/* Category Widget */}
                                    <div className="widget category">
                                        <h5 className="widget-title">Category</h5>
                                        <div className="category-list">
                                            <a href="#"><i className="far fa-arrow-right"></i>Assisted Living<span>(10)</span></a>
                                            <a href="#"><i className="far fa-arrow-right"></i>Nursing Care<span>(15)</span></a>
                                            <a href="#"><i className="far fa-arrow-right"></i>Medical & Health<span>(20)</span></a>
                                            <a href="#"><i className="far fa-arrow-right"></i>Physical Assistance<span>(30)</span></a>
                                            <a href="#"><i className="far fa-arrow-right"></i>Residential Care<span>(25)</span></a>
                                        </div>
                                    </div>

                                    {/* Recent Post Widget */}
                                    <div className="widget recent-post">
                                        <h5 className="widget-title">Recent Post</h5>
                                        <div className="recent-post-item">
                                            <div className="recent-post-img">
                                                <img src="assets/img/blog/bs-1.jpg" alt="thumb" />
                                            </div>
                                            <div className="recent-post-info">
                                                <h6><a href="#">There are many variatio of passage majority.</a></h6>
                                                <span><i className="far fa-clock"></i>Jan 23, 2025</span>
                                            </div>
                                        </div>
                                        <div className="recent-post-item">
                                            <div className="recent-post-img">
                                                <img src="assets/img/blog/bs-2.jpg" alt="thumb" />
                                            </div>
                                            <div className="recent-post-info">
                                                <h6><a href="#">There are many variatio of passage majority.</a></h6>
                                                <span><i className="far fa-clock"></i>Jan 23, 2025</span>
                                            </div>
                                        </div>
                                        <div className="recent-post-item">
                                            <div className="recent-post-img">
                                                <img src="assets/img/blog/bs-3.jpg" alt="thumb" />
                                            </div>
                                            <div className="recent-post-info">
                                                <h6><a href="#">There are many variatio of passage majority.</a></h6>
                                                <span><i className="far fa-clock"></i>Jan 23, 2025</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Social Widget */}
                                    <div className="widget social">
                                        <h5 className="widget-title">Follow Us</h5>
                                        <div className="social-link">
                                            <a href="#"><i className="fab fa-facebook-f"></i></a>
                                            <a href="#"><i className="fab fa-x-twitter"></i></a>
                                            <a href="#"><i className="fab fa-dribbble"></i></a>
                                            <a href="#"><i className="fab fa-whatsapp"></i></a>
                                            <a href="#"><i className="fab fa-youtube"></i></a>
                                        </div>
                                    </div>

                                    {/* Tag Widget */}
                                    <div className="widget tag">
                                        <h5 className="widget-title">Popular Tags</h5>
                                        <div className="tag-list">
                                            {publication.tag && publication.tag.length > 0 ? (
                                                publication.tag.map((tag, index) => (
                                                    <a href="#" key={index}>{tag}</a>
                                                ))
                                            ) : (
                                                <span>No tags available</span>
                                            )}
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Blog Single End */}
            </main>
        </div>
    );
}

export default PublicationDetailPsy;