import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Translation mappings for professional help recommendations
const professionalHelpTranslations = {
  "Consulter un psychiatre dès que possible.": "Consult a psychiatrist as soon as possible.",
  "Consulter un psychologue pour une évaluation.": "Consult a psychologist for an evaluation.",
  "Envisager de consulter un conseiller en bien-être.": "Consider consulting a wellness counselor."
};

// Translation mappings for activities
const activityTranslations = {
  "Méditation et pleine conscience": "Meditation and mindfulness",
  "Exercice physique régulier": "Regular physical exercise",
  "Yoga ou étirements": "Yoga or stretching",
  "Lecture": "Reading",
  "Écouter de la musique": "Listening to music",
  "Passer du temps dans la nature": "Spending time in nature",
  "Tenir un journal": "Journaling",
  "Peinture ou dessin": "Painting or drawing",
  "Rejoindre un club social": "Joining a social club",
  "Faire du bénévolat": "Volunteering"
};

const MentalHealthDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState(null);
  const [activityDetails, setActivityDetails] = useState({});

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const token = localStorage.getItem('jwt-token'); // Changed from 'token' to 'jwt-token'
        if (!token) {
          toast.error('You need to be logged in to view your assessment history');
          navigate('/login');
          return;
        }

        console.log('Fetching assessments with token:', token); // Debug log

        const response = await axios.get(
          'http://localhost:5000/mental-health/assessment/history',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );

        console.log('Assessments data:', response.data); // Debug log

        if (response.data && response.data.data) {
          setAssessments(response.data.data);

          // Fetch top activity details for the latest assessment
          if (response.data.data.length > 0 &&
              response.data.data[0].recommendedActivities &&
              response.data.data[0].recommendedActivities.length > 0) {
            const topActivityId = response.data.data[0].recommendedActivities[0];
            // Check if it's an ID (not a string activity name)
            if (topActivityId && topActivityId.match(/^[0-9a-fA-F]{24}$/)) {
              await fetchActivityDetails(topActivityId);
            }
          }
        } else {
          // If no assessments or unexpected format, set empty array
          setAssessments([]);
          toast.info('No assessment history found. Take your first assessment to get started!');
        }
      } catch (error) {
        console.error('Error fetching assessments:', error);

        // More detailed error logging
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);

          if (error.response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
            navigate('/login');
          } else if (error.response.status === 404) {
            // If no assessments found, set empty array
            setAssessments([]);
            toast.info('No assessment history found. Take your first assessment to get started!');
          } else {
            setError(error.response.data?.message || 'Failed to load assessment history');
            toast.error(error.response.data?.message || 'Failed to load assessment history');
          }
        } else if (error.request) {
          console.error('No response received:', error.request);
          setError('No response from server. Please try again later.');
          toast.error('No response from server. Please try again later.');
        } else {
          setError('Error setting up request: ' + error.message);
          toast.error('Error setting up request: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [navigate]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get risk level badge color
  const getRiskLevelBadgeColor = (riskLevel) => {
    return riskLevel === 'High' ? 'danger' : 'success';
  };

  // Get mental health score color
  const getMentalHealthScoreColor = (score) => {
    if (score >= 10) return 'danger';
    if (score >= 6) return 'warning';
    return 'success';
  };

  // Translate professional help recommendation
  const translateProfessionalHelp = (help) => {
    if (!help) return null;
    return professionalHelpTranslations[help] || help;
  };

  // Translate activity
  const translateActivity = (activity) => {
    return activityTranslations[activity] || activity;
  };

  // Fetch activity details by ID
  const fetchActivityDetails = async (activityId) => {
    try {
      if (!activityId) return null;

      // Check if we already have this activity's details
      if (activityDetails[activityId]) {
        return activityDetails[activityId];
      }

      const token = localStorage.getItem('jwt-token');
      if (!token) return null;

      const response = await axios.get(`http://localhost:5000/users/activity/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Store the activity details in state
      setActivityDetails(prev => ({
        ...prev,
        [activityId]: response.data
      }));

      return response.data;
    } catch (error) {
      console.error('Error fetching activity details:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your assessment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            <button
              className="btn btn-outline-danger"
              style={{ borderRadius: '50px' }}
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="site-breadcrumb"
        style={{
          background: "url(/assets/img/breadcrumb/01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "60px 0",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Mental Health Dashboard</h2>
          <ul
            className="breadcrumb-menu"
            style={{
              display: "flex",
              justifyContent: "center",
              listStyle: "none",
              padding: "0",
              marginTop: "10px",
            }}
          >
            <li style={{ marginRight: "10px" }}>
              <a href="/Home" style={{ color: "#fff", textDecoration: "none"}}>
                Home
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none" }}>Mental Health Dashboard</li>
          </ul>
        </div>
      </div>
      <div className="container py-5">
        <ToastContainer />
      <div className="row mb-4">
        <div className="col-md-8">
          <h1 className="display-5 fw-bold">Mental Health Dashboard</h1>
          <p className="lead">
            Track your mental health journey and view your assessment history.
          </p>
        </div>
        <div className="col-md-4 d-flex align-items-center justify-content-md-end">
          <button
            className="theme-btn"
            style={{ borderRadius: '50px',padding:"12px 14px" }}
            onClick={() => navigate('/mental-health-assessment')}
          >
            <i className="fas fa-plus-circle me-2"></i>
            New Assessment
          </button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="card shadow">
          <div className="card-body text-center py-5">
            <i className="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
            <h3>No Assessments Yet</h3>
            <p className="lead">
              Take your first mental health assessment to get personalized recommendations.
            </p>
<div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          className="theme-btn"
          style={{
            borderRadius: '50px',
            padding: '10px 20px', // Ajuste la taille pour un bouton plus compact
            width: 'auto', // Laisse le bouton s'adapter au contenu
            fontSize: '16px', // Taille de police standard
          }}
          onClick={() => navigate('/mental-health-assessment')}
        >
          Take Assessment
        </button>
      </div>
          </div>
        </div>
      ) : (
        <>
          {/* Latest Assessment Summary */}
          <div className="card shadow mb-4">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0">Latest Assessment Summary</h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h4>
                    <i className="fas fa-calendar-alt me-2"></i>
                    {formatDate(assessments[0].createdAt)}
                  </h4>
                  <div className="d-flex mt-3">
                    <div className="me-4">
                      <h5>Risk Level</h5>
                      <span className={`badge bg-${getRiskLevelBadgeColor(assessments[0].riskLevel)} fs-5`}>
                        {assessments[0].riskLevel}
                      </span>
                    </div>
                    <div>
                      <h5>Mental Health Score</h5>
                      <span className={`badge bg-${getMentalHealthScoreColor(assessments[0].mentalHealthScore)} fs-5`}>
                        {assessments[0].mentalHealthScore}/15
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <h4>Key Recommendations</h4>
                  {assessments[0].professionalHelp && (
                    <p>
                      <i className="fas fa-user-md me-2 text-primary"></i>
                      <strong>Professional Help:</strong> {translateProfessionalHelp(assessments[0].professionalHelp)}
                    </p>
                  )}
                  {assessments[0].recommendedActivities && assessments[0].recommendedActivities.length > 0 && (
                    <p>
                      <i className="fas fa-running me-2 text-success"></i>
                      <strong>Top Activity:</strong> {
                        // Check if it's an ID and we have fetched the details
                        assessments[0].recommendedActivities[0].match(/^[0-9a-fA-F]{24}$/) &&
                        activityDetails[assessments[0].recommendedActivities[0]]
                          ? activityDetails[assessments[0].recommendedActivities[0]].title
                          : translateActivity(assessments[0].recommendedActivities[0])
                      }
                    </p>
                  )}
                  <div className="mt-3">
                    <button
                      className="btn btn-outline-primary"
                      style={{ borderRadius: '50px' }}
                      onClick={() => navigate(`/mental-health-results/${assessments[0]._id}`)}
                    >
                      View Full Results
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assessment History */}
          <div className="card shadow">
            <div className="card-header bg-secondary text-white">
              <h3 className="mb-0">Assessment History</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Risk Level</th>
                      <th>Mental Health Score</th>
                      <th>Professional Help</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((assessment) => (
                      <tr key={assessment._id}>
                        <td>{formatDate(assessment.createdAt)}</td>
                        <td>
                          <span className={`badge bg-${getRiskLevelBadgeColor(assessment.riskLevel)}`}>
                            {assessment.riskLevel}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${getMentalHealthScoreColor(assessment.mentalHealthScore)}`}>
                            {assessment.mentalHealthScore}/15
                          </span>
                        </td>
                        <td>
                          {assessment.professionalHelp ? (
                            <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                              {translateProfessionalHelp(assessment.professionalHelp)}
                            </span>
                          ) : (
                            <span className="text-muted">None recommended</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ borderRadius: '50px' }}
                            onClick={() => navigate(`/mental-health-results/${assessment._id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mental Health Resources */}
      <div className="card shadow mt-4">
        <div className="card-header bg-info text-white">
          <h3 className="mb-0">Mental Health Resources</h3>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="fas fa-book me-2 text-primary"></i>
                    Educational Resources
                  </h5>
                  <p className="card-text">
                    Learn more about mental health, stress management, and self-care techniques.
                  </p>
                  <a href="#" className="btn btn-outline-primary" style={{ borderRadius: '50px' }}>Explore Resources</a>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="fas fa-users me-2 text-success"></i>
                    Support Groups
                  </h5>
                  <p className="card-text">
                    Connect with others who are going through similar experiences.
                  </p>
                  <a href="#" className="btn btn-outline-success" style={{ borderRadius: '50px' }}>Find Groups</a>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="fas fa-phone-alt me-2 text-danger"></i>
                    Crisis Hotlines
                  </h5>
                  <p className="card-text">
                    Immediate support for those experiencing mental health crises.
                  </p>
                  <a href="#" className="btn btn-outline-danger" style={{ borderRadius: '50px' }}>View Hotlines</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MentalHealthDashboard;
