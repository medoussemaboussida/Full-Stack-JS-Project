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
        scheduledDate: '',
        publishNow: true,
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortOrder, setSortOrder] = useState('recent');
    const [filterStatus, setFilterStatus] = useState('all');

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

    const handleEdit = (post) => {
        console.log('post.tag:', post.tag, 'typeof:', typeof post.tag);
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
            scheduledDate: post.scheduledDate || '',
            publishNow: !post.scheduledDate,
        });
        setPreviewImage(post.imagePublication ? `http://localhost:5000${post.imagePublication}` : 'assets/img/donation/01.jpg');
        setShowEditModal(true);
    };

    const calculateProgress = () => {
        let filledFields = 0;
        const totalFields = 5;

        if (editFormData.titrePublication.trim()) filledFields += 1;
        if (editFormData.description.trim()) filledFields += 1;
        if (editFormData.imagePublication || previewImage) filledFields += 1;
        if (editFormData.tags.some(tag => tag.trim())) filledFields += 1;
        if (editFormData.publishNow || editFormData.scheduledDate) filledFields += 1;

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
        } else if (name === 'publishNow') {
            setEditFormData((prev) => ({ ...prev, publishNow: value === 'true', scheduledDate: value === 'true' ? '' : prev.scheduledDate }));
        } else if (name === 'scheduledDate') {
            setEditFormData((prev) => ({ ...prev, scheduledDate: value }));
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
        // Ajout du statut explicite en fonction de publishNow
        data.append('status', editFormData.publishNow ? 'published' : 'later');
        data.append('scheduledDate', editFormData.publishNow ? '' : editFormData.scheduledDate); // Vide si publié maintenant

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
                    post._id === editFormData._id ? { 
                        ...post, 
                        ...result.publication, 
                        status: editFormData.publishNow ? 'published' : 'later', // Mise à jour explicite du statut
                        scheduledDate: editFormData.publishNow ? null : editFormData.scheduledDate // Mise à jour de scheduledDate
                    } : post
                ));
                toast.success('Publication updated successfully', { autoClose: 3000 });
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
                                toast.success(`Publication deleted successfully`, { autoClose: 3000 });
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
                                setPublications(publications.map(post =>
                                    post._id === publicationId ? { ...post, status: 'archived' } : post
                                ));
                                toast.success(`Publication archived successfully`, { autoClose: 3000 });
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
                                toast.success(`Publication restored successfully`, { autoClose: 3000 });
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

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    const handleFilterStatusChange = (e) => {
        setFilterStatus(e.target.value);
    };

    const filteredPublications = publications
        .filter(post => {
            const titre = stripHtmlTags(post.titrePublication).toLowerCase();
            const description = stripHtmlTags(post.description).toLowerCase();
            const term = searchTerm.toLowerCase();
            const publicationDate = new Date(post.datePublication).toISOString().split('T')[0];
            const matchesSearch = titre.includes(term) || description.includes(term);
            const matchesDate = selectedDate ? publicationDate === selectedDate : true;
            const matchesStatus = filterStatus === 'all' ? true : post.status === filterStatus;

            return matchesSearch && matchesDate && matchesStatus;
        })
        .sort((a, b) => {
            const dateA = new Date(a.datePublication);
            const dateB = new Date(b.datePublication);
            return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
        });

    useEffect(() => {
        fetchMyPublications();
    }, [sortOrder]);

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
                        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
                            <select
                                value={filterStatus}
                                onChange={handleFilterStatusChange}
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
                                <option value="all">All Publications</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                                <option value="later">Scheduled (Later)</option>
                            </select>
                        </div>
                        <div className="row g-4">
                            {filteredPublications.length > 0 ? (
                                filteredPublications.map((post, index) => (
                                    <div className="col-lg-4" key={index}>
                                        <div className="donation-item" style={{ opacity: (post.status === 'archived' || post.status === 'later') ? 0.6 : 1 }}>
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
                                                    {(post.status === 'archived' || post.status === 'later') && (
                                                        <span style={{ color: '#6c757d', fontSize: '14px', marginLeft: '10px' }}>
                                                            {post.status === 'archived' ? '(Archived)' : '(Scheduled)'}
                                                        </span>
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
                                                    ) : post.status !== 'later' && (
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

                                    {publications.find(post => post._id === editFormData._id)?.status === 'later' && (
                                        <>
                                            <h5 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#333' }}>
                                                Publication Schedule
                                            </h5>
                                            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            color: '#555',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            transition: 'background-color 0.3s ease, color 0.3s ease',
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="publishNow"
                                                            value="true"
                                                            checked={editFormData.publishNow}
                                                            onChange={handleChange}
                                                            style={{
                                                                appearance: 'none',
                                                                width: '18px',
                                                                height: '18px',
                                                                border: '2px solid #0ea5e6',
                                                                borderRadius: '50%',
                                                                backgroundColor: editFormData.publishNow ? '#0ea5e6' : '#fff',
                                                                cursor: 'pointer',
                                                                position: 'relative',
                                                                transition: 'background-color 0.2s ease',
                                                            }}
                                                        />
                                                        Publish Now
                                                    </label>
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            color: '#555',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            transition: 'background-color 0.3s ease, color 0.3s ease',
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="publishNow"
                                                            value="false"
                                                            checked={!editFormData.publishNow}
                                                            onChange={handleChange}
                                                            style={{
                                                                appearance: 'none',
                                                                width: '18px',
                                                                height: '18px',
                                                                border: '2px solid #0ea5e6',
                                                                borderRadius: '50%',
                                                                backgroundColor: !editFormData.publishNow ? '#0ea5e6' : '#fff',
                                                                cursor: 'pointer',
                                                                position: 'relative',
                                                                transition: 'background-color 0.2s ease',
                                                            }}
                                                        />
                                                        Schedule for Later <span style={{ fontSize: '12px', color: '#888' }}>(will be archived until scheduled date)</span>
                                                    </label>
                                                </div>
                                                {!editFormData.publishNow && (
                                                    <div style={{ position: 'relative', maxWidth: '300px' }}>
                                                        <input
                                                            type="datetime-local"
                                                            name="scheduledDate"
                                                            value={editFormData.scheduledDate}
                                                            onChange={handleChange}
                                                            min={new Date().toISOString().slice(0, 16)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 40px 12px 12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #ddd',
                                                                fontSize: '16px',
                                                                color: '#333',
                                                                backgroundColor: '#fff',
                                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                                outline: 'none',
                                                                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                                                            }}
                                                            onFocus={(e) => {
                                                                e.target.style.borderColor = '#0ea5e6';
                                                                e.target.style.boxShadow = '0 0 8px rgba(14, 165, 230, 0.3)';
                                                            }}
                                                            onBlur={(e) => {
                                                                e.target.style.borderColor = '#ddd';
                                                                e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                right: '12px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                color: '#888',
                                                                fontSize: '18px',
                                                                pointerEvents: 'none',
                                                            }}
                                                        >
                                                            📅
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

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
                                {publications.find(post => post._id === editFormData._id)?.status === 'later' && (
                                    <div style={{ marginTop: '10px' }}>
                                        <strong>Scheduled:</strong> {editFormData.publishNow ? 'Now' : (editFormData.scheduledDate ? new Date(editFormData.scheduledDate).toLocaleString() : 'Not set')}
                                    </div>
                                )}
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