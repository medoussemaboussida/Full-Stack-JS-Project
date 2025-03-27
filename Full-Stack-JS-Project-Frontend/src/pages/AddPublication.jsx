import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import EmojiPicker from 'emoji-picker-react';
import 'react-toastify/dist/ReactToastify.css';

// Fonction utilitaire pour debounce (non utilisée ici, mais conservée pour référence)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function AddPublication() {
    const [formData, setFormData] = useState({
        titrePublication: '',
        description: '',
        imagePublication: null,
        tags: [''],
        scheduledDate: '',
        publishNow: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false);
    const [showDescEmojiPicker, setShowDescEmojiPicker] = useState(false);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const navigate = useNavigate();

    let CKEditorComponent, ClassicEditor;
    try {
        CKEditorComponent = require('@ckeditor/ckeditor5-react').CKEditor;
        ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
        console.log('CKEditor loaded successfully');
    } catch (error) {
        console.error('Failed to load CKEditor:', error);
    }

    // Fonction pour générer des tags avec l'API de Groq
    const generateTagsFromDescription = async () => {
        if (!formData.description || formData.description.trim() === '') {
            toast.error('Veuillez entrer une description pour générer des tags.');
            return [''];
        }

        const plainText = formData.description.replace(/<[^>]+>/g, '').trim();

        try {
            setIsLoadingTags(true);
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'user',
                            content: `Génère 5 tags significatifs pour ce texte en français : "${plainText}". Retourne uniquement les tags séparés par des virgules, sans texte supplémentaire (exemple : "tag1, tag2, tag3, tag4, tag5").`,
                        },
                    ],
                    max_tokens: 50,
                    temperature: 0.5,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Détails de l’erreur API Groq:', errorData);
                throw new Error(`Erreur API Groq : ${errorData.error?.message || 'Erreur inconnue'}`);
            }

            const data = await response.json();
            const rawTags = data.choices[0].message.content.trim();
            const tags = rawTags
                .split(',')
                .map(tag => tag.replace(/[*#]+/g, '').trim())
                .filter(tag => tag.length > 0)
                .slice(0, 5);

            setFormData((prev) => ({ ...prev, tags: tags.length > 0 ? tags : [''] }));
        } catch (error) {
            console.error('Erreur lors de la génération des tags:', error);
            toast.error(`Erreur lors de la génération des tags : ${error.message}`);
            setFormData((prev) => ({ ...prev, tags: [''] }));
        } finally {
            setIsLoadingTags(false);
        }
    };

    const calculateProgress = () => {
        let filledFields = 0;
        const totalFields = 5;
        if (formData.titrePublication.trim()) filledFields += 1;
        if (formData.description.trim()) filledFields += 1;
        if (formData.imagePublication) filledFields += 1;
        if (formData.tags.some(tag => tag.trim())) filledFields += 1;
        if (formData.publishNow || formData.scheduledDate) filledFields += 1;
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
        } else if (name.startsWith('tag-')) {
            const index = parseInt(name.split('-')[1], 10);
            const newTags = [...formData.tags];
            newTags[index] = value;
            setFormData((prev) => ({ ...prev, tags: newTags }));
        } else if (name === 'publishNow') {
            setFormData((prev) => ({ ...prev, publishNow: value === 'true', scheduledDate: value === 'true' ? '' : prev.scheduledDate }));
        } else if (name === 'scheduledDate') {
            setFormData((prev) => ({ ...prev, scheduledDate: value }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleEditorChange = (field) => (event, editor) => {
        const data = editor.getData();
        setFormData((prev) => ({ ...prev, [field]: data }));
    };

    const addTagField = () => {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, ''] }));
    };

    const removeTagField = (index) => {
        setFormData((prev) => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index),
        }));
    };

    const handleTitleEmojiClick = (emojiObject) => {
        setFormData((prev) => ({
            ...prev,
            titrePublication: prev.titrePublication + emojiObject.emoji,
        }));
        setShowTitleEmojiPicker(false);
    };

    const handleDescEmojiClick = (emojiObject) => {
        setFormData((prev) => ({
            ...prev,
            description: prev.description + emojiObject.emoji,
        }));
        setShowDescEmojiPicker(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('jwt-token');
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
        data.append('tag', formData.tags.filter(tag => tag.trim()).join(','));
        data.append('scheduledDate', formData.publishNow ? 'now' : formData.scheduledDate);

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
                toast.success('Publication added successfully !');
                setFormData({ titrePublication: '', description: '', imagePublication: null, tags: [''], scheduledDate: '', publishNow: true });
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
                                        <h5>Title</h5>
                                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                                            {CKEditorComponent && ClassicEditor ? (
                                                <>
                                                    <CKEditorComponent
                                                        editor={ClassicEditor}
                                                        data={formData.titrePublication}
                                                        onChange={handleEditorChange('titrePublication')}
                                                        config={{
                                                            placeholder: 'Enter publication title here...',
                                                            toolbar: ['bold', 'italic', 'link', '|', 'undo', 'redo'],
                                                            height: 100,
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTitleEmojiPicker(!showTitleEmojiPicker)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '10px',
                                                            right: '10px',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                            zIndex: 1000,
                                                        }}
                                                    >
                                                        😊
                                                    </button>
                                                    {showTitleEmojiPicker && (
                                                        <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                            <EmojiPicker onEmojiClick={handleTitleEmojiClick} />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
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
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTitleEmojiPicker(!showTitleEmojiPicker)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '10px',
                                                            right: '10px',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                        }}
                                                    >
                                                        😊
                                                    </button>
                                                    {showTitleEmojiPicker && (
                                                        <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                            <EmojiPicker onEmojiClick={handleTitleEmojiClick} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <h5>Description</h5>
                                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                                            {CKEditorComponent && ClassicEditor ? (
                                                <>
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
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDescEmojiPicker(!showDescEmojiPicker)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '10px',
                                                            right: '10px',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                            zIndex: 1000,
                                                        }}
                                                    >
                                                        😊
                                                    </button>
                                                    {showDescEmojiPicker && (
                                                        <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                            <EmojiPicker onEmojiClick={handleDescEmojiClick} />
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
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
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDescEmojiPicker(!showDescEmojiPicker)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '10px',
                                                            right: '10px',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                        }}
                                                    >
                                                        😊
                                                    </button>
                                                    {showDescEmojiPicker && (
                                                        <div style={{ position: 'absolute', top: '-350px', right: '0', zIndex: 1000 }}>
                                                            <EmojiPicker onEmojiClick={handleDescEmojiClick} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={generateTagsFromDescription}
                                                disabled={isLoadingTags}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: isLoadingTags ? '#ccc' : '#6b48ff',
                                                    color: '#fff',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: isLoadingTags ? 'not-allowed' : 'pointer',
                                                    marginTop: '10px',
                                                    boxShadow: '0 4px 12px rgba(107, 72, 255, 0.3)',
                                                    transition: 'all 0.3s ease',
                                                    gap: '8px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isLoadingTags) {
                                                        e.target.style.background = '#5439cc';
                                                        e.target.style.transform = 'scale(1.05)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isLoadingTags) {
                                                        e.target.style.background = '#6b48ff';
                                                        e.target.style.transform = 'scale(1)';
                                                    }
                                                }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" />
                                                    <path d="M12 8v8" />
                                                    <path d="M8 12h8" />
                                                </svg>
                                                {isLoadingTags ? 'Génération...' : 'Générer les tags avec IA'}
                                            </button>
                                        </div>

                                        <h5>Tags {isLoadingTags ? ' - Chargement...' : ''}</h5>
                                        {formData.tags.map((tag, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                                <input
                                                    type="text"
                                                    name={`tag-${index}`}
                                                    value={tag}
                                                    onChange={handleChange}
                                                    placeholder={`Tag ${index + 1}`}
                                                    disabled={isLoadingTags}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        borderRadius: '5px',
                                                        border: '1px solid #ccc',
                                                        fontSize: '16px',
                                                        outline: 'none',
                                                        marginRight: '10px',
                                                        backgroundColor: isLoadingTags ? '#f0f0f0' : '#fff',
                                                    }}
                                                />
                                                {formData.tags.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTagField(index)}
                                                        disabled={isLoadingTags}
                                                        style={{
                                                            background: '#ff4d4d',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            padding: '5px 10px',
                                                            cursor: isLoadingTags ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                )}
                                                {index === formData.tags.length - 1 && formData.tags.length < 5 && (
                                                    <button
                                                        type="button"
                                                        onClick={addTagField}
                                                        disabled={isLoadingTags}
                                                        style={{
                                                            background: '#0ea5e6',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '5px',
                                                            padding: '5px 10px',
                                                            cursor: isLoadingTags ? 'not-allowed' : 'pointer',
                                                            marginLeft: '10px',
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                        ))}

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
                                                        checked={formData.publishNow}
                                                        onChange={handleChange}
                                                        style={{
                                                            appearance: 'none',
                                                            width: '18px',
                                                            height: '18px',
                                                            border: '2px solid #0ea5e6',
                                                            borderRadius: '50%',
                                                            backgroundColor: formData.publishNow ? '#0ea5e6' : '#fff',
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
                                                        checked={!formData.publishNow}
                                                        onChange={handleChange}
                                                        style={{
                                                            appearance: 'none',
                                                            width: '18px',
                                                            height: '18px',
                                                            border: '2px solid #0ea5e6',
                                                            borderRadius: '50%',
                                                            backgroundColor: !formData.publishNow ? '#0ea5e6' : '#fff',
                                                            cursor: 'pointer',
                                                            position: 'relative',
                                                            transition: 'background-color 0.2s ease',
                                                        }}
                                                    />
                                                    Schedule for Later <span style={{ fontSize: '12px', color: '#888' }}>(will be archived until scheduled date)</span>
                                                </label>
                                            </div>
                                            {!formData.publishNow && (
                                                <div style={{ position: 'relative', maxWidth: '300px' }}>
                                                    <input
                                                        type="datetime-local"
                                                        name="scheduledDate"
                                                        value={formData.scheduledDate}
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
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: '#28a745',
                                                    color: '#fff',
                                                    padding: '12px 24px',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                                                    transition: 'all 0.3s ease',
                                                    gap: '8px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = '#218838';
                                                    e.target.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = '#28a745';
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                            >
                                                <i className="fas fa-camera" />
                                                Add Photo
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isLoadingTags}
                                        style={{
                                            background: isSubmitting || isLoadingTags ? '#ccc' : '#0ea5e6',
                                            color: '#fff',
                                            padding: '12px 24px',
                                            borderRadius: '5px',
                                            border: 'none',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: isSubmitting || isLoadingTags ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Publication'}
                                    </button>
                                </form>
                            </div>

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
                                        }}
                                    >
                                        <span style={{ display: 'block', fontSize: '18px', fontWeight: '600' }}>{day}</span>
                                        <span style={{ fontSize: '12px' }}>{month}</span>
                                    </div>
                                </div>
                                <div style={{ padding: '20px 0' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 15px' }}>
                                        <div dangerouslySetInnerHTML={{ __html: formData.titrePublication || 'Title not defined' }} />
                                    </h3>
                                    <div>
                                        <div
                                            style={{ marginTop: '5px' }}
                                            dangerouslySetInnerHTML={{ __html: formData.description || 'No description yet' }}
                                        />
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <strong>Tags:</strong> {formData.tags.filter(tag => tag.trim()).join(', ') || 'No tags yet'}
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <strong>Scheduled:</strong> {formData.publishNow ? 'Now' : (formData.scheduledDate ? new Date(formData.scheduledDate).toLocaleString() : 'Not set')}
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
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
                </div>
            </main>
        </div>
    );
}

export default AddPublication;