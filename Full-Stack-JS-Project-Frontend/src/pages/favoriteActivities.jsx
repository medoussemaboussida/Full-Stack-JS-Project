import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const BASE_URL = "http://localhost:5000"; // URL du serveur backend


const activities = [
  {
    category: "Professional and Intellectual",
    class: "cat1",
    list: [
      "Work",
      "Learning",
      "Reading",
      "Creativity",
      "Writing",
      "Research",
      "Programming",
      "Entrepreneurship",
    ],
  },
  {
    category: "Wellness and Relaxation",
    class: "cat2",
    list: [
      "Relaxing",
      "Self-care",
      "Meditation",
      "Yoga",
      "Massage",
      "Spa",
      "Relaxing-bath",
      "Deep-breathing",
    ],
  },
  {
    category: "Social and Relationship",
    class: "cat3",
    list: [
      "Family",
      "Friendships",
      "Partner",
      "Dating",
      "Partying",
      "Hanging-out-with-friends",
      "Conversations",
      "Volunteering",
    ],
  },
  {
    category: "Physical and Sports",
    class: "cat4",
    list: [
      "Physical-fitness",
      "Running",
      "Weight-training",
      "Swimming",
      "Cycling",
      "Hiking",
      "Yoga",
      "Dancing",
      "football",
      "basketball"
    ],
  },
  {
    category: "Leisure and Cultural",
    class: "cat5",
    list: [
      "Traveling",
      "Watching-movies",
      "Music",
      "Video-games",
      "Painting",
      "Drawing",
      "Theater",
      "Photography",
      "Writing",
    ],
  },
  {
    category: "Consumption and Shopping",
    class: "cat6",
    list: [
      "Shopping",
      "Cooking",
      "Trying-new-restaurants",
    ],
  },
  {
    category: "Domestic and Organizational",
    class: "cat7",
    list: [
      "Gardening",
      "DIY",
      "Home-repairs",
    ],
  },
  {
    category: "Nature and Animal-Related",
    class: "cat8",
    list: [
      "Pets",
      "Walking by the sea",
      "Agricultural-activities",
    ],
  },
];

function Portfolio() {
  const [userId, setUserId] = useState(null);
  const [favoriteActivities, setFavoriteActivities] = useState([]);

  // Récupérer le userId depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);

        // Charger les activités favorites
        axios
          .get(`${BASE_URL}/users/${decoded.id}`)
          .then((res) => setFavoriteActivities(res.data.favoriteActivities || []))
          .catch((err) => console.error("Erreur chargement activités favorites:", err));
      } catch (error) {
        console.error("Token invalide:", error);
        localStorage.removeItem("jwt-token");
        window.location.href = "/login";
      }
    }
  }, []);

  // Ajouter ou retirer une activité des favoris
  const toggleFavorite = async (activity) => {
    if (!userId) {
      toast.error("Vous devez être connecté !");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/users/favorite-activity/${userId}`, { activity });
      setFavoriteActivities(response.data.favoriteActivities);
      toast.success(response.data.favoriteActivities.includes(activity) ? "Ajouté aux favoris !" : "Retiré des favoris !");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des favoris.");
      console.error("Erreur toggleFavorite:", error);
    }
};

  return (
    <div>
   <ToastContainer position="top-right" autoClose={3000} />

      <main className="main">
        {/* Breadcrumb */}
        <div
          className="site-breadcrumb"
          style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
        >
          <div className="container">
            <h2 className="breadcrumb-title">List of Activities</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/">Home</a>
              </li>
              <li className="active">Activities</li>
            </ul>
          </div>
        </div>
        {/* Breadcrumb end */}

        {/* Portfolio area */}
        <div className="portfolio-area py-100">
          <div className="container">
            <div className="row wow fadeInDown" data-wow-delay=".25s">
              <div className="col-lg-6 mx-auto">
                <div className="site-heading text-center mb-5">
                  <span className="site-title-tagline">
                    <i className="far fa-hand-heart"></i> Our Activities
                  </span>
                  <h2 className="site-title">
                    Let's take a look at some of our favorite <span>activities.</span>
                  </h2>
                </div>
              </div>
              <div className="col-lg-12 mx-auto mb-40">
                <ul className="filter-btn">
                  <li className="active" data-filter="*">
                    All
                  </li>
                  {activities.map((activity, index) => (
                    <li key={index} data-filter={`.${activity.class}`}>
                      {activity.category}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Activities Grid */}
            <div className="row g-4 filter-box popup-gallery wow fadeInUp" data-wow-delay=".25s">
              {activities.map((activity) =>
                activity.list.map((item, index) => (
                  <div key={index} className={`col-md-6 col-lg-3 filter-item ${activity.class}`}>
                    <div className="portfolio-item">
                      <div className="portfolio-img">
                        <img
                          src={`assets/img/activities/${item.replace(/\s+/g, "-").toLowerCase()}.png`}
                          alt={item}
                        />
                        <button
                        className={`popup-img portfolio-link btn ${favoriteActivities.includes(item) ? "btn-success" : "btn-outline-success"}`}
                        onClick={() => toggleFavorite(item)}
                      >
                        <i className={`far fa-plus ${favoriteActivities.includes(item) ? "text-white" : ""}`}></i>
                      </button>
                      </div>
                      <div className="portfolio-content">
                        <div className="portfolio-info">
                          <p className="portfolio-subtitle">// {activity.category}</p>
                          <h4 className="portfolio-title">
                            <a href="portfolio-single.html">{item}</a>
                          </h4>
                        </div>
                        <button
                          className={`btn ${favoriteActivities.includes(item) ? "btn-success" : "btn-outline-success"}`}
                          onClick={() => toggleFavorite(item)}
                        >
                          <i className={`fa-solid fa-thumbs-up ${favoriteActivities.includes(item) ? "text-white" : ""}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Portfolio area end */}
      </main>
    </div>
  );
}

export default Portfolio;
