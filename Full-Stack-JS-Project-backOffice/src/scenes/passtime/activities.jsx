import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  IconButton,
  InputBase,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Header from "../../components/Header";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { jwtDecode } from "jwt-decode";
import jsPDF from "jspdf";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "", image: null });
  const [error, setError] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.role === "admin") {
          setAdminId(decoded.id);
        } else {
          navigate("/unauthorized");
        }
      } catch (err) {
        console.error("Invalid token:", err);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    fetch("http://localhost:5000/users/categories", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then(setCategories)
      .catch((err) => console.error("❌ Error loading categories", err));
  }, []);

  const fetchActivities = useCallback(() => {
    if (!adminId) return;

    const url = `http://localhost:5000/users/list/activities?createdBy=${adminId}`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        let activitiesArray = [];

        if (Array.isArray(data)) {
          activitiesArray = data;
        } else if (Array.isArray(data.activities)) {
          activitiesArray = data.activities;
        } else {
          console.error("Unexpected data format:", data);
          return;
        }

        let filteredActivities = activitiesArray.filter((activity) => {
          const matchesSearch =
            activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory =
            !selectedCategory ||
            String(activity.category) === selectedCategory ||
            String(activity.category?._id) === selectedCategory;

          return matchesSearch && matchesCategory;
        });

        const mappedActivities = filteredActivities.map((activity) => ({
          id: activity._id,
          ...activity,
        }));

        const start = page * pageSize;
        const end = start + pageSize;
        const paginatedActivities = mappedActivities.slice(start, end);

        setActivities(paginatedActivities);
        setTotalActivities(filteredActivities.length);
      })
      .catch((err) => console.error("❌ Error fetching activities:", err));
  }, [adminId, searchQuery, selectedCategory, page, pageSize]);

  useEffect(() => {
    if (adminId) {
      const delayDebounceFn = setTimeout(() => {
        fetchActivities();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, selectedCategory, page, pageSize, adminId, fetchActivities]);

  const toBase64 = async (url) => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    let y = 20;
    let pageNumber = 1;

    // Titre du document
    doc.setFontSize(18);
    doc.text("Liste des Activités", 10, 10);

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const boxHeight = 50; // Hauteur totale de l'activité (texte + image)
      const imageWidth = 40;
      const imageHeight = 30;

      // Vérifier si l'activité peut tenir sur la page actuelle
      if (y + boxHeight > 260) {
        // Ajouter le numéro de page avant de passer à la nouvelle page
        doc.setFontSize(10);
        doc.text(`Page ${pageNumber}`, 190, 290, { align: "right" });
        doc.addPage();
        pageNumber++;
        y = 20; // Réinitialiser y pour la nouvelle page
      }

      // Cadre autour de chaque activité
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(10, y - 5, 190, boxHeight, "S");

      // Numérotation des activités (ex: "Activity 1: Titre")
      doc.setFontSize(12);
      doc.text(`Activity ${i + 1}: ${activity.title}`, 15, y);

      doc.setFontSize(10);
      doc.text(`Catégorie: ${activity.category?.name || "N/A"}`, 15, y + 6);

      // Description avec wrap si nécessaire
      const descriptionLines = doc.splitTextToSize(`Description: ${activity.description}`, 130);
      doc.text(descriptionLines, 15, y + 12);

      // Image si présente
      if (activity.imageUrl) {
        try {
          const base64Image = await toBase64(`http://localhost:5000${activity.imageUrl}`);
          doc.addImage(base64Image, "JPEG", 160, y, imageWidth, imageHeight);
        } catch (err) {
          console.error("⚠️ Erreur lors du chargement de l'image:", err);
        }
      }

      y += boxHeight + 10; // Espacement après chaque activité
    }

    // Ajouter le numéro de la dernière page
    doc.setFontSize(10);
    doc.text(`Page ${pageNumber}`, 190, 290, { align: "right" });

    doc.save("activities-with-images.pdf");
  };

  const handleOpen = (activity = null) => {
    if (activity) {
      setFormData({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        category: activity.category?._id || activity.category,
        imageUrl: activity.imageUrl || "",
        image: null,
      });
    } else {
      setFormData({ title: "", description: "", category: "", imageUrl: "" });
    }
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.category) {
      setError("All fields are required!");
      return;
    }

    const url = formData.id
      ? `http://localhost:5000/users/psychiatrist/${adminId}/update-activity/${formData.id}`
      : `http://localhost:5000/users/psychiatrist/${adminId}/add-activity`;

    const method = formData.id ? "PUT" : "POST";

    const form = new FormData();
    form.append("title", formData.title);
    form.append("description", formData.description);
    form.append("category", formData.category);
    if (formData.image) {
      form.append("image", formData.image);
    } else {
      form.append("imageUrl", formData.imageUrl);
    }

    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
      body: form,
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.message || "Failed to save activity");
          });
        }
        return res.json();
      })
      .then(() => {
        fetchActivities();
        handleClose();
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setError(err.message);
      });
  };

  const getCategoryNameById = (id) => {
    const category = categories.find((cat) => cat._id === id);
    return category ? category.name : "";
  };

  const handleViewActivity = (id) => {
    fetch(`http://localhost:5000/users/activity/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSelectedActivity(data);
        setOpenViewModal(true);
      })
      .catch((err) => console.error("❌ Error retrieving activity:", err));
  };

  const handleDelete = (id) => {
    setActivityToDelete(id);
    setOpenDeleteModal(true);
  };

  const confirmDelete = () => {
    fetch(`http://localhost:5000/users/psychiatrist/${adminId}/delete-activity/${activityToDelete}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then(() => {
        fetchActivities();
        setOpenDeleteModal(false);
        setActivityToDelete(null);
      })
      .catch((err) => console.error("❌ Error deleting activity:", err));
  };

  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "description", headerName: "Description", flex: 1.5 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      valueGetter: (params) => {
        return params.row.category?.name;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleOpen(params.row)}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="info"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewActivity(params.row.id)}
          >
            View
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="Activity Management" subtitle="Manage Activities (Admin)" />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Activity
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/categories")}
          >
            Manage Categories
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={generatePDF}
          >
            Generate PDF
          </Button>
        </Box>

        <Box
          display="flex"
          backgroundColor={colors.primary[400]}
          borderRadius="3px"
          p={1}
          width="100%"
          maxWidth="500px"
        >
          <InputBase
            sx={{ ml: 2, flex: 1, color: colors.grey[100] }}
            placeholder="Search by title or description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton type="button" sx={{ p: 1, color: colors.grey[100] }}>
            <SearchIcon />
          </IconButton>
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={activities}
          columns={columns}
          pageSize={pageSize}
          rowCount={totalActivities}
          pagination
          paginationMode="server"
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
        />
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Edit Activity" : "Add Activity"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Title"
            name="title"
            value={formData.title}
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
            <InputLabel>Category</InputLabel>
            <Select name="category" value={formData.category} onChange={handleChange}>
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {formData.image ? (
            <img
              src={URL.createObjectURL(formData.image)}
              alt="Preview"
              style={{ width: "100%", marginBottom: "10px", borderRadius: "8px" }}
            />
          ) : formData.imageUrl ? (
            <img
              src={`http://localhost:5000${formData.imageUrl}`}
              alt="Current"
              style={{ width: "100%", marginBottom: "10px", borderRadius: "8px" }}
            />
          ) : null}
          <TextField
            fullWidth
            margin="dense"
            type="file"
            inputProps={{ accept: "image/*" }}
            onChange={(e) => {
              setFormData({ ...formData, image: e.target.files[0] });
            }}
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

      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)}>
        <DialogTitle>Activity Details</DialogTitle>
        <DialogContent>
          {selectedActivity ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Typography>
                <strong>Title:</strong> {selectedActivity.title}
              </Typography>
              <Typography>
                <strong>Description:</strong> {selectedActivity.description}
              </Typography>
              <Typography>
                <strong>Category:</strong> {selectedActivity.category?.name}
              </Typography>
              {selectedActivity.imageUrl && (
                <img
                  src={`http://localhost:5000${selectedActivity.imageUrl}`}
                  alt={selectedActivity.title}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              )}
            </Box>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this activity?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Activities;