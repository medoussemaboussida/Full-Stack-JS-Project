import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Avatar,
  Button,
  Modal,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import VisibilityIcon from "@mui/icons-material/Visibility";

const Forum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [forums, setForums] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedForum, setSelectedForum] = useState(null);
  const [comments, setComments] = useState([]);
  const [openReportModal, setOpenReportModal] = useState(false); // Nouvel état pour le modal des rapports
  const [reports, setReports] = useState([]); // Stocke les rapports
  const [openCommentReportModal, setOpenCommentReportModal] = useState(false); // Nouvel état pour le modal des signalements des commentaires
  const [selectedComment, setSelectedComment] = useState(null); // Commentaire sélectionné pour afficher ses signalements
  const [commentReports, setCommentReports] = useState([]); // Stocke les signalements des commentaires
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/forum/getForum");
        const data = await response.json();
        setForums(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, []);

  const handleViewComments = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`
      );
      const data = await response.json();
      setComments(data);
      setSelectedForum(forumId);
      setOpenModal(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des commentaires:", error);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedForum(null);
    setComments([]);
  };
  //affichage de reports de forum
  const handleViewReports = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forum/getForumReports/${forumId}`
      );
      const data = await response.json();
      if (response.ok) {
        setReports(data);
        setSelectedForum(forumId);
        setOpenReportModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des rapports:",
          data.message
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
    }
  };
  const handleViewCommentReports = async (commentId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getCommentReports/${commentId}`
      );
      const data = await response.json();
      if (response.ok) {
        setCommentReports(data);
        setSelectedComment(commentId);
        setOpenCommentReportModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des signalements:",
          data.message
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
    }
  };

  const handleCloseCommentReportModal = () => {
    setOpenCommentReportModal(false);
    setSelectedComment(null);
    setCommentReports([]);
  };
  const handleCloseReportModal = () => {
    setOpenReportModal(false);
    setSelectedForum(null);
    setReports([]);
  };
  return (
    <Box m="20px">
      <Header
        title="FORUM MANAGEMENT"
        subtitle="List of forum topics and their comments"
      />
      <Box mt={4}>
        {forums.map((forum, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            bgcolor={colors.primary[400]}
            p={2}
            borderRadius={2}
            mb={2}
            boxShadow={3}
          >
            {forum.forum_photo && (
              <img
                src={forum.forum_photo}
                alt="Forum"
                style={{
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  marginRight: 16,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            <Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4">
                  <strong>Forum topic : </strong> {forum.title}
                </Typography>
                {/* Badge pour les tags */}
                {forum.tags && forum.tags.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid #FF0000", // Cadre rouge
                      color: "#FF0000", // Texte rouge
                      padding: "2px 8px",
                      borderRadius: "20px",
                      boxShadow: "0 0 10px rgba(255, 0, 0, 0.5)", // Lueur rouge
                      fontSize: "0.875rem", // Petit texte
                    }}
                  >
                    {forum.tags.join(", ")}{" "}
                    {/* Affiche les tags séparés par une virgule */}
                  </span>
                )}
              </Box>
              <br />
              <Typography variant="h5">
                <strong>Posted By :</strong>{" "}
                {forum.user_id?.username || "Unknown"} &nbsp; &nbsp;
                <span
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #00BFFF", // Cadre bleu
                    color: "#00BFFF", // Texte bleu
                    padding: "2px 8px",
                    borderRadius: "20px",
                    boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                    fontSize: "0.875rem", // Petit texte
                  }}
                >
                  {forum.user_id?.level} {forum.user_id?.speciality}
                </span>
              </Typography>
              <br />
              <Box
                mt={1}
                p={1}
                bgcolor={colors.blueAccent[700]}
                borderRadius={1}
                sx={{ maxHeight: 100, overflowY: "auto" }}
              >
                <Typography variant="h6">
                  <strong>Description : </strong> {forum.description}
                </Typography>
              </Box>
              <br />
              <Button
                variant="contained"
                color="info"
                size="medium"
                startIcon={<VisibilityIcon />}
                onClick={() => handleViewComments(forum._id)}
              >
                View comments
              </Button>{" "}
              &nbsp;
              <Button
                variant="contained"
                color="warning"
                size="medium"
                startIcon={<VisibilityIcon />}
                onClick={() => handleViewReports(forum._id)}
              >
                View Reports
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Modal des commentaires */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "60%",
            maxHeight: "80%",
            overflowY: comments.length > 3 ? "auto" : "visible",
          }}
        >
          <Typography variant="h5" mb={2}>
            Comments for Forum Topic:{" "}
            {forums.find((forum) => forum._id === selectedForum)?.title}
          </Typography>

          {/* Affichage des commentaires dans un modal */}
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <Box key={index} mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    src={`http://localhost:5000/uploads/${comment.user_id?.user_photo}`}
                    alt="User Avatar"
                    sx={{
                      width: 40,
                      height: 40,
                      objectFit: "cover",
                    }}
                  />
                  <Box display="flex" flexDirection="row" alignItems="center">
                    <Typography variant="body1">
                      {comment.user_id?.username}
                    </Typography>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Typography variant="body2" sx={{ color: "#00BFFF" }}>
                      <span
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid #00BFFF", // Cadre bleu
                          color: "#00BFFF", // Texte bleu
                          padding: "2px 8px",
                          borderRadius: "20px",
                          boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                          fontSize: "0.875rem", // Petit texte
                        }}
                      >
                        {comment.user_id?.level} {comment.user_id?.speciality}
                      </span>
                    </Typography>
                  </Box>
                </Box>
                <br />
                <Box
                  display="flex"
                  alignItems="center"
                  bgcolor={colors.primary[400]}
                  p={2}
                  borderRadius={2}
                  mb={2}
                  boxShadow={3}
                  sx={{ maxHeight: 100, overflowY: "auto" }}
                >
                  <Typography variant="h6">{comment.content}</Typography>
                </Box>{" "}
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewCommentReports(comment._id)}
                  >
                    View Reports
                  </Button>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2">No comments available.</Typography>
          )}

          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
      {/* Modal des rapports */}
      <Modal open={openReportModal} onClose={handleCloseReportModal}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "60%",
            maxHeight: "80%",
            overflowY: comments.length > 3 ? "auto" : "visible",
          }}
        >
          <Typography variant="h5" mb={2}>
            Reports for Forum Topic:{" "}
            {forums.find((forum) => forum._id === selectedForum)?.title}
          </Typography>

          {/* Affichage des rapports */}
          {reports.length > 0 ? (
            reports.map((report, index) => (
              <Box
                key={index}
                mb={2}
                p={2}
                bgcolor={colors.primary[400]}
                borderRadius={2}
                boxShadow={3}
              >
                <Typography variant="h6">
                  <strong>Reported By :</strong>{" "}
                  <Box display="flex" alignItems="center" gap={1}>
                    {report.user_id?.username ||
                      "Unknown User (ID: " + report.user_id + ")"}
                    {report.user_id &&
                      report.user_id.level &&
                      report.user_id.speciality && (
                        <span
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #00BFFF",
                            color: "#00BFFF",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {report.user_id.level} {report.user_id.speciality}
                        </span>
                      )}
                  </Box>
                </Typography>
                <Typography variant="body1">
                  <strong>Reason :</strong> {report.reason}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Reported at:{" "}
                  {new Date(report.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2">No reports available.</Typography>
          )}

          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseReportModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
      {/* Modal des signalements des commentaires */}
      <Modal
        open={openCommentReportModal}
        onClose={handleCloseCommentReportModal}
      >
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "60%",
            maxHeight: "80%",
            overflowY: comments.length > 3 ? "auto" : "visible",
          }}
        >
          <Typography variant="h5" mb={2}>
            Reports for Comment
          </Typography>

          {/* Affichage des signalements */}
          {commentReports.length > 0 ? (
            commentReports.map((report, index) => (
              <Box
                key={index}
                mb={2}
                p={2}
                bgcolor={colors.primary[400]}
                borderRadius={2}
                boxShadow={3}
              >
                <Typography variant="h6">
                  <strong>Posted By :</strong>{" "}
                  <Box display="flex" alignItems="center" gap={1}>
                    {report.user_id?.username ||
                      "Unknown User (ID: " + report.user_id + ")"}
                    {report.user_id &&
                      report.user_id.level &&
                      report.user_id.speciality && (
                        <span
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #00BFFF",
                            color: "#00BFFF",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {report.user_id.level} {report.user_id.speciality}
                        </span>
                      )}
                  </Box>
                </Typography>
                <Typography variant="body1">
                  <strong>Reason :</strong> {report.reason}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Reported at:{" "}
                  {new Date(report.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2">No reports available.</Typography>
          )}

          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseCommentReportModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Forum;
