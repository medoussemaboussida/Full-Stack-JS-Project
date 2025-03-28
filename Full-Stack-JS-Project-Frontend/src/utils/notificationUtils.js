// Récupérer les notifications d'un utilisateur depuis localStorage
export const getNotifications = (userId) => {
    const notifications = localStorage.getItem(`notifications_${userId}`);
    return notifications ? JSON.parse(notifications) : [];
  };
  
  // Ajouter une notification pour un utilisateur
  export const addNotification = (userId, message, type) => {
    const notifications = getNotifications(userId);
    const newNotification = {
      id: Date.now(), // Utiliser un timestamp comme ID unique
      message,
      type, // "ban", "post_deleted", "comment_deleted"
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(newNotification);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
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