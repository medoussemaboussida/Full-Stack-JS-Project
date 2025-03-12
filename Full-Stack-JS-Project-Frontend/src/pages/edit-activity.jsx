import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

function EditActivity() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    imageUrl: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

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

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        if (!token) {
          toast.error("You must be logged in to edit an activity.");
          return;
        }

        const response = await fetch(`http://localhost:5000/users/activity/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (response.ok) {
          console.log("Fetched activity data:", result);
          const imageUrl = result.imageUrl
            ? result.imageUrl.startsWith("http")
              ? result.imageUrl
              : `http://localhost:5000${result.imageUrl}`
            : null;
          console.log("Computed image URL:", imageUrl);
          setFormData({
            title: result.title || "",
            description: result.description || "",
            category: result.category || "",
            imageUrl: result.imageUrl || null,
          });
          setPreviewImage(imageUrl);
        } else {
          toast.error(result.message || "Error fetching activity details.");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Network error while fetching activity details.");
      }
    };

    fetchActivity();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, imageUrl: file || prev.imageUrl }));
      if (file) {
        setPreviewImage(URL.createObjectURL(file));
      } else {
        setPreviewImage(
          formData.imageUrl
            ? formData.imageUrl.startsWith("http")
              ? formData.imageUrl
              : `http://localhost:5000${formData.imageUrl}`
            : null
        );
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
      toast.error("You must be logged in to edit an activity.");
      setIsSubmitting(false);
      return;
    }

    const decoded = jwtDecode(token);
    const userId = decoded.id;

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", formData.category);

    if (formData.imageUrl && formData.imageUrl instanceof File) {
      data.append("image", formData.imageUrl);
    }

    try {
      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${userId}/update-activity/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await response.json();
      if (response.ok) {
        toast.success("Activity successfully updated!");
        setTimeout(() => navigate("/Activities"), 2000);
      } else {
        toast.error(result.message || "Error while updating the activity.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Network error while updating the activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Edit
  const handleCancel = () => {
    navigate("/Activities");
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Edit Activity</h2>
          <ul className="breadcrumb-menu">
            <li>
              <a href="/Home">Home</a>
            </li>
            <li className="active">Edit Activity</li>
          </ul>
        </div>
      </div>

      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="become-volunteer-img">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Activity Image"
                    style={{ maxWidth: "100%", height: "auto" }}
                    onError={(e) => {
                      e.target.src = "/assets/img/default-image.jpg";
                      console.log("Activity image failed to load, using default.");
                    }}
                  />
                ) : (
                  <div>
                    <p>No image available for this activity</p>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="become-volunteer-form">
                <h2>Edit Activity</h2>
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
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button
                          type="submit"
                          className="theme-btn mt-2"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Updating..." : "Update Activity"}{" "}
                          <i className="fas fa-circle-arrow-right"></i>
                        </button>
                        <button
                          type="button"
                          className="theme-btn mt-2"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          style={{ backgroundColor: "#f44336" }} // Red to indicate cancellation
                        >
                          Cancel Edit <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer-area">
        <div className="container">
          <div className="copyright text-center">
            <p>
              © {new Date().getFullYear()} <a href="#">Lovcare</a> - All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default EditActivity;