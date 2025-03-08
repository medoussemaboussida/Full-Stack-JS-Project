import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode'; // Changement ici : importation nommée
import 'react-toastify/dist/ReactToastify.css';

const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

function PublicationDetailPsy() {
    const { id } = useParams();
    const [publication, setPublication] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [commentaires, setCommentaires] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [userRole, setUserRole] = useState(null);

    const fetchPublicationDetail = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) throw new Error('No token found');

            const response = await fetch(`http://localhost:5000/users/publication/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) setPublication(data);
            else console.error('Failed to fetch publication:', data.message);
        } catch (error) {
            console.error('Error fetching publication:', error);
        }
    };

    const fetchCommentaires = async () => {
        try {
            const response = await fetch(`http://localhost:5000/users/commentaires/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) setCommentaires(data);
            else console.error('Failed to fetch commentaires:', data.message);
        } catch (error) {
            console.error('Error fetching commentaires:', error);
        }
    };

    const fetchUserRole = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) {
                console.log('No token found in localStorage');
                return;
            }

            const decoded = jwtDecode(token); // Pas de changement ici, juste l'importation corrigée
            console.log('Decoded token:', decoded);

            const response = await fetch(`http://localhost:5000/users/session/${decoded.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            console.log('Session response:', data);

            if (response.ok) {
                setUserRole(data.role);
                console.log('User role set to:', data.role);
            } else {
                console.error('Failed to fetch user role:', data.message);
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour commenter');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/users/commentaire', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ contenu: newComment, publication_id: id }),
            });

            const result = await response.json();
            if (response.ok) {
                setCommentaires([result.commentaire, ...commentaires]);
                setNewComment('');
                toast.success('Commentaire ajouté avec succès');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur lors de l'ajout du commentaire: ${error.message}`);
        }
    };

    useEffect(() => {
        Promise.all([fetchPublicationDetail(), fetchCommentaires(), fetchUserRole()]).finally(() => setIsLoading(false));
    }, [id]);

    console.log('Current userRole:', userRole);

    if (isLoading) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
    if (!publication) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Publication not found</div>;

    return (
        <div>
            <main className="main">
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Publication Details</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Publication Details</li>
                        </ul>
                    </div>
                </div>

                <div className="blog-single py-120">
                    <div className="container">
                        <div className="row g-4">
                            <div className="col-lg-8">
                                <div className="blog-single-wrap">
                                    <div className="blog-single-content">
                                        <div className="blog-thumb-img">
                                            <img
                                                src={publication.imagePublication ? `http://localhost:5000${publication.imagePublication}` : 'assets/img/blog/single.jpg'}
                                                alt={stripHtmlTags(publication.titrePublication)}
                                            />
                                        </div>
                                        <div className="blog-info">
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
                                            <div className="blog-details">
                                                <h3 className="blog-details-title mb-20">{stripHtmlTags(publication.titrePublication)}</h3>
                                                <p className="mb-20">{stripHtmlTags(publication.description)}</p>
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
                                            <div className="blog-author">
                                                <div className="blog-author-img">
                                                    <img src="assets/img/blog/author.jpg" alt="" />
                                                </div>
                                                <div className="author-info">
                                                    <h6>Author</h6>
                                                    <h3 className="author-name">{publication.author_id?.username || 'Shelly Frederick'}</h3>
                                                    <p>It is a long established fact that a reader will be distracted by the abcd readable content.</p>
                                                    <div className="author-social">
                                                        <a href="#"><i className="fab fa-facebook-f"></i></a>
                                                        <a href="#"><i className="fab fa-x-twitter"></i></a>
                                                        <a href="#"><i className="fab fa-instagram"></i></a>
                                                        <a href="#"><i className="fab fa-whatsapp"></i></a>
                                                        <a href="#"><i className="fab fa-youtube"></i></a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="blog-comment">
                                                <h3>Comments ({commentaires.length})</h3>
                                                <div className="blog-comment-wrap">
                                                    {commentaires.length > 0 ? (
                                                        commentaires.map((comment, index) => (
                                                            <div key={index} className="blog-comment-item">
                                                                <img src="assets/img/blog/com-1.jpg" alt="thumb" />
                                                                <div className="blog-comment-content">
                                                                    <h5>{comment.auteur_id?.username || 'Unknown'}</h5>
                                                                    <span><i className="far fa-clock"></i> {new Date(comment.dateCreation).toLocaleDateString()}</span>
                                                                    <p>{comment.contenu}</p>
                                                                    <a href="#"><i className="far fa-reply"></i> Reply</a>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>No comments yet.</p>
                                                    )}
                                                </div>
                                                {/* Contenu spécifique selon le rôle */}
                                                {userRole === 'student' && (
                                                    <div className="blog-comment-form">
                                                        <h3>Leave A Comment</h3>
                                                        <form onSubmit={handleCommentSubmit}>
                                                            <div className="row">
                                                                <div className="col-md-12">
                                                                    <div className="form-group">
                                                                        <div className="form-icon">
                                                                            <i className="far fa-pen"></i>
                                                                            <textarea
                                                                                name="message"
                                                                                value={newComment}
                                                                                onChange={(e) => setNewComment(e.target.value)}
                                                                                cols="30"
                                                                                rows="5"
                                                                                className="form-control"
                                                                                placeholder="Your Comment*"
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <button type="submit" className="theme-btn">
                                                                        Post Comment <i className="far fa-paper-plane"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}
                                                {userRole === 'psychiatrist' && (
                                                    <div className="psychiatrist-actions">
                                                        <h3>Psychiatrist Actions</h3>
                                                        <p>You can manage this publication or perform specific actions here.</p>
                                                        <button className="theme-btn" onClick={() => toast.info('Feature coming soon!')}>
                                                            Manage Publication <i className="fas fa-tools"></i>
                                                        </button>
                                                    </div>
                                                )}
                                                {!userRole && (
                                                    <p>Please log in to comment or manage this publication.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <aside className="blog-sidebar">
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
                                    </div>
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
                                    <div className="widget tag">
                                        <h5 className="widget-title">Popular Tags</h5>
                                        <div className="tag-list">
                                            {publication.tag && publication.tag.length > 0 ? (
                                                publication.tag.map((tag, index) => <a href="#" key={index}>{tag}</a>)
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
            </main>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}

export default PublicationDetailPsy;