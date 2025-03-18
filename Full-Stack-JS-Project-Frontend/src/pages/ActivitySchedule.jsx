import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faTimes, faCheckCircle, faTrash } from "@fortawesome/free-solid-svg-icons";

// Function to generate a list of dates for the current month
const generateDatesForMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    dates.push(date.toISOString().split("T")[0]); // Format: YYYY-MM-DD
  }

  return dates;
};

// Function to get the first day of the month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return new Date(year, month, 1).getDay();
};

// Function to get the number of days in the current month
const getDaysInMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

function ActivitySchedule() {
  const [userId, setUserId] = useState(null);
  const [favoriteActivities, setFavoriteActivities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [scheduledActivities, setScheduledActivities] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFavoriteList, setShowFavoriteList] = useState(false);
  const [showRemoveFavoriteModal, setShowRemoveFavoriteModal] = useState(false);
  const [activityToRemove, setActivityToRemove] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showViewActivityModal, setShowViewActivityModal] = useState(false);
  const [showClearAllFavoriteModal, setShowClearAllFavoriteModal] = useState(false);
  const dates = generateDatesForMonth();
  const navigate = useNavigate();

  // Fetch favorite activities
  const fetchFavoriteActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/favorite-activities/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setFavoriteActivities(data.favoriteActivities || []);
      } else {
        toast.error(`Failed to fetch favorite activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching favorite activities:", error);
      toast.error("An error occurred while fetching favorite activities.");
    }
  };

  // Fetch all activities to get titles and details
  const fetchActivities = async () => {
    try {
      const response = await fetch("http://localhost:5000/users/list/activities");
      const data = await response.json();
      if (response.ok) {
        setActivities(data);
      } else {
        toast.error(`Failed to fetch activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("An error occurred while fetching activities.");
    }
  };

  // Fetch scheduled activities
  const fetchScheduledActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(`http://localhost:5000/users/schedule/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setScheduledActivities(data.schedules || {});
      } else {
        toast.error(`Failed to fetch scheduled activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching scheduled activities:", error);
      toast.error("An error occurred while fetching scheduled activities.");
    }
  };

  // Save scheduled activities
  const saveScheduledActivities = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("No authentication token found. Please log in.");
        navigate("/login");
        return;
      }
      const response = await fetch(`http://localhost:5000/users/schedule/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate, activities: scheduledActivities[selectedDate] || [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save schedule");
      toast.success("Schedule saved successfully!");
    } catch (error) {
      console.error("Error saving scheduled activities:", error);
      toast.error(`Error saving schedule: ${error.message}`);
    }
  };

  // Toggle favorite activity
  const toggleFavoriteActivity = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/favorite-activity/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activity: activityId }),
      });

      const data = await response.json();
      if (response.ok) {
        const isFavorite = favoriteActivities.includes(activityId);
        setFavoriteActivities((prev) =>
          isFavorite
            ? prev.filter((id) => id !== activityId)
            : [...prev, activityId]
        );
        toast.success(`Activity ${isFavorite ? "removed from" : "added to"} favorites!`);
      } else {
        toast.error(`Failed to toggle favorite: ${data.message}`);
      }
    } catch (error) {
      console.error("Error toggling favorite activity:", error);
      toast.error("An error occurred while toggling the favorite.");
    }
  };

  // Clear all favorite activities
  const clearFavoriteActivities = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/clear-favorite/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (response.ok) {
        setFavoriteActivities([]);
        toast.success("All favorite activities have been cleared!");
      } else {
        toast.error(`Failed to clear favorites: ${data.message}`);
      }
    } catch (error) {
      console.error("Error clearing favorite activities:", error);
      toast.error("An error occurred while clearing favorites.");
    }
  };

  // Handle remove favorite confirmation
  const handleRemoveFavorite = (activityId) => {
    setActivityToRemove(activityId);
    setShowRemoveFavoriteModal(true);
  };

  const handleConfirmRemoveFavorite = async () => {
    if (activityToRemove) {
      await toggleFavoriteActivity(activityToRemove);
    }
    closeRemoveFavoriteModal();
  };

  const closeRemoveFavoriteModal = () => {
    setShowRemoveFavoriteModal(false);
    setActivityToRemove(null);
  };

  // Handle view activity modal
  const handleViewActivityModal = (activity) => {
    setSelectedActivity(activity);
    setShowViewActivityModal(true);
  };

  const closeViewActivityModal = () => {
    setShowViewActivityModal(false);
    setSelectedActivity(null);
  };

  // Handle clear all favorites confirmation
  const handleConfirmClearAllFavorites = async () => {
    await clearFavoriteActivities();
    closeClearAllFavoriteModal();
  };

  const closeClearAllFavoriteModal = () => {
    setShowClearAllFavoriteModal(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.id) {
          setUserId(decoded.id);
          fetchFavoriteActivities(decoded.id);
          fetchActivities();
          fetchScheduledActivities(decoded.id);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        toast.error("Invalid session, please log in again.");
        navigate("/login");
      }
    } else {
      toast.error("You must be logged in to access this page.");
      navigate("/login");
    }
    setIsLoading(false);
  }, [navigate]);

  // Open modal to schedule activities for a specific date
  const handleScheduleActivity = (date) => {
    setSelectedDate(date);
    setShowScheduleModal(true);
  };

  // Close the scheduling modal
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedDate(null);
  };

  // Schedule activities for the selected date
  const handleConfirmSchedule = async (selectedActivityIds) => {
    if (!selectedDate || !selectedActivityIds.length) {
      toast.error("Please select at least one activity to schedule.");
      return;
    }
  
    setScheduledActivities((prev) => {
      const updated = {
        ...prev,
        [selectedDate]: selectedActivityIds.map((activityId) => ({
          activityId,
          completed: false,
        })),
      };
      return updated;
    });
  
    await saveScheduledActivities(); // Attendre la sauvegarde
    toast.success(`Activities scheduled for ${selectedDate}!`);
    closeScheduleModal();
  };

  // Toggle completion status of an activity
  const handleToggleComplete = async (date, activityId) => {
    setScheduledActivities((prev) => {
      const updatedActivities = prev[date].map((activity) =>
        activity.activityId === activityId
          ? { ...activity, completed: !activity.completed }
          : activity
      );
      const updated = { ...prev, [date]: updatedActivities };
      return updated;
    });
  
    await saveScheduledActivities(); // Sauvegarder après mise à jour
    toast.info(
      `Activity marked as ${
        scheduledActivities[date].find((act) => act.activityId === activityId).completed
          ? "incomplete"
          : "completed"
      }!`
    );
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

  // Calendar logic
  const firstDay = getFirstDayOfMonth();
  const daysInMonth = getDaysInMonth();
  const today = new Date().getDate();
  const monthName = new Date().toLocaleString("default", { month: "long" });
  const year = new Date().getFullYear();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before the first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day); // Days of the month
  }

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{
          background: "url(assets/img/breadcrumb/01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "60px 0",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Activity Schedule</h2>
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
              <a href="/Home" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
                Home
              </a>
            </li>
            <li style={{ marginRight: "10px" }}>
              <a href="/Activities" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
                Activities
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none", fontWeight: "bold" }}>
              Activity Schedule
            </li>
          </ul>
        </div>
      </div>

      {/* My Favorite Activities Button */}
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <button
          onClick={() => {
            setShowFavoriteList(!showFavoriteList);
            if (!showFavoriteList) fetchFavoriteActivities(userId);
          }}
          style={{
            backgroundColor: "#0ea5e6",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
        >
          My Favorite Activities
        </button>
      </div>

      {/* Favorite Activities Modal */}
      {showFavoriteList && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            margin: "0 auto 40px",
            maxWidth: "1200px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>
              My Favorite Activities
            </h3>
            {favoriteActivities.length > 0 && (
              <button
                onClick={() => setShowClearAllFavoriteModal(true)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
              >
                Clear All Favorites
              </button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "30px",
            }}
          >
            {activities
              .filter((activity) => favoriteActivities.includes(activity._id))
              .map((activity, index) => (
                <div
                  key={index}
                  style={{
                    background: "#fff",
                    borderRadius: "15px",
                    overflow: "hidden",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    transition: "transform 0.3s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div style={{ padding: "10px", backgroundColor: "#f9f9f9" }}>
                    <p style={{ color: "#00aaff", fontStyle: "italic", margin: 0 }}>
                      //{activity.category || "Uncategorized"}
                    </p>
                  </div>
                  <img
                    src={
                      activity.imageUrl
                        ? `http://localhost:5000${activity.imageUrl}`
                        : "/assets/img/activities/default.png"
                    }
                    alt="Favorite Activity"
                    style={{ width: "100%", height: "250px", objectFit: "cover" }}
                    onClick={() => handleViewActivityModal(activity)}
                  />
                  <div style={{ padding: "20px" }}>
                    <button
                      onClick={() => handleRemoveFavorite(activity._id)}
                      style={{
                        display: "block",
                        marginLeft: "auto",
                        background: "rgba(244, 67, 54, 0.1)",
                        border: "none",
                        borderRadius: "50%",
                        padding: "5px",
                        cursor: "pointer",
                        color: "#f44336",
                        fontSize: "16px",
                        transition: "background 0.3s ease",
                        marginBottom: "10px",
                      }}
                      onMouseEnter={(e) => (e.target.style.background = "rgba(244, 67, 54, 0.3)")}
                      onMouseLeave={(e) => (e.target.style.background = "rgba(244, 67, 54, 0.1)")}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <h4>{activity.title}</h4>
                    <p>{activity.description}</p>
                  </div>
                </div>
              ))}
          </div>
          {activities.filter((activity) => favoriteActivities.includes(activity._id)).length === 0 && (
            <p style={{ textAlign: "center", color: "#666" }}>No favorite activities yet.</p>
          )}
        </div>
      )}

      {/* Remove Favorite Modal */}
      {showRemoveFavoriteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Removal</h3>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to remove this activity from favorites?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={handleConfirmRemoveFavorite}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Yes, Remove
              </button>
              <button
                onClick={closeRemoveFavoriteModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Favorite Modal */}
      {showClearAllFavoriteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Clear All</h3>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to clear all favorite activities?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={handleConfirmClearAllFavorites}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Yes, Clear All
              </button>
              <button
                onClick={closeClearAllFavoriteModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Activity Modal */}
      {showViewActivityModal && selectedActivity && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
              padding: "8px",
              borderRadius: "8px",
              width: "550px",
              maxWidth: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#00aaff", fontStyle: "italic", marginBottom: "10px" }}>
              //{selectedActivity.category || "Uncategorized"}
            </p>
            <img
              src={
                selectedActivity.imageUrl
                  ? `http://localhost:5000${selectedActivity.imageUrl}`
                  : "/assets/img/activities/default.png"
              }
              alt="Activity"
              style={{
                width: "100%",
                height: "300px",
                objectFit: "cover",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            />
            <h3 style={{ fontSize: "20px", marginBottom: "10px" }}>{selectedActivity.title}</h3>
            <p
              style={{
                fontSize: "14px",
                marginBottom: "15px",
                maxHeight: "100px",
                overflowY: "auto",
                padding: "0 5px",
              }}
            >
              {selectedActivity.description}
            </p>
            <button
              onClick={closeViewActivityModal}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "5px",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Schedule Section - Calendar View */}
      <div style={{ padding: "40px", backgroundColor: "#f9f9f9", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Plan Your <span style={{ color: "#ff5a5f" }}>Activity Schedule</span>
        </h2>

        {favoriteActivities.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            You have no favorite activities to schedule. Go to the{" "}
            <a href="/Activities" style={{ color: "#0ea5e6", textDecoration: "underline" }}>
              Activities page
            </a>{" "}
            to add some favorites.
          </p>
        ) : (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            {/* Calendar Header */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "24px", color: "#333" }}>{monthName} {year}</h3>
            </div>

            {/* Calendar Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "5px",
                backgroundColor: "#fff",
                padding: "10px",
                borderRadius: "10px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              {/* Weekday Headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#666",
                    padding: "10px 0",
                  }}
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {calendarDays.map((day, index) => {
                const dateStr = day ? `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
                const isToday = day === today;
                return (
                  <div
                    key={index}
                    style={{
                      background: day ? "#fff" : "#f0f0f0",
                      borderRadius: "8px",
                      padding: "10px",
                      minHeight: "100px",
                      border: isToday ? "2px solid #ff5a5f" : "1px solid #ddd",
                      cursor: day ? "pointer" : "default",
                      position: "relative",
                      transition: "transform 0.2s ease",
                    }}
                    onClick={() => day && handleScheduleActivity(dateStr)}
                    onMouseEnter={(e) => day && (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => day && (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {day && (
                      <>
                        <div style={{ fontWeight: "bold", color: "#333", marginBottom: "5px" }}>
                          {day}
                        </div>
                        {scheduledActivities[dateStr] && scheduledActivities[dateStr].length > 0 && (
                          <ul style={{ listStyle: "none", padding: "0", fontSize: "12px" }}>
                            {scheduledActivities[dateStr].map((scheduledActivity, idx) => {
                              const activity = activities.find(
                                (act) => act._id === scheduledActivity.activityId
                              );
                              return (
                                <li
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    marginBottom: "5px",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={scheduledActivity.completed}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleToggleComplete(dateStr, scheduledActivity.activityId);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  />
                                  <span
                                    style={{
                                      textDecoration: scheduledActivity.completed
                                        ? "line-through"
                                        : "none",
                                      color: scheduledActivity.completed ? "#666" : "#333",
                                    }}
                                  >
                                    {activity ? activity.title : "Unknown"}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal for scheduling activities */}
      {showScheduleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "20px" }}>
              Schedule Activities for{" "}
              {new Date(selectedDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </h3>
            <ScheduleModalContent
              favoriteActivities={favoriteActivities}
              activities={activities}
              onConfirm={handleConfirmSchedule}
              onCancel={closeScheduleModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Component for the modal content to select activities
function ScheduleModalContent({ favoriteActivities, activities, onConfirm, onCancel }) {
  const [selectedActivities, setSelectedActivities] = useState([]);

  const handleToggleActivity = (activityId) => {
    setSelectedActivities((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  return (
    <div>
      <ul style={{ listStyle: "none", padding: "0", maxHeight: "200px", overflowY: "auto" }}>
        {favoriteActivities.map((activityId) => {
          const activity = activities.find((act) => act._id === activityId);
          return (
            <li
              key={activityId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                borderBottom: "1px solid #ddd",
              }}
            >
              <input
                type="checkbox"
                checked={selectedActivities.includes(activityId)}
                onChange={() => handleToggleActivity(activityId)}
                style={{ cursor: "pointer" }}
              />
              <span>{activity ? activity.title : "Unknown Activity"}</span>
            </li>
          );
        })}
      </ul>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
        <button
          onClick={() => onConfirm(selectedActivities)}
          style={{
            backgroundColor: "#0ea5e6",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
        >
          Schedule
        </button>
        <button
          onClick={onCancel}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
        >
          Cancel <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </div>
  );
}

export default ActivitySchedule;