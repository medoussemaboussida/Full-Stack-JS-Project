import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MentalHealthAssessment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    counselingServiceUse: 'never',
    stressLevel: 3,
    substanceUse: 'never',
    age: '',
    course: '',
    financialStress: 3,
    physicalActivity: 'moderate',
    extracurricularInvolvement: 'moderate',
    semesterCreditLoad: 15,
    familyHistory: 'no',
    chronicIllness: 'no',
    anxietyScore: 3,
    depressionScore: 3
  });
  // We don't need to store userData separately since we're using it immediately

  // Get user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('jwt-token'); // Changed from 'token' to 'jwt-token'
        if (!token) {
          toast.error('You need to be logged in to access this page');
          navigate('/login');
          return;
        }

        console.log('Fetching user data with token:', token); // Debug log

        // First get basic user info
        const basicResponse = await axios.get('http://localhost:5000/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        console.log('Basic user data:', basicResponse.data); // Debug log

        // Then get detailed user info including dob
        const userId = basicResponse.data._id;
        const detailedResponse = await axios.get(`http://localhost:5000/users/session/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        console.log('Detailed user data:', detailedResponse.data); // Debug log

        // Calculate age from date of birth
        let calculatedAge = '';
        if (detailedResponse.data.dob) {
          const today = new Date();
          const birthDate = new Date(detailedResponse.data.dob);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          calculatedAge = age;
        }

        // Set values for the form
        setFormData(prevData => ({
          ...prevData,
          age: calculatedAge || 20, // Use calculated age or default to 20
          course: detailedResponse.data?.speciality || 'Computer Science' // Use speciality or default
        }));

        // Show a message to the user
        // toast.info('Please verify and complete all fields in the form.');
      } catch (error) {
        console.error('Error fetching user data:', error);

        // More detailed error logging
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);

          if (error.response.status === 401) {
            toast.error('Authentication failed. Please log in again.');
            navigate('/login');
          } else {
            toast.error('Failed to load user data: ' + (error.response.data?.message || 'Unknown error'));
          }
        } else if (error.request) {
          console.error('No response received:', error.request);
          toast.error('No response from server. Please try again later.');
        } else {
          toast.error('Error setting up request: ' + error.message);
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  // No longer needed since we're using default values

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle range input changes
  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: parseInt(value, 10)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the correct token from localStorage
      const token = localStorage.getItem('jwt-token'); // Changed from 'token' to 'jwt-token'
      if (!token) {
        toast.error('You need to be logged in to submit an assessment');
        navigate('/login');
        return;
      }

      console.log('Using token:', token); // Debug log

      // Submit assessment data
      const response = await axios.post(
        'http://localhost:5000/mental-health/assessment',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true // Include cookies if any
        }
      );

      console.log('Response:', response.data); // Debug log

      // Navigate to results page with assessment ID
      navigate(`/mental-health-results/${response.data.data.id}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);

      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);

        if (error.response.status === 401) {
          toast.error('Authentication failed. Please log in again.');
          navigate('/login');
        } else {
          toast.error(error.response.data?.message || 'Failed to submit assessment');
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('No response from server. Please try again later.');
      } else {
        toast.error('Error setting up request: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="breadcrumb-title">Mental Health Assessment</h2>
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
            <li className="active"style={{ textDecoration: "none" }}>Mental Health Assessment</li>
          </ul>
        </div>
      </div>
      <div className="container py-5">
        <ToastContainer />
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">Mental Health Assessment</h2>
            </div>
            <div className="card-body">
              <p className="lead mb-4">
                This assessment will help us understand your mental health status and provide personalized recommendations.
                All information is kept confidential.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <h4 className="mb-3">Personal Information</h4>
                <div className="row mb-4">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="age" className="form-label">Age</label>
                    <input
                      type="number"
                      className="form-control"
                      id="age"
                      name="age"
                      value={formData.age}
                      readOnly
                      disabled
                      title="Age is automatically calculated from your date of birth"
                      style={{borderRadius:"50px"}}
                    />
                    <small className="text-muted">Calculated from your date of birth</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="course" className="form-label">Course/Speciality</label>
                    <input
                      type="text"
                      className="form-control"
                      id="course"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    />
                  </div>
                </div>

                {/* Academic Information */}
                <h4 className="mb-3">Academic Information</h4>
                <div className="row mb-4">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="semesterCreditLoad" className="form-label">Semester Credit Load</label>
                    <input
                      type="number"
                      className="form-control"
                      id="semesterCreditLoad"
                      name="semesterCreditLoad"
                      value={formData.semesterCreditLoad}
                      onChange={handleChange}
                      required
                      min="1"
                      max="30"
                      style={{borderRadius:"50px"}}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="extracurricularInvolvement" className="form-label">Extracurricular Involvement</label>
                    <select
                      className="form-select"
                      id="extracurricularInvolvement"
                      name="extracurricularInvolvement"
                      value={formData.extracurricularInvolvement}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* Health Information */}
                <h4 className="mb-3">Health Information</h4>
                <div className="row mb-4">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="physicalActivity" className="form-label">Physical Activity Level</label>
                    <select
                      className="form-select"
                      id="physicalActivity"
                      name="physicalActivity"
                      value={formData.physicalActivity}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="substanceUse" className="form-label">Substance Use</label>
                    <select
                      className="form-select"
                      id="substanceUse"
                      name="substanceUse"
                      value={formData.substanceUse}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    >
                      <option value="never">Never</option>
                      <option value="occasionally">Occasionally</option>
                      <option value="regularly">Regularly</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="familyHistory" className="form-label">Family History of Mental Health Issues</label>
                    <select
                      className="form-select"
                      id="familyHistory"
                      name="familyHistory"
                      value={formData.familyHistory}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="chronicIllness" className="form-label">Chronic Illness</label>
                    <select
                      className="form-select"
                      id="chronicIllness"
                      name="chronicIllness"
                      value={formData.chronicIllness}
                      onChange={handleChange}
                      required
                      style={{borderRadius:"50px"}}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="counselingServiceUse" className="form-label">Counseling Service Use</label>
                  <select
                    className="form-select"
                    id="counselingServiceUse"
                    name="counselingServiceUse"
                    value={formData.counselingServiceUse}
                    onChange={handleChange}
                    required
                    style={{borderRadius:"50px"}}
                  >
                    <option value="never">Never</option>
                    <option value="occasionally">Occasionally</option>
                    <option value="regularly">Regularly</option>
                  </select>
                </div>

                {/* Mental Health Scales */}
                <h4 className="mb-3">Mental Health Scales</h4>
                <div className="mb-4">
                  <label htmlFor="stressLevel" className="form-label">
                    Stress Level (0-5): {formData.stressLevel}
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    id="stressLevel"
                    name="stressLevel"
                    min="0"
                    max="5"
                    step="1"
                    value={formData.stressLevel}
                    onChange={handleRangeChange}
                    required
                  />
                  <div className="d-flex justify-content-between">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Extreme</span>
                    <span>Overwhelming</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="anxietyScore" className="form-label">
                    Anxiety Level (0-5): {formData.anxietyScore}
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    id="anxietyScore"
                    name="anxietyScore"
                    min="0"
                    max="5"
                    step="1"
                    value={formData.anxietyScore}
                    onChange={handleRangeChange}
                    required
                  />
                  <div className="d-flex justify-content-between">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Extreme</span>
                    <span>Overwhelming</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="depressionScore" className="form-label">
                    Depression Level (0-5): {formData.depressionScore}
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    id="depressionScore"
                    name="depressionScore"
                    min="0"
                    max="5"
                    step="1"
                    value={formData.depressionScore}
                    onChange={handleRangeChange}
                    required
                  />
                  <div className="d-flex justify-content-between">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Extreme</span>
                    <span>Overwhelming</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="financialStress" className="form-label">
                    Financial Stress Level (0-5): {formData.financialStress}
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    id="financialStress"
                    name="financialStress"
                    min="0"
                    max="5"
                    step="1"
                    value={formData.financialStress}
                    onChange={handleRangeChange}
                    required
                  />
                  <div className="d-flex justify-content-between">
                    <span>None</span>
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Extreme</span>
                    <span>Overwhelming</span>
                  </div>
                </div>
<br></br>
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="theme-btn"
                    style={{ borderRadius: '50px' ,height:"50px",fontSize:"16px"}}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Submit Assessment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MentalHealthAssessment;
