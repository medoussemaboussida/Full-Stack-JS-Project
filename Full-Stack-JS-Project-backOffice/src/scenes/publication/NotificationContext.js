import { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  // Charger les publications et commentaires vus depuis localStorage
  const [viewedPublications, setViewedPublications] = useState(() => {
    const stored = localStorage.getItem("viewedPublications");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const [viewedComments, setViewedComments] = useState(() => {
    const stored = localStorage.getItem("viewedComments");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Initialiser les publications et commentaires signalés
  const [reportedPublications, setReportedPublications] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);

  // Mettre à jour localStorage chaque fois que viewedPublications ou viewedComments change
  useEffect(() => {
    localStorage.setItem("viewedPublications", JSON.stringify([...viewedPublications]));
  }, [viewedPublications]);

  useEffect(() => {
    localStorage.setItem("viewedComments", JSON.stringify([...viewedComments]));
  }, [viewedComments]);

  const addReportedPublication = (publication) => {
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

  const addReportedComment = (comment) => {
    if (viewedComments.has(comment._id)) {
      return;
    }

    setReportedComments((prev) => {
      if (prev.some(c => c._id === comment._id)) {
        return prev;
      }
      return [...prev, comment];
    });
  };

  const removeReportedPublication = (publicationId) => {
    setReportedPublications((prev) => prev.filter(pub => pub.id !== publicationId));
    setViewedPublications((prev) => new Set(prev).add(publicationId));
  };

  const removeReportedComment = (commentId) => {
    setReportedComments((prev) => prev.filter(c => c._id !== commentId));
    setViewedComments((prev) => new Set(prev).add(commentId));
  };

  return (
    <NotificationContext.Provider value={{
      reportedPublications,
      reportedComments,
      addReportedPublication,
      addReportedComment,
      removeReportedPublication,
      removeReportedComment
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);