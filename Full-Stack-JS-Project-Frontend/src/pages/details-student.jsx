import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function DetailsStudents() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    dob: "",
    speciality: "",
    level: "",
    role: "",
    etat: "",
    user_photo: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [availabilityData, setAvailabilityData] = useState({
    day: "",
    startTime: "",
    endTime: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const BASE_URL = "http://localhost:5000"; // URL de base du serveur

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const fetchUser = async () => {
          try {
            const response = await fetch(`${BASE_URL}/users/session/${decoded.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            const data = await response.json();
            if (response.ok) {
              console.log("Fetched user data on load:", data); // Vérifiez si availability est présent
              setUser(data); // Assurez-vous que data contient availability
              setFormData({
                username: data.username,
                email: data.email,
                dob: formatDateForInput(data.dob),
                speciality: data.speciality || "",
                level: data.level || "",
                role: data.role,
                etat: data.etat,
                user_photo: data.user_photo || "",
              });
              setPreviewPhoto(
                data.user_photo ? `${BASE_URL}${data.user_photo}` : "assets/img/user.png"
              );
            } else {
              console.error("Failed to fetch user:", data.message);
            }
          } catch (error) {
            console.error("Error fetching user:", error);
          }
        };
        fetchUser();
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("jwt-token");
        window.location.href = "/login";
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        dob: formatDateForInput(user.dob),
        speciality: user.speciality || "",
        level: user.level || "",
        role: user.role,
        etat: user.etat,
        user_photo: user.user_photo || "",
      });
      setPreviewPhoto(
        user.user_photo ? `${BASE_URL}${user.user_photo}` : "assets/img/user.png"
      );
    }
  }, [user]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      username: user.username,
      email: user.email,
      dob: formatDateForInput(user.dob),
      speciality: user.speciality || "",
      level: user.level || "",
      role: user.role,
      etat: user.etat,
      user_photo: user.user_photo || "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "dob") {
      const age = calculateAge(value);
      if (age < 18) {
        toast.error("You must be at least 18 years old");
        return;
      }
    }
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.username) {
      toast.error("Username cannot be empty");
      return;
    }
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(`${BASE_URL}/users/students/update/${decoded.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user || data.student);
        setIsEditing(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error(`Error updating profile: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error updating profile");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (
      !passwordData.newPassword ||
      !passwordData.confirmNewPassword ||
      !passwordData.currentPassword
    ) {
      toast.error("All fields are required");
      return;
    }
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(`${BASE_URL}/users/students/update/${decoded.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordData.newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Password changed successfully");
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } else {
        toast.error(`Error changing password: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error changing password");
    }
  };

  const handleChangePhoto = async () => {
    if (!photoFile) {
      toast.error("Please select a photo");
      return;
    }
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const formDataPhoto = new FormData();
      formDataPhoto.append("user_photo", photoFile);

      const response = await fetch(`${BASE_URL}/users/students/update-photo/${decoded.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataPhoto,
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setFormData((prev) => ({ ...prev, user_photo: data.user.user_photo }));
        setPreviewPhoto(`${BASE_URL}${data.user.user_photo}`);
        setIsChangingPhoto(false);
        setPhotoFile(null);
        toast.success("Profile photo updated successfully");
      } else {
        toast.error(`Error updating photo: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error updating photo");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(`${BASE_URL}/users/delete/${decoded.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Account deleted successfully");
        localStorage.removeItem("jwt-token");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        const data = await response.json();
        toast.error(`Error deleting account: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error deleting account");
    }
  };

  const handleAddAvailability = async () => {
    if (!availabilityData.day || !availabilityData.startTime || !availabilityData.endTime) {
      toast.error("All fields are required");
      return;
    }

    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(
        `${BASE_URL}/users/psychiatrists/add-availability/${decoded.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(availabilityData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setUser(data.user); // Mise à jour de l'utilisateur avec les nouvelles disponibilités
        setIsAddingAvailability(false);
        setAvailabilityData({ day: "", startTime: "", endTime: "" });
        toast.success("Availability added successfully");
      } else {
        toast.error(`Error adding availability: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error adding availability");
    }
  };
  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  fontSize: "16px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "5px",
                  transition: "background-color 0.3s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  fontSize: "16px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "5px",
                  transition: "background-color 0.3s ease",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
        <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
          <div className="container">
            <h2 className="breadcrumb-title">Volunteer Single</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="index.html">Home</a>
              </li>
              <li className="active">Volunteer Single</li>
            </ul>
          </div>
        </div>

        <div style={{ padding: "40px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
                padding: "30px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "300px 1fr",
                  gap: "40px",
                  alignItems: "start",
                }}
              >
                <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative" }}>
                  <img src={previewPhoto} alt="Profile" style={{ width: "100%", display: "block" }} />
                </div>

                <div style={{ padding: "20px 0" }}>
                  <div
                    style={{
                      borderBottom: "2px solid #eef2f6",
                      paddingBottom: "20px",
                      marginBottom: "25px",
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "12px 15px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "1.5rem",
                            fontWeight: "600",
                            transition: "all 0.3s ease",
                            outline: "none",
                            backgroundColor: "#ffffff",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                        />
                        {formData.username === "" && (
                          <span style={{ color: "red", fontSize: "0.9rem" }}>
                            Username is required
                          </span>
                        )}
                      </>
                    ) : (
                      <h2
                        style={{
                          fontSize: "2rem",
                          fontWeight: "700",
                          color: "#2d3748",
                          margin: "0",
                        }}
                      >
                        {user.username}
                      </h2>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {[
                      { title: "Email", name: "email", value: formData.email, disabled: true },
                      {
                        title: "Date of Birth",
                        name: "dob",
                        value: isEditing ? formData.dob : new Date(user.dob).toLocaleDateString(),
                        type: isEditing ? "date" : "text",
                      },
                      ...(user.role === "student"
                        ? [
                            { title: "Speciality", name: "speciality", value: formData.speciality },
                            { title: "Level", name: "level", value: formData.level },
                          ]
                        : []),
                      { title: "Role", name: "role", value: formData.role, disabled: true },
                      { title: "Status", name: "etat", value: formData.etat, disabled: true },
                      ...(user.role === "psychiatrist" && user.availability && user.availability.length > 0
                        ? [{
                            title: "Availability",
                            name: "availability",
                            value: user.availability.map((slot) => `${slot.day}: ${slot.startTime} - ${slot.endTime}`).join(", "),
                            disabled: true,
                          }]
                        : []),
                    ].map((field, index) => (
                      <div
                        key={index}
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "20px",
                          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)";
                        }}
                      >
                        <h6
                          style={{
                            fontSize: "0.95rem",
                            color: "#718096",
                            marginBottom: "10px",
                            fontWeight: "500",
                          }}
                        >
                          {field.title}
                        </h6>
                        {isEditing && field.name !== "availability" ? (
                          field.name === "speciality" ? (
                            <select
                              name="speciality"
                              value={formData.speciality}
                              onChange={handleChange}
                              style={{
                                width: "100%",
                                padding: "10px 15px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                fontSize: "1rem",
                                backgroundColor: "#ffffff",
                                transition: "all 0.3s ease",
                                outline: "none",
                              }}
                              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="P">P</option>
                              <option value="TWIN">TWIN</option>
                              <option value="SAE">SAE</option>
                              <option value="SE">SE</option>
                              <option value="BI">BI</option>
                              <option value="DS">DS</option>
                              <option value="IOSYS">IOSYS</option>
                              <option value="SLEAM">SLEAM</option>
                              <option value="SIM">SIM</option>
                              <option value="NIDS">NIDS</option>
                              <option value="INFINI">INFINI</option>
                            </select>
                          ) : field.name === "level" ? (
                            <select
                              name="level"
                              value={formData.level}
                              onChange={handleChange}
                              style={{
                                width: "100%",
                                padding: "10px 15px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                fontSize: "1rem",
                                backgroundColor: "#ffffff",
                                transition: "all 0.3s ease",
                                outline: "none",
                              }}
                              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          ) : (
                            <input
                              type={field.type || "text"}
                              name={field.name}
                              value={field.value}
                              onChange={handleChange}
                              disabled={field.disabled}
                              style={{
                                width: "100%",
                                padding: "10px 15px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                fontSize: "1rem",
                                backgroundColor: field.disabled ? "#e9ecef" : "#ffffff",
                                color: field.disabled ? "#6c757d" : "#2d3748",
                                transition: "all 0.3s ease",
                                outline: "none",
                                cursor: field.disabled ? "not-allowed" : "text",
                              }}
                              onFocus={(e) => !field.disabled && (e.target.style.borderColor = "#4CAF50")}
                              onBlur={(e) => !field.disabled && (e.target.style.borderColor = "#e2e8f0")}
                            />
                          )
                        ) : (
                          <p
                            style={{
                              color: "#2d3748",
                              fontSize: "1.1rem",
                              margin: "0",
                              fontWeight: "500",
                            }}
                          >
                            {field.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      marginTop: "30px",
                      flexWrap: "wrap",
                      textAlign: "center",
                    }}
                  >
                    {user.role === "student" && (
                      isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            style={{
                              backgroundColor: "#4CAF50",
                              color: "white",
                              padding: "12px 24px",
                              fontSize: "16px",
                              border: "none",
                              cursor: "pointer",
                              borderRadius: "8px",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                            }}
                          >
                            <i className="far fa-save" style={{ marginRight: "8px" }}></i> Save
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              backgroundColor: "#f44336",
                              color: "white",
                              padding: "12px 24px",
                              fontSize: "16px",
                              border: "none",
                              cursor: "pointer",
                              borderRadius: "8px",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                            }}
                          >
                            <i className="far fa-times" style={{ marginRight: "8px" }}></i> Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEdit}
                          style={{
                            backgroundColor: "#4CAF50",
                            color: "white",
                            padding: "12px 24px",
                            fontSize: "16px",
                            border: "none",
                            cursor: "pointer",
                            borderRadius: "8px",
                            transition: "all 0.3s ease",
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                          }}
                        >
                          <i className="far fa-edit" style={{ marginRight: "8px" }}></i> Edit
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      style={{
                        backgroundColor: "#2196F3",
                        color: "white",
                        padding: "12px 24px",
                        fontSize: "16px",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "8px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <i className="fas fa-key" style={{ marginRight: "8px" }}></i> Change Password
                    </button>
                    <button
                      onClick={() => setIsChangingPhoto(true)}
                      style={{
                        backgroundColor: "#FF9800",
                        color: "white",
                        padding: "12px 24px",
                        fontSize: "16px",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "8px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <i className="fas fa-camera" style={{ marginRight: "8px" }}></i> Change Photo
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      style={{
                        backgroundColor: "#ff0000",
                        color: "white",
                        padding: "12px 24px",
                        fontSize: "16px",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "8px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "translateY(-1px)";
                        e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <i className="fas fa-trash" style={{ marginRight: "8px" }}></i> Delete Account
                    </button>
                    {user.role === "psychiatrist" && (
                      <button
                        onClick={() => setIsAddingAvailability(true)}
                        style={{
                          backgroundColor: "#9C27B0",
                          color: "white",
                          padding: "12px 24px",
                          fontSize: "16px",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: "8px",
                          transition: "all 0.3s ease",
                          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
                        }}
                      >
                        <i className="fas fa-clock" style={{ marginRight: "8px" }}></i> Add Availability
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isChangingPassword && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Change Password</h3>
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                />
                <i
                  className={`fas ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`}
                  onMouseDown={() => setShowCurrentPassword(true)}
                  onMouseUp={() => setShowCurrentPassword(false)}
                  style={{ marginLeft: "10px", cursor: "pointer" }}
                />
              </div>
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                />
                <i
                  className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`}
                  onMouseDown={() => setShowNewPassword(true)}
                  onMouseUp={() => setShowNewPassword(false)}
                  style={{ marginLeft: "10px", cursor: "pointer" }}
                />
              </div>
              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  name="confirmNewPassword"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmNewPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })
                  }
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                />
                <i
                  className={`fas ${showConfirmNewPassword ? "fa-eye-slash" : "fa-eye"}`}
                  onMouseDown={() => setShowConfirmNewPassword(true)}
                  onMouseUp={() => setShowConfirmNewPassword(false)}
                  style={{ marginLeft: "10px", cursor: "pointer" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  onClick={handleChangePassword}
                  style={{
                    backgroundColor: "#4CAF50",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Save New Password
                </button>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isChangingPhoto && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Change Profile Photo</h3>
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <img
                  src={previewPhoto}
                  alt="Preview"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginBottom: "10px",
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "block", margin: "0 auto" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  onClick={handleChangePhoto}
                  style={{
                    backgroundColor: "#4CAF50",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Save Photo
                </button>
                <button
                  onClick={() => {
                    setIsChangingPhoto(false);
                    setPhotoFile(null);
                    setPreviewPhoto(
                      user.user_photo ? `${BASE_URL}${user.user_photo}` : "assets/img/user.png"
                    );
                  }}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddingAvailability && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                width: "400px",
                maxWidth: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Add Availability</h3>
              <div style={{ marginBottom: "10px" }}>
                <select
                  name="day"
                  value={availabilityData.day}
                  onChange={(e) => setAvailabilityData({ ...availabilityData, day: e.target.value })}
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                >
                  <option value="">Select Day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <input
                  type="time"
                  name="startTime"
                  value={availabilityData.startTime}
                  onChange={(e) =>
                    setAvailabilityData({ ...availabilityData, startTime: e.target.value })
                  }
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="time"
                  name="endTime"
                  value={availabilityData.endTime}
                  onChange={(e) =>
                    setAvailabilityData({ ...availabilityData, endTime: e.target.value })
                  }
                  style={{ padding: "10px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  onClick={handleAddAvailability}
                  style={{
                    backgroundColor: "#4CAF50",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Save Availability
                </button>
                <button
                  onClick={() => setIsAddingAvailability(false)}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    padding: "10px 20px",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DetailsStudents;