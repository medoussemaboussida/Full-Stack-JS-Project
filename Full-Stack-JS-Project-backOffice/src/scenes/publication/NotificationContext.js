import { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  // Charger les publications vues depuis localStorage
  const [viewedPublications, setViewedPublications] = useState(() => {
    const stored = localStorage.getItem("viewedPublications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Initialiser reportedPublications
  const [reportedPublications, setReportedPublications] = useState([]);

  // Mettre à jour localStorage chaque fois que viewedPublications change
  useEffect(() => {
    localStorage.setItem("viewedPublications", JSON.stringify([...viewedPublications]));
  }, [viewedPublications]);

  const addReportedPublication = (publication) => {
    // Ne pas ajouter si la publication a déjà été vue
    if (viewedPublications.has(publication.id)) {
      return;
    }

    setReportedPublications((prev) => {
      if (prev.some(pub => pub.id === publication.id)) {
        return prev;
      }
      return [...prev, publication];
    });
  };

  const removeReportedPublication = (publicationId) => {
    // Supprimer de la liste des notifications
    setReportedPublications((prev) => prev.filter(pub => pub.id !== publicationId));
    // Ajouter à la liste des publications vues
    setViewedPublications((prev) => new Set(prev).add(publicationId));
  };

  return (
    <NotificationContext.Provider value={{ reportedPublications, addReportedPublication, removeReportedPublication }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);