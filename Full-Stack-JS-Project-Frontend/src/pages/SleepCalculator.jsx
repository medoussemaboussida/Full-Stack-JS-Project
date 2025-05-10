import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Recommandations de sommeil par tranche d'âge (inspirées de Sleep Foundation)
const sleepRecommendations = {
  "0-3": { min: 14, max: 17 }, // Nouveaux-nés
  "4-11": { min: 12, max: 15 }, // Bébés
  "1-2": { min: 11, max: 14 }, // Tout-petits
  "3-5": { min: 10, max: 13 }, // Préscolaire
  "6-13": { min: 9, max: 11 }, // Enfants d'âge scolaire
  "14-17": { min: 8, max: 10 }, // Adolescents
  "18-64": { min: 7, max: 9 }, // Adultes
  "65+": { min: 7, max: 8 }, // Personnes âgées
};

// Fonction pour simuler une API de calcul de sommeil
const fetchSleepTimes = async (wakeUpTime = null, bedTime = null) => {
  try {
    // Simuler un délai d'API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const cycleDuration = 90; // Durée d'un cycle de sommeil en minutes (90 minutes)
    const fallAsleepTime = 15; // Temps moyen pour s'endormir (15 minutes)
    const cycles = [4, 5, 6]; // Nombre de cycles de sommeil recommandés (4, 5 ou 6)
    const ageRange = "18-64"; // Plage d'âge fixée à 18-64 (adultes)

    let results = [];
    let totalSleepHours = [];

    if (wakeUpTime) {
      // Calculer les heures de coucher en fonction de l'heure de réveil
      const [hours, minutes] = wakeUpTime.split(":").map(Number);
      const wakeUpDate = new Date();
      wakeUpDate.setHours(hours, minutes, 0, 0);

      cycles.forEach((numCycles) => {
        const totalSleepMinutes = numCycles * cycleDuration + fallAsleepTime;
        const bedTimeDate = new Date(wakeUpDate.getTime() - totalSleepMinutes * 60 * 1000);
        const bedTimeHours = bedTimeDate.getHours().toString().padStart(2, "0");
        const bedTimeMinutes = bedTimeDate.getMinutes().toString().padStart(2, "0");
        results.push(`${bedTimeHours}:${bedTimeMinutes}`);
        totalSleepHours.push(totalSleepMinutes / 60); // Convertir en heures
      });
    } else if (bedTime) {
      // Calculer les heures de réveil en fonction de l'heure de coucher
      const [hours, minutes] = bedTime.split(":").map(Number);
      const bedTimeDate = new Date();
      bedTimeDate.setHours(hours, minutes, 0, 0);

      cycles.forEach((numCycles) => {
        const totalSleepMinutes = numCycles * cycleDuration + fallAsleepTime;
        const wakeUpDate = new Date(bedTimeDate.getTime() + totalSleepMinutes * 60 * 1000);
        const wakeUpHours = wakeUpDate.getHours().toString().padStart(2, "0");
        const wakeUpMinutes = wakeUpDate.getMinutes().toString().padStart(2, "0");
        results.push(`${wakeUpHours}:${wakeUpMinutes}`);
        totalSleepHours.push(totalSleepMinutes / 60); // Convertir en heures
      });
    }

    // Vérifier si les durées de sommeil sont dans la plage recommandée pour l'âge
    const { min, max } = sleepRecommendations[ageRange] || { min: 7, max: 9 };
    const sleepFeedback = totalSleepHours.map((hours) => {
      if (hours < min) return `This provides ${hours.toFixed(1)} hours of sleep, which is below the recommended ${min}-${max} hours for adults.`;
      if (hours > max) return `This provides ${hours.toFixed(1)} hours of sleep, which is above the recommended ${min}-${max} hours for adults.`;
      return `This provides ${hours.toFixed(1)} hours of sleep, which is within the recommended ${min}-${max} hours for adults.`;
    });

    return { times: results, feedback: sleepFeedback };
  } catch (error) {
    throw new Error("Failed to calculate sleep times.");
  }
};

