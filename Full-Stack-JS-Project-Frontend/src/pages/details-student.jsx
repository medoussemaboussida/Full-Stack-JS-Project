import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";

// Fonction pour évaluer la force du mot de passe
const getPasswordStrength = (password) => {
  let strength = 0;
  const minLength = 8;

  if (password.length > 0) strength += 10;
  if (password.length >= minLength) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 30;

  strength = Math.min(strength, 100);

  let label = "Weak";
  let color = "#f44336";
  if (strength >= 70) {
    label = "Strong";
    color = "#4CAF50";
  } else if (strength >= 40) {
    label = "Medium";
    color = "#FF9800";
  }

  return { strength, label, color };
};

function DetailsStudents() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents] = useState([]);
  const [hasAssociation, setHasAssociation] = useState(false); // Nouvel état pour vérifier l'association
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    dob: "",
    speciality: "",
    level: "",
    role: "",
    etat: "",
    user_photo: "",
    receiveEmails: true,
    description: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("08:00");
  const [selectedEndTime, setSelectedEndTime] = useState("17:00");
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(formData.description || '');
  const [showDeleteAvailabilityModal, setShowDeleteAvailabilityModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const BASE_URL = "http://localhost:5000";
  const navigate = useNavigate();

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
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatAvailabilitiesToEvents = (availabilities) => {
    if (!availabilities || !Array.isArray(availabilities)) return [];
    return availabilities
      .map((slot, index) => {
        let date;
  
        // New schema with date
        if (slot.date) {
          date = new Date(slot.date);
          if (isNaN(date.getTime())) {
            console.error(`Invalid date in slot ${index}:`, slot);
            return null;
          }
        }
        // Old schema with day
        else if (slot.day) {
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayIndex = daysOfWeek.indexOf(slot.day);
          if (dayIndex === -1) {
            console.error(`Invalid day in slot ${index}:`, slot);
            return null;
          }
          const now = new Date();
          const currentDayIndex = now.getDay();
          const daysToAdd = (dayIndex - currentDayIndex + 7) % 7;
          date = new Date(now);
          date.setDate(now.getDate() + daysToAdd);
          date.setHours(0, 0, 0, 0);
        } else {
          console.error(`Missing required fields in slot ${index}:`, slot);
          return null;
        }
        if (!slot.startTime || !slot.endTime) {
          console.error(`Missing time fields in slot ${index}:`, slot);
          return null;
        }
        const [startHour, startMinute] = slot.startTime.split(":").map(Number);
        const [endHour, endMinute] = slot.endTime.split(":").map(Number);
        const startDate = new Date(date);
        startDate.setHours(startHour, startMinute, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(endHour, endMinute, 0, 0);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error(`Invalid time in slot ${index}:`, slot);
          return null;
        }
        return {
          id: index.toString(), // Ensure ID is a string for FullCalendar
          title: `Available - ${startDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          extendedProps: { originalSlot: slot },
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const fetchUser = async () => {
          try {
            const response = await fetch(`${BASE_URL}/users/session/${decoded.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
              setUser(data);
              setFormData({
                username: data.username,
                email: data.email,
                dob: formatDateForInput(data.dob),
                speciality: data.speciality || "",
                level: data.level || "",
                role: data.role,
                etat: data.etat,
                user_photo: data.user_photo || "",
                receiveEmails: data.receiveEmails,
                description: data.description || "",
              });
              setPreviewPhoto(data.user_photo ? `${BASE_URL}${data.user_photo}` : "assets/img/user.png");
              if (data.availability) {
                const formattedEvents = formatAvailabilitiesToEvents(data.availability);
                setEvents(formattedEvents);
              }

              // Vérifier si l'utilisateur a déjà une association
              if (data.role === "association_member") {
                const associationResponse = await fetch(`${BASE_URL}/association/check`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const associationData = await associationResponse.json();
                if (associationResponse.ok) {
                  setHasAssociation(associationData.hasAssociation);
                } else {
                  toast.error("Erreur lors de la vérification de l’association");
                }
              }
            } else {
              toast.error(`Error: ${data.message || "Failed to fetch user data"}`);
              if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("jwt-token");
                navigate("/login");
              }
            }
          } catch (error) {
            console.error("Error fetching user:", error);
            toast.error("Failed to load user data");
          }
        };
        fetchUser();
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("jwt-token");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

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
      receiveEmails: user.receiveEmails,
      description: user.description || "",
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
      reader.onloadend = () => setPreviewPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDescription = async () => {
    if (!descriptionInput.trim()) {
      toast.error("Description cannot be empty");
      return;
    }
  
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(`${BASE_URL}/users/psychiatrists/update-description/${decoded.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: descriptionInput }),
      });
      const data = await response.json();
      if (response.ok) {
        setFormData((prev) => ({ ...prev, description: descriptionInput }));
        setUser((prev) => ({ ...prev, description: descriptionInput }));
        setShowDescriptionModal(false);
        toast.success("Description updated successfully");
      } else {
        toast.error(`Error updating description: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error updating description");
    }
  };

  const handleReceiveEmailsChange = async (e) => {
    const value = e.target.value === "yes";
    setFormData((prevData) => ({ ...prevData, receiveEmails: value }));
    try {
      const token = localStorage.getItem("jwt-token");
      const decoded = jwtDecode(token);
      const response = await fetch(`${BASE_URL}/users/update-receive-emails/${decoded.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiveEmails: value }),
      });
      const data = await response.json();
      if (response.ok) {
        setUser((prevUser) => ({ ...prevUser, receiveEmails: value }));
        toast.success("Email preference updated successfully");
      } else {
        toast.error(`Error updating email preference: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error updating email preference");
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
      let endpoint = '';
      let body = {};

      if (user.role === 'psychiatrist') {
        endpoint = `${BASE_URL}/users/psychiatrists/update-description/${decoded.id}`;
        body = { description: formData.description };
      } else {
        endpoint = `${BASE_URL}/users/students/update/${decoded.id}`;
        body = formData;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
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
    if (!passwordData.newPassword || !passwordData.confirmNewPassword || !passwordData.currentPassword) {
      toast.error("All fields are required");
      return;
    }
    const { strength } = getPasswordStrength(passwordData.newPassword);
    if (strength < 40) {
      toast.error("Password is too weak. Please use a stronger password.");
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Account deleted successfully");
        localStorage.removeItem("jwt-token");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        const data = await response.json();
        toast.error(`Error deleting account: ${data.message}`);
      }
    } catch (error) {
      toast.error("Error deleting account");
    }
  };

  const handleEventDrop = async (info) => {
    const token = localStorage.getItem("jwt-token");
    const decoded = jwtDecode(token);
    const slotIndex = events.findIndex((event) => event.id === info.event.id);

    if (slotIndex !== -1) {
      const startDate = new Date(info.event.start);
      const endDate = new Date(info.event.end);
      const updatedAvailability = {
        date: formatDateForInput(startDate),
        startTime: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
        endTime: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
      };

      try {
        const response = await fetch(`${BASE_URL}/users/psychiatrists/update-availability/${decoded.id}/${slotIndex}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedAvailability),
        });
        if (response.ok) {
          const data = await response.json();
          setEvents(formatAvailabilitiesToEvents(data.user.availability));
          toast.success("Availability updated successfully");
        } else {
          const errorData = await response.json();
          toast.error(`Error: ${errorData.message}`);
        }
      } catch (error) {
        toast.error("Error updating availability");
        console.error(error);
      }
    }
  };

  const handleEventClick = (info) => {
    console.log("Event clicked:", info.event.id); // Debug log
    setSelectedEventId(info.event.id);
    setShowDeleteAvailabilityModal(true);
  };

  const handleDeleteAvailability = async () => {
    const token = localStorage.getItem("jwt-token");
    const decoded = jwtDecode(token);
    const slotIndex = events.findIndex((event) => event.id === selectedEventId);

    if (slotIndex === -1) {
      toast.error("Availability slot not found");
      setShowDeleteAvailabilityModal(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/users/psychiatrists/delete-availability/${decoded.id}/${slotIndex}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(formatAvailabilitiesToEvents(data.user.availability));
        toast.success("Availability deleted successfully");
        setShowDeleteAvailabilityModal(false);
        setSelectedEventId(null);
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.message}`);
        setShowDeleteAvailabilityModal(false);
      }
    } catch (error) {
      toast.error("Error deleting availability");
      console.error(error);
      setShowDeleteAvailabilityModal(false);
    }
  };

  const handleDateSelect = (selectInfo) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(selectInfo.start);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("You cannot select a date in the past!");
      return;
    }

    setSelectedDate(formatDateForInput(selectInfo.start));
    setSelectedDateInfo(selectInfo);
    setSelectedStartTime(selectInfo.startStr.slice(11, 16) || "08:00");
    setSelectedEndTime(selectInfo.endStr.slice(11, 16) || "17:00");
    setShowAvailabilityModal(true);
  };

  const handleAvailabilityConfirm = async () => {
    const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
    const [endHour, endMinute] = selectedEndTime.split(":").map(Number);
    if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
      toast.error("End time must be after start time!");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availabilityDate = new Date(selectedDate);
    if (availabilityDate < today) {
      toast.error("Cannot save availability for a past date!");
      setShowAvailabilityModal(false);
      return;
    }

    const token = localStorage.getItem("jwt-token");
    const decoded = jwtDecode(token);
    const newAvailability = {
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
    };

    try {
      const response = await fetch(`${BASE_URL}/users/psychiatrists/add-availability/${decoded.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAvailability),
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(formatAvailabilitiesToEvents(data.user.availability));
        toast.success("Availability added successfully");
        setShowAvailabilityModal(false);
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.message}`);
      }
    } catch (error) {
      toast.error("Error adding availability");
      console.error(error);
    }
  };

  const handleAddAssociation = () => {
    navigate("/add-association");
  };

  const handleAddEvent = () => {
    navigate("/add-event");
  };

  if (!user) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Cancel</button>
              <button onClick={handleDeleteAccount} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showAvailabilityModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "5px", width: "350px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ textAlign: "center", marginBottom: "15px" }}>Add Availability</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={formatDateForInput(new Date())}
                style={{ width: "100%", padding: "8px", borderRadius: "3px", border: "1px solid #ccc" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Start Time</label>
              <input
                type="time"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                min="08:00"
                max="20:00"
                style={{ width: "100%", padding: "8px", borderRadius: "3px", border: "1px solid #ccc" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>End Time</label>
              <input
                type="time"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                min={selectedStartTime}
                max="20:00"
                style={{ width: "100%", padding: "8px", borderRadius: "3px", border: "1px solid #ccc" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <button onClick={handleAvailabilityConfirm} style={{ backgroundColor: "#4CAF50", color: "white", padding: "8px 16px", border: "none", borderRadius: "50px", cursor: "pointer" }}>Confirm</button>
              <button onClick={() => setShowAvailabilityModal(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "8px 16px", border: "none", borderRadius: "50px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
        <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
          <div className="container">
            <h2 className="breadcrumb-title">Profile Details</h2>
            <ul className="breadcrumb-menu">
              <li><a href="index.html">Home</a></li>
              <li className="active">Profile Details</li>
            </ul>
          </div>
        </div>

        <div style={{ padding: "40px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
            <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)", padding: "30px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "40px" }}>
                <div style={{ borderRadius: "12px", overflow: "hidden" }}>
                  <img src={previewPhoto} alt="Profile" style={{ width: "100%", display: "block" }} />
                </div>

                <div style={{ padding: "20px 0" }}>
                  <div style={{ borderBottom: "2px solid #eef2f6", paddingBottom: "20px", marginBottom: "25px" }}>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          style={{ width: "100%", padding: "12px 15px", borderRadius: "50px", border: "1px solid #e2e8f0", fontSize: "1.5rem", fontWeight: "600", outline: "none" }}
                        />
                        {formData.username === "" && <span style={{ color: "red", fontSize: "0.9rem" }}>Username is required</span>}
                      </>
                    ) : (
                      <h2 style={{ fontSize: "2rem", fontWeight: "700", color: "#2d3748", margin: "0" }}>{user.username}</h2>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                    {[
                      { title: "Email", name: "email", value: formData.email, disabled: true },
                      { title: "Date of Birth", name: "dob", value: isEditing ? formData.dob : new Date(user.dob).toLocaleDateString(), type: isEditing ? "date" : "text" },
                      ...(user.role === "student" ? [
                        { title: "Speciality", name: "speciality", value: formData.speciality },
                        { title: "Level", name: "level", value: formData.level },
                      ] : []),
                      { title: "Role", name: "role", value: formData.role, disabled: true },
                      { title: "Status", name: "etat", value: formData.etat, disabled: true },
                      { title: "Description", name: "description", value: formData.description }
                    ].map((field, index) => (
                      <div key={index} style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)" }}>
                        <h6 style={{ fontSize: "0.95rem", color: "#718096", marginBottom: "10px", fontWeight: "500" }}>{field.title}</h6>
                        {field.name === "description" && user.role === "psychiatrist" ? (
                          <div 
                            onClick={() => {
                              setDescriptionInput(formData.description || '');
                              setShowDescriptionModal(true);
                            }} 
                            style={{ 
                              cursor: "pointer", 
                              padding: "10px", 
                              border: "1px solid #e2e8f0", 
                              borderRadius: "50px", 
                              backgroundColor: "#f9fafb",
                              minHeight: "100px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: formData.description ? "flex-start" : "center",
                              color: formData.description ? "#2d3748" : "#718096"
                            }}
                          >
                            {formData.description || "Click to add/edit description"}
                          </div>
                        ) : isEditing ? (
                          field.name === "speciality" ? (
                            <select name="speciality" value={formData.speciality} onChange={handleChange} style={{ width: "100%", padding: "10px 15px", borderRadius: "50px", border: "1px solid #e2e8f0" }}>
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
                            <select name="level" value={formData.level} onChange={handleChange} style={{ width: "100%", padding: "10px 15px", borderRadius: "50px", border: "1px solid #e2e8f0" }}>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          ) : field.name === "description" ? (
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              placeholder="Enter your professional description"
                              style={{ width: "100%", padding: "10px 15px", borderRadius: "30px", border: "1px solid #e2e8f0", minHeight: "100px", resize: "vertical" }}
                              maxLength={500}
                            />
                          ) : (
                            <input
                              type={field.type || "text"}
                              name={field.name}
                              value={field.value}
                              onChange={handleChange}
                              disabled={field.disabled}
                              style={{ width: "100%", padding: "10px 15px", borderRadius: "50px", border: "1px solid #e2e8f0", backgroundColor: field.disabled ? "#e9ecef" : "#ffffff" }}
                            />
                          )
                        ) : (
                          <p style={{ color: "#2d3748", fontSize: "1.1rem", margin: "0", fontWeight: "500" }}>{field.value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {user.role === "student" && (
                    <div style={{ marginTop: "20px", background: "#ffffff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)" }}>
                      <h6 style={{ fontSize: "1rem", color: "#2d3748", marginBottom: "15px", fontWeight: "600" }}>Receive Email Notifications</h6>
                      <div style={{ display: "flex", gap: "25px" }}>
                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "8px 16px", borderRadius: "20px", backgroundColor: formData.receiveEmails === true ? "#4CAF50" : "#f1f5f9", color: formData.receiveEmails === true ? "#ffffff" : "#2d3748", transition: "all 0.3s ease", boxShadow: formData.receiveEmails === true ? "0 2px 5px rgba(0, 0, 0, 0.1)" : "none" }}>
                          <input type="radio" name="receiveEmails" value="yes" checked={formData.receiveEmails === true} onChange={handleReceiveEmailsChange} style={{ display: "none" }} />
                          <span style={{ marginLeft: "8px", fontWeight: "500" }}>Yes</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "8px 16px", borderRadius: "20px", backgroundColor: formData.receiveEmails === false ? "#f44336" : "#f1f5f9", color: formData.receiveEmails === false ? "#ffffff" : "#2d3748", transition: "all 0.3s ease", boxShadow: formData.receiveEmails === false ? "0 2px 5px rgba(0, 0, 0, 0.1)" : "none" }}>
                          <input type="radio" name="receiveEmails" value="no" checked={formData.receiveEmails === false} onChange={handleReceiveEmailsChange} style={{ display: "none" }} />
                          <span style={{ marginLeft: "8px", fontWeight: "500" }}>No</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "15px", marginTop: "30px", flexWrap: "wrap" }}>
                    {user.role === "student" && (
                      isEditing ? (
                        <>
                          <button onClick={handleSave} style={{ backgroundColor: "#4CAF50", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                            <i className="far fa-save" style={{ marginRight: "8px" }}></i> Save
                          </button>
                          <button onClick={handleCancel} style={{ backgroundColor: "#f44336", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                            <i className="far fa-times" style={{ marginRight: "8px" }}></i> Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={handleEdit} style={{ backgroundColor: "#4CAF50", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                          <i className="far fa-edit" style={{ marginRight: "8px" }}></i> Edit
                        </button>
                      )
                    )}
                    <button onClick={() => setIsChangingPassword(true)} style={{ backgroundColor: "#2196F3", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                      <i className="fas fa-key" style={{ marginRight: "8px" }}></i> Change Password
                    </button>
                    <button onClick={() => setIsChangingPhoto(true)} style={{ backgroundColor: "#FF9800", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                      <i className="fas fa-camera" style={{ marginRight: "8px" }}></i> Change Photo
                    </button>
                    <button onClick={() => setShowDeleteModal(true)} style={{ backgroundColor: "#ff0000", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                      <i className="fas fa-trash" style={{ marginRight: "8px" }}></i> Delete Account
                    </button>
                    {user.role === "psychiatrist" && (
                      <button onClick={() => setShowCalendar(true)} style={{ backgroundColor: "#9C27B0", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                        <i className="fas fa-clock" style={{ marginRight: "8px" }}></i> Manage Availability
                      </button>
                    )}
                    {user.role === "association_member" && (
                      <>
                        {!hasAssociation && (
                          <button onClick={handleAddAssociation} style={{ backgroundColor: "#00BCD4", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                            <i className="fas fa-users" style={{ marginRight: "8px" }}></i> Add Association
                          </button>
                        )}
                        <button onClick={handleAddEvent} style={{ backgroundColor: "#8BC34A", color: "white", padding: "12px 24px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>
                          <i className="fas fa-calendar-plus" style={{ marginRight: "8px" }}></i> Add Event
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isChangingPassword && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Change Password</h3>
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  style={{ padding: "10px", width: "100%", borderRadius: "50px", border: "1px solid #ccc" }}
                />
                <i className={`fas ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"}`} onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ marginLeft: "10px", cursor: "pointer" }} />
              </div>
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  style={{ padding: "10px", width: "100%", borderRadius: "50px", border: "1px solid #ccc" }}
                />
                <i className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`} onClick={() => setShowNewPassword(!showNewPassword)} style={{ marginLeft: "10px", cursor: "pointer" }} />
              </div>
              <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  name="confirmNewPassword"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmNewPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                  style={{ padding: "10px", width: "100%", borderRadius: "50px", border: "1px solid #ccc" }}
                />
                <i className={`fas ${showConfirmNewPassword ? "fa-eye-slash" : "fa-eye"}`} onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={{ marginLeft: "10px", cursor: "pointer" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ height: "10px", backgroundColor: "#e0e0e0", borderRadius: "50px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${passwordStrength.strength}%`,
                      height: "100%",
                      backgroundColor: passwordStrength.color,
                      transition: "width 0.3s ease-in-out",
                    }}
                  />
                </div>
                <p style={{ textAlign: "center", marginTop: "5px", color: passwordStrength.color, fontWeight: "bold", fontSize:"14px" }}>
                  Password Strength: {passwordStrength.label}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button onClick={handleChangePassword} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Save New Password</button>
                <button onClick={() => setIsChangingPassword(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showDescriptionModal && user.role === "psychiatrist" && (
          <div style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: "rgba(0, 0, 0, 0.5)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 1000 
          }}>
            <div style={{ 
              backgroundColor: "white", 
              padding: "20px", 
              borderRadius: "8px", 
              width: "500px", 
              maxWidth: "90%", 
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" 
            }}>
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
                {formData.description ? "Edit Description" : "Add Description"}
              </h3>
              <textarea
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Enter your professional description"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc", 
                  minHeight: "150px", 
                  resize: "vertical",
                  marginBottom: "20px"
                }}
                maxLength={500}
              />
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button 
                  onClick={handleSaveDescription} 
                  style={{ 
                    backgroundColor: "#4CAF50", 
                    color: "white", 
                    padding: "10px 20px", 
                    fontSize: "16px", 
                    border: "none", 
                    cursor: "pointer", 
                    borderRadius: "5px" 
                  }}
                >
                  Save
                </button>
                <button 
                  onClick={() => setShowDescriptionModal(false)} 
                  style={{ 
                    backgroundColor: "#f44336", 
                    color: "white", 
                    padding: "10px 20px", 
                    fontSize: "16px", 
                    border: "none", 
                    cursor: "pointer", 
                    borderRadius: "50px" 
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isChangingPhoto && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
              <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Change Profile Photo</h3>
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <img src={previewPhoto} alt="Preview" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px" }} />
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "block", margin: "0 auto" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button onClick={handleChangePhoto} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Save Photo</button>
                <button onClick={() => { setIsChangingPhoto(false); setPhotoFile(null); setPreviewPhoto(user.user_photo ? `${BASE_URL}${user.user_photo}` : "assets/img/user.png"); }} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showCalendar && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "90%", maxWidth: "1000px", maxHeight: "90vh", overflow: "auto", position: "relative" }}>
              <h3 style={{ textAlign: "center", marginBottom: "10px" }}>Manage Your Availability</h3>
              <p style={{ textAlign: "center", color: "#555", marginBottom: "20px" }}>
                Select a time slot to add availability, drag to move, or click to delete
              </p>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                eventDrop={handleEventDrop}
                eventClick={handleEventClick}
                select={handleDateSelect}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                validRange={{
                  start: new Date().toISOString().split("T")[0],
                }}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
              />
              <button onClick={() => setShowCalendar(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "5px", marginTop: "20px", display: "block", marginLeft: "auto" }}>Close</button>

              {/* Delete Availability Modal Inside Calendar */}
              {showDeleteAvailabilityModal && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
                    <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
                    <p style={{ marginBottom: "20px", textAlign: "center" }}>Do you want to delete this availability?</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                      <button onClick={() => setShowDeleteAvailabilityModal(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Cancel</button>
                      <button onClick={handleDeleteAvailability} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", fontSize: "16px", border: "none", cursor: "pointer", borderRadius: "50px" }}>Confirm</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DetailsStudents;