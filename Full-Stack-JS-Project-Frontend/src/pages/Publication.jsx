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

    // Fonction pour ouvrir le modal d'édition
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
            console.log('Update API Response:', result);

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

    // Fonction pour supprimer une publication
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
                                toast.success('Publication supprimée avec succès', { autoClose: 3000 });
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

    // Fonction pour archiver une publication
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
                                toast.success('Publication archivée avec succès', { autoClose: 3000 });
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