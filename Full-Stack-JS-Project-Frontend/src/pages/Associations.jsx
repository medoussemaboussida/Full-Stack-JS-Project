import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom'; // Ajout de Link pour la navigation
import '../App.css';

const Associations = () => {
  const [associations, setAssociations] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const associationsPerPage = 8;

  // Fonction pour récupérer toutes les associations
  const fetchAssociations = async () => {
    try {
      console.log('Fetching associations from API...');
      const response = await axios.get('http://localhost:5000/association/getAssociations');
      console.log('API Response:', response.data);
      setAssociations(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching associations:', err);
      setError(`Erreur lors de la récupération des associations : ${err.message}`);
      setIsLoading(false);
    }
  };

  // Vérification du rôle utilisateur
  const fetchUserRole = async (token, userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/users/session/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setUserRole(response.data.role);
        console.log('User Role:', response.data.role);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  // Suppression d'une association
  const handleDelete = (associationId) => {
    const token = localStorage.getItem('jwt-token');
    if (!token || userRole !== 'admin') {
      toast.error('Vous devez être administrateur pour supprimer une association');
      return;
    }

    const toastId = toast(
      <div>
        <p>Êtes-vous sûr de vouloir supprimer cette association ?</p>
        <button
          onClick={async () => {
            try {
              const response = await axios.delete(`http://localhost:5000/association/deleteAssociation/${associationId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.status === 200) {
                setAssociations(associations.filter((assoc) => assoc._id !== associationId));
                toast.success('Association supprimée avec succès', { autoClose: 3000 });
              }
            } catch (err) {
              toast.error(`Erreur lors de la suppression : ${err.message}`, { autoClose: 3000 });
            } finally {
              toast.dismiss(toastId);
            }
          }}
          style={{ marginRight: '10px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
        >
          Oui
        </button>
        <button
          onClick={() => toast.dismiss(toastId)}
          style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '3px' }}
        >
          Non
        </button>
      </div>,
      { autoClose: false, closeOnClick: false, draggable: false }
    );
  };

  // Pagination
  const indexOfLastAssociation = currentPage * associationsPerPage;
  const indexOfFirstAssociation = indexOfLastAssociation - associationsPerPage;
  const currentAssociations = associations.slice(indexOfFirstAssociation, indexOfLastAssociation);
  const totalPages = Math.ceil(associations.length / associationsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Initialisation
  useEffect(() => {
    const token = localStorage.getItem('jwt-token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
        fetchUserRole(token, decoded.id);
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
    fetchAssociations();
  }, []);

  if (isLoading) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Chargement...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>{error}</div>;

  return (
    <>
      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Nos Associations</h2>
          <ul className="breadcrumb-menu">
            <li>
              <Link to="/Home">Accueil</Link>
            </li>
            <li className="active">Nos Associations</li>
          </ul>
        </div>
      </div>
      {/* Fin Breadcrumb */}

      <div className="team-area py-100">
        <div className="container">
          <ToastContainer />
          <div className="row">
            <div className="col-lg-6 mx-auto">
              <div className="site-heading text-center wow fadeInDown" data-wow-delay=".25s">
                <span className="site-title-tagline">
                  <i className="far fa-hand-heart"></i> Nos Associations
                </span>
                <h2 className="site-title">
                  Découvrez nos <span>Associations</span>
                </h2>
              </div>
            </div>
          </div>
          <div className="row g-4">
            {currentAssociations.map((association, index) => (
              <div className="col-md-6 col-lg-3" key={association._id}>
                <div className="team-item wow fadeInUp" data-wow-delay={`${0.25 * (index + 1)}s`}>
                  <div className="team-img">
                    <img
                      src={`http://localhost:5000${association.logo_association}`}
                      alt={association.Name_association}
                      onError={(e) => (e.target.src = '/assets/img/team/default.jpg')}
                    />
                    <div className="team-social-wrap">
                      <div className="team-social-btn">
                        <button type="button">
                          <i className="far fa-share-alt"></i>
                        </button>
                      </div>
                      <div className="team-social">
                        <a href={association.facebook || '#'}><i className="fab fa-facebook-f"></i></a>
                        <a href={association.twitter || '#'}><i className="fab fa-x-twitter"></i></a>
                        <a href={association.linkedin || '#'}><i className="fab fa-linkedin-in"></i></a>
                        <a href={association.youtube || '#'}><i className="fab fa-youtube"></i></a>
                      </div>
                    </div>
                  </div>
                  <div className="team-content">
                    <h4>
                      <Link to={`/AssociationDetails/${association._id}`}>
                        {association.Name_association}
                      </Link>
                    </h4>
                    <span>{association.support_type || 'Association'}</span>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDelete(association._id)}
                        style={{ marginTop: '10px', backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '3px' }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination" style={{ textAlign: 'center', marginTop: '20px' }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  style={{
                    margin: '0 5px',
                    padding: '5px 10px',
                    backgroundColor: currentPage === i + 1 ? '#ff5733' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Associations;