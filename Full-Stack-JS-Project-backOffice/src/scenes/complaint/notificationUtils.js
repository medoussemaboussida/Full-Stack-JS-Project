// notificationUtils.js

// Récupérer les notifications d'un utilisateur ou admin depuis localStorage
export const getNotifications = (id, isAdmin = false) => {
  const key = isAdmin ? `notifications_admin_${id}` : `notifications_${id}`;
  const notifications = localStorage.getItem(key);
  return notifications ? JSON.parse(notifications) : [];
};

// Ajouter une notification pour un utilisateur ou admin
export const addNotification = (id, message, type, isAdmin = false) => {
  const key = isAdmin ? `notifications_admin_${id}` : `notifications_${id}`;
  const notifications = getNotifications(id, isAdmin);
  const newNotification = {
    id: Date.now(), // Utiliser un timestamp comme ID unique
    message,
    type, // Par exemple, "complaint_deleted", "new_response", etc.
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(newNotification);
  localStorage.setItem(key, JSON.stringify(notifications));

  // Envoyer un message à l'autre application (si nécessaire)
  window.postMessage(
    {
      type: "NEW_NOTIFICATION",
      userId: id,
      notification: newNotification,
      isAdmin,
    },
    "*"
  );
};

// Marquer une notification comme lue
export const markNotificationAsRead = (id, notificationId, isAdmin = false) => {
  const key = isAdmin ? `notifications_admin_${id}` : `notifications_${id}`;
  const notifications = getNotifications(id, isAdmin);
  const updatedNotifications = notifications.map((notif) =>
    notif.id === notificationId ? { ...notif, read: true } : notif
  );
  localStorage.setItem(key, JSON.stringify(updatedNotifications));

  // Envoyer un message à l'autre application
  window.postMessage(
    {
      type: "UPDATE_NOTIFICATION",
      userId: id,
      notificationId,
      read: true,
      isAdmin,
    },
    "*"
  );
};

// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = (id, isAdmin = false) => {
  const key = isAdmin ? `notifications_admin_${id}` : `notifications_${id}`;
  const notifications = getNotifications(id, isAdmin);
  const updatedNotifications = notifications.map((notif) => ({
    ...notif,
    read: true,
  }));
  localStorage.setItem(key, JSON.stringify(updatedNotifications));

  // Envoyer un message à l'autre application
  window.postMessage(
    {
      type: "MARK_ALL_READ",
      userId: id,
      isAdmin,
    },
    "*"
  );
};