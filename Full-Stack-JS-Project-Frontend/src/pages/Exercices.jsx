import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Précharger les fichiers audio
const inhaleSound = new Audio("/assets/sounds/inhale.mp3");
const holdSound = new Audio("/assets/sounds/hold.mp3");
const exhaleSound = new Audio("/assets/sounds/exhale.mp3");

// Fonction pour simuler une API d'exercices de respiration
const fetchBreathingExercise = async (type) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const exercises = {
      relaxation: { inhale: 4, hold: 4, exhale: 6, cycles: 10, totalDuration: 5 * 60 },
      focus: { inhale: 4, hold: 2, exhale: 4, cycles: 15, totalDuration: 3 * 60 },
      sleep: { inhale: 4, hold: 7, exhale: 8, cycles: 8, totalDuration: 4 * 60 },
    };
    const exercise = exercises[type];
    if (!exercise) throw new Error("Invalid exercise type.");
    return exercise;
  } catch (error) {
    throw new Error("Failed to fetch breathing exercise: " + error.message);
  }
};

function Exercises() {
  const [exerciseType, setExerciseType] = useState("");
  const [exerciseData, setExerciseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("inhale");
  const [cycleCount, setCycleCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);

  // Charger les données de l'exercice
  const handleStartExercise = async (type) => {
    setIsLoading(true);
    setExerciseType(type);
    setIsBreathing(false);
    setCycleCount(0);
    setCurrentPhase("inhale");

    try {
      const data = await fetchBreathingExercise(type);
      setExerciseData(data);
      setTimeLeft(data.totalDuration);
      setPhaseTimeLeft(data.inhale);
      toast.success(`Starting ${type} breathing exercise!`);
    } catch (error) {
      console.error("Error fetching breathing exercise:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour arrêter tous les sons
  const stopAllSounds = () => {
    inhaleSound.pause();
    holdSound.pause();
    exhaleSound.pause();
    inhaleSound.currentTime = 0;
    holdSound.currentTime = 0;
    exhaleSound.currentTime = 0;
  };

  // Gérer le cycle de respiration et jouer les sons
  useEffect(() => {
    if (!exerciseData || !isBreathing) {
      stopAllSounds();
      return;
    }

    const { inhale, hold, exhale, cycles } = exerciseData;
    let timer;

    const runCycle = () => {
      if (cycleCount >= cycles) {
        setIsBreathing(false);
        stopAllSounds();
        toast.success("Breathing exercise completed!");
        return;
      }

      if (currentPhase === "inhale") {
        stopAllSounds();
        inhaleSound.play().catch((error) => console.error("Error playing inhale sound:", error));
        setPhaseTimeLeft(inhale);
        timer = setTimeout(() => {
          setCurrentPhase("hold");
          setPhaseTimeLeft(hold);
        }, inhale * 1000);
      } else if (currentPhase === "hold") {
        stopAllSounds();
        holdSound.play().catch((error) => console.error("Error playing hold sound:", error));
        setPhaseTimeLeft(hold);
        timer = setTimeout(() => {
          setCurrentPhase("exhale");
          setPhaseTimeLeft(exhale);
        }, hold * 1000);
      } else if (currentPhase === "exhale") {
        stopAllSounds();
        exhaleSound.play().catch((error) => console.error("Error playing exhale sound:", error));
        setPhaseTimeLeft(exhale);
        timer = setTimeout(() => {
          setCurrentPhase("inhale");
          setCycleCount((prev) => prev + 1);
        }, exhale * 1000);
      }
    };

    runCycle();

    return () => {
      clearTimeout(timer);
      stopAllSounds();
    };
  }, [currentPhase, isBreathing, exerciseData, cycleCount]);

  // Gérer le minuteur global
  useEffect(() => {
    if (!isBreathing || !exerciseData || timeLeft <= 0) {
      if (isBreathing && timeLeft <= 0) { // Vérifier si l'exercice était en cours
        setIsBreathing(false);
        setCycleCount(exerciseData?.cycles || 0);
        stopAllSounds();
        toast.success("Breathing exercise completed!");
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathing, timeLeft, exerciseData]);

  // Gérer le temps restant dans la phase actuelle
  useEffect(() => {
    if (!isBreathing || phaseTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setPhaseTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathing, phaseTimeLeft]);

  // Démarrer ou arrêter l'exercice
  const toggleBreathing = () => {
    if (!exerciseData) {
      toast.error("Please select an exercise type first.");
      return;
    }
    setIsBreathing((prev) => {
      if (prev) {
        stopAllSounds();
      }
      return !prev;
    });
  };

  // Formater le temps restant
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculer la progression du cercle
  const getProgress = () => {
    if (!exerciseData) return 0;
    const phaseDuration =
      currentPhase === "inhale"
        ? exerciseData.inhale
        : currentPhase === "hold"
        ? exerciseData.hold
        : exerciseData.exhale;
    return (phaseTimeLeft / phaseDuration) * 100;
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
          <h2 className="breadcrumb-title">Explore Breathing Exercises</h2>
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
              <a href="/Home" style={{ color: "#fff", textDecoration: "none"}}>
                Home
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none"}}>
              Wellness Exercises
            </li>
          </ul>
        </div>
      </div>

      {/* Exercises Section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}></h2>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            padding: "30px",
            marginBottom: "40px",
          }}
        >
          {/* Sélection du type d'exercice */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "18px", color: "#333", marginBottom: "10px" }}>
              Choose Your Breathing Exercise
            </h4>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              {["relaxation", "focus", "sleep"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleStartExercise(type)}
                  disabled={isLoading || isBreathing}
                  style={{
                    backgroundColor: exerciseType === type ? "#ff5a5f" : "#0ea5e6",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "50px",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor =
                      exerciseType === type ? "#e04f54" : "#0d8bc2")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor =
                      exerciseType === type ? "#ff5a5f" : "#0ea5e6")
                  }
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Animation de Respiration avec Cercle de Progression */}
          {exerciseData && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ position: "relative", width: "150px", height: "150px", margin: "0 auto" }}>
                <svg width="150" height="150" style={{ position: "absolute", top: 0, left: 0 }}>
                  <circle
                    cx="75"
                    cy="75"
                    r="70"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="75"
                    cy="75"
                    r="70"
                    fill="none"
                    stroke="#0ea5e6"
                    strokeWidth="10"
                    strokeDasharray="439.6"
                    strokeDashoffset={(439.6 * (100 - getProgress())) / 100}
                    transform="rotate(-90 75 75)"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "24px",
                    color: "#333",
                  }}
                >
                  {phaseTimeLeft}s
                </div>
              </div>
              <h4 style={{ fontSize: "18px", color: "#333", marginTop: "20px", textAlign: "center" }}>
                {currentPhase === "inhale"
                  ? "inhale"
                  : currentPhase === "hold"
                  ? "hold"
                  : "exhale"}
              </h4>
              <p style={{ color: "#666", fontSize: "14px", marginTop: "10px", textAlign: "center" }}>
                Cycle {cycleCount} of {exerciseData.cycles}
              </p>
              <p style={{ color: "#666", fontSize: "14px", textAlign: "center" }}>
                Time Left: {formatTime(timeLeft)}
              </p>
            </div>
          )}

          {/* Bouton Start/Stop */}
          {exerciseData && (
            <button
              onClick={toggleBreathing}
              disabled={isLoading}
              style={{
                backgroundColor: isBreathing ? "#ff5a5f" : "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "50px",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                display: "block",
                margin: "0 auto",
              }}
              onMouseEnter={(e) =>
                (e.target.style.backgroundColor = isBreathing ? "#e04f54" : "#0d8bc2")
              }
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = isBreathing ? "#ff5a5f" : "#0ea5e6")
              }
            >
              {isBreathing ? "Stop" : "Start"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Exercises;