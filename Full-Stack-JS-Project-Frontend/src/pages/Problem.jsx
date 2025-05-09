import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Problem = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const defaultStartDate = today.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    what: '',
    source: '',
    reaction: '',
    resolved: false,
    satisfaction: '',
    startDate: defaultStartDate, // Default to today
    endDate: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('jwt-token');
    if (!token) {
      toast.error('You must be logged in to submit a problem');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Input validation
    if (!formData.what.trim()) {
      toast.error('Please fill in the "What is the problem?" field');
      return;
    }
    if (!formData.source.trim()) {
      toast.error('Please fill in the "Where does the problem come from?" field');
      return;
    }
    if (!formData.reaction.trim()) {
      toast.error('Please fill in the "How did you react?" field');
      return;
    }
    if (!formData.satisfaction) {
      toast.error('Please select your satisfaction level');
      return;
    }
    if (!formData.startDate) {
      toast.error('Please select a start date');
      return;
    }
    // Validate startDate is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0); // Normalize startDate for comparison
    if (startDate > today) {
      toast.error('Start date cannot be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `http://localhost:5000/users/problems`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Problem submitted successfully!');
      setFormData({
        what: '',
        source: '',
        reaction: '',
        resolved: false,
        satisfaction: '',
        startDate: defaultStartDate, // Reset to today
        endDate: '',
        notes: '',
      });
      setTimeout(() => navigate('/list-problems'), 2000);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || 'Error submitting the problem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/list-problems`);
  };

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
          <h2 className="breadcrumb-title">Report a Problem</h2>
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
              <a href="/Home" style={{ color: '#fff', textDecoration: 'none' }}>
                Home
              </a>
            </li>
            <li style={{ marginRight: '10px' }}>
              <a href="/list-problems" style={{ color: '#fff', textDecoration: 'none' }}>
                Problems
              </a>
            </li>
            <li style={{ color: '#ff5a5f', textDecoration: 'none' }}>
              Report a Problem
            </li>
          </ul>
        </div>
      </div>

      {/* Form Section */}
      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="become-volunteer-img">
                <img
                  src="/assets/img/quote/mistake.jpg"
                  alt="Problem Illustration"
                  style={{ width: '100%', height: 'auto', borderRadius: '10px' }}
                />
              </div>
            </div>
            <div className="col-lg-6">
              <div
                className="become-volunteer-form"
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '10px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                }}
              >
                <h2
                  style={{
                    fontSize: '28px',
                    color: '#2A5B84',
                    marginBottom: '15px',
                    textAlign: 'center',
                  }}
                >
                  Report a Problem
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <input
                      type="text"
                      name="what"
                      value={formData.what}
                      onChange={handleChange}
                      placeholder="What is the problem?"
                      className="form-control"
                      style={{ width: '100%', padding: '12px', borderRadius: '50px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      placeholder="Where does the problem come from?"
                      className="form-control"
                      style={{ width: '100%', padding: '12px', borderRadius: '50px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <input
                      type="text"
                      name="reaction"
                      value={formData.reaction}
                      onChange={handleChange}
                      placeholder="How did you react to the problem?"
                      className="form-control"
                      style={{ width: '100%', padding: '12px', borderRadius: '50px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#666' }}>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="form-control"
                      style={{ width: '100%', padding: '12px', borderRadius: '50px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#666' }}>End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="form-control"
                      style={{ width: '100%', padding: '12px', borderRadius: '50px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                      Are you satisfied with your reaction?
                    </label>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {['100%', '75%', '50%', '25%', '0%'].map((value) => (
                        <label
                          key={value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '50px',
                            border: formData.satisfaction === value ? '2px solid #2A5B84' : '1px solid #ccc',
                            backgroundColor: formData.satisfaction === value ? '#e6f0fa' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="satisfaction"
                            value={value}
                            checked={formData.satisfaction === value}
                            onChange={handleChange}
                            style={{ width: '16px', height: '16px' }}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                    <label style={{ marginRight: '10px', color: '#666' }}>Is the problem resolved?</label>
                    <input
                      type="checkbox"
                      name="resolved"
                      checked={formData.resolved}
                      onChange={handleChange}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#666' }}>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add any additional notes here..."
                      className="form-control"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '30px',
                        border: '1px solid #ddd',
                        minHeight: '100px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="submit"
                      className="theme-btn"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#2A5B84',
                        color: 'white',
                        padding: '12px 30px',
                        borderRadius: '25px',
                        border: 'none',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Now'}
                    </button>
                    <button
                      type="button"
                      className="theme-btn"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        padding: '12px 30px',
                        borderRadius: '25px',
                        border: 'none',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problem;