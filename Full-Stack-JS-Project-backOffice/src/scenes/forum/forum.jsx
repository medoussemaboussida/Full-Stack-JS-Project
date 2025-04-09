import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Avatar,
  Button,
  Modal,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
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
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Fonction pour générer l'URL du QR code avec les informations de ban
const generateQRCodeUrl = (user) => {
  const qrData = `Username: ${user.user_id.username}\nLevel and Speciality: ${user.user_id.level || 'N/A'} ${user.user_id.speciality || 'N/A'}\nReason of ban: ${user.reason}\nBan expires: ${new Date(user.expiresAt).toLocaleString("fr-FR")}`;
  const encodedData = encodeURIComponent(qrData);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=120x120`;
};

const Forum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [forums, setForums] = useState([]);
  const [filteredForums, setFilteredForums] = useState([]);
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
  const [totalCommentReports, setTotalCommentReports] = useState(0);
  const [monthlyForumPosts, setMonthlyForumPosts] = useState({});
  const [topPublisher, setTopPublisher] = useState(null);
  const [topCommenter, setTopCommenter] = useState(null);
  const [mostBannedUser, setMostBannedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [forumToDelete, setForumToDelete] = useState(null);
  const [openDeleteCommentModal, setOpenDeleteCommentModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [openBannedListModal, setOpenBannedListModal] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [token, setToken] = useState(null);
  const [openStatsModal, setOpenStatsModal] = useState(false);

  // Récupérer le token et les données initiales
  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      setToken(token);
    } else {
      toast.error("No token found. Please log in as an admin.");
    }

    const fetchData = async () => {
      try {
        const forumsResponse = await fetch("http://localhost:5000/forum/getForum", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const forumsData = await forumsResponse.json();
        setForums(forumsData);
        setFilteredForums(forumsData);

        const statsResponse = await fetch("http://localhost:5000/forum/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const statsData = await statsResponse.json();
        setStats({
          uniquePublishers: statsData.uniquePublishers || 0,
          totalComments: statsData.totalComments || 0,
          totalReports: statsData.totalReports || 0,
          bannedUsers: statsData.bannedUsers || 0,
        });


        const monthlyResponse = await fetch("http://localhost:5000/forum/monthlyStats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const monthlyData = await monthlyResponse.json();
        setMonthlyForumPosts(monthlyData);

        const publisherResponse = await fetch("http://localhost:5000/forum/topPublisher", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const publisherData = await publisherResponse.json();
        setTopPublisher(publisherData);

        const commenterResponse = await fetch("http://localhost:5000/forumComment/topCommenter", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const commenterData = await commenterResponse.json();
        setTopCommenter(commenterData);

        const bannedResponse = await fetch("http://localhost:5000/forum/mostBannedUser", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const bannedData = await bannedResponse.json();
        setMostBannedUser(bannedData);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    if (token) {
      fetchData();
    }
  }, []);

  useEffect(() => {
    let updatedForums = [...forums];

    if (searchQuery) {
      updatedForums = updatedForums.filter((forum) => {
        const title = forum.title?.toLowerCase() || "";
        const description = forum.description?.toLowerCase() || "";
        const username = forum.user_id?.username?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return (
          title.includes(query) ||
          description.includes(query) ||
          username.includes(query)
        );
      });
    }

    updatedForums.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredForums(updatedForums);
  }, [searchQuery, sortOption, forums]);

  const fetchBannedUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/forum/banned-users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setBannedUsers(data.bannedUsers);
        setOpenBannedListModal(true);
      } else {
        toast.error("Failed to fetch banned users!");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs bannis:", error);
      toast.error("Error fetching banned users!");
    }
  };

  const handleDeleteForum = async (forumId) => {
    try {
      const response = await fetch(`http://localhost:5000/forum/deleteForum/${forumId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setForums(forums.filter((forum) => forum._id !== forumId));
        setFilteredForums(filteredForums.filter((forum) => forum._id !== forumId));
        setOpenDeleteModal(false);
        toast.success("Forum deleted successfully!");
      } else {
        toast.error(data.message || "Failed to delete forum");
      }
    } catch (error) {
      console.error("Error deleting forum:", error);
      toast.error("Error deleting forum");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/deleteComment/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setComments(comments.filter((comment) => comment._id !== commentId));
        setOpenDeleteCommentModal(false);
        toast.success("Comment deleted successfully!");
      } else {
        toast.error(data.message || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Error deleting comment");
    }
  };

  const handleChangeStatus = async (forumId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/forum/changeStatus/${forumId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (response.ok) {
        setForums(
          forums.map((forum) =>
            forum._id === forumId ? { ...forum, status: newStatus } : forum
          )
        );
        setFilteredForums(
          filteredForums.map((forum) =>
            forum._id === forumId ? { ...forum, status: newStatus } : forum
          )
        );
        toast.success(`Forum status changed to ${newStatus}!`);
      } else {
        toast.error(data.message || "Failed to change forum status");
      }
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Error changing forum status");
    }
  };

  const handleViewComments = async (forumId) => {
    try {
      // Récupérer les commentaires
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const commentsData = await response.json();

      // Pour chaque commentaire, récupérer le nombre de signalements
      const commentsWithReportCount = await Promise.all(
        commentsData.map(async (comment) => {
          try {
            const reportResponse = await fetch(
              `http://localhost:5000/forumComment/getCommentReports/${comment._id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const reportsData = await reportResponse.json();
            const reportCount = Array.isArray(reportsData) ? reportsData.length : 0;
            return { ...comment, reportCount };
          } catch (error) {
            console.error(`Erreur lors de la récupération des signalements pour le commentaire ${comment._id}:`, error);
            return { ...comment, reportCount: 0 }; // En cas d'erreur, on met 0
          }
        })
      );

      setComments(commentsWithReportCount);
      setSelectedForum(forumId);
      setOpenModal(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des commentaires:", error);
      toast.error("Error loading comments!");
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
        `http://localhost:5000/forum/getForumReports/${forumId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setReports(data);
        setSelectedForum(forumId);
        setOpenReportModal(true);
      } else {
        toast.error("Failed to fetch reports: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Error fetching reports!");
    }
  };

  const handleViewCommentReports = async (commentId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getCommentReports/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setCommentReports(data);
        setSelectedComment(commentId);
        setOpenCommentReportModal(true);
      } else {
        toast.error("Failed to fetch comment reports: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Error fetching comment reports!");
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

    try {
      const logo = `../../assets/logo.png`;
      const imgWidth = 40;
      const imgHeight = 10;
      doc.addImage(logo, "PNG", 160, 13, imgWidth, imgHeight);

      doc.setFontSize(18);
      doc.text("Rapport Détaillé du Forum", 14, 20);

      doc.setFontSize(14);
      doc.text("Forums publiés par mois", 14, 30);
      const monthlyData = Object.entries(monthlyForumPosts).map(([month, count]) => [
        month,
        count,
      ]);
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
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Commentaire", "Nombre de signalements"]],
        body: commentReportData,
      });

      doc.save(`rapport_forum_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur dans generatePDF:", error);
      toast.error("Error generating PDF!");
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Header
        title="FORUM MANAGEMENT"
        subtitle="List of forum topics and their comments"
      />
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Search by title, description, or username"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            label="Sort By"
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ position: "relative" }}>
          <Button
            variant="contained"
            color="warning"
            onClick={fetchBannedUsers}
          >
            View Banned Users
          </Button>
          {stats.bannedUsers > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                backgroundColor: "red",
                color: "white",
                borderRadius: "50%",
                padding: "5px 8px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {stats.bannedUsers}
            </Box>
          )}
        </Box>
        <Button
          variant="contained"
          color="info"
          onClick={() => setOpenStatsModal(true)}
        >
          View Statistics
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={generatePDF}
        >
          Download Report
        </Button>
      </Box>
      <Box mt={4}>
        {filteredForums.map((forum, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            bgcolor={colors.primary[400]}
            p={2}
            borderRadius={2}
            mb={2}
            boxShadow={3}
            sx={{ opacity: forum.status === "inactif" ? 0.5 : 1 }}
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
            <Box flex={1}>
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
              <Typography variant="body2">
                <strong>Status: </strong>
                <span style={{ color: forum.status === "actif" ? "green" : "red" }}>
                  {forum.status}
                </span>
              </Typography>
              <br />
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="info"
                  size="medium"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewComments(forum._id)}
                >
                  View Comments
                </Button>
                <Box sx={{ position: "relative" }}>
                  <Button
                    variant="contained"
                    color="warning"
                    size="medium"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewReports(forum._id)}
                  >
                    View Reports
                  </Button>
                  {forum.reportCount > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "-10px",
                        right: "-10px",
                        backgroundColor: "red",
                        color: "white",
                        borderRadius: "50%",
                        padding: "5px 8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {forum.reportCount}
                    </Box>
                  )}
                </Box>
                <Button
                  variant="contained"
                  color={forum.status === "actif" ? "error" : "success"}
                  size="medium"
                  onClick={() =>
                    handleChangeStatus(forum._id, forum.status === "actif" ? "inactif" : "actif")
                  }
                >
                  {forum.status === "actif" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="medium"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setForumToDelete(forum._id);
                    setOpenDeleteModal(true);
                  }}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Modal pour les commentaires */}
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
                    View Reports ({comment.reportCount})
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setCommentToDelete(comment._id);
                      setOpenDeleteCommentModal(true);
                    }}
                  >
                    Delete
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

      {/* Modal pour confirmer la suppression d'un forum */}
      <Modal open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "40%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Confirm Deletion
          </Typography>
          <Typography variant="body1" mb={2} color="white">
            Are you sure you want to delete this forum topic? This action cannot be undone.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDeleteForum(forumToDelete)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Modal pour confirmer la suppression d'un commentaire */}
      <Modal open={openDeleteCommentModal} onClose={() => setOpenDeleteCommentModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "40%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Confirm Deletion
          </Typography>
          <Typography variant="body1" mb={2} color="white">
            Are you sure you want to delete this comment? This action cannot be undone.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenDeleteCommentModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDeleteComment(commentToDelete)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Modal pour les signalements d'un forum */}
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
            overflowY: reports.length > 3 ? "auto" : "visible",
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

      {/* Modal pour les signalements d'un commentaire */}
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
            overflowY: commentReports.length > 3 ? "auto" : "visible",
          }}
        >
          <Typography variant="h5" mb={2}>
            Reports for Comment
          </Typography>
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
              onClick={handleCloseCommentReportModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Modal pour la liste des utilisateurs bannis */}
      <Modal open={openBannedListModal} onClose={() => setOpenBannedListModal(false)}>
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
            overflowY: bannedUsers.length > 3 ? "auto" : "visible",
          }}
        >
          <Typography variant="h5" mb={2}>
            Banned Users List
          </Typography>
          {bannedUsers.length > 0 ? (
            bannedUsers.map((user, index) => (
              <Box
                key={index}
                mb={2}
                p={2}
                bgcolor={colors.primary[400]}
                borderRadius={2}
                boxShadow={3}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h6">
                    <strong>Username:</strong> {user.user_id?.username}
                  </Typography>
                </Box>
                <img
                  src={generateQRCodeUrl(user)}
                  alt="QR Code for ban info"
                  style={{
                    width: "90px",
                    height: "90px",
                  }}
                />
              </Box>
            ))
          ) : (
            <Typography variant="body2">No banned users found.</Typography>
          )}
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenBannedListModal(false)}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Modal pour les statistiques */}
      <Modal open={openStatsModal} onClose={() => setOpenStatsModal(false)}>
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
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Forum Statistics
          </Typography>
          <Box sx={{ maxWidth: "600px", margin: "0 auto" }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenStatsModal(false)}
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