import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../App.css';

const AssociationDetails = () => {
  const { id } = useParams(); // Récupère l'ID de l'association depuis l'URL
  const [association, setAssociation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupérer les détails de l'association depuis l'API
  const fetchAssociationDetails = async () => {
    try {
      console.log(`Fetching association details for ID: ${id}`);
      const response = await axios.get(`http://localhost:5000/association/getAssociationById/${id}`);
      console.log('API Response:', response.data);
      setAssociation(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching association details:', err);
      setError(`Erreur lors de la récupération des détails de l'association : ${err.message}`);
      setIsLoading(false);
      toast.error(`Erreur : ${err.message}`);
    }
  };

  useEffect(() => {
    fetchAssociationDetails();
  }, [id]);

  if (isLoading) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Chargement...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>{error}</div>;
  if (!association) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px' }}>Association non trouvée</div>;

  return (
    <>
      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">{association.Name_association}</h2>
          <ul className="breadcrumb-menu">
            <li>
              <Link to="/Home">Accueil</Link>
            </li>
            <li>
              <Link to="/Associations">Nos Associations</Link>
            </li>
            <li className="active">{association.Name_association}</li>
          </ul>
        </div>
      </div>

      {/* Team Single */}
      <div className="team-single py-120">
        <div className="container">
          <ToastContainer />
          <div className="team-single-wrap">
            <div className="row align-items-center">
              <div className="col-lg-4">
                <div className="team-single-img">
                  <img
                    src={`http://localhost:5000${association.logo_association}`}
                    alt={association.Name_association}
                    onError={(e) => (e.target.src = '/assets/img/team/default.jpg')}
                  />
                </div>
              </div>
              <div className="col-lg-8">
                <div className="team-single-content">
                  <div className="team-single-name">
                    <h3>{association.Name_association}</h3>
                    <p>{association.support_type || 'Association'}</p>
                  </div>
                  <div className="team-single-info">
                    <ul>
                      <li>
                        <span className="team-single-info-left">Email :</span>
                        <span className="team-single-info-right">
                          {association.contact_email_association || 'Non spécifié'}
                        </span>
                      </li>
                      <li>
                        <span className="team-single-info-left">Type de soutien :</span>
                        <span className="team-single-info-right">
                          {association.support_type || 'Non spécifié'}
                        </span>
                      </li>
                      <li>
                        <span className="team-single-info-left">Description :</span>
                        <span className="team-single-info-right">
                          {association.Description_association || 'Non spécifiée'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <hr />
                  <div className="team-single-social">
                    <a href={association.facebook || '#'}><i className="fab fa-facebook-f"></i></a>
                    <a href={association.twitter || '#'}><i className="fab fa-x-twitter"></i></a>
                    <a href={association.instagram || '#'}><i className="fab fa-instagram"></i></a>
                    <a href={association.linkedin || '#'}><i className="fab fa-linkedin-in"></i></a>
                    <a href={association.youtube || '#'}><i className="fab fa-youtube"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="team-single-overview">
            <div className="row">
              <div className="col-lg-7">
                <div className="team-single-overview-content">
                  <h4 className="mb-10">Description</h4>
                  <p>{association.Description_association || 'Aucune description disponible.'}</p>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="team-single-overview-img">
                  <img
                    src={`http://localhost:5000${association.logo_association}`}
                    alt="Overview"
                    onError={(e) => (e.target.src = '/assets/img/team/bio.jpg')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssociationDetails;