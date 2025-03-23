import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function StudentDashboard() {
  const [userId, setUserId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [moods, setMoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Mapping des humeurs à des valeurs numériques pour le calcul
  const moodValues = {
    "Very Sad": 1,
    Sad: 2,
    Neutral: 3,
    Happy: 4,
    "Very Happy": 5,
  };

  // Couleurs pour les barres du graphique
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
        console.log("Activities fetched:", data); // Log pour débogage
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
        console.error("No token or userId found:", { token, userId }); // Log pour débogage
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
        console.log("Moods fetched:", data); // Log pour débogage
        setMoods(data);
      } else {
        console.error("Failed to fetch moods:", data.message); // Log pour débogage
        toast.error(`Failed to fetch moods: ${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching moods:", error);
      toast.error("An error occurred while fetching moods.");
    }
  };

  // Calculer l'impact moyen des humeurs par activité
  const calculateMoodImpact = () => {
    const moodImpact = {};

    // Initialiser les activités avec un tableau vide pour les humeurs
    activities.forEach((activity) => {
      moodImpact[activity._id] = { title: activity.title, moods: [], average: 0 };
    });

    // Remplir les humeurs pour chaque activité
    moods.forEach((mood) => {
      const activityId = mood.activityId._id; // Ajustement pour la structure des données
      if (moodImpact[activityId]) {
        moodImpact[activityId].moods.push(moodValues[mood.mood]);
      }
    });

    // Calculer la moyenne pour chaque activité
    Object.keys(moodImpact).forEach((activityId) => {
      const moods = moodImpact[activityId].moods;
      if (moods.length > 0) {
        const average = moods.reduce((sum, value) => sum + value, 0) / moods.length;
        moodImpact[activityId].average = average;
      }
    });

    return moodImpact;
  };

  // Préparer les données pour le graphique
  const prepareChartData = () => {
    const moodImpact = calculateMoodImpact();

    // Filtrer les activités qui ont des humeurs enregistrées
    const labels = [];
    const data = [];
    const backgroundColors = [];

    Object.keys(moodImpact).forEach((activityId) => {
      if (moodImpact[activityId].moods.length > 0) {
        labels.push(moodImpact[activityId].title);
        data.push(moodImpact[activityId].average);

        // Déterminer la couleur en fonction de la moyenne
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

  // Deuxième useEffect pour fetcher les données après que userId est défini
  useEffect(() => {
    if (userId) {
      fetchActivities();
      fetchMoods(userId);
      setIsLoading(false);
    }
  }, [userId]);

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

  const chartData = prepareChartData();

  const chartOptions = {
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

      {/* Chart Section */}
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
            }}
          >
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;