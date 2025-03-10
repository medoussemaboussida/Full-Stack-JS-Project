import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

function AddActivity() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    image: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  const categories = [
    "Professional and Intellectual",
    "Wellness and Relaxation",
    "Social and Relationship",
    "Physical and Sports",
    "Leisure and Cultural",
    "Consumption and Shopping",
    "Domestic and Organizational",
    "Nature and Animal-Related",
  ];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, image: file }));
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        setPreviewImage(imageUrl);
      } else {
        setPreviewImage(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem("jwt-token");
    if (!token) {
      toast.error("You must be logged in to add an activity.");
      setIsSubmitting(false);
      return;
    }

    let userId;
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    } catch (error) {
      toast.error("Invalid session, please log in again.");
      localStorage.removeItem("jwt-token");
      navigate("/login");
      return;
    }

    if (!userId) {
      toast.error("User not found, please log in again.");
      setIsSubmitting(false);
      return;
    }

    const data = new FormData();
data.append("title", formData.title);
data.append("description", formData.description);
data.append("category", formData.category);
if (formData.image) {
  data.append("image", formData.image); // Le champ doit être "image"
}


    try {
      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${userId}/add-activity`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await response.json();
      if (response.ok) {
        toast.success("Activity successfully added!");
        setFormData({ title: "", description: "", category: "", image: null });
        setPreviewImage(null);
        setTimeout(() => navigate("/Activities"), 2000);
      } else {
        toast.error(result.message || "Error while adding the activity.");
      }
    } catch (error) {
      toast.error("Network error while adding the activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Breadcrumb */}
      <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Add an Activity</h2>
          <ul className="breadcrumb-menu">
            <li>
              <a href="/Home">Home</a>
            </li>
            <li className="active">Add an Activity</li>
          </ul>
        </div>
      </div>

      {/* Form Section */}
      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="become-volunteer-img">
                <img src={previewImage || "assets/img/volunteer/01.jpg"} alt="Preview" />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="become-volunteer-form">
                <h2>Add a New Activity</h2>
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Activity Title"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <textarea
                          className="form-control"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Activity Description"
                          required
                          rows="3"
                        ></textarea>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <select
                          className="form-control"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select a Category</option>
                          {categories.map((cat, index) => (
                            <option key={index} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleChange}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="col-md-12">
                      <button type="submit" className="theme-btn mt-2" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Add Activity"}{" "}
                        <i className="fas fa-circle-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-area">
        <div className="container">
          <div className="copyright text-center">
            <p>
              &copy; {new Date().getFullYear()} <a href="#">Lovcare</a> - All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AddActivity;