function SleepCalculator() {
  const [wakeUpTime, setWakeUpTime] = useState("");
  const [bedTime, setBedTime] = useState("");
  const [results, setResults] = useState({ times: [], feedback: [] });
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculate = async (type) => {
    setIsLoading(true);
    setResults({ times: [], feedback: [] });

    try {
      let sleepData;
      if (type === "wakeUp") {
        if (!wakeUpTime) {
          toast.error("Please enter a wake-up time.");
          setIsLoading(false);
          return;
        }
        sleepData = await fetchSleepTimes(wakeUpTime, null);
        toast.success("Bedtimes calculated successfully!");
      } else {
        if (!bedTime) {
          toast.error("Please enter a bedtime.");
          setIsLoading(false);
          return;
        }
        sleepData = await fetchSleepTimes(null, bedTime);
        toast.success("Wake-up times calculated successfully!");
      }
      setResults(sleepData);
    } catch (error) {
      console.error("Error calculating sleep times:", error);
      toast.error("An error occurred while calculating sleep times.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main">
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
          <h2 className="breadcrumb-title">Sleep Calculator</h2>
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
              <a href="/Home" style={{ color: "#fff", textDecoration: "none" }}>
                Home
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none"}}>
              Sleep Calculator
            </li>
          </ul>
        </div>
      </div>
<br/><br/>
      {/* Sleep Calculator Section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Calculate Your <span style={{ color: "#ff5a5f" }}>Optimal Sleep</span> Schedule
        </h2>

        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
          Enter your desired wake-up time or bedtime to find the best times to sleep or wake up, ensuring you complete full 90-minute sleep cycles and wake up refreshed. This calculator is optimized for adults (18-64 years).
        </p>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            padding: "30px",
            marginBottom: "40px",
          }}
        >
          {/* Wake-Up Time Input */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "20px", color: "#333", marginBottom: "10px" }}>
              I Want to Wake Up At...
            </h3>
            <input
              type="time"
              value={wakeUpTime}
              onChange={(e) => {
                setWakeUpTime(e.target.value);
                setBedTime(""); // Réinitialiser l'autre champ
              }}
              style={{
                padding: "10px",
                fontSize: "16px",
                borderRadius: "50px",
                border: "1px solid #ccc",
                width: "200px",
              }}
            />
            <button
              onClick={() => handleCalculate("wakeUp")}
              disabled={isLoading}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                border: "none",
                cursor: "pointer",
                marginLeft: "10px",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
            >
              {isLoading ? "Calculating..." : "Calculate Bedtime"}
            </button>
          </div>

          {/* Bedtime Input */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "20px", color: "#333", marginBottom: "10px" }}>
              I Want to Go to Bed At...
            </h3>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => {
                setBedTime(e.target.value);
                setWakeUpTime(""); // Réinitialiser l'autre champ
              }}
              style={{
                padding: "10px",
                fontSize: "16px",
                borderRadius: "50px",
                border: "1px solid #ccc",
                width: "200px",
              }}
            />
            <button
              onClick={() => handleCalculate("bedTime")}
              disabled={isLoading}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                border: "none",
                cursor: "pointer",
                marginLeft: "10px",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
            >
              {isLoading ? "Calculating..." : "Calculate Wake-Up Time"}
            </button>
          </div>

          {/* Résultats */}
          {results.times.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h3 style={{ fontSize: "20px", color: "#333", marginBottom: "10px" }}>
                {wakeUpTime ? "Recommended Bedtimes" : "Recommended Wake-Up Times"}
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: "0",
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                }}
              >
                {results.times.map((time, index) => (
                  <li
                    key={index}
                    style={{
                      backgroundColor: "#f0f0f0",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      fontSize: "16px",
                      color: "#333",
                    }}
                  >
                    {time}
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      {results.feedback[index]}
                    </p>
                  </li>
                ))}
              </ul>
              <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
                {wakeUpTime
                  ? "These times account for 4, 5, or 6 sleep cycles (90 minutes each) plus 15 minutes to fall asleep."
                  : "These times account for 4, 5, or 6 sleep cycles (90 minutes each) after falling asleep in 15 minutes."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SleepCalculator;