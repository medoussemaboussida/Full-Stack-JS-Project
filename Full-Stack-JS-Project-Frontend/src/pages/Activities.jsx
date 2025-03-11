import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

// Fonction pour supprimer les balises HTML
const stripHtmlTags = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
};

function Activities() {
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("*");
    const [activityToDelete, setActivityToDelete] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Liste des catégories stylées
    const categories = [
        { label: "All", value: "*" },
        { label: "Professional and Intellectual", value: "Professional and Intellectual" },
        { label: "Wellness and Relaxation", value: "Wellness and Relaxation" },
        { label: "Social and Relationship", value: "Social and Relationship" },
        { label: "Physical and Sports", value: "Physical and Sports" },
        { label: "Leisure and Cultural", value: "Leisure and Cultural" },
        { label: "Consumption and Shopping", value: "Consumption and Shopping" },
        { label: "Domestic and Organizational", value: "Domestic and Organizational" },
        { label: "Nature and Animal-Related", value: "Nature and Animal-Related" }

    ];

    // Récupérer les activités
    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:5000/users/list/activities");
            const data = await response.json();
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
 // ✅ Pour la gestion du modal
 const [showModal, setShowModal] = useState(false);
 const [selectedActivity, setSelectedActivity] = useState(null);

 const navigate = useNavigate();

    //Update activity
      // ✅ Ouvrir le modal avec les données de l'activité sélectionnée
      const handleEdit = (activity) => {
        navigate(`/edit-activity/${activity._id}`);
    };

    // ✅ Fermer le modal
    const closeModal = () => {
        setShowModal(false);
        setSelectedActivity(null);
    };


// Supprimer une activité

const handleDelete = (activityId) => {
    setActivityToDelete(activityId);
    setShowDeleteModal(true);
};
const handleConfirmDelete = async (activityId) => {
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
    closeDeleteModal();
};

const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setActivityToDelete(null);
};


 // Ouvrir la page "View Activity"
 const handleViewActivity = (activityId) => {
    window.location.href = `/activity/${activityId}`;
};
    // Filtrer par catégorie
    const fetchActivitiesByCategory = async (category) => {
        setIsLoading(true);
        if (category === "*") {
            fetchActivities();
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/users/activities/category?category=${encodeURIComponent(category)}`);
            const data = await response.json();
            if (response.ok) {
                setActivities(data);
            } else {
                console.error("Erreur:", data.message);
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("jwt-token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.id) setUserId(decoded.id);
                if (decoded.role) setUserRole(decoded.role);
            } catch (error) {
                console.error("Invalid token:", error);
            }
        }
        fetchActivities();
    }, []);

    useEffect(() => {
        fetchActivitiesByCategory(selectedCategory);
    }, [selectedCategory]);

    if (isLoading) {
        return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
    }

    return (
        <div>
            {/* 🔥 Ajout du Breadcrumb */}
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
                    <h2 className="breadcrumb-title">Activities</h2>
                    <ul
                        className="breadcrumb-menu"
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            listStyle: "none",
                            padding: 0,
                            marginTop: "10px",
                        }}
                    >
                        <li style={{ marginRight: "10px" }}>
                            <a href="/Home" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
                                Home
                            </a>
                        </li>
                        <li style={{ color: "#ff5a5f", textDecoration: "none", fontWeight: "bold"}}>
                            Activities
                        </li>
                    </ul>
                </div>
            </div>

            {/* 🔥 Liste des activités */}
            <div style={{ padding: "40px", backgroundColor: "#f9f9f9", textAlign: "center" }}>
                <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
                    Let's Check Our <span style={{ color: "#ff5a5f" }}>Recent Projects</span>
                </h2>

                {/* 🔥 Filtres stylisés */}
                <ul
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "15px",
                        listStyle: "none",
                        marginBottom: "40px",
                        flexWrap: "wrap",
                        padding: "0",
                    }}
                >
                    {categories.map((category) => (
                        <li
                            key={category.value}
                            onClick={() => setSelectedCategory(category.value)}
                            style={{
                                padding: "10px 20px",
                                cursor: "pointer",
                                background: selectedCategory === category.value ? "#0ea5e6" : "#f1f1f1",
                                color: selectedCategory === category.value ? "#fff" : "#333",
                                borderRadius: "20px",
                                transition: "all 0.3s ease",
                                fontWeight: "bold",
                                border: "2px solid transparent",
                                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            {category.label}
                        </li>
                    ))}
                </ul>

                {/* 🔥 Grille des activités */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "30px",
                    }}
                >
                    {activities.length > 0 ? (
                        activities.map((activity, index) => (
                            <div
                                key={index}
                                style={{
                                    background: "#fff",
                                    borderRadius: "15px",
                                    overflow: "hidden",
                                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                    transition: "transform 0.3s ease",
                                    textAlign: "left",
                                    position: "relative"
                                }}

                                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                            >
                               <img
                                src={activity.imageUrl ? `http://localhost:5000${activity.imageUrl}` : "/assets/img/activities/default.png"}
                                alt="Activity"
                                style={{ width: "100%", height: "250px", objectFit: "cover" }}
                                onClick={() => handleViewActivity(activity._id)} // ✅ Ajout du clic sur l'image
                            />

                                <div style={{ padding: "20px" }}>
                                    <h4>{stripHtmlTags(activity.title)}</h4>
                                    <p>{stripHtmlTags(activity.description)}</p>
                                </div>
                                {userRole === "psychiatrist" && (
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px" }}>
                                        <button onClick={() => handleEdit(activity)} className="btn btn-primary">Edit</button>
                                        <button onClick={() => handleDelete(activity._id)} className="btn btn-danger">Delete</button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: "center", gridColumn: "span 3" }}>
                            <p>No activities available for this category.</p>
                        </div>
                    )}
                </div>
            </div>

        {showDeleteModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
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
                        width: "400px",
                        maxWidth: "90%",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                    }}>
                        <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
                        <p style={{ textAlign: "center" }}>Are you sure you want to delete this activity?</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button
                                onClick={() => handleConfirmDelete(activityToDelete)}
                                style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", borderRadius: "5px" }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                onClick={closeDeleteModal}
                                style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", borderRadius: "5px" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            

            {/* ✅ Correction de la fermeture de `div` */}
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}

export default Activities;