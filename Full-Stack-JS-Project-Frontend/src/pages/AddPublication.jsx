import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AddPublication() {
    const [formData, setFormData] = useState({
        titrePublication: '',
        description: '',
        imagePublication: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const navigate = useNavigate();

    // Attempt to load CKEditor with error handling
    let CKEditorComponent, ClassicEditor;
    try {
        CKEditorComponent = require('@ckeditor/ckeditor5-react').CKEditor;
        ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
        console.log('CKEditor loaded successfully');
    } catch (error) {
        console.error('Failed to load CKEditor:', error);
    }

    const calculateProgress = () => {
        let filledFields = 0;
        const totalFields = 3;

        if (formData.titrePublication.trim()) filledFields += 1;
        if (formData.description.trim()) filledFields += 1;
        if (formData.imagePublication) filledFields += 1;

        return Math.round((filledFields / totalFields) * 100);
    };

    const progress = calculateProgress();

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'imagePublication') {
            const file = files[0];
            setFormData((prev) => ({ ...prev, imagePublication: file }));
            if (file) {
                const imageUrl = URL.createObjectURL(file);
                setPreviewImage(imageUrl);
            } else {
                setPreviewImage(null);
            }
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleEditorChange = (field) => (event, editor) => {
        const data = editor.getData();
        setFormData((prev) => ({ ...prev, [field]: data }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('jwt-token');
        console.log('Token récupéré depuis localStorage:', token);
        if (!token) {
            toast.error('Vous devez être connecté pour ajouter une publication');
            setIsSubmitting(false);
            return;
        }

        const data = new FormData();
        data.append('titrePublication', formData.titrePublication);
        data.append('description', formData.description);
        if (formData.imagePublication) {
            data.append('imagePublication', formData.imagePublication);
        }

        console.log('Données envoyées:', Object.fromEntries(data));

        try {
            const response = await fetch('http://localhost:5000/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: data,
            });

            const result = await response.json();
            console.log('Réponse du backend:', result);
            if (response.ok) {
                toast.success('Publication ajoutée avec succès !');
                setFormData({ titrePublication: '', description: '', imagePublication: null });
                setPreviewImage(null);
                setTimeout(() => navigate('/Publication'), 2000);
            } else {
                if (result.errors && Array.isArray(result.errors)) {
                    result.errors.forEach((error) => toast.error(error));
                } else {
                    toast.error(result.message || 'Erreur lors de l’ajout');
                }
            }
        } catch (error) {
            toast.error('Erreur réseau lors de l’ajout de la publication');
            console.error('Erreur:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'short' });

    return (
        <div>
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

            <main style={{ padding: '20px', backgroundColor: '#f9f9f9' }}>
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Add Publication</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Publication</a></li>
                            <li className="active">Add Publication</li>
                        </ul>
                    </div>
                </div>

                <div style={{ padding: '120px 0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                            <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <form onSubmit={handleSubmit}>
                                    <div style={{ marginBottom: '30px' }}>
                                        <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Publication Details</h3>
                                        {/* Title Field with CKEditor */}
                                        <h5>Title</h5>
                                        <div style={{ marginBottom: '20px' }}>
                                            {CKEditorComponent && ClassicEditor ? (
                                                <CKEditorComponent
                                                    editor={ClassicEditor}
                                                    data={formData.titrePublication}
                                                    onChange={handleEditorChange('titrePublication')}
                                                    config={{
                                                        placeholder: 'Enter publication title here...',
                                                        toolbar: ['bold', 'italic', 'link', '|', 'undo', 'redo'],
                                                        height: 100, // Smaller height for title
                                                    }}
                                                />
                                            ) : (
                                                <div>
                                                    <textarea
                                                        name="titrePublication"
                                                        value={formData.titrePublication}
                                                        onChange={handleChange}
                                                        placeholder="CKEditor failed to load. Use this textarea instead."
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px',
                                                            borderRadius: '5px',
                                                            border: '1px solid #ccc',
                                                            fontSize: '16px',
                                                            minHeight: '50px',
                                                            outline: 'none',
                                                            transition: 'border-color 0.3s ease',
                                                        }}
                                                    />
                                                    <p style={{ color: 'red', fontSize: '14px' }}>
                                                        Error: CKEditor is not available for Title. Check console.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description Field with CKEditor */}
                                        <h5>Description</h5>
                                        <div style={{ marginBottom: '20px' }}>
                                            {CKEditorComponent && ClassicEditor ? (
                                                <CKEditorComponent
                                                    editor={ClassicEditor}
                                                    data={formData.description}
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
                                                <div>
                                                    <textarea
                                                        name="description"
                                                        value={formData.description}
                                                        onChange={handleChange}
                                                        placeholder="CKEditor failed to load. Use this textarea instead."
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px',
                                                            borderRadius: '5px',
                                                            border: '1px solid #ccc',
                                                            fontSize: '16px',
                                                            minHeight: '150px',
                                                            outline: 'none',
                                                            transition: 'border-color 0.3s ease',
                                                        }}
                                                    />
                                                    <p style={{ color: 'red', fontSize: '14px' }}>
                                                        Error: CKEditor is not available for Description. Check console.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            <input
                                                type="file"
                                                name="imagePublication"
                                                accept="image/*"
                                                onChange={handleChange}
                                                style={{ display: 'none' }}
                                                id="imageUpload"
                                            />
                                            <label
                                                htmlFor="imageUpload"
                                                style={{
                                                    display: 'inline-block',
                                                    background: '#0ea5e6',
                                                    color: '#fff',
                                                    padding: '10px 20px',
                                                    borderRadius: '5px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.3s ease',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                    textAlign: 'center',
                                                }}
                                                onMouseEnter={(e) => (e.target.style.background = '#164da6')}
                                                onMouseLeave={(e) => (e.target.style.background = '#0ea5e6')}
                                            >
                                                Add Photo
                                            </label>
                                        </div>
                                    </div>
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
                                            transition: 'background 0.3s ease',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                                        }}
                                        onMouseEnter={(e) => !isSubmitting && (e.target.style.background = '#164da6')}
                                        onMouseLeave={(e) => !isSubmitting && (e.target.style.background = '#0ea5e6')}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Publication'} <i className="fas fa-circle-arrow-right" style={{ marginLeft: '8px' }}></i>
                                    </button>
                                </form>
                            </div>

                            {/* Sidebar */}
                            <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={previewImage || '/assets/img/donation/01.jpg'}
                                        alt="Sidebar"
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
                                            textAlign: 'center',
                                        }}
                                    >
                                        <span style={{ display: 'block', fontSize: '18px', fontWeight: '600' }}>{day}</span>
                                        <span style={{ fontSize: '12px' }}>{month}</span>
                                    </div>
                                </div>
                                <div style={{ padding: '20px 0' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px' }}>
                                        <a href="#" style={{ color: '#333', textDecoration: 'none' }}>
                                            <div dangerouslySetInnerHTML={{ __html: formData.titrePublication || 'Title not defined' }} />
                                        </a>
                                    </h3>
                                    <div>
                                        <div
                                            style={{ marginTop: '5px' }}
                                            dangerouslySetInnerHTML={{ __html: formData.description || 'No description yet' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}></div>
                                        <div style={{ background: '#e0e0e0', height: '10px', borderRadius: '5px', position: 'relative' }}>
                                            <div
                                                style={{
                                                    width: `${progress}%`,
                                                    background: '#0ea5e6',
                                                    height: '100%',
                                                    borderRadius: '5px',
                                                    transition: 'width 0.3s ease',
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
                </div>
            </main>

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
                    transition: 'background 0.3s ease',
                }}
                onMouseEnter={(e) => (e.target.style.background = '#164da6')}
                onMouseLeave={(e) => (e.target.style.background = '#0ea5e6')}
            >
                <i className="far fa-arrow-up"></i>
            </a>
        </div>
    );
}

export default AddPublication;