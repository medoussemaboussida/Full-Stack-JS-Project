import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Translation mappings for professional help recommendations
const professionalHelpTranslations = {
  "Consulter un psychiatre dès que possible.": "Consult a psychiatrist as soon as possible.",
  "Consulter un psychologue pour une évaluation.": "Consult a psychologist for an evaluation.",
  "Envisager de consulter un conseiller en bien-être.": "Consider consulting a wellness counselor."
};

// Translation mappings for daily practices
const dailyPracticesTranslations = {
  "Pratiquer des exercices de respiration profonde plusieurs fois par jour": "Practice deep breathing exercises several times a day",
  "Maintenir une routine de sommeil régulière": "Maintain a regular sleep routine",
  "Limiter la consommation de caféine et d'alcool": "Limit caffeine and alcohol consumption",
  "Prendre des pauses régulières pendant les périodes de travail intense": "Take regular breaks during intense work periods",
  "Pratiquer la pleine conscience pendant 10 minutes chaque jour": "Practice mindfulness for 10 minutes each day",
  "Faire de l'exercice physique modéré 3 fois par semaine": "Do moderate physical exercise 3 times a week",
  "Maintenir des contacts sociaux réguliers": "Maintain regular social contacts",
  "Pratiquer une activité relaxante chaque jour": "Practice a relaxing activity every day",
  "Maintenir un équilibre entre travail et loisirs": "Maintain a balance between work and leisure",
  "Continuer à maintenir un mode de vie équilibré": "Continue to maintain a balanced lifestyle",
  "Pratiquer des activités qui vous apportent de la joie régulièrement": "Regularly practice activities that bring you joy"
};

const MentalHealthResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [activityDetails, setActivityDetails] = useState([]);

  // Function to fetch activity details by ID
  const fetchActivityDetails = async (activityIds) => {
    try {
      const token = localStorage.getItem('jwt-token');
      if (!token || !activityIds || activityIds.length === 0) return;

      // Create an array of promises for each activity ID
      const activityPromises = activityIds.map(activityId =>
        axios.get(`http://localhost:5000/users/activity/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      // Wait for all promises to resolve
      const responses = await Promise.all(activityPromises);

      // Extract the activity data from each response
      const activities = responses.map(response => response.data);
      setActivityDetails(activities);
    } catch (error) {
      console.error('Error fetching activity details:', error);
      toast.error('Failed to load activity details');
    }
  };

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const token = localStorage.getItem('jwt-token'); // Changed from 'token' to 'jwt-token'
        if (!token) {
          toast.error('You need to be logged in to view assessment results');
          navigate('/login');
          return;
        }

        console.log('Fetching assessment with token:', token); // Debug log

        // Check if ID is valid
        if (!id || id === 'undefined') {
          setError('Invalid assessment ID. Please try taking the assessment again.');
          toast.error('Invalid assessment ID. Please try taking the assessment again.');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/mental-health/assessment/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );

        console.log('Assessment data:', response.data); // Debug log

        if (response.data && response.data.data) {
          setAssessment(response.data.data);

          // Fetch activity details if there are recommended activities
          if (response.data.data.recommendedActivities &&
              response.data.data.recommendedActivities.length > 0) {
            await fetchActivityDetails(response.data.data.recommendedActivities);
          }
        } else {
          setError('Assessment data has unexpected format. Please try again.');
          toast.error('Assessment data has unexpected format. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);

        // More detailed error logging
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);

          if (error.response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
            navigate('/login');
          } else if (error.response.status === 404) {
            setError('Assessment not found. Please try taking the assessment again.');
            toast.error('Assessment not found. Please try taking the assessment again.');
            setTimeout(() => navigate('/mental-health-assessment'), 3000);
          } else {
            setError(error.response.data?.message || 'Failed to load assessment results');
            toast.error(error.response.data?.message || 'Failed to load assessment results');
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

    fetchAssessment();
  }, [id, navigate]);

  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    return riskLevel === 'High' ? 'danger' : 'success';
  };

  // Get mental health score color
  const getMentalHealthScoreColor = (score) => {
    if (score >= 10) return 'danger';
    if (score >= 6) return 'warning';
    return 'success';
  };

  // Get professional help icon
  const getProfessionalHelpIcon = (help) => {
    if (!help) return null;

    if (help.includes('psychiatre') || help.includes('psychiatrist')) {
      return <i className="fas fa-user-md me-2"></i>;
    } else if (help.includes('psychologue') || help.includes('psychologist')) {
      return <i className="fas fa-brain me-2"></i>;
    } else {
      return <i className="fas fa-hands-helping me-2"></i>;
    }
  };

  // Translate professional help recommendation
  const translateProfessionalHelp = (help) => {
    if (!help) return null;
    return professionalHelpTranslations[help] || help;
  };

  // Translate daily practice
  const translateDailyPractice = (practice) => {
    return dailyPracticesTranslations[practice] || practice;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your assessment results...</p>
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
              onClick={() => navigate('/mental-health-assessment')}
            >
              Try Again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <ToastContainer />
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow mb-4">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">Your Mental Health Assessment Results</h2>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className={`alert alert-${getRiskLevelColor(assessment.riskLevel)}`}>
                    <h4 className="alert-heading">
                      <i className={`fas fa-${assessment.riskLevel === 'High' ? 'exclamation-triangle' : 'check-circle'} me-2`}></i>
                      Risk Level: {assessment.riskLevel}
                    </h4>
                    <p>
                      {assessment.riskLevel === 'High'
                        ? 'Your responses indicate a higher level of mental health risk. Please review our recommendations carefully.'
                        : 'Your responses indicate a lower level of mental health risk. Continue with the recommended practices to maintain your wellbeing.'}
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className={`alert alert-${getMentalHealthScoreColor(assessment.mentalHealthScore)}`}>
                    <h4 className="alert-heading">
                      <i className="fas fa-chart-line me-2"></i>
                      Mental Health Score: {assessment.mentalHealthScore}/15
                    </h4>
                    <p>
                      {assessment.mentalHealthScore >= 10
                        ? 'Your score indicates significant mental health concerns that should be addressed promptly.'
                        : assessment.mentalHealthScore >= 6
                          ? 'Your score indicates moderate mental health concerns that would benefit from attention.'
                          : 'Your score indicates good mental health. Keep up the positive practices!'}
                    </p>
                  </div>
                </div>
              </div>

              {assessment.professionalHelp && (
                <div className="mb-4">
                  <div className="card border-primary">
                    <div className="card-header bg-primary text-white">
                      <h4 className="mb-0">
                        <i className="fas fa-user-md me-2"></i>
                        Professional Help Recommendation
                      </h4>
                    </div>
                    <div className="card-body">
                      <p className="lead">
                        {getProfessionalHelpIcon(assessment.professionalHelp)}
                        {translateProfessionalHelp(assessment.professionalHelp)}
                      </p>
                      <p>
                        Professional guidance can provide you with personalized strategies and support
                        for managing your mental health effectively.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-info text-white">
                      <h4 className="mb-0">
                        <i className="fas fa-running me-2"></i>
                        Recommended Activities
                      </h4>
                    </div>
                    <div className="card-body">
                      {assessment.recommendedActivities && assessment.recommendedActivities.length > 0 ? (
                        <ul className="list-group list-group-flush">
                          {activityDetails.length > 0 ? (
                            activityDetails.map((activity, index) => (
                              <li key={index} className="list-group-item">
                                <i className="fas fa-check-circle text-success me-2"></i>
                                {activity.title}
                              </li>
                            ))
                          ) : (
                            assessment.recommendedActivities.map((_, index) => (
                              <li key={index} className="list-group-item">
                                <i className="fas fa-check-circle text-success me-2"></i>
                                <span className="text-muted">Loading activity details...</span>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : (
                        <p>No specific activities recommended.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-warning text-dark">
                      <h4 className="mb-0">
                        <i className="fas fa-calendar-day me-2"></i>
                        Daily Practices
                      </h4>
                    </div>
                    <div className="card-body">
                      {assessment.dailyPractices && assessment.dailyPractices.length > 0 ? (
                        <ul className="list-group list-group-flush">
                          {assessment.dailyPractices.map((practice, index) => (
                            <li key={index} className="list-group-item">
                              <i className="fas fa-star text-warning me-2"></i>
                              {translateDailyPractice(practice)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No specific daily practices recommended.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-between">
                <button
                  className="btn btn-outline-primary"
                  style={{ borderRadius: '50px' }}
                  onClick={() => navigate('/mental-health-dashboard')}
                >
                  <i className="fas fa-chart-bar me-2"></i>
                  View Dashboard
                </button>
                <button
                  className="btn btn-primary"
                  style={{ borderRadius: '50px' }}
                  onClick={() => navigate('/mental-health-assessment')}
                >
                  <i className="fas fa-redo me-2"></i>
                  Take Another Assessment
                </button>
              </div>
            </div>
          </div>

          <div className="card shadow">
            <div className="card-header bg-secondary text-white">
              <h3 className="mb-0">Important Note</h3>
            </div>
            <div className="card-body">
              <p>
                This assessment is designed to provide general guidance and is not a substitute for professional
                medical advice, diagnosis, or treatment. If you're experiencing severe mental health symptoms,
                please seek help from a qualified healthcare provider immediately.
              </p>
              <p className="mb-0">
                <strong>Emergency Resources:</strong> If you're in crisis, please call your local emergency number
                or visit the nearest emergency room.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalHealthResults;
