import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jwtDecode } from "jwt-decode";

function AddActivity() {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        image: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const navigate = useNavigate();

    const categories = [
        "Professional and Intellectual",
        "Wellness and Relaxation",
        "Social and Relationship",
        "Physical and Sports",
        "Leisure and Cultural",
        "Consumption and Shopping",
        "Domestic and Organizational",
        "Nature and Animal-Related"
    ];

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            const file = files[0];
            setFormData((prev) => ({ ...prev, image: file }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('jwt-token');

        if (!token) {
            toast.error('Vous devez être connecté pour ajouter une activité');
            setIsSubmitting(false);
            return;
        }
        
        let userId;
        try {
            const decoded = jwtDecode(token);
            userId = decoded.id;
            console.log("🔍 userId récupéré depuis le JWT :", userId);
        } catch (error) {
            console.error("❌ Erreur lors du décodage du token :", error);
            toast.error("Session invalide, veuillez vous reconnecter");
            localStorage.removeItem("jwt-token");
            navigate("/login");
            return;
        }
        
        if (!userId) {
            toast.error("Utilisateur non trouvé, veuillez vous reconnecter");
            setIsSubmitting(false);
            return;
        }
        

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('category', formData.category);
        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
            const response = await fetch(`http://localhost:5000/users/psychiatrist/${userId}/add-activity`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: data,
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('Activité ajoutée avec succès !');
                setFormData({ title: '', description: '', category: '', image: null });
                setPreviewImage(null);
                setTimeout(() => navigate('/favoriteActivities'), 2000);
            } else {
                toast.error(result.message || 'Erreur lors de l’ajout');
            }
        } catch (error) {
            toast.error('Erreur réseau lors de l’ajout de l’activité');
            console.error('Erreur:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <ToastContainer position="top-right" autoClose={3000} />
            <main style={{ padding: '20px', backgroundColor: '#f9f9f9' }}>
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Ajouter une Activité</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="/">Accueil</a></li>
                            <li className="active">Ajouter une Activité</li>
                        </ul>
                    </div>
                </div>

                <div style={{ padding: '80px 0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                            <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <form onSubmit={handleSubmit}>
                                    <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Détails de l'Activité</h3>

                                    <div style={{ marginBottom: '20px' }}>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="Titre de l'activité"
                                            required
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Description de l'activité"
                                            required
                                            style={{ ...inputStyle, minHeight: '150px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            required
                                            style={inputStyle}
                                        >
                                            <option value="">Sélectionner une catégorie</option>
                                            {categories.map((cat, index) => (
                                                <option key={index} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <input
                                            type="file"
                                            name="image"
                                            accept="image/*"
                                            onChange={handleChange}
                                            style={{ display: 'none' }}
                                            id="imageUpload"
                                        />
                                        <label htmlFor="imageUpload" style={uploadButtonStyle}>
                                            Ajouter une Image
                                        </label>
                                    </div>

                                    <button type="submit" disabled={isSubmitting} style={submitButtonStyle}>
                                        {isSubmitting ? 'Ajout en cours...' : 'Ajouter l’Activité'}
                                    </button>
                                </form>
                            </div>

                            {/* Aperçu de l'image */}
                            <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <div>
                                    <img
                                        src={previewImage || '/assets/img/01.jpg'}
                                        alt="Preview"
                                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px' }}
                                    />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '20px 0' }}>
                                    {formData.title || 'Titre non défini'}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#666' }}>
                                    {formData.description || 'Aucune description disponible'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Styles
const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    fontSize: '16px',
    outline: 'none'
};

const uploadButtonStyle = {
    display: 'inline-block',
    background: '#0ea5e6',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center'
};

const submitButtonStyle = {
    background: '#0ea5e6',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '5px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
};

export default AddActivity;
