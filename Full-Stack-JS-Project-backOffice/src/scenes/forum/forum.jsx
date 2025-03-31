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
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Forum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [forums, setForums] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedForum, setSelectedForum] = useState(null);
  const [comments, setComments] = useState([]);
  const [openReportModal, setOpenReportModal] = useState(false);
  const [reports, setReports] = useState([]);
  const [openCommentReportModal, setOpenCommentReportModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [commentReports, setCommentReports] = useState([]);
  const [stats, setStats] = useState({
    uniquePublishers: 0,
    totalComments: 0,
    totalReports: 0,
    bannedUsers: 0,
  });
  const [monthlyForumPosts, setMonthlyForumPosts] = useState({});
  const [topPublisher, setTopPublisher] = useState(null);
  const [topCommenter, setTopCommenter] = useState(null);
  const [mostBannedUser, setMostBannedUser] = useState(null);

  // Récupérer les forums
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

  // Récupérer les statistiques
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/forum/stats");
        const data = await response.json();
        setStats({
          uniquePublishers: data.uniquePublishers || 0,
          totalComments: data.totalComments || 0,
          totalReports: data.totalReports || 0,
          bannedUsers: data.bannedUsers || 0,
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des stats:", error);
      }
    };

    fetchStats();
  }, []);

  // Récupérer les données pour le rapport PDF
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const monthlyResponse = await fetch("http://localhost:5000/forum/monthlyStats");
        const monthlyData = await monthlyResponse.json();
        setMonthlyForumPosts(monthlyData);

        const publisherResponse = await fetch("http://localhost:5000/forum/topPublisher");
        const publisherData = await publisherResponse.json();
        setTopPublisher(publisherData);

        const commenterResponse = await fetch("http://localhost:5000/forumComment/topCommenter");
        const commenterData = await commenterResponse.json();
        setTopCommenter(commenterData);

        const bannedResponse = await fetch("http://localhost:5000/forum/mostBannedUser");
        const bannedData = await bannedResponse.json();
        setMostBannedUser(bannedData);
      } catch (error) {
        console.error("Erreur lors de la récupération des données du rapport:", error);
      }
    };

    fetchReportData();
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
        console.error("Erreur lors de la récupération des rapports:", data.message);
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
        console.error("Erreur lors de la récupération des signalements:", data.message);
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
  const generatePDF = () => {
    const doc = new jsPDF();
  
    console.log("generatePDF appelé");
  
    try {
      // Ajouter le logo
      const logo = `../../assets/logo.png`; // Ajuste si nécessaire
    const imgWidth = 40; // Largeur du logo en mm (ajuste selon tes besoins)
    const imgHeight = 10; // Hauteur du logo en mm (ajuste selon tes besoins)
    doc.addImage(logo, "PNG", 160, 13, imgWidth, imgHeight); // Position (x: 14, y: 10)

      doc.setFontSize(18);
      doc.text("Rapport Détaillé du Forum", 14, 20);
  
      doc.setFontSize(14);
      doc.text("Forums publiés par mois", 14, 30);
      const monthlyData = Object.entries(monthlyForumPosts).map(([month, count]) => [
        month,
        count,
      ]);
      console.log("monthlyData:", monthlyData);
      autoTable(doc, {
        startY: 35,
        head: [["Mois", "Nombre de publications"]],
        body: monthlyData,
      });
  
      let currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Nombre de commentaires par forum", 14, currentY);
      const commentData = forums.map((forum) => [
        forum.title,
        forum.commentCount || 0,
      ]);
      console.log("commentData:", commentData);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Forum", "Nombre de commentaires"]],
        body: commentData,
      });
  
      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Top Utilisateurs", 14, currentY);
      const topUsersData = [
        ["Top Publisher", topPublisher?.username || "N/A", topPublisher?.postCount || 0],
        ["Top Commenter", topCommenter?.username || "N/A", topCommenter?.commentCount || 0],
        ["Most Banned", mostBannedUser?.username || "N/A", mostBannedUser?.banCount || 0],
      ];
      console.log("topUsersData:", topUsersData);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Catégorie", "Utilisateur", "Nombre"]],
        body: topUsersData,
      });
  
      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Signalements par forum", 14, currentY);
      const reportData = forums.map((forum) => [
        forum.title,
        forum.reportCount || 0,
      ]);
      console.log("reportData:", reportData);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Forum", "Nombre de signalements"]],
        body: reportData,
      });
  
      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Signalements des commentaires", 14, currentY);
      const commentReportData = comments.map((comment) => [
        comment.content.substring(0, 30) + "...",
        comment.reportCount || 0,
      ]);
      console.log("commentReportData:", commentReportData);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Commentaire", "Nombre de signalements"]],
        body: commentReportData,
      });
  
      console.log("PDF prêt à être sauvegardé");
      doc.save(`rapport_forum_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur dans generatePDF:", error);
    }
  };

  const chartData = {
    labels: [
      "Unique Publishers",
      "Total Comments",
      "Total Reports",
      "Banned Users",
    ],
    datasets: [
      {
        label: "Forum Statistics",
        data: [
          stats.uniquePublishers,
          stats.totalComments,
          stats.totalReports,
          stats.bannedUsers,
        ],
        backgroundColor: [
          colors.greenAccent[500],
          colors.blueAccent[500],
          colors.redAccent[500],
          colors.grey[500],
        ],
        borderColor: [
          colors.greenAccent[700],
          colors.blueAccent[700],
          colors.redAccent[700],
          colors.grey[700],
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: colors.grey[100],
        },
      },
      title: {
        display: true,
        text: "Forum Statistics Overview",
        color: colors.grey[100],
        font: {
          size: 18,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.grey[100],
        },
        grid: {
          color: colors.grey[700],
        },
      },
      x: {
        ticks: {
          color: colors.grey[100],
        },
        grid: {
          color: colors.grey[700],
        },
      },
    },
  };

  return (
    <Box m="20px">
      <Header
        title="FORUM MANAGEMENT"
        subtitle="List of forum topics and their comments"
      />
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          color="warning"
          onClick={generatePDF}
        >
          Download report
        </Button>
      </Box>
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
                {forum.tags && forum.tags.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid #FF0000",
                      color: "#FF0000",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      boxShadow: "0 0 10px rgba(255, 0, 0, 0.5)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {forum.tags.join(", ")}
                  </span>
                )}
              </Box>
              <br />
              <Typography variant="h5">
                <strong>Posted By :</strong> {forum.user_id?.username || "Unknown"} {" "}
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

      <Box mt={4} p={2} bgcolor={colors.primary[400]} borderRadius={2} boxShadow={3}>
        <Typography variant="h4" mb={2}>
          Forum Statistics
        </Typography>
        <Box sx={{ maxWidth: "600px", margin: "0 auto" }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </Box>

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
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <Box key={index} mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    src={`http://localhost:5000${comment.user_id?.user_photo}`}
                    alt="User Avatar"
                    sx={{ width: 40, height: 40, objectFit: "cover" }}
                  />
                  <Box display="flex" flexDirection="row" alignItems="center">
                    <Typography variant="body1">
                      {comment.user_id?.username}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#00BFFF" }}>
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
                </Box>
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
                    {report.user_id?.username || "Unknown User (ID: " + report.user_id + ")"}
                    {report.user_id && report.user_id.level && report.user_id.speciality && (
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

      <Modal open={openCommentReportModal} onClose={handleCloseCommentReportModal}>
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
          {commentReports.length > 0 ? (
            comments.map((report, index) => (
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
                    {report.user_id?.username || "Unknown User (ID: " + report.user_id + ")"}
                    {report.user_id && report.user_id.level && report.user_id.speciality && (
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