import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Fonction pour supprimer les balises HTML et retourner uniquement le texte
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
};
console.log(localStorage.getItem("jwt-token"));

function Activities() {
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [favoriteActivities, setFavoriteActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        _id: "",
        title: "",
        description: "",
        image: null,
        tags: [""],
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fonction pour récupérer les activités depuis l'API
    const fetchActivities = async () => {
        try {
            console.log("Fetching activities from API...");
            const response = await fetch("http://localhost:5000/users/list/activities", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            console.log("API Response:", data);

            if (response.ok) {
                setActivities(data);
            } else {
                console.error("Failed to fetch activities:", data.message);
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setIsLoading(false);
        }
    };
    const handleDelete = async (activityId) => {
      if (!window.confirm("Are you sure you want to delete this activity?")) {
          return; // Annuler si l'utilisateur clique sur "Cancel"
      }
  
      try {
          const token = localStorage.getItem("jwt-token");
          if (!token) {
              toast.error("You must be logged in!");
              return;
          }
  
          const response = await fetch(`http://localhost:5000/users/psychiatrist/${userId}/delete-activity/${activityId}`, {
              method: "DELETE",
              headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
              },
          });
  
          const data = await response.json();
          if (response.ok) {
              setActivities(activities.filter(activity => activity._id !== activityId));
              toast.success("Activity deleted successfully!");
          } else {
              toast.error(`Failed to delete activity: ${data.message}`);
          }
      } catch (error) {
          console.error("Error deleting activity:", error);
          toast.error("An error occurred while deleting the activity.");
      }
  };
  
  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    console.log("📌 Raw JWT Token from localStorage:", token); // Vérifier le token brut

    if (token) {
        try {
            const decoded = jwtDecode(token);
            console.log("📌 Decoded Token:", decoded); // Voir le contenu du token
            
            if (decoded.id) setUserId(decoded.id);
            
            if (decoded.role) {
                setUserRole(decoded.role);
                console.log("✅ Role found in token:", decoded.role);
            } else {
                console.error("❌ Role is missing in the token!");
            }
        } catch (error) {
            console.error("❌ Invalid token:", error);
        }
    } else {
        console.warn("⚠️ No token found in localStorage");
    }

    fetchActivities();
}, []);


    if (isLoading) {
        return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
    }
    console.log("User Role State:", userRole);

    return (
        <div>
            {/* Main Content */}
            <main style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
                {/* Breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Activities</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="/">Home</a></li>
                            <li className="active">Activities</li>
                        </ul>
                    </div>
                </div>

                {/* Activities Area */}
                <div style={{ padding: "100px 0" }}>
                    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
                        <div style={{ textAlign: "center", marginBottom: "50px" }}>
                            <span style={{ fontSize: "16px", color: "#0ea5e6", display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                                <i className="far fa-hand-heart"></i> Our Activities
                            </span>
                            <h2 style={{ fontSize: "32px", fontWeight: "700", margin: "10px 0 0" }}>
                                Discover our <span style={{ color: "#0ea5e6" }}>latest activities</span>
                            </h2>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
                            {activities.length > 0 ? (
                                activities.map((activity, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: "#fff",
                                            borderRadius: "10px",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                            transition: "transform 0.3s ease",
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                    >
                                        <div style={{ position: "relative" }}>
                                        <img
                                              src={activity.imageUrl ? `http://localhost:5000${activity.imageUrl}` : "/assets/img/activities/default.png"}
                                              alt="Activity"
                                              style={{ width: "100%", height: "200px", objectFit: "cover" }}
                                              onError={(e) => { e.target.src = "/assets/img/activities/default.png"; }} // Remplacement si l'image ne charge pas
                                          />

                                            <div style={{
                                                position: "absolute",
                                                top: "10px",
                                                left: "10px",
                                                background: "#0ea5e6",
                                                color: "#fff",
                                                padding: "5px 10px",
                                                borderRadius: "5px",
                                                textAlign: "center",
                                            }}>
                                                
                                            </div>
                                        </div>
                                        <div style={{ padding: "20px" }}>
                                            <h4 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 15px", lineHeight: "1.4" }}>
                                                <a href={`/activity/${activity._id}`} style={{ color: "#333", textDecoration: "none" }}>
                                                    {stripHtmlTags(activity.title)}
                                                </a>
                                            </h4>
                                            <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
                                                {stripHtmlTags(activity.description).length > 100
                                                    ? `${stripHtmlTags(activity.description).substring(0, 100)}...`
                                                    : stripHtmlTags(activity.description)}
                                            </p>
                                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
    <a
        href={`/activity/${activity._id}`}
        style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#0ea5e6",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            textDecoration: "none",
            transition: "background 0.3s ease",
        }}
        onMouseEnter={(e) => e.target.style.background = "#164da6"}
        onMouseLeave={(e) => e.target.style.background = "#0ea5e6"}
    >
        View <i className="fas fa-circle-arrow-right" style={{ marginLeft: "5px" }}></i>
    </a>

    {/* Afficher le bouton Delete uniquement si l'utilisateur est un psychiatre */}
    {userRole === "psychiatrist" && (
    <button
        onClick={() => handleDelete(activity._id)}
        style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#dc3545",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
            transition: "background 0.3s ease",
        }}
        onMouseEnter={(e) => e.target.style.background = "#c82333"}
        onMouseLeave={(e) => e.target.style.background = "#dc3545"}
    >
        Delete <i className="fas fa-trash" style={{ marginLeft: "5px" }}></i>
    </button>
)}


</div>

                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: "center", gridColumn: "span 3" }}>
                                    <p>No activities available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Scroll Top */}
            <a
                href="#"
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    background: "#0ea5e6",
                    color: "#fff",
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    transition: "background 0.3s ease",
                }}
                onMouseEnter={(e) => e.target.style.background = "#45a049"}
                onMouseLeave={(e) => e.target.style.background = "#0ea5e6"}
            >
                <i className="far fa-arrow-up"></i>
            </a>

            {/* Toast Container */}
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}

export default Activities;
