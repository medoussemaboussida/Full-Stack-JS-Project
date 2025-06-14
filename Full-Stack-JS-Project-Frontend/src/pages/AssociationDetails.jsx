import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../App.css";
import { jwtDecode } from "jwt-decode";

const BASE_URL = "http://localhost:5000";

const AssociationDetails = () => {
  const { id } = useParams();
  const [association, setAssociation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
        console.log("User ID from token:", decoded.id);
      } catch (error) {
        console.error("Error decoding token:", error);
        toast.error("Invalid session, please log in again");
      }
    } else {
      console.log("No token found in localStorage");
    }

    const fetchAssociationDetails = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        if (!token) throw new Error("No token found in localStorage");
        console.log(`Fetching association details for ID: ${id}`);
        const response = await axios.get(
          `${BASE_URL}/association/getAssociationById/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("API Response:", response.data);
        setAssociation(response.data);
        setFormData(response.data);
        console.log("User ID from association:", response.data.user_id?._id);
        setIsLoading(false);
      } catch (err) {
        console.error(
          "Error fetching association details:",
          err.response || err
        );
        setError(`Error: ${err.response?.data?.message || err.message}`);
        setIsLoading(false);
        toast.error(`Error: ${err.response?.data?.message || err.message}`);
      }
    };

    fetchAssociationDetails();
  }, [id]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleUpdate = () => setIsEditing(true);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) throw new Error("No token found");
      const updatedData = { ...formData };
      const response = await axios.put(
        `${BASE_URL}/association/updateAssociation/${id}`,
        updatedData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAssociation(response.data);
      setFormData(response.data);
      setIsEditing(false);
      toast.success("Update successful!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating");
    }
  };

  const handleCancel = () => {
    setFormData(association);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this association?"))
      return;
    try {
      const token = localStorage.getItem("jwt-token");
      await axios.delete(`${BASE_URL}/association/deleteAssociation/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Deletion successful!");
      setTimeout(() => navigate("/Associations"), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting");
    }
  };

  if (isLoading)
    return (
      <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>
        Loading...
      </div>
    );
  if (error)
    return (
      <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>
        {error}
      </div>
    );
  if (!association)
    return (
      <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>
        Association not found
      </div>
    );

  const isCreator = userId && association.user_id?._id === userId;
  console.log("isCreator:", isCreator);

  return (
    <>
      <div
        className="site-breadcrumb"
        style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">{association.Name_association}</h2>
          <ul className="breadcrumb-menu">
            <li>
              {" "}
              <a href="/Home" style={{ color: "#fff", textDecoration: "none" }}>
                Home
              </a>{" "}
            </li>
            <li>
              <Link
                to="/Associations"
                style={{ color: "#fff", textDecoration: "none" }}
              >
                Our Associations
              </Link>
            </li>
            <li className="active">{association.Name_association}</li>
          </ul>
        </div>
      </div>

      <div className="team-single py-120">
        <div className="container">
          <ToastContainer />
          <div className="team-single-wrap">
            <div className="row align-items-center">
              <div className="col-lg-4">
                <div className="team-single-img">
                  <img
                    src={`${BASE_URL}${association.logo_association}`}
                    alt={association.Name_association}
                    onError={(e) =>
                      (e.target.src = "/assets/img/team/default.jpg")
                    }
                  />
                </div>
              </div>
              <div className="col-lg-8">
                <div className="team-single-content">
                  <div className="team-single-name">
                    {isEditing ? (
                      <input
                        type="text"
                        name="Name_association"
                        value={formData.Name_association}
                        onChange={handleFormChange}
                        className="form-control"
                      />
                    ) : (
                      <h3>{association.Name_association}</h3>
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        name="support_type"
                        value={formData.support_type}
                        onChange={handleFormChange}
                        className="form-control"
                      />
                    ) : (
                      <p>{association.support_type || "Association"}</p>
                    )}
                  </div>
                  <div className="team-single-info">
                    <ul>
                      <li>
                        <span className="team-single-info-left">Email:</span>
                        {isEditing ? (
                          <input
                            type="email"
                            name="contact_email_association"
                            value={formData.contact_email_association}
                            onChange={handleFormChange}
                            className="form-control"
                          />
                        ) : (
                          <span className="team-single-info-right">
                            {association.contact_email_association ||
                              "Not specified"}
                          </span>
                        )}
                      </li>
                      <li>
                        <span className="team-single-info-left">
                          Support Type:
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            name="support_type"
                            value={formData.support_type}
                            onChange={handleFormChange}
                            className="form-control"
                          />
                        ) : (
                          <span className="team-single-info-right">
                            {association.support_type || "Not specified"}
                          </span>
                        )}
                      </li>
                    </ul>
                  </div>
                  <hr />
                  <div className="team-single-social">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="facebook"
                          value={formData.facebook || ""}
                          onChange={handleFormChange}
                          className="form-control mb-2"
                          placeholder="Facebook Link"
                        />
                        <input
                          type="text"
                          name="twitter"
                          value={formData.twitter || ""}
                          onChange={handleFormChange}
                          className="form-control mb-2"
                          placeholder="Twitter Link"
                        />
                        <input
                          type="text"
                          name="instagram"
                          value={formData.instagram || ""}
                          onChange={handleFormChange}
                          className="form-control mb-2"
                          placeholder="Instagram Link"
                        />
                        <input
                          type="text"
                          name="linkedin"
                          value={formData.linkedin || ""}
                          onChange={handleFormChange}
                          className="form-control mb-2"
                          placeholder="LinkedIn Link"
                        />
                        <input
                          type="text"
                          name="youtube"
                          value={formData.youtube || ""}
                          onChange={handleFormChange}
                          className="form-control mb-2"
                          placeholder="YouTube Link"
                        />
                      </>
                    ) : (
                      <>
                        <a href={association.facebook || "#"}>
                          <i className="fab fa-facebook-f"></i>
                        </a>
                        <a href={association.twitter || "#"}>
                          <i className="fab fa-x-twitter"></i>
                        </a>
                        <a href={association.instagram || "#"}>
                          <i className="fab fa-instagram"></i>
                        </a>
                        <a href={association.linkedin || "#"}>
                          <i className="fab fa-linkedin-in"></i>
                        </a>
                        <a href={association.youtube || "#"}>
                          <i className="fab fa-youtube"></i>
                        </a>
                      </>
                    )}
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
                  {isEditing ? (
                    <textarea
                      name="Description_association"
                      value={formData.Description_association}
                      onChange={handleFormChange}
                      className="form-control"
                      rows="5"
                    />
                  ) : (
                    <p>
                      {association.Description_association ||
                        "No description available."}
                    </p>
                  )}
                  {isCreator && (
                    <div className="mt-3">
                      {isEditing ? (
                        <form onSubmit={handleFormSubmit}>
                          <button type="submit" className="theme-btn me-2">
                            Save <i className="fas fa-save"></i>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="theme-btn btn-danger"
                          >
                            Cancel <i className="fas fa-times"></i>
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            onClick={handleUpdate}
                            className="theme-btn me-2"
                          >
                            Update <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={handleDelete}
                            className="theme-btn btn-danger"
                          >
                            Delete <i className="fas fa-trash"></i>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-lg-5">
                <div className="team-single-overview-img">
                  <img
                    src="/assets/img/about/associations_Newletter-640x400pxl-480x320.png"
                    alt="Overview"
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
