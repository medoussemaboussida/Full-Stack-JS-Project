import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faTimes,
  faCheckCircle,
  faTrash,
  faCalendarPlus,
  faStickyNote,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";

// Function to generate a list of dates for the specified month
const generateDatesForMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    dates.push(currentDate.toISOString().split("T")[0]); // Format: YYYY-MM-DD
  }

  return dates;
};

// Function to get the first day of the specified month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1).getDay();
};

// Function to get the number of days in the specified month
const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [moods, setMoods] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteDate, setCurrentNoteDate] = useState(null);
  const [currentNote, setCurrentNote] = useState("");
  const [showMoodHistoryModal, setShowMoodHistoryModal] = useState(false);
  const [weatherData, setWeatherData] = useState({});
  const [currentMoodDate, setCurrentMoodDate] = useState(null);
  const [showForumRulesModal, setShowForumRulesModal] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState({}); // State to store dynamic prayer times
  const dates = generateDatesForMonth(currentDate);
  const navigate = useNavigate();

  // Icons for moods
  const moodIcons = {
    "Very Sad": "😢",
    Sad: "😔",
    Neutral: "😐",
    Happy: "🙂",
    "Very Happy": "😊",
  };

  // Weather emoji mapping based on OpenWeatherMap weather codes
  const weatherIcons = {
    "01": "☀️", // clear sky
    "02": "⛅", // few clouds
    "03": "☁️", // scattered clouds
    "04": "☁️", // broken clouds
    "09": "🌧️", // shower rain
    "10": "🌦️", // rain
    "11": "⛈️", // thunderstorm
    "13": "❄️", // snow
    "50": "🌫️", // mist
  };

  // Fetch prayer times from Aladhan API for Ariana, Tunis
  const fetchPrayerTimes = async () => {
    try {
      const response = await fetch(
        `http://api.aladhan.com/v1/timingsByCity?city=Ariana&country=Tunisia&method=3`
      );
      const data = await response.json();
      if (data.code === 200) {
        const timings = data.data.timings;
        // Convert times to HH:MM format and store them
        setPrayerTimes({
          Fajr: timings.Fajr.slice(0, 5),
          Dhuhr: timings.Dhuhr.slice(0, 5),
          Asr: timings.Asr.slice(0, 5),
          Maghrib: timings.Maghrib.slice(0, 5),
          Isha: timings.Isha.slice(0, 5),
        });
      } else {
        throw new Error("Failed to fetch prayer times");
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      toast.error("Failed to fetch prayer times. Using default times.");
      // Fallback to static times if API fails
      setPrayerTimes({
        Fajr: "05:00",
        Dhuhr: "12:00",
        Asr: "15:00",
        Maghrib: "18:00",
        Isha: "20:00",
      });
    }
  };

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

  // Fetch scheduled activities (including notes)
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
        const schedules = data.schedules || {};
        setScheduledActivities(
          Object.keys(schedules).reduce((acc, date) => {
            acc[date] = schedules[date].activities.map((act) => ({
              activityId: act.activityId,
              completed: act.completed,
              note: schedules[date].note || '',
            }));
            return acc;
          }, {})
        );
      } else {
        toast.error(`Failed to fetch scheduled activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching scheduled activities:", error);
      toast.error("An error occurred while fetching scheduled activities.");
    }
  };

  // Fetch moods for the user
  const fetchMoods = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return [];
      }

      const response = await fetch(`http://localhost:5000/users/moods/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        return data;
      } else {
        toast.error(`Failed to fetch moods: ${data.message}`);
        return [];
      }
    } catch (error) {
      console.error("Error fetching moods:", error);
      toast.error("An error occurred while fetching moods.");
      return [];
    }
  };

  // Fetch weather data from backend
  const fetchWeatherData = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('http://localhost:5000/users/weather', { headers });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText} - ${errorData}`);
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error("Error fetching weather data:", error.message);
      toast.error(`Erreur lors de la récupération des données météo : ${error.message}`);
    }
  };

  // Save scheduled activities (including note)
  const saveScheduledActivities = async (date, activities, note = '') => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("No authentication token found. Please log in.");
        navigate("/login");
        return;
      }
      if (!date || !activities) {
        throw new Error("Date or activities missing");
      }
      const response = await fetch(`http://localhost:5000/users/schedule/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date, activities, note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save schedule");
      toast.success("Schedule saved successfully!");
    } catch (error) {
      console.error("Error saving scheduled activities:", error);
      toast.error(`Error saving schedule: ${error.message}`);
    }
  };

  // Save mood to the server
  const saveMood = async (activityId, mood, moodDate) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("No authentication token found. Please log in.");
        navigate("/login");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/moods/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityId,
          mood,
          date: moodDate ? `${moodDate}T00:00:00.000Z` : new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save mood");

      toast.success("Mood saved successfully!");
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error(`Error saving mood: ${error.message}`);
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
          isFavorite ? prev.filter((id) => id !== activityId) : [...prev, activityId]
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

  // Navigate to previous month
  const handlePreviousMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Handle mood selection
  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  // Confirm mood and save to server
  const handleMoodConfirm = async () => {
    if (selectedMood !== null && currentActivity) {
      await saveMood(currentActivity._id, selectedMood, currentMoodDate);
      fetchMoods().then((moodsData) => {
        console.log("Updated moods:", moodsData);
        setMoods(moodsData);
      });
    }
    setShowMoodModal(false);
    setSelectedMood(null);
    setCurrentActivity(null);
    setCurrentMoodDate(null);
  };

  // Cancel and close the mood modal
  const closeMoodModal = () => {
    setShowMoodModal(false);
    setSelectedMood(null);
    setCurrentActivity(null);
    setCurrentMoodDate(null);
  };

  // Open note modal
  const handleOpenNoteModal = (date) => {
    setCurrentNoteDate(date);
    setCurrentNote(scheduledActivities[date]?.[0]?.note || "");
    setShowNoteModal(true);
  };

  // Close note modal
  const closeNoteModal = () => {
    setShowNoteModal(false);
    setCurrentNoteDate(null);
    setCurrentNote("");
  };

  // Save note
  const handleSaveNote = async () => {
    if (currentNoteDate) {
      const existingActivities = scheduledActivities[currentNoteDate] || [];
      await saveScheduledActivities(currentNoteDate, existingActivities, currentNote);
      setScheduledActivities((prev) => ({
        ...prev,
        [currentNoteDate]: existingActivities.map((act) => ({ ...act, note: currentNote })),
      }));
    }
    closeNoteModal();
  };

  // Open mood history modal
  const handleOpenMoodHistoryModal = () => {
    setShowMoodHistoryModal(true);
  };

  // Close mood history modal
  const closeMoodHistoryModal = () => {
    setShowMoodHistoryModal(false);
  };

  // Open forum rules modal
  const handleOpenForumRulesModal = () => {
    setShowForumRulesModal(true);
  };

  // Close forum rules modal
  const closeForumRulesModal = () => {
    setShowForumRulesModal(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (!token) {
      toast.error("You must be logged in to access this page.");
      navigate("/login");
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (!decoded.id) {
        throw new Error("Invalid token: No user ID found");
      }

      setUserId(decoded.id);
      setIsLoading(true);

      Promise.all([
        fetchActivities(),
        fetchFavoriteActivities(decoded.id),
        fetchScheduledActivities(decoded.id),
        fetchMoods().then((moodsData) => setMoods(moodsData)),
        fetchWeatherData(),
        fetchPrayerTimes(), // Fetch prayer times on component mount
      ]).finally(() => {
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Invalid token:", error);
      toast.error("Invalid session, please log in again.");
      navigate("/login");
      setIsLoading(false);
    }
  }, [navigate, currentDate]);

  // Notification for today's activities
  useEffect(() => {
    let hasShownNotification = false;

    return () => {
      if (!hasShownNotification && Object.keys(scheduledActivities).length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const todayActivities = scheduledActivities[today];
        if (todayActivities && todayActivities.length > 0) {
          toast.info(`You have ${todayActivities.length} activity(ies) scheduled for today!`);
          hasShownNotification = true;
        }
      }
    };
  }, [scheduledActivities]);

  // Logic to play Azan on the 25th if "prayer" is scheduled
  useEffect(() => {
    const checkPrayerTimes = () => {
      const today = new Date();
      const day = today.getDate();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

      // Check if today is the 25th
      if (day !== 25) return;

      // Check if "prayer" is scheduled for the 25th
      const scheduledForDay = scheduledActivities[dateStr] || [];
      const prayerActivity = activities.find((act) => act.title.toLowerCase() === "prayer");
      const isPrayerScheduled = scheduledForDay.some(
        (act) => act.activityId === prayerActivity?._id
      );

      if (!isPrayerScheduled) return;

      // Get current time in HH:MM format
      const currentTime = today.toTimeString().slice(0, 5); // HH:MM

      // Check if current time matches any prayer time
      Object.values(prayerTimes).forEach((prayerTime) => {
        if (currentTime === prayerTime) {
          const azanAudio = new Audio("/assets/sounds/azan.mp3");
          azanAudio.play().catch((error) => {
            console.error("Error playing Azan:", error);
            toast.error("Failed to play Azan sound.");
          });
          toast.info("Time for prayer! Azan is playing.");
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkPrayerTimes, 60000);
    checkPrayerTimes(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [scheduledActivities, activities, prayerTimes]);

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

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

    const existingActivities = scheduledActivities[selectedDate] || [];
    const newActivities = selectedActivityIds.map((activityId) => {
      const existingActivity = existingActivities.find((act) => act.activityId === activityId);
      return existingActivity ? existingActivity : { activityId, completed: false, note: existingActivities[0]?.note || '' };
    });

    setScheduledActivities((prev) => ({
      ...prev,
      [selectedDate]: newActivities,
    }));

    await saveScheduledActivities(selectedDate, newActivities, newActivities[0]?.note || '');
    toast.success(`Activities scheduled for ${selectedDate}!`);
    closeScheduleModal();
  };

  // Toggle completion status of an activity
  const handleToggleComplete = async (date, activityId) => {
    const updatedActivities = scheduledActivities[date].map((activity) =>
      activity.activityId === activityId ? { ...activity, completed: !activity.completed } : activity
    );

    setScheduledActivities((prev) => ({
      ...prev,
      [date]: updatedActivities,
    }));

    const newCompletedStatus = updatedActivities.find((act) => act.activityId === activityId).completed;

    await saveScheduledActivities(date, updatedActivities, updatedActivities[0]?.note || '');
    toast.info(`Activity marked as ${newCompletedStatus ? "completed" : "incomplete"}!`);

    if (newCompletedStatus) {
      const activity = activities.find((act) => act._id === activityId);
      setCurrentActivity(activity);
      setCurrentMoodDate(date);
      setShowMoodModal(true);
    }
  };

  const firstDay = getFirstDayOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const today = new Date().getDate();
  const monthName = currentDate.toLocaleString("en-US", { month: "long" });
  const year = currentDate.getFullYear();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Forum Rules Button - Fixed Position at Bottom-Left */}
      <button
        onClick={handleOpenForumRulesModal}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          width: "60px",
          height: "60px",
          backgroundColor: "#ff9500",
          borderRadius: "50%",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          zIndex: 1001,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        }}
      >
        <span style={{
          fontSize: "30px",
          color: "#ff0000",
          fontWeight: "bold",
        }}>
          ?
        </span>
      </button>

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

      {/* My Favorite Activities and Mood History Buttons */}
      <div style={{ textAlign: "center", margin: "20px 0", display: "flex", justifyContent: "center", gap: "20px" }}>
        <button
          onClick={() => {
            setShowFavoriteList(!showFavoriteList);
            if (!showFavoriteList) fetchFavoriteActivities(userId);
          }}
          style={{
            backgroundColor: "#ff9500",
            color: "white",
            padding: "10px 20px",
            borderRadius: "50px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#e68600")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff9500")}
        >
          Open My Favorite Activities
        </button>
        <button
          onClick={handleOpenMoodHistoryModal}
          style={{
            backgroundColor: "#ff9500",
            color: "white",
            padding: "10px 20px",
            borderRadius: "50px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#e68600")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff9500")}
        >
          <FontAwesomeIcon icon={faHistory} />
          Mood History
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
                  borderRadius: "50px",
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
                  <div style={{ padding: "10px", backgroundColor: "#f9f9f9" }}></div>
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
                    <h4>{activity.title}</h4>
                    <p style={{ color: "#00aaff", fontStyle: "italic", margin: 0 }}>
                      ** {activity.category?.name || "Uncategorized"} **
                    </p>
                    <p>{activity.description}</p>
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
                  borderRadius: "50px",
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
                  borderRadius: "50px",
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
                  borderRadius: "50px",
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
                  borderRadius: "50px",
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
              ** {selectedActivity.category?.name || "Uncategorized"} **
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

      {/* Mood Impact Modal */}
      {showMoodModal && currentActivity && (
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
            <h3 style={{ marginBottom: "10px" }}>
              How do you feel right now after completing {currentActivity.title}?
            </h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
              Indicate your current mood to integrate a first piece of data into your statistics.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "20px" }}>
              {[
                { mood: "Very Sad", emoji: "😢" },
                { mood: "Sad", emoji: "😔" },
                { mood: "Neutral", emoji: "😐" },
                { mood: "Happy", emoji: "🙂" },
                { mood: "Very Happy", emoji: "😊" },
              ].map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleMoodSelect(item.mood)}
                  style={{
                    fontSize: "30px",
                    cursor: "pointer",
                    padding: "10px",
                    borderRadius: "50%",
                    backgroundColor: selectedMood === item.mood ? "#e0e0e0" : "transparent",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  {item.emoji}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={handleMoodConfirm}
                disabled={selectedMood === null}
                style={{
                  backgroundColor: selectedMood === null ? "#ccc" : "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: selectedMood === null ? "not-allowed" : "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => selectedMood !== null && (e.target.style.backgroundColor = "#0d8bc2")}
                onMouseLeave={(e) => selectedMood !== null && (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Confirm
              </button>
              <button
                onClick={closeMoodModal}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
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
              Note for{" "}
              {new Date(currentNoteDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Write your note here..."
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
                resize: "vertical",
                fontSize: "14px",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button
                onClick={handleSaveNote}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Save Note
              </button>
              <button
                onClick={closeNoteModal}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mood History Modal */}
      {showMoodHistoryModal && (
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
              width: "500px",
              maxWidth: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={closeMoodHistoryModal}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#f44336",
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Mood History</h3>
            {moods.length === 0 ? (
              <p style={{ color: "#666" }}>
                No moods recorded yet. Go to the{" "}
                <a href="/Activities" style={{ color: "#0ea5e6", textDecoration: "underline" }}>
                  Activities page
                </a>{" "}
                to favorite and schedule activities, then complete them to record your mood!
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: "0" }}>
                {moods.map((mood, index) => {
                  const activityId =
                    mood.activityId && typeof mood.activityId === "object"
                      ? mood.activityId._id
                      : mood.activityId;
                  const activity = activities.find((act) => act._id === activityId);
                  const moodDate = new Date(mood.date).toISOString().split("T")[0];
                  const weather = weatherData[moodDate];
                  return (
                    <li
                      key={index}
                      style={{
                        padding: "10px 0",
                        borderBottom: index < moods.length - 1 ? "1px solid #ddd" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "14px",
                      }}
                    >
                      <span>
                        <strong>{activity ? activity.title : "Unknown Activity"}</strong> -{" "}
                        {moodIcons[mood.mood]} {mood.mood}
                        {weather && (
                          <span style={{ marginLeft: "10px", color: "#666" }}>
                            ({weatherIcons[weather.weatherCode] || "☁️"} {weather.temp}°C)
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#666", fontSize: "12px" }}>
                        {new Date(mood.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              onClick={closeMoodHistoryModal}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                marginTop: "20px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Forum Rules Modal */}
      {showForumRulesModal && (
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
            <h3 style={{ fontSize: "24px", marginBottom: "20px" }}>Rules</h3>
            <p style={{ fontSize: "16px", marginBottom: "20px", textAlign: "left" }}>
              1. <strong>Be Respectful</strong>: Treat all users with kindness and respect. No harassment, discrimination, or
              offensive language.<br />
              2. <strong>Stay On-Topic</strong>: Keep discussions relevant to the forum's purpose and activities.<br />
              3. <strong>No Spam</strong>: Avoid posting repetitive or irrelevant content, including advertisements.<br />
              4. <strong>Protect Privacy</strong>: Do not share personal information about yourself or others.<br />
              5. <strong>Follow Guidelines</strong>: Adhere to all platform-specific rules and report any violations to moderators.
            </p>
            <button
              onClick={closeForumRulesModal}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
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
            {/* Calendar Header with Pagination */}
            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={handlePreviousMonth}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Previous
              </button>
              <h3 style={{ fontSize: "24px", color: "#333" }}>
                {monthName} {year}
              </h3>
              <button
                onClick={handleNextMonth}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
              >
                Next
              </button>
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
                const dateStr = day
                  ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
                      2,
                      "0"
                    )}-${String(day).padStart(2, "0")}`
                  : null;
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                return (
                  <div
                    key={index}
                    style={{
                      background: day ? "#fff" : "#f0f0f0",
                      borderRadius: "8px",
                      padding: "10px",
                      minHeight: "140px",
                      border: isToday ? "2px solid #ff5a5f" : "1px solid #ddd",
                      position: "relative",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => day && (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => day && (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {day && (
                      <>
                        <div style={{ fontWeight: "bold", color: "#333", marginBottom: "5px" }}>{day}</div>
                        {weatherData[dateStr] && (
                          <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                            {weatherIcons[weatherData[dateStr].weatherCode] || "☁️"} {weatherData[dateStr].temp}°C
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginBottom: "5px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleActivity(dateStr);
                            }}
                            style={{
                              backgroundColor: "#0ea5e6",
                              color: "white",
                              padding: "5px 10px",
                              borderRadius: "50px",
                              fontSize: "12px",
                              border: "none",
                              cursor: "pointer",
                              transition: "background-color 0.3s ease",
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
                          >
                            <FontAwesomeIcon icon={faCalendarPlus} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNoteModal(dateStr);
                            }}
                            style={{
                              backgroundColor: "#ff9500",
                              color: "white",
                              padding: "5px 10px",
                              borderRadius: "50px",
                              fontSize: "12px",
                              border: "none",
                              cursor: "pointer",
                              transition: "background-color 0.3s ease",
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = "#e68600")}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff9500")}
                          >
                            <FontAwesomeIcon icon={faStickyNote} />
                          </button>
                        </div>
                        {scheduledActivities[dateStr] && scheduledActivities[dateStr].length > 0 && (
                          <ul style={{ listStyle: "none", padding: "0", fontSize: "12px" }}>
                            {scheduledActivities[dateStr].map((scheduledActivity, idx) => {
                              const activity = activities.find((act) => act._id === scheduledActivity.activityId);
                              const moodEntry = moods.find(
                                (mood) =>
                                  mood.activityId === scheduledActivity.activityId &&
                                  new Date(mood.date).toISOString().split("T")[0] === dateStr
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
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleComplete(dateStr, scheduledActivity.activityId);
                                    }}
                                    style={{
                                      display: "inline-block",
                                      width: "16px",
                                      height: "16px",
                                      lineHeight: "16px",
                                      textAlign: "center",
                                      borderRadius: "4px",
                                      backgroundColor: scheduledActivity.completed ? "#e6ffe6" : "#ffe6e6",
                                      color: scheduledActivity.completed ? "#00cc00" : "#ff0000",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {scheduledActivity.completed ? "✔" : "✘"}
                                  </span>
                                  <span
                                    style={{
                                      textDecoration: scheduledActivity.completed ? "line-through" : "none",
                                      color: scheduledActivity.completed ? "#666" : "#333",
                                    }}
                                  >
                                    {activity ? activity.title : "Unknown"}
                                  </span>
                                  {moodEntry && scheduledActivity.completed && (
                                    <span style={{ fontSize: "12px", color: "#0ea5e6", fontStyle: "italic" }}>
                                      ({moodIcons[moodEntry.mood]} {moodEntry.mood})
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {scheduledActivities[dateStr]?.[0]?.note && (
                          <div style={{ fontSize: "10px", color: "#666", marginTop: "5px" }}>
                            <FontAwesomeIcon icon={faStickyNote} />{" "}
                            <span title={scheduledActivities[dateStr][0].note}>
                              {scheduledActivities[dateStr][0].note.length > 20
                                ? `${scheduledActivities[dateStr][0].note.slice(0, 20)}...`
                                : scheduledActivities[dateStr][0].note}
                            </span>
                          </div>
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
              activities={activities}
              favoriteActivities={favoriteActivities}
              scheduledActivities={scheduledActivities}
              selectedDate={selectedDate}
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
function ScheduleModalContent({ activities, favoriteActivities, scheduledActivities, selectedDate, onConfirm, onCancel }) {
  const [selectedActivities, setSelectedActivities] = useState(() => {
    const existingActivities = scheduledActivities[selectedDate] || [];
    return existingActivities.map((activity) => activity.activityId);
  });

  const handleToggleActivity = (activityId) => {
    setSelectedActivities((prev) =>
      prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId]
    );
  };

  // Define favoriteActivitiesList to filter activities
  const favoriteActivitiesList = activities.filter((activity) =>
    favoriteActivities.includes(activity._id)
  );

  return (
    <div>
      {favoriteActivitiesList.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px", textAlign: "center" }}>
          No favorite activities available.{" "}
          <a href="/Activities" style={{ color: "#0ea5e6", textDecoration: "underline" }}>
            Add some favorites first!
          </a>
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: "0", maxHeight: "200px", overflowY: "auto" }}>
          {favoriteActivitiesList.map((activity) => (
            <li
              key={activity._id}
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
                checked={selectedActivities.includes(activity._id)}
                onChange={() => handleToggleActivity(activity._id)}
                style={{ cursor: "pointer" }}
              />
              <span>{activity.title}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
        <button
          onClick={() => onConfirm(selectedActivities)}
          disabled={favoriteActivitiesList.length === 0}
          style={{
            backgroundColor: favoriteActivitiesList.length === 0 ? "#ccc" : "#0ea5e6",
            color: "white",
            padding: "10px 20px",
            borderRadius: "50px",
            fontWeight: "bold",
            border: "none",
            cursor: favoriteActivitiesList.length === 0 ? "not-allowed" : "pointer",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) =>
            favoriteActivitiesList.length !== 0 && (e.target.style.backgroundColor = "#0d8bc2")
          }
          onMouseLeave={(e) =>
            favoriteActivitiesList.length !== 0 && (e.target.style.backgroundColor = "#0ea5e6")
          }
        >
          Schedule
        </button>
        <button
          onClick={onCancel}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px 20px",
            borderRadius: "50px",
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