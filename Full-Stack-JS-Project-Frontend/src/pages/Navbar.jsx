import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [animateBell, setAnimateBell] = useState(false); // For bell animation
  const prevNotificationsRef = useRef([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("jwt-token");
    if (storedToken) {
      setToken(storedToken);
      fetchUserData(storedToken);
      fetchNotifications(storedToken); // Fetch immediately on mount
    }

    const interval = setInterval(() => fetchNotifications(storedToken), 30000);
    return () => clearInterval(interval);

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await axios.get("http://localhost:5000/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const fetchNotifications = async (token) => {
    try {
      const response = await axios.get(
        "http://localhost:5000/users/notifications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const newNotifications = response.data.notifications;

      const prevNotifications = prevNotificationsRef.current;
      const unreadCount = newNotifications.filter((n) => !n.read).length;
      const prevUnreadCount = prevNotifications.filter((n) => !n.read).length;

      if (unreadCount > prevUnreadCount) {
        const newCount = unreadCount - prevUnreadCount;
        console.log(`New notifications received: ${newCount}`);
        setAnimateBell(true); // Trigger bell animation
        setTimeout(() => setAnimateBell(false), 1000); // Reset after 1s
        if (Notification.permission === "granted") {
          new Notification("New Notification", {
            body: `You have ${newCount} new notification(s)`,
            icon: "/assets/img/logo/logo.png",
          });
        }
      }

      setNotifications(newNotifications);
      prevNotificationsRef.current = newNotifications;
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(
        `http://localhost:5000/users/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(
        notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) =>
            axios.put(
              `http://localhost:5000/users/notifications/${n._id}/read`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            )
          )
      );
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkNotificationAsRead(notification._id);
    // Redirect to AppointmentHistory
    window.location.href = "/appointment-history";
  };

  const logout = () => {
    console.log("Déconnexion en cours...");
    fetch("http://localhost:5000/logout", {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          localStorage.removeItem("jwt-token");
          console.log("Déconnexion réussie, redirection vers /login...");
          window.location.href = "/login";
        } else {
          console.error("Erreur lors de la déconnexion:", response.statusText);
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la déconnexion:", error);
      });
  };

  return (
    <header className="header">
      <div className="main-navigation">
        <nav className="navbar navbar-expand-lg">
          <div className="container position-relative">
            <a className="navbar-brand" href="/Home">
              <img
                src="/assets/img/logo/icon.png"
                alt="logo"
                style={{ width: "50px", height: "auto" }}
              />
            </a>
            <div className="mobile-menu-right">
              {/* <div className="mobile-menu-btn">
                <button
                  type="button"
                  className="nav-right-link search-box-outer"
                >
                  <i className="far fa-search"></i>
                </button>
              </div> */}
              
              <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#offcanvasNavbar"
                aria-controls="offcanvasNavbar"
                aria-label="Toggle navigation"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
            <div
              className="offcanvas offcanvas-start"
              tabIndex="-1"
              id="offcanvasNavbar"
              aria-labelledby="offcanvasNavbarLabel"
            >
              <div className="offcanvas-header">
                <a
                  href="/Home"
                  className="offcanvas-brand"
                  id="offcanvasNavbarLabel"
                >
                  <img src="/assets/img/logo/logo.png" alt=""                 style={{ width: "300px", height: "auto" }}
/>
                </a>
                
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                >
                  <i className="far fa-xmark"></i>
                </button>
                  <li className="nav-item ms-1">
                    <button
                      className="btn btn-danger"
                      style={{
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 0, // Supprime le padding par défaut pour un cercle parfait
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        logout();
                      }}
                    >
                      <i
                        className="fas fa-sign-out-alt"
                        style={{ fontSize: "14px" }}
                      ></i>
                    </button>
                  </li>
              </div>
              <div className="offcanvas-body gap-xl-4">
                <ul className="navbar-nav justify-content-end flex-grow-1">
                  <li className="nav-item">
                    <a className="nav-link" href="/Home">
                      Home
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href="/About">
                      About
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href="/Publication">
                      Publication
                    </a>
                  </li>
                  <li className="nav-item dropdown">
                    <a
                      className="nav-link dropdown-toggle"
                      href="#"
                      data-bs-toggle="dropdown"
                    >
                      Our Services
                    </a>
                    <ul className="dropdown-menu fade-down">
                      <li>
                        <a className="dropdown-item" href="/about">
                          About Us
                        </a>
                      </li>
                      <li>
                        <a className="dropdown-item" href="/Forum">
                          Forum
                        </a>
                      </li>
                      <li>
                        <a className="dropdown-item" href="/Complaint">
                          Complaint
                        </a>
                      </li>
                      <li>
                        <a className="dropdown-item" href="/Associations">
                          Our Associations
                        </a>
                      </li>
                      <li>
                        <a className="dropdown-item" href="/events">
                          Our Events
                        </a>
                      </li>
                    </ul>
                  </li>
                  {user?.role === "student" ? (
                    <li className="nav-item dropdown">
                      <a
                        className="nav-link dropdown-toggle"
                        href="#"
                        data-bs-toggle="dropdown"
                      >
                        Pastime
                      </a>
                      <ul className="dropdown-menu fade-down">
                        <li>
                          <a className="dropdown-item" href="/Activities">
                            Activities
                          </a>
                        </li>
                        <li>
                          <a className="dropdown-item" href="/Exercices">
                            Breathing Exercises
                          </a>
                        </li>
                        <li>
                          <a className="dropdown-item" href="/SleepCalculator">
                            Sleep Calculator
                          </a>
                        </li>
                        <li>
                          <a className="dropdown-item" href="/list-problems">
                            Problem Management
                          </a>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <a
                            className="dropdown-item"
                            href="/mental-health-assessment"
                          >
                            Mental Health Assessment
                          </a>
                        </li>
                        <li>
                          <a
                            className="dropdown-item"
                            href="/mental-health-dashboard"
                          >
                            Mental Health Dashboard
                          </a>
                        </li>
                      </ul>
                    </li>
                  ) : (
                    <li className="nav-item">
                      <a className="nav-link" href="/Activities">
                        Activities
                      </a>
                    </li>
                  )}
                  <li className="nav-item dropdown">
                    <a
                      className="nav-link dropdown-toggle"
                      href="#"
                      data-bs-toggle="dropdown"
                    >
                      Appointment
                    </a>
                    <ul className="dropdown-menu fade-down">
                      <li>
                        <a
                          className="dropdown-item"
                          href="/appointment-history"
                        >
                          History
                        </a>
                      </li>
                      <li>
                        <a className="dropdown-item" href="/chat">
                          Chat
                        </a>
                      </li>
                    </ul>
                  </li>
                  
                </ul>
                <div className="nav-right">
                  <div className="search-btn">
                    {/* <button
                      type="button"
                      className="nav-right-link search-box-outer"
                    >
                      <i className="far fa-search"></i>
                    </button> */}
                  </div>
                  <div
                    className="notification-bell"
                    style={{ position: "relative", marginLeft: "15px" }}
                  >
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <i
                        className={`fas fa-bell ${
                          animateBell ? "bell-shake" : ""
                        }`}
                        style={{ fontSize: "20px", color: "#007BFF" }}
                      ></i>
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <span
                          className="notification-badge"
                          style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            backgroundColor: "red",
                            color: "white",
                            borderRadius: "50%",
                            width: "15px",
                            height: "15px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                          }}
                        >
                          {notifications.filter((n) => !n.read).length}
                        </span>
                      )}
                    </button>
                    {showNotifications && (
                      <div
                        className="notification-dropdown"
                        style={{
                          position: "absolute",
                          top: "30px",
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #ddd",
                          borderRadius: "5px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                          width: "300px",
                          maxHeight: "400px",
                          overflowY: "auto",
                          zIndex: 1000,
                        }}
                      >
                        <div
                          className="notification-header"
                          style={{
                            padding: "10px",
                            borderBottom: "1px solid #ddd",
                          }}
                        >
                          <h5 style={{ margin: 0, fontSize: "16px" }}>
                            Notifications
                          </h5>
                          {notifications.filter((n) => !n.read).length > 0 && (
                            <button
                              onClick={handleMarkAllNotificationsAsRead}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#007BFF",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Mark All as Read
                            </button>
                          )}
                        </div>
                        {notifications.length === 0 ? (
                          <p style={{ padding: "10px", margin: 0 }}>
                            No notifications
                          </p>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`notification-item ${
                                notification.read ? "read" : "unread"
                              }`}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid #eee",
                                cursor: "pointer",
                                backgroundColor: notification.read
                                  ? "#f9f9f9"
                                  : "#fff",
                              }}
                            >
                              <p style={{ margin: 0, fontSize: "14px" }}>
                                {notification.message}
                              </p>
                              <small
                                style={{ color: "#888", fontSize: "12px" }}
                              >
                                {new Date(
                                  notification.createdAt
                                ).toLocaleString()}
                              </small>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: "15px",
                    }}
                  >
                    <img
                      id="user-avatar"
                      src={
                        user?.user_photo
                          ? `http://localhost:5000${user.user_photo}`
                          : "/assets/img/user_icon.png"
                      }
                      alt="User Avatar"
                      style={{
                        width: "45px",
                        height: "45px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        objectFit: "cover",
                      }}
                      onClick={() => (window.location.href = "/student")}
                    />
                  </div>
                  <li className="nav-item ms-3">
                    <button
                      className="btn btn-danger"
                      style={{
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 0, // Supprime le padding par défaut pour un cercle parfait
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        logout();
                      }}
                    >
                      <i
                        className="fas fa-sign-out-alt"
                        style={{ fontSize: "14px" }}
                      ></i>
                    </button>
                  </li>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
