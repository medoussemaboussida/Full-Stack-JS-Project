import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importer CKEditor
let CKEditorComponent, ClassicEditor;
try {
    CKEditorComponent = require('@ckeditor/ckeditor5-react').CKEditor;
    ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
    console.log('CKEditor loaded successfully');
} catch (error) {
    console.error('Failed to load CKEditor:', error);
}

// Fonction pour supprimer les balises HTML et retourner uniquement le texte
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
};

function Publication() {
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [publications, setPublications] = useState([]);
    const [favoritePublications, setFavoritePublications] = useState([]);
    const [pinnedPublications, setPinnedPublications] = useState([]); // État pour les publications épinglées
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        _id: '',
        titrePublication: '',
        description: '',
        imagePublication: null,
        tags: [''],
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('recent');

    const publicationsPerPage = 6;

    // Récupérer toutes les publications depuis l'API
    const fetchPublications = async () => {
        try {
            console.log('Fetching publications from API...');
            const response = await fetch(`http://localhost:5000/users/allPublication?sort=${sortOrder}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            console.log('API Response:', data);

            if (response.ok) {
                const filteredPublications = data.filter(post => post.status !== 'archived');
                setPublications(filteredPublications);
                console.log('Filtered Publications updated:', filteredPublications);
            } else {
                console.error('Failed to fetch publications:', data.message);
            }
        } catch (error) {
            console.error('Error fetching publications:', error);
        }
    };

    // Récupérer les publications favorites
    const fetchFavoritePublications = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            const response = await fetch('http://localhost:5000/users/favoritePublications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setFavoritePublications(data);
            } else {
                console.error('Failed to fetch favorite publications:', data.message);
            }
        } catch (error) {
            console.error('Error fetching favorite publications:', error);
        }
    };

    // Récupérer les publications épinglées depuis l'API
    const fetchPinnedPublications = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) return;

            const response = await fetch('http://localhost:5000/users/pinnedPublications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setPinnedPublications(data.map(pub => pub._id)); // Stocker uniquement les IDs
                console.log('Pinned Publications fetched:', data);
            } else {
                console.error('Failed to fetch pinned publications:', data.message);
            }
        } catch (error) {
            console.error('Error fetching pinned publications:', error);
        }
    };

    // Gérer le clic sur l'étoile pour ajouter/supprimer des favoris
    const handleToggleFavorite = async (publicationId) => {
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour gérer vos favoris');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/users/publication/favorite/${publicationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                fetchFavoritePublications();
            } else {
                toast.error(`Erreur: ${data.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    // Gérer l'épinglage/désépinglage via l'API
    const handlePin = async (publicationId) => {
        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour épingler une publication');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/users/publication/pin/${publicationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                // Mettre à jour localement l'état pinnedPublications
                setPinnedPublications(prev => 
                    prev.includes(publicationId) 
                        ? prev.filter(id => id !== publicationId) 
                        : [...prev, publicationId]
                );
            } else {
                toast.error(`Erreur: ${data.message}`);
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    // Gérer le changement du terme de recherche
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // Gérer le changement de l'ordre de tri
    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
        setCurrentPage(1);
    };

    // Filtrer et trier les publications avec épinglage basé sur pinnedPublications
    const displayedPublications = filterType === 'favorites' ? favoritePublications : publications;
    const filteredPublications = displayedPublications
        .filter(post => {
            const titre = stripHtmlTags(post.titrePublication).toLowerCase();
            const tag = stripHtmlTags(post.tag).toLowerCase();
            const auteur = (post.author_id?.username || 'Unknown').toLowerCase();
            const term = searchTerm.toLowerCase();
            return titre.includes(term) || auteur.includes(term) || tag.includes(term);
        })
        .sort((a, b) => {
            const isAPinned = pinnedPublications.includes(a._id);
            const isBPinned = pinnedPublications.includes(b._id);

            if (isAPinned && !isBPinned) return -1; // A épinglé, B non -> A en premier
            if (!isAPinned && isBPinned) return 1;  // B épinglé, A non -> B en premier
            // Si les deux sont épinglés ou non épinglés, tri par date
            const dateA = new Date(a.datePublication);
            const dateB = new Date(b.datePublication);
            return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
        });

    const indexOfLastPublication = currentPage * publicationsPerPage;
    const indexOfFirstPublication = indexOfLastPublication - publicationsPerPage;
    const currentPublications = filteredPublications.slice(indexOfFirstPublication, indexOfLastPublication);
    const totalPages = Math.ceil(filteredPublications.length / publicationsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleEdit = (post) => {
        let tags = [''];
        if (post.tag) {
            if (Array.isArray(post.tag)) {
                tags = post.tag.length > 0 ? post.tag : [''];
            } else if (typeof post.tag === 'string') {
                tags = post.tag.split(',').map(tag => tag.trim()).filter(tag => tag) || [''];
            }
        }

        setEditFormData({
            _id: post._id,
            titrePublication: stripHtmlTags(post.titrePublication),
            description: stripHtmlTags(post.description),
            imagePublication: null,
            tags: tags,
        });
        setPreviewImage(post.imagePublication ? `http://localhost:5000${post.imagePublication}` : '/assets/img/blog/01.jpg');
        setShowEditModal(true);
    };

    const calculateProgress = () => {
        let filledFields = 0;
        const totalFields = 4;

        if (editFormData.titrePublication.trim()) filledFields += 1;
        if (editFormData.description.trim()) filledFields += 1;
        if (editFormData.imagePublication || previewImage) filledFields += 1;
        if (editFormData.tags.some(tag => tag.trim())) filledFields += 1;

        return Math.round((filledFields / totalFields) * 100);
    };

    const progress = calculateProgress();

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'imagePublication') {
            const file = files[0];
            setEditFormData((prev) => ({ ...prev, imagePublication: file }));
            if (file) {
                const imageUrl = URL.createObjectURL(file);
                setPreviewImage(imageUrl);
            } else {
                setPreviewImage(null);
            }
        } else if (name.startsWith('tag-')) {
            const index = parseInt(name.split('-')[1], 10);
            const newTags = [...editFormData.tags];
            newTags[index] = value;
            setEditFormData((prev) => ({ ...prev, tags: newTags }));
        } else {
            setEditFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleEditorChange = (field) => (event, editor) => {
        const data = editor.getData();
        setEditFormData((prev) => ({ ...prev, [field]: data }));
    };

    const addTagField = () => {
        setEditFormData((prev) => ({ ...prev, tags: [...prev.tags, ''] }));
    };

    const removeTagField = (index) => {
        setEditFormData((prev) => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index),
        }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error('Vous devez être connecté pour modifier une publication');
            setIsSubmitting(false);
            return;
        }

        const data = new FormData();
        data.append('titrePublication', editFormData.titrePublication);
        data.append('description', editFormData.description);
        if (editFormData.imagePublication) {
            data.append('imagePublication', editFormData.imagePublication);
        }
        data.append('tag', editFormData.tags.filter(tag => tag.trim()).join(','));

        try {
            const response = await fetch(`http://localhost:5000/users/publication/update/${editFormData._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: data,
            });

            const result = await response.json();
            console.log('Update API Response:', result);

            if (response.ok) {
                setPublications((prevPublications) =>
                    prevPublications.map((post) =>
                        post._id === editFormData._id
                            ? { ...post, ...result.publication, author_id: post.author_id }
                            : post
                    )
                );
                toast.success('Publication successfully updated', { autoClose: 3000 });
                setShowEditModal(false);
            } else {
                toast.error(`Échec de la mise à jour : ${result.message}`, { autoClose: 3000 });
            }
        } catch (error) {
            toast.error(`Erreur lors de la mise à jour : ${error.message}`, { autoClose: 3000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (publicationId) => {
        const toastId = toast(
            <div>
                <p>Are you sure you want to delete this publication?</p>
                <button
                    onClick={async () => {
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
                                setFavoritePublications(favoritePublications.filter(post => post._id !== publicationId));
                                setPinnedPublications(pinnedPublications.filter(id => id !== publicationId)); // Retirer des épinglés
                                toast.success('Publication successfully deleted', { autoClose: 3000 });
                            } else {
                                const data = await response.json();
                                toast.error(`Échec de la suppression : ${data.message}`, { autoClose: 3000 });
                            }
                        } catch (error) {
                            toast.error(`Erreur lors de la suppression : ${error.message}`, { autoClose: 3000 });
                        } finally {
                            toast.dismiss(toastId);
                        }
                    }}
                    style={{ marginRight: '10px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
                >
                    Yes
                </button>
                <button
                    onClick={() => toast.dismiss(toastId)}
                    style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
                >
                    No
                </button>
            </div>,
            { autoClose: false, closeOnClick: false, draggable: false }
        );
    };

    const handleArchive = (publicationId) => {
        const toastId = toast(
            <div>
                <p>Are you sure you want to archive this publication?</p>
                <button
                    onClick={async () => {
                        try {
                            const token = localStorage.getItem('jwt-token');
                            const response = await fetch(`http://localhost:5000/users/publication/${publicationId}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: 'archived' }),
                            });

                            if (response.ok) {
                                setPublications(publications.filter(post => post._id !== publicationId));
                                setFavoritePublications(favoritePublications.filter(post => post._id !== publicationId));
                                setPinnedPublications(pinnedPublications.filter(id => id !== publicationId)); // Retirer des épinglés
                                toast.success('Publication successfully archived', { autoClose: 3000 });
                            } else {
                                const data = await response.json();
                                toast.error(`Échec de l'archivage : ${data.message}`, { autoClose: 3000 });
                            }
                        } catch (error) {
                            toast.error(`Erreur lors de l'archivage : ${error.message}`, { autoClose: 3000 });
                        } finally {
                            toast.dismiss(toastId);
                        }
                    }}
                    style={{ marginRight: '10px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
                >
                    Yes
                </button>
                <button
                    onClick={() => toast.dismiss(toastId)}
                    style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
                >
                    No
                </button>
            </div>,
            { autoClose: false, closeOnClick: false, draggable: false }
        );
    };

    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserId(decoded.id);
                const fetchUser = async () => {
                    try {
                        const response = await fetch(`http://localhost:5000/users/session/${decoded.id}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const data = await response.json();
                        if (response.ok) {
                            setUserRole(data.role);
                            console.log('User Role:', data.role);
                            if (data.role === 'student') {
                                fetchFavoritePublications();
                            }
                            fetchPinnedPublications(); // Charger les publications épinglées au démarrage
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

        fetchPublications();
    }, [sortOrder]);

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
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                {userRole === 'student' && (
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '5px',
                                            border: '1px solid #ccc',
                                            fontSize: '16px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="all">All Publications</option>
                                        <option value="favorites">Favorite Publications</option>
                                    </select>
                                )}
                                {userRole === 'psychiatrist' && (
                                    <div style={{ display: 'flex', gap: '15px' }}>
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
                                        <a
                                            href="/PublicationPsychiatristAll"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                background: '#28a745',
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
                        </div>

                        {/* Conteneur pour la barre de recherche et le tri par date */}
                        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Barre de recherche */}
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Search ..."
                                style={{
                                    width: '60%',
                                    maxWidth: '600px',
                                    padding: '15px 20px',
                                    borderRadius: '25px',
                                    border: 'none',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                                    fontSize: '16px',
                                    color: '#333',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                }}
                                onFocus={(e) => {
                                    e.target.style.boxShadow = '0 6px 20px rgba(14, 165, 230, 0.3)';
                                    e.target.style.width = '65%';
                                }}
                                onBlur={(e) => {
                                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                                    e.target.style.width = '60%';
                                }}
                            />
                            {/* Sélecteur de tri par date */}
                            <select
                                value={sortOrder}
                                onChange={handleSortChange}
                                style={{
                                    padding: '15px 20px',
                                    borderRadius: '25px',
                                    border: 'none',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                                    fontSize: '16px',
                                    color: '#333',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    width: '200px',
                                    cursor: 'pointer',
                                }}
                                onFocus={(e) => {
                                    e.target.style.boxShadow = '0 6px 20px rgba(14, 165, 230, 0.3)';
                                    e.target.style.width = '220px';
                                }}
                                onBlur={(e) => {
                                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                                    e.target.style.width = '200px';
                                }}
                            >
                                <option value="recent">Most Recent</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {currentPublications.length > 0 ? (
                                currentPublications.map((post, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.3s ease',
                                            border: pinnedPublications.includes(post._id) ? '2px solid #ffd700' : 'none', // Bordure dorée si épinglé
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#666', flexWrap: 'wrap' }}>
                                                <span>
                                                    <i className="far fa-user-circle" style={{ marginRight: '5px' }}></i>
                                                    By {post.author_id?.username || 'Unknown'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <span>
                                                        <i className="far fa-comments" style={{ marginRight: '5px' }}></i>
                                                        {post.commentsCount >= 0 ? `${post.commentsCount} Comment${post.commentsCount !== 1 ? 's' : ''}` : 'No Comments'}
                                                    </span>
                                                    <span>
                                                        <i className="far fa-thumbs-up" style={{ marginRight: '5px' }}></i>
                                                        {post.likeCount >= 0 ? `${post.likeCount} Like${post.likeCount !== 1 ? 's' : ''}` : 'No Likes'}
                                                    </span>
                                                    <span>
                                                        <i className="far fa-thumbs-down" style={{ marginRight: '5px' }}></i>
                                                        {post.dislikeCount >= 0 ? `${post.dislikeCount} Dislike${post.dislikeCount !== 1 ? 's' : ''}` : 'No Dislikes'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px', lineHeight: '1.4', display: 'flex', alignItems: 'center' }}>
                                                <a href={`/PublicationDetailPsy/${post._id}`} style={{ color: '#333', textDecoration: 'none' }}>
                                                    {stripHtmlTags(post.titrePublication)}
                                                </a>
                                                {userRole === 'student' && (
                                                    <button
                                                        onClick={() => handleToggleFavorite(post._id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                            color: favoritePublications.some(fav => fav._id === post._id) ? '#ffd700' : '#ccc',
                                                            marginLeft: '10px',
                                                        }}
                                                    >
                                                        <i className="fas fa-star"></i>
                                                    </button>
                                                )}
                                            </h4>
                                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                                                {stripHtmlTags(post.description).length > 100
                                                    ? `${stripHtmlTags(post.description).substring(0, 100)}...`
                                                    : stripHtmlTags(post.description)}
                                            </p>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <a
                                                    href={`/PublicationDetailPsy/${post._id}`}
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
                                                    View <i className="fas fa-circle-arrow-right" style={{ marginLeft: '5px' }}></i>
                                                </a>
                                                {userRole === 'psychiatrist' && userId === post.author_id?._id && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(post)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                background: '#28a745',
                                                                color: '#fff',
                                                                padding: '10px 20px',
                                                                borderRadius: '5px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.3s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = '#218838'}
                                                            onMouseLeave={(e) => e.target.style.background = '#28a745'}
                                                        >
                                                            Edit <i className="fas fa-edit" style={{ marginLeft: '5px' }}></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(post._id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                background: '#dc3545',
                                                                color: '#fff',
                                                                padding: '10px 20px',
                                                                borderRadius: '5px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.3s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = '#c82333'}
                                                            onMouseLeave={(e) => e.target.style.background = '#dc3545'}
                                                        >
                                                            Delete <i className="fas fa-trash" style={{ marginLeft: '5px' }}></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleArchive(post._id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                background: '#6c757d',
                                                                color: '#fff',
                                                                padding: '10px 20px',
                                                                borderRadius: '5px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.3s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = '#5a6268'}
                                                            onMouseLeave={(e) => e.target.style.background = '#6c757d'}
                                                        >
                                                            Archive <i className="fas fa-archive" style={{ marginLeft: '5px' }}></i>
                                                        </button>
                                                    </>
                                                )}
                                                {/* Bouton Pin pour toutes les publications */}
                                                <button
                                                    onClick={() => handlePin(post._id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        background: pinnedPublications.includes(post._id) ? '#ffd700' : '#ff9800',
                                                        color: '#fff',
                                                        padding: '10px 20px',
                                                        borderRadius: '5px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.3s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = pinnedPublications.includes(post._id) ? '#ffca28' : '#f57c00'}
                                                    onMouseLeave={(e) => e.target.style.background = pinnedPublications.includes(post._id) ? '#ffd700' : '#ff9800'}
                                                >
                                                    {pinnedPublications.includes(post._id) ? 'Unpin' : 'Pin'} <i className="fas fa-thumbtack" style={{ marginLeft: '5px' }}></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', gridColumn: 'span 3' }}>
                                    <p>No publications available.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
                            <ul style={{ display: 'flex', listStyle: 'none', padding: 0, gap: '10px' }}>
                                <li>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            background: currentPage === 1 ? '#e0e0e0' : '#fff',
                                            color: currentPage === 1 ? '#999' : '#333',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            border: 'none',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            transition: 'background 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => currentPage !== 1 && (e.target.style.background = '#f1f1f1')}
                                        onMouseLeave={(e) => currentPage !== 1 && (e.target.style.background = '#fff')}
                                    >
                                        <i className="fas fa-arrow-left"></i>
                                    </button>
                                </li>
                                {Array.from({ length: totalPages }, (_, index) => (
                                    <li key={index + 1}>
                                        <button
                                            onClick={() => handlePageChange(index + 1)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '40px',
                                                height: '40px',
                                                background: currentPage === index + 1 ? '#0ea5e6' : '#fff',
                                                color: currentPage === index + 1 ? '#fff' : '#333',
                                                borderRadius: '5px',
                                                textDecoration: 'none',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => currentPage !== index + 1 && (e.target.style.background = '#f1f1f1')}
                                            onMouseLeave={(e) => currentPage !== index + 1 && (e.target.style.background = '#fff')}
                                        >
                                            {index + 1}
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            background: currentPage === totalPages ? '#e0e0e0' : '#fff',
                                            color: currentPage === totalPages ? '#999' : '#333',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                            border: 'none',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            transition: 'background 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => currentPage !== totalPages && (e.target.style.background = '#f1f1f1')}
                                        onMouseLeave={(e) => currentPage !== totalPages && (e.target.style.background = '#fff')}
                                    >
                                        <i className="fas fa-arrow-right"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal pour éditer une publication */}
            {showEditModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            padding: '30px',
                            borderRadius: '10px',
                            width: '800px',
                            maxWidth: '90%',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr',
                            gap: '30px',
                        }}
                    >
                        {/* Section gauche : Formulaire */}
                        <div>
                            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Edit Publication</h3>
                            <form onSubmit={handleSaveEdit}>
                                <div style={{ marginBottom: '30px' }}>
                                    <h5>Title</h5>
                                    <div style={{ marginBottom: '20px' }}>
                                        {CKEditorComponent && ClassicEditor ? (
                                            <CKEditorComponent
                                                editor={ClassicEditor}
                                                data={editFormData.titrePublication}
                                                onChange={handleEditorChange('titrePublication')}
                                                config={{
                                                    placeholder: 'Enter publication title here...',
                                                    toolbar: ['bold', 'italic', 'link', '|', 'undo', 'redo'],
                                                    height: 100,
                                                }}
                                            />
                                        ) : (
                                            <textarea
                                                name="titrePublication"
                                                value={editFormData.titrePublication}
                                                onChange={handleChange}
                                                placeholder="CKEditor failed to load. Use this textarea instead."
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    borderRadius: '5px',
                                                    border: '1px solid #ccc',
                                                    fontSize: '16px',
                                                    minHeight: '50px',
                                                }}
                                            />
                                        )}
                                    </div>

                                    <h5>Description</h5>
                                    <div style={{ marginBottom: '20px' }}>
                                        {CKEditorComponent && ClassicEditor ? (
                                            <CKEditorComponent
                                                editor={ClassicEditor}
                                                data={editFormData.description}
                                                onChange={handleEditorChange('description')}
                                                config={{
                                                    placeholder: 'Enter publication content here...',
                                                    toolbar: [
                                                        'heading', '|',
                                                        'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                                                        'undo', 'redo',
                                                    ],
                                                }}
                                            />
                                        ) : (
                                            <textarea
                                                name="description"
                                                value={editFormData.description}
                                                onChange={handleChange}
                                                placeholder="CKEditor failed to load. Use this textarea instead."
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    borderRadius: '5px',
                                                    border: '1px solid #ccc',
                                                    fontSize: '16px',
                                                    minHeight: '150px',
                                                }}
                                            />
                                        )}
                                    </div>

                                    <h5>Tags</h5>
                                    {editFormData.tags.map((tag, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                            <input
                                                type="text"
                                                name={`tag-${index}`}
                                                value={tag}
                                                onChange={handleChange}
                                                placeholder={`Tag ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    borderRadius: '5px',
                                                    border: '1px solid #ccc',
                                                    fontSize: '16px',
                                                    outline: 'none',
                                                    marginRight: '10px',
                                                }}
                                            />
                                            {index > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTagField(index)}
                                                    style={{
                                                        background: '#ff4d4d',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        padding: '5px 10px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    -
                                                </button>
                                            )}
                                            {index === editFormData.tags.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={addTagField}
                                                    style={{
                                                        background: '#0ea5e6',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        padding: '5px 10px',
                                                        cursor: 'pointer',
                                                        marginLeft: '10px',
                                                    }}
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div style={{ marginBottom: '20px' }}>
                                        <input
                                            type="file"
                                            name="imagePublication"
                                            accept="image/*"
                                            onChange={handleChange}
                                            style={{ display: 'none' }}
                                            id="editImageUpload"
                                        />
                                        <label
                                            htmlFor="editImageUpload"
                                            style={{
                                                display: 'inline-block',
                                                background: '#0ea5e6',
                                                color: '#fff',
                                                padding: '10px 20px',
                                                borderRadius: '5px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Update Photo
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            background: isSubmitting ? '#ccc' : '#0ea5e6',
                                            color: '#fff',
                                            padding: '12px 24px',
                                            borderRadius: '5px',
                                            border: 'none',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        style={{
                                            background: '#f44336',
                                            color: '#fff',
                                            padding: '12px 24px',
                                            borderRadius: '5px',
                                            border: 'none',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Section droite : Sidebar */}
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={previewImage || '/assets/img/blog/01.jpg'}
                                    alt="Preview"
                                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px' }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        background: '#0ea5e6',
                                        color: '#fff',
                                        padding: '5px 10px',
                                        borderRadius: '5px',
                                    }}
                                >
                                    <span style={{ display: 'block', fontSize: '18px', fontWeight: '600' }}>{new Date().getDate()}</span>
                                    <span style={{ fontSize: '12px' }}>{new Date().toLocaleString('default', { month: 'short' })}</span>
                                </div>
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px' }}>
                                    <div dangerouslySetInnerHTML={{ __html: editFormData.titrePublication || 'Title not defined' }} />
                                </h3>
                                <div>
                                    <div
                                        style={{ marginTop: '5px' }}
                                        dangerouslySetInnerHTML={{ __html: editFormData.description || 'No description yet' }}
                                    />
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <strong>Tags:</strong> {editFormData.tags.filter(tag => tag.trim()).join(', ') || 'No tags yet'}
                                </div>
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ background: '#e0e0e0', height: '10px', borderRadius: '5px', position: 'relative' }}>
                                        <div
                                            style={{
                                                width: `${progress}%`,
                                                background: '#0ea5e6',
                                                height: '100%',
                                                borderRadius: '5px',
                                            }}
                                        ></div>
                                        <span style={{ position: 'absolute', top: '-25px', right: '15%', fontSize: '14px', color: '#0ea5e6' }}>
                                            {progress}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Toast Container */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </div>
    );
}

export default Publication;