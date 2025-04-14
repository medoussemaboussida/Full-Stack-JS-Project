import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';
import '../App.css';

const Associations = () => {
  const [associations, setAssociations] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const associationsPerPage = 8;

  // Fetch approved associations for the front-end
  const fetchAssociations = async () => {
    try {
      console.log('Fetching approved associations from API...');
      const token = localStorage.getItem('jwt-token');
      if (!token) throw new Error('No token found in localStorage');
      const response = await axios.get('http://localhost:5000/association/getApprovedAssociations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('API Response:', response.data);
      setAssociations(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching associations:', err.response || err);
      setError(`Erreur lors de la récupération des associations : ${err.response?.data?.message || err.message}`);
      setIsLoading(false);
    }
  };

  // Fetch user role
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

  // Handle deletion of an association
  const handleDelete = async (associationId) => {
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
              const response = await axios.delete(`http://localhost:5000/association/${associationId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.status === 200) {
                setAssociations(associations.filter((assoc) => assoc._id !== associationId));
                toast.success('Association supprimée avec succès', { autoClose: 3000 });
              }
            } catch (err) {
              toast.error(`Erreur lors de la suppression : ${err.response?.data?.message || err.message}`, { autoClose: 3000 });
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

  // Function to truncate long text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle filter change (by support type)
  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
  };

  // Filter and sort associations
  const filteredAssociations = associations
    .filter((assoc) => {
      const name = assoc.Name_association?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();
      const matchesSearch = name.includes(term);
      const matchesFilter = filterType === 'all' || assoc.support_type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return (a.Name_association || '').localeCompare(b.Name_association || '');
      } else if (sortOrder === 'name-desc') {
        return (b.Name_association || '').localeCompare(a.Name_association || '');
      } else if (sortOrder === 'recent') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });

  // Pagination
  const indexOfLastAssociation = currentPage * associationsPerPage;
  const indexOfFirstAssociation = indexOfLastAssociation - associationsPerPage;
  const currentAssociations = filteredAssociations.slice(indexOfFirstAssociation, indexOfLastAssociation);
  const totalPages = Math.ceil(filteredAssociations.length / associationsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Initial fetch
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
  if (error) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '18px', color: 'red' }}>{error}</div>;

  return (
    <>
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

          {/* Search, Filter, and Sort Controls */}
          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Rechercher une association..."
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

            <select
              value={filterType}
              onChange={handleFilterChange}
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
              <option value="all">Tous les types</option>
              <option value="Financial">Financier</option>
              <option value="Material">Matériel</option>
              <option value="Educational">Éducatif</option>
              <option value="Other">Autre</option>
            </select>

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
              <option value="name-asc">Nom (A-Z)</option>
              <option value="name-desc">Nom (Z-A)</option>
              <option value="recent">Plus récent</option>
              <option value="oldest">Plus ancien</option>
            </select>
          </div>

          <div className="row g-4">
            {currentAssociations.length > 0 ? (
              currentAssociations.map((association, index) => (
                <div className="col-md-6 col-lg-3" key={association._id}>
                  <div
                    className="team-item wow fadeInUp"
                    data-wow-delay={`${0.25 * (index + 1)}s`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '350px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="team-img"
                      style={{
                        position: 'relative',
                        height: '200px',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={association.logo_association ? `http://localhost:5000${association.logo_association}` : '/assets/img/team/default.jpg'}
                        alt={association.Name_association || 'Association'}
                        onError={(e) => (e.target.src = '/assets/img/team/default.jpg')}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                        }}
                      />
                      <div className="team-social-wrap">
                        <div className="team-social-btn">
                          <button type="button">
                            <i className="far fa-share-alt"></i>
                          </button>
                        </div>
                        <div className="team-social">
                          {association.facebook && (
                            <a href={association.facebook} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-facebook-f"></i>
                            </a>
                          )}
                          {association.twitter && (
                            <a href={association.twitter} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-x-twitter"></i>
                            </a>
                          )}
                          {association.linkedin && (
                            <a href={association.linkedin} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-linkedin-in"></i>
                            </a>
                          )}
                          {association.youtube && (
                            <a href={association.youtube} target="_blank" rel="noopener noreferrer">
                              <i className="fab fa-youtube"></i>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className="team-content"
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '15px',
                        textAlign: 'center',
                        height: '150px',
                        overflow: 'hidden',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', lineHeight: '1.2' }}>
                        <Link to={`/AssociationDetails/${association._id}`}>
  {truncateText(association.Name_association, 20)}
</Link>
                        </h4>
                        <span style={{ fontSize: '14px', color: '#666', margin: '5px 0', display: 'block' }}>
                          {truncateText(association.support_type || 'Association', 15)}
                        </span>
                      </div>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDelete(association._id)}
                          style={{
                            marginTop: '10px',
                            backgroundColor: '#f44336',
                            color: '#fff',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', gridColumn: 'span 4' }}>
                <p>Aucune association trouvée.</p>
              </div>
            )}
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