import React, { useState } from 'react';
import axios from 'axios';

const AddAvailabilityForm = () => {
    const [day, setDay] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [message, setMessage] = useState('');
    
    // Vérification du rôle de l'utilisateur



    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Récupérer l'ID de l'utilisateur actuel (assurez-vous qu'il est déjà connecté)
        const userId = localStorage.getItem('user-id');
        
        if (!userId) {
            setMessage('Veuillez vous connecter');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/users/psychiatrists/availability', {
                userId,
                day,
                startTime,
                endTime
            });
            setMessage(response.data.message);
        } catch (error) {
            setMessage('Erreur lors de l\'ajout de la disponibilité');
            console.error('Erreur:', error);
        }
    };

    return (
        <div>
            <h3>Ajouter une disponibilité</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="day">Jour</label>
                    <input
                        type="text"
                        id="day"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        placeholder="Lundi"
                    />
                </div>
                <div>
                    <label htmlFor="startTime">Heure de début</label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="endTime">Heure de fin</label>
                    <input
                        type="time"
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                    />
                </div>
                <button type="submit">Ajouter disponibilité</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default AddAvailabilityForm;
