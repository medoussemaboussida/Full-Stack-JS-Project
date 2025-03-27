import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Alert, IconButton, InputBase,
  Divider, Chip, Avatar
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CommentIcon from "@mui/icons-material/Comment";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"; // Icône pour le bouton PDF
import Header from "../../components/Header";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Snackbar from '@mui/material/Snackbar';
import html2pdf from "html2pdf.js"; // Importer html2pdf.js

// Fonction pour supprimer les balises HTML
const stripHtmlTags = (str) => {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
};

const Publication = () => {
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
  const [comments, setComments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [authors, setAuthors] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const token = localStorage.getItem("jwt-token");

  // Charger les publications
  const fetchPublications = (query = "") => {
    let url = query
      ? `http://localhost:5000/users/searchPublications?searchTerm=${query}`
      : "http://localhost:5000/users/allPublication";

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch publications");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const pubs = data.map((pub) => ({ id: pub._id, ...pub }));
          setPublications(pubs);
          const uniqueAuthors = [...new Set(pubs.map(pub => pub.author_id?.username).filter(Boolean))];
          setAuthors(uniqueAuthors);
        } else {
          setPublications([]);
          setAuthors([]);
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching publications:", err);
        setNotification({ open: true, message: "Failed to load publications", severity: "error" });
      });
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
    fetch(`http://localhost:5000/users/commentaires/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch comments");
        return res.json();
      })
      .then((data) => {
        setComments(data);
        setOpenCommentsModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving comments:", err);
        setNotification({ open: true, message: "Failed to load comments!", severity: "error" });
      });
  };

  // Générer le PDF avec les publications classées par mois
  const generatePDF = () => {
    // Trier les publications par date
    const sortedPublications = [...publications].sort((a, b) => new Date(a.datePublication) - new Date(b.datePublication));

    // Grouper par mois
    const publicationsByMonth = sortedPublications.reduce((acc, pub) => {
      const date = new Date(pub.datePublication);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(pub);
      return acc;
    }, {});

    // Créer le contenu HTML pour le PDF
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

    // Générer le PDF avec html2pdf.js
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
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color="info"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewProfile(params.row.id)}
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
            }}
          >
            Comment
          </Button>
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
          autoHideDuration={3000}
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
        {/* Bouton pour générer le PDF */}
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
          }}
        >
          Generate PDF
        </Button>
      </Box>

      <Box sx={{ height: 500, width: "100%" }}>
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
                      src={comment.auteur_id.user_photo ? `http://localhost:5000${comment.auteur_id.user_photo}` : null}
                      alt={comment.auteur_id.username}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Typography sx={{ fontWeight: "bold", color: colors.grey[100] }}>
                      {comment.auteur_id.username}
                    </Typography>
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

// Animation CSS pour l'effet fade-in
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);