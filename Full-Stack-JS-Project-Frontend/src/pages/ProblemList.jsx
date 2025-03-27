import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jwtDecode } from 'jwt-decode';

const ProblemList = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState(false); // Nouvelle modale pour les solutions
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [problemToDelete, setProblemToDelete] = useState(null);
  const [generatedSolution, setGeneratedSolution] = useState(''); // Stocker la solution générée
  const [formData, setFormData] = useState({
    what: '',
    source: '',
    reaction: '',
    resolved: false,
    satisfaction: '',
    startDate: '',
    endDate: '',
  });

  // Fetch problems
  const fetchProblems = async (userId) => {
    setIsLoading(true);
    const token = localStorage.getItem('jwt-token');
    if (!token) {
      toast.error('You must be logged in to view your problems');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/users/problems/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProblems(response.data || []);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || 'Error fetching problems');
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialisation avec le token
  useEffect(() => {
    const token = localStorage.getItem('jwt-token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.id) {
          setUserId(decoded.id);
          fetchProblems(decoded.id);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        toast.error('Invalid session, please log in again.');
        navigate('/login');
        setIsLoading(false);
      }
    } else {
      toast.error('You must be logged in to access this page.');
      navigate('/login');
      setIsLoading(false);
    }
  }, [navigate]);

  // Ouvrir la modale de modification
  const handleEditClick = (problem) => {
    setSelectedProblem(problem);
    setFormData({
      what: problem.what || '',
      source: problem.source || '',
      reaction: problem.reaction || '',
      resolved: problem.resolved || false,
      satisfaction: problem.satisfaction || '',
      startDate: problem.startDate
        ? new Date(problem.startDate).toISOString().split('T')[0]
        : '',
      endDate: problem.endDate
        ? new Date(problem.endDate).toISOString().split('T')[0]
        : '',
    });
    setEditModalOpen(true);
  };

  // Fermer la modale de modification
  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedProblem(null);
    setFormData({
      what: '',
      source: '',
      reaction: '',
      resolved: false,
      satisfaction: '',
      startDate: '',
      endDate: '',
    });
  };

  // Ouvrir la modale de suppression
  const handleDeleteClick = (problemId) => {
    setProblemToDelete(problemId);
    setDeleteModalOpen(true);
  };

  // Fermer la modale de suppression
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setProblemToDelete(null);
  };

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Mettre à jour un problème
  const handleUpdateProblem = async () => {
    const token = localStorage.getItem('jwt-token');
    if (!token) {
      toast.error('You must be logged in to update a problem');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:5000/users/problems/${userId}/${selectedProblem._id}`,
        {
          what: formData.what,
          source: formData.source,
          reaction: formData.reaction,
          resolved: formData.resolved,
          satisfaction: formData.satisfaction,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Problem updated successfully!');
      fetchProblems(userId);
      closeEditModal();
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || 'Error updating problem');
    }
  };

  // Supprimer un problème
  const handleDeleteProblem = async () => {
    const token = localStorage.getItem('jwt-token');
    if (!token) {
      toast.error('You must be logged in to delete a problem');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/users/problems/${userId}/${problemToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Problem deleted successfully!');
      fetchProblems(userId);
      closeDeleteModal();
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || 'Error deleting problem');
    }
  };

  // Générer une solution avec une API IA (exemple avec OpenAI ou une API similaire)
  const generateSolution = async (problem) => {
    try {
      const prompt = `Problem: ${problem.what}\nSource: ${problem.source}\nReaction: ${problem.reaction}\nSuggest a solution to this problem.`;
      const response = await axios.post(
        'https://api.openai.com/v1/completions', // Remplacez par l'URL de l'API IA que vous utilisez
        {
          model: 'text-davinci-003', // Modèle OpenAI (ajustez selon l'API)
          prompt: prompt,
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer VOTRE_CLE_API_IA`, // Remplacez par votre clé API
          },
        }
      );
      const solution = response.data.choices[0].text.trim();
      setGeneratedSolution(solution);
      setSelectedProblem(problem); // Garder une référence au problème
      setSolutionModalOpen(true); // Ouvrir la modale des solutions
    } catch (error) {
      console.error('Error generating solution:', error);
      toast.error('Error generating solution');
    }
  };

  // Fermer la modale de solution
  const closeSolutionModal = () => {
    setSolutionModalOpen(false);
    setGeneratedSolution('');
    setSelectedProblem(null);
  };

  // Fonction pour afficher la satisfaction sous forme d'emojis
  const getSatisfactionEmoji = (value) => {
    switch (value) {
      case '100%': return '😁';
      case '75%': return '😊';
      case '50%': return '😐';
      case '25%': return '😟';
      case '0%': return '😞';
      default: return '❓';
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f7fa' }}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{
          background: 'url(assets/img/breadcrumb/01.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '60px 0',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Your Problems</h2>
          <ul
            className="breadcrumb-menu"
            style={{
              display: 'flex',
              justifyContent: 'center',
              listStyle: 'none',
              padding: '0',
              marginTop: '10px',
            }}
          >
            <li style={{ marginRight: '10px' }}>
              <a href="/Home" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>
                Home
              </a>
            </li>
            <li style={{ color: '#ff5a5f', textDecoration: 'none', fontWeight: 'bold' }}>
              Problems
            </li>
          </ul>
        </div>
      </div>

      {/* Problem List Section */}
      <div className="py-120">
        <div className="container">
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '28px', color: '#2A5B84', marginBottom: '20px', textAlign: 'center' }}>
              Your Problems
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                onClick={() => navigate('/add-problem')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                Add Problem
              </button>
            </div>

            {problems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No problems found.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {problems.map((problem) => (
                  <li
                    key={problem._id}
                    style={{
                      border: '1px solid #ddd',
                      padding: '15px',
                      marginBottom: '15px',
                      borderRadius: '5px',
                      backgroundColor: '#f9f9f9',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Date: {new Date(problem.createdAt).toLocaleDateString()}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span
                          onClick={() => handleEditClick(problem)}
                          style={{ cursor: 'pointer', fontSize: '18px' }}
                          title="Edit"
                        >
                          ✏️
                        </span>
                        <span
                          onClick={() => handleDeleteClick(problem._id)}
                          style={{ cursor: 'pointer', fontSize: '18px' }}
                          title="Delete"
                        >
                          🗑️
                        </span>
                        <span
                          onClick={() => generateSolution(problem)}
                          style={{ cursor: 'pointer', fontSize: '18px' }}
                          title="Generate Solution"
                        >
                          💡
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '18px', color: '#2A5B84' }}>{problem.what}</strong>
                    </div>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Source:</strong> {problem.source}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Reaction:</strong> {problem.reaction}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Resolved:</strong> {problem.resolved ? 'Yes' : 'No'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Satisfaction:</strong> {getSatisfactionEmoji(problem.satisfaction)}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>Start Date:</strong>{' '}
                      {problem.startDate ? new Date(problem.startDate).toLocaleDateString() : '—'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>End Date:</strong>{' '}
                      {problem.endDate ? new Date(problem.endDate).toLocaleDateString() : '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour modifier un problème */}
      {editModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Edit Problem</h3>
            <form>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>What is the problem?</label>
                <input
                  type="text"
                  name="what"
                  value={formData.what}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Where does the problem come from?</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>How did you react?</label>
                <input
                  type="text"
                  name="reaction"
                  value={formData.reaction}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Start Date:</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>End Date:</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ marginRight: '10px' }}>
                  Resolved?
                  <input
                    type="checkbox"
                    name="resolved"
                    checked={formData.resolved}
                    onChange={handleChange}
                    style={{ marginLeft: '5px' }}
                  />
                </label>
                <label>
                  Satisfaction:
                  <select
                    name="satisfaction"
                    value={formData.satisfaction}
                    onChange={handleChange}
                    style={{ marginLeft: '5px', padding: '5px' }}
                  >
                    <option value="">—</option>
                    <option value="100%">100%</option>
                    <option value="75%">75%</option>
                    <option value="50%">50%</option>
                    <option value="25%">25%</option>
                    <option value="0%">0%</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleUpdateProblem}
                  style={{
                    backgroundColor: '#0ea5e6',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour confirmer la suppression */}
      {deleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>Confirm Deletion</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Are you sure you want to delete this problem?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleDeleteProblem}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
              <button
                onClick={closeDeleteModal}
                style={{
                  backgroundColor: '#0ea5e6',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour afficher la solution générée */}
      {solutionModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>Generated Solution</h3>
            <p style={{ marginBottom: '20px', color: '#333', textAlign: 'left' }}>
              <strong>Problem:</strong> {selectedProblem?.what}<br />
              <strong>Solution:</strong> {generatedSolution}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={closeSolutionModal}
                style={{
                  backgroundColor: '#0ea5e6',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemList;