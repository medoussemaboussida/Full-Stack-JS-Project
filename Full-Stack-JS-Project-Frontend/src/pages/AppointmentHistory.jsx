import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AppointmentHistory = () => {
    const [appointments, setAppointments] = useState([]);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // État pour gérer la modification du statut
    const [editingAppointmentId, setEditingAppointmentId] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const token = localStorage.getItem('jwt-token');
                if (!token) {
                    setError('Vous devez être connecté pour voir votre historique.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:5000/users/appointments/history', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                setAppointments(response.data.appointments);
                setRole(response.data.role);
                setLoading(false);
            } catch (err) {
                console.error('Erreur lors de la récupération des rendez-vous:', err);
                setError(err.response?.data?.message || 'Erreur serveur');
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    const handleStatusChange = async (appointmentId) => {
        try {
            const token = localStorage.getItem('jwt-token');
            const response = await axios.put(
                `http://localhost:5000/users/appointments/${appointmentId}/status`,
                { status: newStatus },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            // Mettre à jour les rendez-vous localement
            setAppointments((prevAppointments) =>
                prevAppointments.map((appointment) =>
                    appointment._id === appointmentId ? { ...appointment, status: newStatus } : appointment
                )
            );
            setEditingAppointmentId(null); // Quitter le mode édition
            alert('Statut mis à jour avec succès !');
        } catch (err) {
            console.error('Erreur lors de la mise à jour du statut:', err);
            alert(`Erreur: ${err.response?.data?.message || err.message}`);
        }
    };

    if (loading) return <p>Chargement...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h2>Historique des rendez-vous</h2>
            {appointments.length === 0 ? (
                <p>Aucun rendez-vous trouvé.</p>
            ) : (
                <ul>
                    {appointments.map((appointment) => (
                        <li key={appointment._id}>
                            <strong>Date :</strong> {new Date(appointment.date).toLocaleDateString()} <br />
                            <strong>Heure :</strong> {appointment.startTime} - {appointment.endTime} <br />
                            {role === 'student' ? (
                                <>
                                    <strong>Psychiatre :</strong> {appointment.psychiatrist.username} ({appointment.psychiatrist.email}) <br />
                                    <strong>Statut :</strong> {appointment.status || 'Non défini'} <br />
                                </>
                            ) : (
                                <>
                                    <strong>Étudiant :</strong> {appointment.student.username} ({appointment.student.email}) <br />
                                    <strong>Statut :</strong>{' '}
                                    {editingAppointmentId === appointment._id ? (
                                        <>
                                            <select
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value)}
                                            >
                                                <option value="">Sélectionner un statut</option>
                                                <option value="pending">En attente</option>
                                                <option value="confirmed">Confirmé</option>
                                                <option value="completed">Terminé</option>
                                                <option value="canceled">Annulé</option>
                                            </select>
                                            <button onClick={() => handleStatusChange(appointment._id)}>
                                                Enregistrer
                                            </button>
                                            <button onClick={() => setEditingAppointmentId(null)}>Annuler</button>
                                        </>
                                    ) : (
                                        <>
                                            {appointment.status || 'Non défini'}{' '}
                                            <button onClick={() => {
                                                setEditingAppointmentId(appointment._id);
                                                setNewStatus(appointment.status || '');
                                            }}>
                                                Modifier
                                            </button>
                                        </>
                                    )}
                                    <br />
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AppointmentHistory;