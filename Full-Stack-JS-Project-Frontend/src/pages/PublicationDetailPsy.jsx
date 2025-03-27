import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import EmojiPicker from 'emoji-picker-react';
import { Filter } from 'bad-words';
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
    const [userId, setUserId] = useState(null);
    const [editCommentId, setEditCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [relatedPublications, setRelatedPublications] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false); // État pour le popup de signalement
    const [reportReason, setReportReason] = useState(''); // Raison du signalement
    const [reportCustomReason, setReportCustomReason] = useState(''); // Texte personnalisé pour "other"

    const BASE_URL = "http://localhost:5000";
    const ANONYMOUS_PHOTO = '/assets/img/anonymous_member.png';

    const filter = new Filter();
    filter.addWords('con', 'salope', 'connard', 'merde', 'putain');

    const containsBadWords = (text) => filter.isProfane(text);

    const fetchPublicationDetail = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) throw new Error('No token found');

            const response = await fetch(`${BASE_URL}/users/publication/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setPublication(data);
                return data;
            } else {
                console.error('Failed to fetch publication:', data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching publication:', error);
            return null;
        }
    };

    const fetchCommentaires = async () => {
        try {
            const response = await fetch(`${BASE_URL}/users/commentaires/${id}`, {
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

    const fetchUserInfo = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) return;

            const decoded = jwtDecode(token);
            setUserId(decoded.id);

            const response = await fetch(`${BASE_URL}/users/session/${decoded.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setUserRole(data.role);
            else console.error('Failed to fetch user role:', data.message);
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchRelatedPublications = async (tags) => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token || !tags || tags.length === 0) {
                setRelatedPublications([]);
                return;
            }

            const response = await fetch(`${BASE_URL}/users/publications/by-tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ tags }),
            });

            const data = await response.json();
            if (response.ok) {
                const filteredPublications = data.filter(pub => pub._id !== id).slice(0, 3);
                setRelatedPublications(filteredPublications);
            } else {
                setRelatedPublications([]);
            }
        } catch (error) {
            setRelatedPublications([]);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour commenter');
            return;
        }

        if (containsBadWords(newComment)) {
            toast.error('Votre commentaire contient des mots inappropriés.');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/commentaire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ contenu: newComment, publication_id: id, isAnonymous }),
            });

            const result = await response.json();
            if (response.ok) {
                setCommentaires([result.commentaire, ...commentaires]);
                setNewComment('');
                setShowEmojiPicker(false);
                setIsAnonymous(false);
                toast.success('Commentaire ajouté avec succès');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleEditComment = (e, comment) => {
        e.preventDefault();
        setEditCommentId(comment._id);
        setEditCommentContent(comment.contenu);
    };

    const handleUpdateComment = async (commentId) => {
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour modifier un commentaire');
            return;
        }

        if (containsBadWords(editCommentContent)) {
            toast.error('Votre commentaire modifié contient des mots inappropriés.');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/commentaire/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ contenu: editCommentContent }),
            });

            const result = await response.json();
            if (response.ok) {
                setCommentaires(commentaires.map(c => 
                    c._id === commentId ? { ...c, contenu: editCommentContent } : c
                ));
                setEditCommentId(null);
                setEditCommentContent('');
                setShowEditEmojiPicker(false);
                toast.success('Commentaire modifié avec succès');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleDeleteComment = async (e, commentId) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour supprimer un commentaire');
            return;
        }

        const toastId = toast.info(
            <div>
                <p>Voulez-vous vraiment supprimer ce commentaire ?</p>
                <button
                    onClick={async () => {
                        toast.dismiss(toastId);
                        try {
                            const response = await fetch(`${BASE_URL}/users/commentaire/${commentId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` },
                            });

                            if (response.ok) {
                                setCommentaires(commentaires.filter(c => c._id !== commentId));
                                toast.success('Commentaire supprimé avec succès');
                            } else {
                                const result = await response.json();
                                toast.error(`Erreur: ${result.message}`);
                            }
                        } catch (error) {
                            toast.error(`Erreur: ${error.message}`);
                        }
                    }}
                    style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px' }}
                >
                    Oui
                </button>
                <button
                    onClick={() => toast.dismiss(toastId)}
                    style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '3px' }}
                >
                    Non
                </button>
            </div>,
            { autoClose: false, closeOnClick: false, draggable: false }
        );
    };

    const handleLike = async () => {
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour aimer une publication');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/publication/like/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });

            const result = await response.json();
            if (response.ok) {
                setPublication(result.publication);
                toast.success('Publication aimée avec succès');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleDislike = async () => {
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour désapprouver une publication');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/publication/dislike/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });

            const result = await response.json();
            if (response.ok) {
                setPublication(result.publication);
                toast.success('Publication désapprouvée avec succès');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setNewComment(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleEditEmojiClick = (emojiObject) => {
        setEditCommentContent(prev => prev + emojiObject.emoji);
        setShowEditEmojiPicker(false);
    };

    const toggleShareOptions = (e) => {
        e.preventDefault();
        setShowShareOptions(!showShareOptions);
    };

    const shareOnTwitter = () => {
        if (!publication) return;
        const url = `${window.location.origin}/PublicationDetailPsy/${id}`;
        const text = `${stripHtmlTags(publication.titrePublication)} - ${stripHtmlTags(publication.description)}`;
        const truncatedText = text.length > 280 - url.length - 1 ? text.substring(0, 280 - url.length - 3) + '...' : text;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(truncatedText)}`, '_blank');
    };

    const shareOnWhatsApp = () => {
        if (!publication) return;
        const url = `${window.location.origin}/PublicationDetailPsy/${id}`;
        const text = `${stripHtmlTags(publication.titrePublication)} - ${stripHtmlTags(publication.description)} - ${url}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Fonction pour gérer le signalement
    const handleReportSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour signaler une publication');
            setShowReportModal(false);
            return;
        }

        if (!reportReason) {
            toast.error('Veuillez sélectionner une raison de signalement');
            return;
        }

        if (reportReason === 'other' && !reportCustomReason.trim()) {
            toast.error('Veuillez préciser la raison dans le champ texte');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/publication/report/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reason: reportReason,
                    customReason: reportReason === 'other' ? reportCustomReason : undefined,
                }),
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('Publication signalée avec succès');
                setShowReportModal(false);
                setReportReason('');
                setReportCustomReason('');
            } else {
                toast.error(`Erreur: ${result.message}`);
            }
        } catch (error) {
            toast.error(`Erreur lors du signalement: ${error.message}`);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [publicationData] = await Promise.all([
                fetchPublicationDetail(),
                fetchCommentaires(),
                fetchUserInfo(),
            ]);
            if (publicationData && publicationData.tag && publicationData.tag.length > 0) {
                await fetchRelatedPublications(publicationData.tag);
            }
            setIsLoading(false);
        };

        loadData();
    }, [id]);

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
                                                src={publication.imagePublication ? `${BASE_URL}${publication.imagePublication}` : 'assets/img/blog/single.jpg'}
                                                alt={stripHtmlTags(publication.titrePublication)}
                                            />
                                        </div>
                                        <div className="blog-info">
                                            <div className="blog-meta">
                                                <div className="blog-meta-left">
                                                    <ul>
                                                        <li><i className="far fa-user"></i>{publication.author_id?.username || 'Unknown'}</li>
                                                        <li><i className="far fa-calendar"></i>{new Date(publication.datePublication).toLocaleDateString()}</li>
                                                        <li><i className="far fa-eye"></i>{publication.viewCount || 0} vues</li>
                                                    </ul>
                                                </div>
                                                <div className="blog-meta-right">
                                                    <a href="#" className="share-link" onClick={toggleShareOptions}>
                                                        <i className="far fa-share-alt"></i> Share
                                                    </a>
                                                    {showShareOptions && (
                                                        <div className="share-options" style={{
                                                            position: 'absolute',
                                                            background: '#fff',
                                                            padding: '10px',
                                                            borderRadius: '5px',
                                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                            zIndex: 1000,
                                                            marginTop: '5px',
                                                        }}>
                                                            <a href="#" onClick={(e) => { e.preventDefault(); shareOnTwitter(); }} style={{ marginRight: '10px' }}>
                                                                <i className="fab fa-x-twitter" style={{ color: '#1da1f2', fontSize: '20px' }}></i>
                                                            </a>
                                                            <a href="#" onClick={(e) => { e.preventDefault(); shareOnWhatsApp(); }}>
                                                                <i className="fab fa-whatsapp" style={{ color: '#25d366', fontSize: '20px' }}></i>
                                                            </a>
                                                        </div>
                                                    )}
                                                    {/* Bouton de signalement */}
                                                    <a href="#" onClick={(e) => { e.preventDefault(); setShowReportModal(true); }} style={{ marginLeft: '15px' }}>
                                                        <i className="far fa-flag" title="Signaler cette publication"></i> Report
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="blog-details">
                                                <h3 className="blog-details-title mb-20">{stripHtmlTags(publication.titrePublication)}</h3>
                                                <p className="mb-20">{stripHtmlTags(publication.description)}</p>
                                                <div className="like-dislike-buttons" style={{ marginBottom: '20px' }}>
                                                    <button 
                                                        onClick={handleLike}
                                                        className="theme-btn"
                                                        style={{ marginRight: '10px', backgroundColor: publication.likes && publication.likes.includes(userId) ? '#28a745' : '#0ea5e6' }}
                                                        disabled={publication.likes && publication.likes.includes(userId)}
                                                    >
                                                        <i className="far fa-thumbs-up"></i> Like ({publication.likeCount || 0})
                                                    </button>
                                                    <button 
                                                        onClick={handleDislike}
                                                        className="theme-btn"
                                                        style={{ backgroundColor: publication.dislikes && publication.dislikes.includes(userId) ? '#dc3545' : '#6c757d' }}
                                                        disabled={publication.dislikes && publication.dislikes.includes(userId)}
                                                    >
                                                        <i className="far fa-thumbs-down"></i> Dislike ({publication.dislikeCount || 0})
                                                    </button>
                                                </div>
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
                                                    <img
                                                        src={
                                                            publication.author_id?.user_photo && publication.author_id.user_photo !== ''
                                                                ? `${BASE_URL}${publication.author_id.user_photo}`
                                                                : 'assets/img/blog/author.jpg'
                                                        }
                                                        alt={publication.author_id?.username || 'Author'}
                                                        style={{ width: '200px', height: '200px', borderRadius: '50%' }}
                                                    />
                                                </div>
                                                <div className="author-info">
                                                    <h6>Psychiatrist</h6>
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
                                                        commentaires.map((comment) => (
                                                            <div key={comment._id} className="blog-comment-item">
                                                                <img
                                                                    src={
                                                                        comment.isAnonymous 
                                                                            ? ANONYMOUS_PHOTO
                                                                            : (comment.auteur_id?.user_photo && comment.auteur_id.user_photo !== ''
                                                                                ? `${BASE_URL}${comment.auteur_id.user_photo}`
                                                                                : 'assets/img/blog/com-1 f.jpg')
                                                                    }
                                                                    alt={comment.isAnonymous ? 'Anonymous' : (comment.auteur_id?.username || 'User')}
                                                                    style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                                                                />
                                                                <div className="blog-comment-content">
                                                                    <h5>{comment.isAnonymous ? 'Anonymous' : (comment.auteur_id?.username || 'Unknown')}</h5>
                                                                    <span><i className="far fa-clock"></i> {new Date(comment.dateCreation).toLocaleDateString()}</span>
                                                                    {editCommentId === comment._id ? (
                                                                        <div style={{ position: 'relative' }}>
                                                                            <textarea
                                                                                value={editCommentContent}
                                                                                onChange={(e) => setEditCommentContent(e.target.value)}
                                                                                className="form-control"
                                                                                rows="3"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '10px',
                                                                                    right: '10px',
                                                                                    background: 'none',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    fontSize: '20px'
                                                                                }}
                                                                            >
                                                                                😊
                                                                            </button>
                                                                            {showEditEmojiPicker && (
                                                                                <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                                                    <EmojiPicker onEmojiClick={handleEditEmojiClick} />
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleUpdateComment(comment._id)}
                                                                                className="theme-btn"
                                                                                style={{ marginTop: '10px' }}
                                                                            >
                                                                                Save <i className="far fa-save"></i>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditCommentId(null)}
                                                                                className="theme-btn"
                                                                                style={{ marginTop: '10px', marginLeft: '10px', backgroundColor: '#f44336' }}
                                                                            >
                                                                                Cancel <i className="far fa-times"></i>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <p>{comment.contenu}</p>
                                                                    )}
                                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                                        <a href="#" onClick={(e) => e.preventDefault()}><i className="far fa-reply"></i> Reply</a>
                                                                        {userId && comment.auteur_id && comment.auteur_id._id && comment.auteur_id._id.toString() === userId && (
                                                                            <>
                                                                                <a href="#" onClick={(e) => handleEditComment(e, comment)}>
                                                                                    <i className="far fa-edit" title="Modifier"></i>
                                                                                </a>
                                                                                <a href="#" onClick={(e) => handleDeleteComment(e, comment._id)}>
                                                                                    <i className="far fa-trash-alt" title="Supprimer"></i>
                                                                                </a>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>No comments yet.</p>
                                                    )}
                                                </div>
                                                <div className="blog-comment-form">
                                                    <h3>Leave A Comment</h3>
                                                    <form onSubmit={handleCommentSubmit}>
                                                        <div className="row">
                                                            <div className="col-md-12">
                                                                <div className="form-group">
                                                                    <div className="form-icon" style={{ position: 'relative' }}>
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
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: '10px',
                                                                                right: '10px',
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                fontSize: '20px'
                                                                            }}
                                                                        >
                                                                            😊
                                                                        </button>
                                                                        {showEmojiPicker && (
                                                                            <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {userId && (
                                                                    <div className="form-group" style={{ marginBottom: '15px' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isAnonymous}
                                                                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                                                            />
                                                                            Post as anonymous
                                                                        </label>
                                                                    </div>
                                                                )}
                                                                <button type="submit" className="theme-btn">
                                                                    Post Comment <i className="far fa-paper-plane"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </div>
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
                                        <h5 className="widget-title">Related Posts</h5>
                                        {relatedPublications.length > 0 ? (
                                            relatedPublications.map((pub) => (
                                                <div key={pub._id} className="recent-post-item">
                                                    <div className="recent-post-img">
                                                        <img
                                                            src={pub.imagePublication ? `${BASE_URL}${pub.imagePublication}` : 'assets/img/blog/bs-1.jpg'}
                                                            alt={stripHtmlTags(pub.titrePublication)}
                                                        />
                                                    </div>
                                                    <div className="recent-post-info">
                                                        <h6>
                                                            <a href={`/PublicationDetailPsy/${pub._id}`}>
                                                                {stripHtmlTags(pub.titrePublication)}
                                                            </a>
                                                        </h6>
                                                        <span><i className="far fa-clock"></i> {new Date(pub.datePublication).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No related posts found.</p>
                                        )}
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

                {/* Popup de signalement */}
                {showReportModal && (
                    <div className="modal" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            backgroundColor: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            width: '400px',
                            maxWidth: '90%',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        }}>
                            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Report this post</h3>
                            <form onSubmit={handleReportSubmit}>
                                <div className="form-group">
                                    <label htmlFor="reportReason" style={{ display: 'block', marginBottom: '10px' }}>
                                    Reason for reporting :
                                    </label>
                                    <select
                                        id="reportReason"
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
                                        required
                                    >
                                        <option value="">Select a reason</option>
                                        <option value="inappropriate_content">inappropriate content</option>
                                        <option value="spam">Spam</option>
                                        <option value="harassment">Harassment</option>
                                        <option value="offensive_language">Offensive_language</option>
                                        <option value="misinformation">Misinformation</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                {reportReason === 'other' && (
                                    <div className="form-group">
                                        <label htmlFor="customReason" style={{ display: 'block', marginBottom: '10px' }}>
                                        Specify the reason :
                                        </label>
                                        <textarea
                                            id="customReason"
                                            value={reportCustomReason}
                                            onChange={(e) => setReportCustomReason(e.target.value)}
                                            className="form-control"
                                            rows="3"
                                            placeholder="Describe the reason here..."
                                            style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
                                            required
                                        />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button
                                        type="submit"
                                        className="theme-btn"
                                        style={{ backgroundColor: '#dc3545', padding: '10px 20px' }}
                                    >
                                        Report <i className="far fa-flag"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowReportModal(false);
                                            setReportReason('');
                                            setReportCustomReason('');
                                        }}
                                        className="theme-btn"
                                        style={{ backgroundColor: '#6c757d', padding: '10px 20px' }}
                                    >
                                        Cancel <i className="far fa-times"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}

export default PublicationDetailPsy;