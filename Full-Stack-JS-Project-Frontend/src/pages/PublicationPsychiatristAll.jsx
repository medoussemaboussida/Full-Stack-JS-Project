import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

function PublicationPsychiatristAll() {
    const [isLoading, setIsLoading] = useState(true);
    const [publications, setPublications] = useState([]);
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
    const [searchTerm, setSearchTerm] = useState(''); // État pour la barre de recherche
    const [selectedDate, setSelectedDate] = useState(''); // État pour la date sélectionnée
    const [sortOrder, setSortOrder] = useState('recent'); // Nouvel état pour le tri par date (recent ou oldest)

    // Fonction pour récupérer les publications de l'utilisateur connecté depuis l'API
    const fetchMyPublications = async () => {
        try {
            const token = localStorage.getItem('jwt-token');
            if (!token) {
                throw new Error('No token found');
            }

            console.log('Fetching my publications from API...');
            const response = await fetch(`http://localhost:5000/users/myPublications?sort=${sortOrder}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            console.log('API Response:', data);

            if (response.ok) {
                setPublications(data);
                console.log('Publications updated:', data);
            } else {
                console.error('Failed to fetch publications:', data.message);
            }
        } catch (error) {
            console.error('Error fetching publications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour ouvrir le modal d'édition
    const handleEdit = (post) => {
        console.log('post.tag:', post.tag, 'typeof:', typeof post.tag); // Debug
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
        setPreviewImage(post.imagePublication ? `http://localhost:5000${post.imagePublication}` : 'assets/img/donation/01.jpg');
        setShowEditModal(true);
    };

    // Calcul de la progression du formulaire
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

    // Gestion des changements dans le formulaire
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

    // Fonction pour sauvegarder les modifications
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
            console.log('Update API Response:', result); // Debug

            if (response.ok) {
                setPublications(publications.map(post =>
                    post._id === editFormData._id ? { ...post, ...result.publication } : post
                ));
                toast.success('Publication mise à jour avec succès', { autoClose: 3000 });
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

    // Fonction pour supprimer une publication avec Toast
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
                                toast.success(`Publication supprimée avec succès`, { autoClose: 3000 });
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

    // Fonction pour archiver une publication avec Toast
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
                                setPublications(publications.map(post =>
                                    post._id === publicationId ? { ...post, status: 'archived' } : post
                                ));
                                toast.success(`Publication archivée avec succès`, { autoClose: 3000 });
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

    // Fonction pour restaurer une publication avec Toast
    const handleRestore = (publicationId) => {
        const toastId = toast(
            <div>
                <p>Are you sure you want to restore this publication?</p>
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
                                body: JSON.stringify({ status: 'published' }),
                            });

                            if (response.ok) {
                                setPublications(publications.map(post =>
                                    post._id === publicationId ? { ...post, status: 'published' } : post
                                ));
                                toast.success(`Publication restaurée avec succès`, { autoClose: 3000 });
                            } else {
                                const data = await response.json();
                                toast.error(`Échec de la restauration : ${data.message}`, { autoClose: 3000 });
                            }
                        } catch (error) {
                            toast.error(`Erreur lors de la restauration : ${error.message}`, { autoClose: 3000 });
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

    // Gérer le changement du terme de recherche
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Gérer le changement de la date sélectionnée
    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    // Gérer le changement de l'ordre de tri
    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    // Filtrer et trier les publications
    const filteredPublications = publications
        .filter(post => {
            const titre = stripHtmlTags(post.titrePublication).toLowerCase();
            const description = stripHtmlTags(post.description).toLowerCase();
            const term = searchTerm.toLowerCase();
            const publicationDate = new Date(post.datePublication).toISOString().split('T')[0]; // Format YYYY-MM-DD

            const matchesSearch = titre.includes(term) || description.includes(term);
            const matchesDate = selectedDate ? publicationDate === selectedDate : true;

            return matchesSearch && matchesDate;
        })
        .sort((a, b) => {
            const dateA = new Date(a.datePublication);
            const dateB = new Date(b.datePublication);
            return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
        });

    useEffect(() => {
        fetchMyPublications();
    }, [sortOrder]); // Recharger les publications lorsque l'ordre de tri change

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
    }

    return (
        <div>
            <main className="main">
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Publications</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">My Publications</li>
                        </ul>
                    </div>
                </div>

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
                        {/* Conteneur pour la barre de recherche, filtre par date et tri */}
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
                            {/* Filtre par date */}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
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
                        <div className="row g-4">
                            {filteredPublications.length > 0 ? (
                                filteredPublications.map((post, index) => (
                                    <div className="col-lg-4" key={index}>
                                        <div className="donation-item" style={{ opacity: post.status === 'archived' ? 0.6 : 1 }}>
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
                                                    {post.status === 'archived' && (
                                                        <span style={{ color: '#6c757d', fontSize: '14px', marginLeft: '10px' }}>(Archived)</span>
                                                    )}
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
                                                    <button
                                                        onClick={() => handleEdit(post)}
                                                        className="theme-btn"
                                                        style={{ marginLeft: '10px', backgroundColor: '#28a745' }}
                                                    >
                                                        Edit <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(post._id)}
                                                        className="theme-btn"
                                                        style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}
                                                    >
                                                        Delete <i className="fas fa-trash"></i>
                                                    </button>
                                                    {post.status === 'archived' ? (
                                                        <button
                                                            onClick={() => handleRestore(post._id)}
                                                            className="theme-btn"
                                                            style={{ marginLeft: '10px', backgroundColor: '#007bff' }}
                                                        >
                                                            Restore <i className="fas fa-undo"></i>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleArchive(post._id)}
                                                            className="theme-btn"
                                                            style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}
                                                        >
                                                            Archive <i className="fas fa-archive"></i>
                                                        </button>
                                                    )}
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
                                    src={previewImage || 'assets/img/donation/01.jpg'}
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

export default PublicationPsychiatristAll;