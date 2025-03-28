import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Alert, IconButton, InputBase,
  Divider, Chip, Avatar, Badge, Tooltip, List, ListItem, ListItemText
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CommentIcon from "@mui/icons-material/Comment";
import ReportIcon from "@mui/icons-material/Report";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import Header from "../../components/Header";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Snackbar from '@mui/material/Snackbar';
import html2pdf from "html2pdf.js";
import { useNotification } from "../publication/NotificationContext";

// Fonction pour supprimer les balises HTML
const stripHtmlTags = (str) => {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
};

const Publication = () => {
  const { reportedPublications, reportedComments, addReportedPublication, addReportedComment, removeReportedPublication, removeReportedComment } = useNotification();
  const [publications, setPublications] = useState([]);
  const [filteredPublications, setFilteredPublications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ titrePublication: "", description: "", status: "", tag: "" });
  const [error, setError] = useState("");
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openCommentsModal, setOpenCommentsModal] = useState(false);
  const [openReportsModal, setOpenReportsModal] = useState(false);
  const [openNotificationsModal, setOpenNotificationsModal] = useState(false);
  const [openCommentReportsModal, setOpenCommentReportsModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false); // État pour la confirmation de suppression
  const [commentToDelete, setCommentToDelete] = useState(null); // Stocker le commentaire à supprimer
  const [selectedComment, setSelectedComment] = useState(null);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [commentReports, setCommentReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [authors, setAuthors] = useState([]);
  const [reportedPublicationsLocal, setReportedPublicationsLocal] = useState(new Set());
  const [reportedCommentsLocal, setReportedCommentsLocal] = useState(new Set());
  const [currentPublicationId, setCurrentPublicationId] = useState(null);
  const [userRole, setUserRole] = useState(null); // Ajout de l'état pour le rôle
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const token = localStorage.getItem("jwt-token");

  // Charger le rôle de l'utilisateur au montage du composant
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("http://localhost:5000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user role");
        const data = await res.json();
        setUserRole(data.role);
      } catch (err) {
        console.error("❌ Error fetching user role:", err);
        setNotification({ open: true, message: "Failed to load user role", severity: "error" });
      }
    };

    if (token) {
      fetchUserRole();
    }
  }, []);

  // Charger les publications
  const fetchPublications = async (query = "") => {
    let url = query
      ? `http://localhost:5000/users/searchPublications?searchTerm=${query}`
      : "http://localhost:5000/users/allPublication";

    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch publications");
      const data = await res.json();

      console.log("📋 Données brutes des publications:", data);

      if (Array.isArray(data)) {
        const pubs = await Promise.all(
          data.map(async (pub) => {
            if (pub.reports && Array.isArray(pub.reports)) {
              console.log(`✅ Publication ${pub._id} a ${pub.reports.length} signalements`);
              const newPub = {
                id: pub._id,
                ...pub,
                reportCount: pub.reports.length,
              };
              if (newPub.reportCount > 0) {
                addReportedPublication(newPub);
              }
              return newPub;
            } else {
              console.log(`⚠️ Publication ${pub._id} n'a pas de champ reports, récupération séparée...`);
              try {
                const reportRes = await fetch(`http://localhost:5000/users/publication/reports/${pub._id}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!reportRes.ok) throw new Error(`Failed to fetch reports for publication ${pub._id}`);
                const reportData = await reportRes.json();
                console.log(`📊 Signalements pour ${pub._id}:`, reportData);

                const reportCount = Array.isArray(reportData) ? reportData.length : 0;
                const newPub = {
                  id: pub._id,
                  ...pub,
                  reportCount,
                };

                if (reportCount > 0) {
                  addReportedPublication(newPub);
                }

                return newPub;
              } catch (err) {
                console.error(`❌ Erreur lors de la récupération des signalements pour ${pub._id}:`, err);
                return {
                  id: pub._id,
                  ...pub,
                  reportCount: 0,
                };
              }
            }
          })
        );

        console.log("📋 Publications avec reportCount:", pubs);

        pubs.forEach((pub) => {
          if (pub.reportCount >= 2 && !reportedPublicationsLocal.has(pub.id)) {
            setNotification({
              open: true,
              message: `⚠️ Publication "${stripHtmlTags(pub.titrePublication)}" a atteint ${pub.reportCount} signalements !`,
              severity: "warning",
            });
            setReportedPublicationsLocal((prev) => new Set(prev).add(pub.id));
          }
        });

        setPublications(pubs);
        const uniqueAuthors = [...new Set(pubs.map(pub => pub.author_id?.username).filter(Boolean))];
        setAuthors(uniqueAuthors);
      } else {
        setPublications([]);
        setAuthors([]);
      }
    } catch (err) {
      console.error("❌ Error fetching publications:", err);
      setNotification({ open: true, message: "Failed to load publications", severity: "error" });
    }
  };

  // Charger les commentaires avec leurs signalements
  const fetchComments = async (publicationId) => {
    try {
      const res = await fetch(`http://localhost:5000/users/commentaires/${publicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();

      const commentsWithReports = await Promise.all(
        data.map(async (comment) => {
          try {
            const reportRes = await fetch(`http://localhost:5000/users/comment/reports/${comment._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!reportRes.ok) throw new Error(`Failed to fetch reports for comment ${comment._id}`);
            const reportData = await reportRes.json();
            const reportCount = Array.isArray(reportData) ? reportData.length : 0;

            const newComment = {
              ...comment,
              reportCount,
            };

            if (reportCount >= 2 && !reportedCommentsLocal.has(comment._id)) {
              setNotification({
                open: true,
                message: `⚠️ Commentaire de "${comment.auteur_id?.username || "Unknown"}" a atteint ${reportCount} signalements !`,
                severity: "warning",
              });
              setReportedCommentsLocal((prev) => new Set(prev).add(comment._id));
            }

            if (reportCount > 0) {
              addReportedComment(newComment);
            }

            return newComment;
          } catch (err) {
            console.error(`❌ Erreur lors de la récupération des signalements pour le commentaire ${comment._id}:`, err);
            return { ...comment, reportCount: 0 };
          }
        })
      );

      setComments(commentsWithReports);
    } catch (err) {
      console.error("❌ Error retrieving comments:", err);
      setNotification({ open: true, message: "Failed to load comments!", severity: "error" });
    }
  };

  // Ouvrir la boîte de dialogue de confirmation avant suppression
  const handleOpenDeleteConfirm = (commentId) => {
    setCommentToDelete(commentId);
    setOpenDeleteConfirmModal(true);
  };

  // Fermer la boîte de dialogue de confirmation
  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirmModal(false);
    setCommentToDelete(null);
  };

  // Supprimer un commentaire
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/users/deleteCommentAdmin/${commentToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete comment");
      }

      // Recharger les commentaires après la suppression
      if (currentPublicationId) {
        await fetchComments(currentPublicationId);
      }

      // Supprimer le commentaire des notifications si nécessaire
      removeReportedComment(commentToDelete);

      setNotification({
        open: true,
        message: "Commentaire supprimé avec succès !",
        severity: "success",
      });

      // Fermer la boîte de dialogue de confirmation
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error("❌ Error deleting comment:", err);
      setNotification({
        open: true,
        message: err.message || "Failed to delete comment!",
        severity: "error",
      });
    }
  };

  // Filtrer les publications côté client
  const filterPublications = (pubs, status, author) => {
    let filtered = [...pubs];
    if (status !== "all") {
      filtered = filtered.filter(pub => pub.status === status);
    }
    if (author !== "all") {
      filtered = filtered.filter(pub => pub.author_id?.username === author);
    }
    return filtered;
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPublications(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const filtered = filterPublications(publications, statusFilter, authorFilter);
    setFilteredPublications(filtered);
  }, [publications, statusFilter, authorFilter]);

  const handleOpen = (pub = null) => {
    setFormData(pub ? { ...pub, tag: pub.tag?.join(",") || "" } : { titrePublication: "", description: "", status: "", tag: "" });
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.titrePublication || !formData.description || !formData.status) {
      setNotification({ open: true, message: "All fields must be filled!", severity: "error" });
      return;
    }

    const method = formData.id ? "PATCH" : "POST";
    const url = formData.id
      ? `http://localhost:5000/users/publication/update/${formData.id}`
      : "http://localhost:5000/users/publication";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...formData, tag: formData.tag ? formData.tag.split(",").map(t => t.trim()) : [] }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save publication");
        return res.json();
      })
      .then((data) => {
        fetchPublications();
        handleClose();
        setNotification({ open: true, message: "Publication saved successfully!", severity: "success" });
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setNotification({ open: true, message: "Failed to save publication!", severity: "error" });
      });
  };

  const handleViewProfile = (id) => {
    fetch(`http://localhost:5000/users/publication/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch publication details");
        return res.json();
      })
      .then((data) => {
        setSelectedPublication(data);
        setOpenProfileModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving publication:", err);
        setNotification({ open: true, message: "Failed to load publication details", severity: "error" });
      });
  };

  const handleStatusChange = (publicationId, newStatus) => {
    fetch(`http://localhost:5000/users/publication/${publicationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update status");
        return res.json();
      })
      .then((data) => {
        setPublications((prev) =>
          prev.map((pub) => (pub.id === publicationId ? { ...pub, status: newStatus } : pub))
        );
        setNotification({ open: true, message: "Status updated successfully!", severity: "success" });
      })
      .catch((err) => {
        console.error("❌ Error updating status:", err);
        setNotification({ open: true, message: "Failed to update status!", severity: "error" });
      });
  };

  const handleViewComments = (id) => {
    setCurrentPublicationId(id);
    fetchComments(id);
    setOpenCommentsModal(true);
  };

  const handleViewReports = (id) => {
    fetch(`http://localhost:5000/users/publication/reports/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
      })
      .then((data) => {
        setReports(data);
        setOpenReportsModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving reports:", err);
        setNotification({ open: true, message: "Failed to load reports!", severity: "error" });
      });
  };

  const handleViewCommentReports = (comment) => {
    fetch(`http://localhost:5000/users/comment/reports/${comment._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch comment reports");
        return res.json();
      })
      .then((data) => {
        setCommentReports(data);
        setSelectedComment(comment);
        setOpenCommentReportsModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving comment reports:", err);
        setNotification({ open: true, message: "Failed to load comment reports!", severity: "error" });
      });
  };

  const handleOpenNotifications = () => {
    setOpenNotificationsModal(true);
  };

  const handleCloseNotifications = () => {
    setOpenNotificationsModal(false);
  };

  const handleViewReportedPublication = (publication) => {
    removeReportedPublication(publication.id);
    handleCloseNotifications();
    handleViewProfile(publication.id);
  };

  const handleViewReportedComment = (comment) => {
    removeReportedComment(comment._id);
    handleCloseNotifications();
    handleViewCommentReports(comment);
  };

  const generatePDF = () => {
    const sortedPublications = [...publications].sort((a, b) => new Date(a.datePublication) - new Date(b.datePublication));
    const publicationsByMonth = sortedPublications.reduce((acc, pub) => {
      const date = new Date(pub.datePublication);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(pub);
      return acc;
    }, {});

    let htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; }
        h2 { color: #555; margin-top: 20px; }
        .publication { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .title { font-weight: bold; font-size: 16px; color: #2c3e50; }
        .description { font-size: 14px; color: #666; }
        .meta { font-size: 12px; color: #888; }
      </style>
      <h1>All Publications</h1>
    `;

    Object.keys(publicationsByMonth).forEach((month) => {
      htmlContent += `<h2>${month}</h2>`;
      publicationsByMonth[month].forEach((pub) => {
        htmlContent += `
          <div class="publication">
            <div class="title">${stripHtmlTags(pub.titrePublication)}</div>
            <div class="description">${stripHtmlTags(pub.description)}</div>
            <div class="meta">
              Author: ${pub.author_id?.username || "Unknown"} | 
              Date: ${new Date(pub.datePublication).toLocaleDateString()} | 
              Status: ${pub.status}
            </div>
          </div>
        `;
      });
    });

    const element = document.createElement("div");
    element.innerHTML = htmlContent;
    html2pdf()
      .from(element)
      .set({
        margin: 1,
        filename: "Publications_by_Month.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      })
      .save()
      .catch((err) => {
        console.error("Error generating PDF:", err);
        setNotification({ open: true, message: "Failed to generate PDF!", severity: "error" });
      });
  };

  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "titrePublication", headerName: "Title", flex: 1, renderCell: (params) => stripHtmlTags(params.value) },
    { field: "description", headerName: "Description", flex: 1.5, renderCell: (params) => stripHtmlTags(params.value) },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Select
          value={params.value}
          onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
          sx={{
            width: "100%",
            height: "40px",
            "& .MuiSelect-select": {
              padding: "8px",
              backgroundColor: params.value === "published" ? colors.greenAccent[500] : colors.redAccent[500],
              color: "#fff",
              borderRadius: "4px",
            },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
        >
          <MenuItem value="published" sx={{ backgroundColor: colors.greenAccent[500], color: "#fff" }}>
            Published
          </MenuItem>
          <MenuItem value="archived" sx={{ backgroundColor: colors.redAccent[500], color: "#fff" }}>
            Archived
          </MenuItem>
        </Select>
      ),
    },
    {
      field: "datePublication",
      headerName: "Publication Date",
      flex: 1,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: "author_id",
      headerName: "Author",
      flex: 1,
      renderCell: (params) => params.row.author_id?.username || "Unknown",
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.5,
      renderCell: (params) => (
        <Box
          display="flex"
          gap={0.5}
          flexWrap="wrap"
          sx={{ alignItems: "center" }}
        >
          <Button
            variant="contained"
            color="info"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewProfile(params.row.id)}
            sx={{
              padding: "4px 8px",
              fontSize: "0.75rem",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            View
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CommentIcon />}
            onClick={() => handleViewComments(params.row.id)}
            sx={{
              backgroundColor: "#fab200",
              color: "#fff",
              "&:hover": {
                backgroundColor: "#ff7000",
              },
              padding: "4px 8px",
              fontSize: "0.75rem",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            Comment
          </Button>
          <Tooltip title={`Voir les signalements (${params.row.reportCount || 0})`}>
            <Badge
              badgeContent={params.row.reportCount || 0}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: params.row.reportCount > 0 ? "#ff1744" : "#bdbdbd",
                  color: "#fff",
                  fontSize: "0.7rem",
                  height: "18px",
                  minWidth: "18px",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  transform: "scale(1)",
                  transition: "transform 0.3s ease",
                  animation: params.row.reportCount > 0 ? "pulse 1.5s infinite" : "none",
                  "&:hover": {
                    transform: "scale(1.1)",
                  },
                },
              }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<ReportIcon />}
                onClick={() => handleViewReports(params.row.id)}
                sx={{
                  backgroundColor: params.row.reportCount > 0 ? colors.redAccent[500] : colors.grey[500],
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: params.row.reportCount > 0 ? colors.redAccent[700] : colors.grey[700],
                  },
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  },
                }}
              >
                Reports
              </Button>
            </Badge>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
        <Header title="Publications" subtitle="Publications published by psychiatrists" />
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={notification.open}
          autoHideDuration={10000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert
            onClose={() => setNotification({ ...notification, open: false })}
            severity={notification.severity}
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" backgroundColor={colors.primary[400]} borderRadius="3px" p={1} width="100%" maxWidth="500px">
          <InputBase
            sx={{ ml: 2, flex: 1, color: colors.grey[100] }}
            placeholder="Search for a Publication"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton type="button" sx={{ p: 1, color: colors.grey[100] }}>
            <SearchIcon />
          </IconButton>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: colors.grey[100], "&.Mui-focused": { color: colors.greenAccent[500] } }}>
            Filter by Status
          </InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              backgroundColor: colors.primary[400],
              color: colors.grey[100],
              borderRadius: "8px",
              height: "48px",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.grey[700],
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.greenAccent[500],
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.greenAccent[500],
                boxShadow: `0 0 8px ${colors.greenAccent[500]}`,
              },
              "& .MuiSvgIcon-root": {
                color: colors.grey[100],
              },
              "& .MuiSelect-select": {
                padding: "12px",
              },
            }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: colors.grey[100], "&.Mui-focused": { color: colors.greenAccent[500] } }}>
            Filter by Author
          </InputLabel>
          <Select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            sx={{
              backgroundColor: colors.primary[400],
              color: colors.grey[100],
              borderRadius: "8px",
              height: "48px",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.grey[700],
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.greenAccent[500],
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.greenAccent[500],
                boxShadow: `0 0 8px ${colors.greenAccent[500]}`,
              },
              "& .MuiSvgIcon-root": {
                color: colors.grey[100],
              },
              "& .MuiSelect-select": {
                padding: "12px",
              },
            }}
          >
            <MenuItem value="all">All Authors</MenuItem>
            {authors.map((author) => (
              <MenuItem key={author} value={author}>
                {author}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={handleOpenNotifications}>
          <Badge
            badgeContent={reportedPublications.length + reportedComments.length}
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: (reportedPublications.length + reportedComments.length) > 0 ? "#ff1744" : "#bdbdbd",
                color: "#fff",
                fontSize: "0.7rem",
                height: "18px",
                minWidth: "18px",
                borderRadius: "50%",
                border: "2px solid #fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              },
            }}
          >
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={generatePDF}
          sx={{
            backgroundColor: colors.blueAccent[700],
            color: "#fff",
            "&:hover": {
              backgroundColor: colors.blueAccent[800],
            },
            height: "48px",
            padding: "0 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            },
          }}
        >
          Generate PDF
        </Button>
      </Box>

      <Box sx={{ height: 500, width: "100%", minWidth: "1200px" }}>
        <DataGrid checkboxSelection rows={filteredPublications} columns={columns} />
      </Box>

      {/* Modal pour les Détails */}
      <Dialog
        open={openProfileModal}
        onClose={() => setOpenProfileModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.8rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.blueAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Publication Details
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
          }}
        >
          {selectedPublication ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                alignItems: "center",
                textAlign: "center",
                animation: "fadeIn 0.5s ease-in",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: colors.greenAccent[400],
                  marginBottom: "10px",
                  wordWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                {stripHtmlTags(selectedPublication.titrePublication)}
              </Typography>
              {selectedPublication.imagePublication && (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <img
                    src={`http://localhost:5000${selectedPublication.imagePublication}`}
                    alt="Publication"
                    style={{ width: "100%", height: "auto", objectFit: "cover" }}
                  />
                </Box>
              )}
              <Typography
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: "1.6",
                  color: colors.grey[200],
                  backgroundColor: colors.primary[600],
                  padding: "12px 16px",
                  borderRadius: "8px",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
                  maxWidth: "100%",
                  wordWrap: "break-word",
                }}
              >
                {stripHtmlTags(selectedPublication.description)}
              </Typography>
              <Chip
                label={`Status: ${selectedPublication.status}`}
                sx={{
                  fontSize: "1rem",
                  padding: "6px 12px",
                  backgroundColor:
                    selectedPublication.status === "published" ? colors.greenAccent[500] :
                    selectedPublication.status === "draft" ? colors.yellowAccent[500] :
                    selectedPublication.status === "archived" ? colors.redAccent[500] :
                    colors.blueAccent[500],
                  color: "#fff",
                  fontWeight: "500",
                  borderRadius: "16px",
                }}
              />
              <Box sx={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
                <Typography sx={{ fontSize: "1rem", color: colors.grey[300] }}>
                  <strong>Author:</strong> {selectedPublication.author_id?.username || "Unknown"}
                </Typography>
                <Typography sx={{ fontSize: "1rem", color: colors.grey[300] }}>
                  <strong>Date:</strong> {new Date(selectedPublication.datePublication).toLocaleString()}
                </Typography>
              </Box>
              {selectedPublication.tag && selectedPublication.tag.length > 0 && (
                <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                  {selectedPublication.tag.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      sx={{
                        backgroundColor: colors.blueAccent[600],
                        color: "#fff",
                        fontSize: "0.9rem",
                        padding: "4px 8px",
                        borderRadius: "12px",
                      }}
                    />
                  ))}
                </Box>
              )}
              <Box sx={{ display: "flex", gap: "20px", justifyContent: "center" }}>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    color: colors.greenAccent[300],
                    backgroundColor: colors.primary[600],
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}
                >
                  Likes: {selectedPublication.likeCount || 0}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    color: colors.redAccent[300],
                    backgroundColor: colors.primary[600],
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}
                >
                  Dislikes: {selectedPublication.dislikeCount || 0}
                </Typography>
              </Box>
              <Divider sx={{ width: "80%", borderColor: colors.grey[700], margin: "10px 0" }} />
            </Box>
          ) : (
            <Typography sx={{ textAlign: "center", color: colors.grey[300], fontSize: "1.2rem" }}>
              No publication data available
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Button
            onClick={() => setOpenProfileModal(false)}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour les Commentaires */}
      <Dialog
        open={openCommentsModal}
        onClose={() => setOpenCommentsModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.8rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.blueAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Comments
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {comments.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {comments.map((comment) => (
                <Box
                  key={comment._id}
                  sx={{
                    backgroundColor: colors.primary[600],
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "12px", mb: "8px" }}>
                    <Avatar
                      src={comment.auteur_id?.user_photo ? `http://localhost:5000${comment.auteur_id.user_photo}` : null}
                      alt={comment.auteur_id?.username}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Typography sx={{ fontWeight: "bold", color: colors.grey[100] }}>
                      {comment.auteur_id?.username || "Unknown"}
                    </Typography>
                    <Tooltip title={`Voir les signalements (${comment.reportCount || 0})`}>
                      <Badge
                        badgeContent={comment.reportCount || 0}
                        color="error"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: comment.reportCount > 0 ? "#ff1744" : "#bdbdbd",
                            color: "#fff",
                            fontSize: "0.7rem",
                            height: "18px",
                            minWidth: "18px",
                            borderRadius: "50%",
                            border: "2px solid #fff",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                          },
                        }}
                      >
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ReportIcon />}
                          onClick={() => handleViewCommentReports(comment)}
                          sx={{
                            backgroundColor: comment.reportCount > 0 ? colors.redAccent[500] : colors.grey[500],
                            color: "#fff",
                            "&:hover": {
                              backgroundColor: comment.reportCount > 0 ? colors.redAccent[700] : colors.grey[700],
                            },
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            borderRadius: "8px",
                          }}
                        >
                          Reports
                        </Button>
                      </Badge>
                    </Tooltip>
                    { ( // Afficher l'icône de suppression uniquement pour les admins
                      <Tooltip title="Delete the comment">
                        <IconButton
                          onClick={() => handleOpenDeleteConfirm(comment._id)}
                          sx={{
                            color: colors.redAccent[500],
                            "&:hover": {
                              color: colors.redAccent[700],
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: "1rem", color: colors.grey[200] }}>
                    {comment.contenu}
                  </Typography>
                  <Typography sx={{ fontSize: "0.9rem", color: colors.grey[400], mt: "8px" }}>
                    {new Date(comment.dateCreation).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ textAlign: "center", color: colors.grey[300], fontSize: "1.2rem" }}>
              No comments available for this publication.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Button
            onClick={() => setOpenCommentsModal(false)}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmation de Suppression */}
      <Dialog
        open={openDeleteConfirmModal}
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.5rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.redAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Confirmer la Suppression
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
          }}
        >
          <Typography sx={{ fontSize: "1.2rem", textAlign: "center" }}>
          Are you sure you want to delete this comment? This action is irreversible
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={handleCloseDeleteConfirm}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteComment}
            variant="contained"
            sx={{
              fontSize: "1.1rem",
              backgroundColor: colors.redAccent[500],
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.redAccent[700] },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour les Signalements de Publication */}
      <Dialog
        open={openReportsModal}
        onClose={() => setOpenReportsModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.8rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.redAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Reports
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {reports.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {reports.map((report) => (
                <Box
                  key={report._id}
                  sx={{
                    backgroundColor: colors.primary[600],
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "12px", mb: "8px" }}>
                    <Avatar
                      src={report.userId?.user_photo ? `http://localhost:5000${report.userId.user_photo}` : null}
                      alt={report.userId?.username}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Typography sx={{ fontWeight: "bold", color: colors.grey[100] }}>
                      {report.userId?.username || "Unknown"}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1rem", color: colors.grey[200] }}>
                    <strong>Reason:</strong> {report.reason}
                  </Typography>
                  {report.customReason && (
                    <Typography sx={{ fontSize: "1rem", color: colors.grey[200], mt: "8px" }}>
                      <strong>Details:</strong> {report.customReason}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: "0.9rem", color: colors.grey[400], mt: "8px" }}>
                    Reported on: {new Date(report.dateReported).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ textAlign: "center", color: colors.grey[300], fontSize: "1.2rem" }}>
              No reports available for this publication.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Button
            onClick={() => setOpenReportsModal(false)}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour les Signalements de Commentaire */}
      <Dialog
        open={openCommentReportsModal}
        onClose={() => setOpenCommentReportsModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.8rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.redAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Comment Reports
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {commentReports.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {commentReports.map((report) => (
                <Box
                  key={report._id}
                  sx={{
                    backgroundColor: colors.primary[600],
                    padding: "16px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "12px", mb: "8px" }}>
                    <Avatar
                      src={report.userId?.user_photo ? `http://localhost:5000${report.userId.user_photo}` : null}
                      alt={report.userId?.username}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Typography sx={{ fontWeight: "bold", color: colors.grey[100] }}>
                      {report.userId?.username || "Unknown"}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "1rem", color: colors.grey[200] }}>
                    <strong>Reason:</strong> {report.reason}
                  </Typography>
                  {report.customReason && (
                    <Typography sx={{ fontSize: "1rem", color: colors.grey[200], mt: "8px" }}>
                      <strong>Details:</strong> {report.customReason}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: "0.9rem", color: colors.grey[400], mt: "8px" }}>
                    Reported on: {new Date(report.dateReported).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ textAlign: "center", color: colors.grey[300], fontSize: "1.2rem" }}>
              No reports available for this comment.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Button
            onClick={() => setOpenCommentReportsModal(false)}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour les Notifications */}
      <Dialog
        open={openNotificationsModal}
        onClose={handleCloseNotifications}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: colors.primary[400],
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.5rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: colors.blueAccent[700],
            color: "#fff",
            padding: "16px 24px",
            borderBottom: `1px solid ${colors.grey[700]}`,
          }}
        >
          Notifications de Signalements
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: colors.primary[500],
            color: colors.grey[100],
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {(reportedPublications.length > 0 || reportedComments.length > 0) ? (
            <List>
              {reportedPublications.map((pub) => (
                <ListItem
                  key={pub.id}
                  button
                  onClick={() => handleViewReportedPublication(pub)}
                  sx={{
                    backgroundColor: colors.primary[600],
                    borderRadius: "8px",
                    mb: "8px",
                    "&:hover": {
                      backgroundColor: colors.primary[700],
                    },
                  }}
                >
                  <ListItemText
                    primary={stripHtmlTags(pub.titrePublication)}
                    secondary={`Publication signalée ${pub.reportCount} fois`}
                    primaryTypographyProps={{ color: colors.grey[100], fontWeight: "bold" }}
                    secondaryTypographyProps={{ color: colors.grey[300] }}
                  />
                </ListItem>
              ))}
              {reportedComments.map((comment) => (
                <ListItem
                  key={comment._id}
                  button
                  onClick={() => handleViewReportedComment(comment)}
                  sx={{
                    backgroundColor: colors.primary[600],
                    borderRadius: "8px",
                    mb: "8px",
                    "&:hover": {
                      backgroundColor: colors.primary[700],
                    },
                  }}
                >
                  <ListItemText
                    primary={`Commentaire de ${comment.auteur_id?.username || "Unknown"}`}
                    secondary={`Signalé ${comment.reportCount} fois`}
                    primaryTypographyProps={{ color: colors.grey[100], fontWeight: "bold" }}
                    secondaryTypographyProps={{ color: colors.grey[300] }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ textAlign: "center", color: colors.grey[300], fontSize: "1.2rem" }}>
              Aucune publication ou commentaire signalé pour le moment.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: colors.primary[400],
            borderTop: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Button
            onClick={handleCloseNotifications}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: colors.grey[100],
              borderColor: colors.grey[600],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.grey[800], borderColor: colors.grey[500] },
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ajouter/Modifier */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Update Publication" : "Add Publication"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Title"
            name="titrePublication"
            value={formData.titrePublication}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={4}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} onChange={handleChange}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
              <MenuItem value="later">Scheduled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="dense"
            label="Tags (comma-separated)"
            name="tag"
            value={formData.tag}
            onChange={handleChange}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formData.id ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Publication;

// Animation CSS pour l'effet fade-in et le badge
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);