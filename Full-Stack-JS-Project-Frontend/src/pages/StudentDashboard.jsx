import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { Bar, Line, Doughnut } from "react-chartjs-2"; // Importer Doughnut pour le graphique circulaire
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement, // Importer ArcElement pour le graphique circulaire
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function StudentDashboard() {
  const [userId, setUserId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [moods, setMoods] = useState([]);
  const [scheduledActivities, setScheduledActivities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  // Mapping des humeurs à des valeurs numériques pour le calcul
  const moodValues = {
    "Very Sad": 1,
    Sad: 2,
    Neutral: 3,
    Happy: 4,
    "Very Happy": 5,
  };

  // Couleurs pour les barres du graphique des humeurs
  const moodColors = {
    "Very Sad": "#ff4d4f",
    Sad: "#ff7875",
    Neutral: "#d3d3d3",
    Happy: "#69c0ff",
    "Very Happy": "#40a9ff",
  };

  // Fetch all activities
  const fetchActivities = async () => {
    try {
      const response = await fetch("http://localhost:5000/users/list/activities");
      const data = await response.json();
      if (response.ok) {
        console.log("Activities fetched:", data);
        setActivities(data);
      } else {
        toast.error(`Failed to fetch activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("An error occurred while fetching activities.");
    }
  };

  // Fetch moods for the user
  const fetchMoods = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        console.error("No token or userId found:", { token, userId });
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/moods/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Moods fetched:", data);
        setMoods(data);
      } else {
        console.error("Failed to fetch moods:", data.message);
        toast.error(`Failed to fetch moods: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching moods:", error);
      toast.error("An error occurred while fetching moods.");
    }
  };

  // Fetch scheduled activities
  const fetchScheduledActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        console.error("No token or userId found:", { token, userId });
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/schedule/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Scheduled activities fetched:", data.schedules);
        setScheduledActivities(data.schedules || {});
      } else {
        console.error("Failed to fetch scheduled activities:", data.message);
        toast.error(`Failed to fetch scheduled activities: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching scheduled activities:", error);
      toast.error("An error occurred while fetching scheduled activities.");
    }
  };

  // Calculer l'impact moyen des humeurs par activité
  const calculateMoodImpact = () => {
    const moodImpact = {};

    activities.forEach((activity) => {
      moodImpact[activity._id] = { title: activity.title, moods: [], average: 0 };
    });

    moods.forEach((mood) => {
      const activityId = mood.activityId._id;
      if (moodImpact[activityId]) {
        moodImpact[activityId].moods.push(moodValues[mood.mood]);
      }
    });

    Object.keys(moodImpact).forEach((activityId) => {
      const moods = moodImpact[activityId].moods;
      if (moods.length > 0) {
        const average = moods.reduce((sum, value) => sum + value, 0) / moods.length;
        moodImpact[activityId].average = average;
      }
    });

    return moodImpact;
  };

  // Calculer le pourcentage de satisfaction pour chaque activité
  const calculateSatisfaction = () => {
    const satisfactionData = {};

    activities.forEach((activity) => {
      satisfactionData[activity._id] = { title: activity.title, positiveMoods: 0, totalMoods: 0, percentage: 0 };
    });

    moods.forEach((mood) => {
      const activityId = mood.activityId._id;
      if (satisfactionData[activityId]) {
        satisfactionData[activityId].totalMoods += 1;
        if (mood.mood === "Happy" || mood.mood === "Very Happy") {
          satisfactionData[activityId].positiveMoods += 1;
        }
      }
    });

    Object.keys(satisfactionData).forEach((activityId) => {
      const { positiveMoods, totalMoods } = satisfactionData[activityId];
      if (totalMoods > 0) {
        satisfactionData[activityId].percentage = (positiveMoods / totalMoods) * 100;
      }
    });

    return satisfactionData;
  };

  // Préparer les données pour le graphique des humeurs
  const prepareMoodChartData = () => {
    const moodImpact = calculateMoodImpact();

    const labels = [];
    const data = [];
    const backgroundColors = [];

    Object.keys(moodImpact).forEach((activityId) => {
      if (moodImpact[activityId].moods.length > 0) {
        labels.push(moodImpact[activityId].title);
        data.push(moodImpact[activityId].average);

        const avg = moodImpact[activityId].average;
        let color;
        if (avg <= 1.5) color = moodColors["Very Sad"];
        else if (avg <= 2.5) color = moodColors["Sad"];
        else if (avg <= 3.5) color = moodColors["Neutral"];
        else if (avg <= 4.5) color = moodColors["Happy"];
        else color = moodColors["Very Happy"];
        backgroundColors.push(color);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Average Mood Impact",
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Fonction pour obtenir le nombre de jours dans un mois
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Préparer les données pour le graphique des moyennes des activités complétées/incomplètes
  const prepareActivityCompletionChartData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(month, year);

    const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    const completedData = new Array(daysInMonth).fill(0);
    const incompleteData = new Array(daysInMonth).fill(0);

    Object.keys(scheduledActivities).forEach((date) => {
      const scheduleDate = new Date(date);
      if (scheduleDate.getMonth() === month && scheduleDate.getFullYear() === year) {
        const dayIndex = scheduleDate.getDate() - 1;
        const activitiesForDate = scheduledActivities[date] || [];
        const totalActivities = activitiesForDate.length;

        if (totalActivities > 0) {
          const completedCount = activitiesForDate.filter((activity) => activity.completed).length;
          const incompleteCount = activitiesForDate.filter((activity) => !activity.completed).length;

          const completedPercentage = (completedCount / totalActivities) * 100;
          const incompletePercentage = (incompleteCount / totalActivities) * 100;

          completedData[dayIndex] = completedPercentage;
          incompleteData[dayIndex] = incompletePercentage;
        }
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Completed Activities (%)",
          data: completedData,
          borderColor: "#40a9ff",
          backgroundColor: "rgba(64, 169, 255, 0.2)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Incomplete Activities (%)",
          data: incompleteData,
          borderColor: "#ff7875",
          backgroundColor: "rgba(255, 120, 117, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  // Préparer les données pour le graphique de satisfaction d'une activité
  const prepareSatisfactionChartData = (percentage) => {
    return {
      labels: ["Satisfaction", "Remaining"],
      datasets: [
        {
          data: [percentage, 100 - percentage],
          backgroundColor: ["#40a9ff", "#e5e7eb"],
          borderWidth: 0,
        },
      ],
    };
  };

  // Fonctions pour la pagination des mois
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.id) {
          setUserId(decoded.id);
        } else {
          throw new Error("No user ID found in token");
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
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      fetchActivities();
      fetchMoods(userId);
      fetchScheduledActivities(userId);
      setIsLoading(false);
    }
  }, [userId]);

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

  const moodChartData = prepareMoodChartData();
  const activityCompletionChartData = prepareActivityCompletionChartData();
  const satisfactionData = calculateSatisfaction();

  const moodChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Impact of Activities on Your Psychological State",
        font: {
          size: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            let moodLabel = "";
            if (value <= 1.5) moodLabel = "Very Sad";
            else if (value <= 2.5) moodLabel = "Sad";
            else if (value <= 3.5) moodLabel = "Neutral";
            else if (value <= 4.5) moodLabel = "Happy";
            else moodLabel = "Very Happy";
            return `Average Mood: ${moodLabel} (${value.toFixed(2)})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          callback: (value) => {
            if (value === 1) return "Very Sad";
            if (value === 2) return "Sad";
            if (value === 3) return "Neutral";
            if (value === 4) return "Happy";
            if (value === 5) return "Very Happy";
            return "";
          },
        },
        title: {
          display: true,
          text: "Mood Impact",
        },
      },
      x: {
        title: {
          display: true,
          text: "Activities",
        },
      },
    },
  };

  const activityCompletionChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `Average Completion Rate of Activities (${currentMonth.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })})`,
        font: {
          size: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            const value = context.raw;
            return `${label}: ${value.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Day of the Month",
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Percentage of Activities",
        },
      },
    },
  };

  const satisfactionChartOptions = {
    responsive: true,
    cutout: "70%", // Taille du trou central pour ressembler à une jauge
    plugins: {
      legend: {
        display: false, // Cacher la légende
      },
      tooltip: {
        enabled: false, // Désactiver les tooltips
      },
      title: {
        display: false,
      },
      // Plugin pour afficher le pourcentage au centre
      datalabels: {
        display: false,
      },
    },
  };

  return (
    <div style={{ padding: "40px", backgroundColor: "#f9f9f9" }}>
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
          <h2 className="breadcrumb-title">Student Dashboard</h2>
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
            <li style={{ color: "#ff5a5f", textDecoration: "none", fontWeight: "bold" }}>
              Student Dashboard
            </li>
          </ul>
        </div>
      </div>

      {/* Mood Chart Section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Your <span style={{ color: "#ff5a5f" }}>Psychological State</span> Overview
        </h2>

        {moods.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            No mood data available. Complete some activities in the{" "}
            <a href="/ActivitySchedule" style={{ color: "#0ea5e6", textDecoration: "underline" }}>
              Activity Schedule
            </a>{" "}
            to see your psychological state.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              padding: "20px",
              marginBottom: "40px",
            }}
          >
            <Bar data={moodChartData} options={moodChartOptions} />
          </div>
        )}
      </div>

      {/* Activity Completion Chart Section (Line Chart) */}
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Your <span style={{ color: "#ff5a5f" }}>Activity Completion</span> Trends
        </h2>

        {/* Pagination Controls */}
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
              borderRadius: "5px",
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
            {currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <button
            onClick={handleNextMonth}
            style={{
              backgroundColor: "#0ea5e6",
              color: "white",
              padding: "8px 16px",
              borderRadius: "5px",
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

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            padding: "20px",
            marginBottom: "40px",
          }}
        >
          <Line data={activityCompletionChartData} options={activityCompletionChartOptions} />
        </div>
      </div>

      {/* Satisfaction Chart Section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Your <span style={{ color: "#ff5a5f" }}>Satisfaction</span> After Activities
        </h2>

        {moods.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            No satisfaction data available. Complete some activities and record your mood in the{" "}
            <a href="/ActivitySchedule" style={{ color: "#0ea5e6", textDecoration: "underline" }}>
              Activity Schedule
            </a>{" "}
            to see your satisfaction levels.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            {Object.keys(satisfactionData)
              .filter((activityId) => satisfactionData[activityId].totalMoods > 0)
              .map((activityId) => {
                const { title, percentage } = satisfactionData[activityId];
                const chartData = prepareSatisfactionChartData(percentage);

                return (
                  <div
                    key={activityId}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "10px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                      padding: "20px",
                      width: "200px",
                      textAlign: "center",
                    }}
                  >
                    <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>{title}</h4>
                    <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto" }}>
                      <Doughnut data={chartData} options={satisfactionChartOptions} />
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;