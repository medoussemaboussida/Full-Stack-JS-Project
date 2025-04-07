// Récupérer les notifications d'un utilisateur depuis localStorage
export const getNotifications = (userId) => {
    const notifications = localStorage.getItem(`notifications_${userId}`);
    return notifications ? JSON.parse(notifications) : [];
  };
  
  // Ajouter une notification pour un utilisateur avec une logique personnalisée
  export const addNotification = (userId, message, type, appointmentId = null) => {
    const notifications = getNotifications(userId);
    const newNotification = {
      id: Date.now(), // ID unique basé sur le timestamp
      message,
      type, // "confirmed", "reminder", "deleted", etc.
      read: false,
      createdAt: new Date().toISOString(),
      appointmentId, // Associer la notification à un rendez-vous spécifique si fourni
    };
  
    // Limiter le nombre de notifications (exemple : 50 max)
    if (notifications.length >= 50) {
      notifications.shift(); // Supprimer la plus ancienne
    }
  
    notifications.push(newNotification);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
  
    // Si le navigateur le permet, afficher une notification système
    if (Notification.permission === "granted") {
      new Notification(type === "confirmed" ? "Appointment Confirmed" : "Appointment Reminder", {
        body: message,
        icon: "/path/to/icon.png", // À personnaliser
      });
    }
  };
  
  // Marquer une notification comme lue
  export const markNotificationAsRead = (userId, notificationId) => {
    const notifications = getNotifications(userId);
    const updatedNotifications = notifications.map((notif) =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
  };
  
  // Marquer toutes les notifications comme lues
  export const markAllNotificationsAsRead = (userId) => {
    const notifications = getNotifications(userId);
    const updatedNotifications = notifications.map((notif) => ({
      ...notif,
      read: true,
    }));
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
  };
  
  // Supprimer les notifications associées à un rendez-vous
  export const removeNotificationsByAppointment = (userId, appointmentId) => {
    const notifications = getNotifications(userId);
    const filteredNotifications = notifications.filter(
      (notif) => notif.appointmentId !== appointmentId
    );
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(filteredNotifications));
  };
  
  // Nettoyer les notifications anciennes (par exemple, plus de 7 jours)
  export const cleanOldNotifications = (userId) => {
    const notifications = getNotifications(userId);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
    const filteredNotifications = notifications.filter(
      (notif) => new Date(notif.createdAt) >= oneWeekAgo
    );
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(filteredNotifications));
  };