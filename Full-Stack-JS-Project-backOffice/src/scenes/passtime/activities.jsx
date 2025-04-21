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
  Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import BarChartIcon from "@mui/icons-material/BarChart";
import CloseIcon from "@mui/icons-material/Close";
import Header from "../../components/Header";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { jwtDecode } from "jwt-decode";
import jsPDF from "jspdf";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  const [openArchiveModal, setOpenArchiveModal] = useState(false);
  const [activityToToggleArchive, setActivityToToggleArchive] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [openCategoriesModal, setOpenCategoriesModal] = useState(false);
  const [openStatsModal, setOpenStatsModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [editedCategory, setEditedCategory] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
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
        let activitiesArray = Array.isArray(data) ? data : data.activities || [];
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

    doc.setFontSize(18);
    doc.text("Liste des Activités", 10, 10);

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const boxHeight = 50;
      const imageWidth = 40;
      const imageHeight = 30;

      if (y + boxHeight > 260) {
        doc.setFontSize(10);
        doc.text(`Page ${pageNumber}`, 190, 290, { align: "right" });
        doc.addPage();
        pageNumber++;
        y = 20;
      }

      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.rect(10, y - 5, 190, boxHeight, "S");

      doc.setFontSize(12);
      doc.text(`Activity ${i + 1}: ${activity.title}`, 15, y);

      doc.setFontSize(10);
      doc.text(`Catégorie: ${activity.category?.name || "N/A"}`, 15, y + 6);
      doc.text(`Statut: ${activity.isArchived ? "Archived" : "Published"}`, 15, y + 12);

      const descriptionLines = doc.splitTextToSize(`Description: ${activity.description}`, 130);
      doc.text(descriptionLines, 15, y + 18);

      if (activity.imageUrl) {
        try {
          const base64Image = await toBase64(`http://localhost:5000${activity.imageUrl}`);
          doc.addImage(base64Image, "JPEG", 160, y, imageWidth, imageHeight);
        } catch (err) {
          console.error("⚠️ Erreur lors du chargement de l'image:", err);
        }
      }

      y += boxHeight + 10;
    }

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
        fetchCategories();
        handleClose();
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setError(err.message);
      });
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

  const handleToggleArchive = (id) => {
    setActivityToToggleArchive(id);
    setOpenArchiveModal(true);
  };

  const confirmToggleArchive = () => {
    const activity = activities.find((a) => a.id === activityToToggleArchive);
    const newArchiveStatus = !activity.isArchived;

    fetch(`http://localhost:5000/users/psychiatrist/${adminId}/archive-activity/${activityToToggleArchive}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isArchived: newArchiveStatus }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchActivities();
        fetchCategories();
        setOpenArchiveModal(false);
        setActivityToToggleArchive(null);
      })
      .catch((err) => console.error("❌ Error toggling archive status:", err));
  };

  const fetchCategories = () => {
    fetch("http://localhost:5000/users/categories", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
      })
      .catch((err) => console.error("❌ Error loading categories", err));
  };

  const openEditModalFunc = (category) => {
    setEditedCategory(category);
    setEditedName(category.name);
    setError("");
  };

  const handleUpdateCategory = () => {
    if (!editedName) {
      setError("Name cannot be empty");
      return;
    }

    fetch(`http://localhost:5000/users/categories/${editedCategory.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
      body: JSON.stringify({ name: editedName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      })
      .then(() => {
        setSuccessMessage("Category updated successfully!");
        setEditedCategory(null);
        setEditedName("");
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Update error:", err);
        setError("Failed to update category");
      });
  };

  const handleDelete = (id) => {
    setCategoryToDelete(id);
  };

  const confirmDelete = () => {
    fetch(`http://localhost:5000/users/categories/${categoryToDelete}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete category");
        return res.json();
      })
      .then(() => {
        setSuccessMessage("Category deleted successfully!");
        setCategoryToDelete(null);
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Delete error:", err);
        setError("Failed to delete category");
      });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "description", headerName: "Description", flex: 1.5 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      valueGetter: (params) => params.row.category?.name,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      valueGetter: (params) => (params.row.isArchived ? "Archived" : "Published"),
      renderCell: (params) => (
        <Typography
          color={params.row.isArchived ? colors.redAccent[500] : colors.greenAccent[500]}
        >
          {params.row.isArchived ? "Archived" : "Published"}
        </Typography>
      ),
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
            color="warning"
            size="small"
            startIcon={params.row.isArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
            onClick={() => handleToggleArchive(params.row.id)}
          >
            {params.row.isArchived ? "Unarchive" : "Archive"}
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
            onClick={() => setOpenCategoriesModal(true)}
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<BarChartIcon />}
            onClick={() => setOpenStatsModal(true)}
          >
            Statistics
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

      {/* Activity Edit Modal */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle sx={{ position: 'relative' }}>
          {formData.id ? "Edit Activity" : "Add Activity"}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: colors.redAccent[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
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
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formData.id ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity View Modal */}
      <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)}>
        <DialogTitle sx={{ position: 'relative' }}>
          Activity Details
          <IconButton
            onClick={() => setOpenViewModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: colors.redAccent[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedActivity ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Typography><strong>Title:</strong> {selectedActivity.title}</Typography>
              <Typography><strong>Description:</strong> {selectedActivity.description}</Typography>
              <Typography><strong>Category:</strong> {selectedActivity.category?.name}</Typography>
              <Typography><strong>Status:</strong> {selectedActivity.isArchived ? "Archived" : "Published"}</Typography>
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
     
      </Dialog>

      {/* Archive Confirmation Modal */}
      <Dialog open={openArchiveModal} onClose={() => setOpenArchiveModal(false)}>
        <DialogTitle sx={{ position: 'relative' }}>
          {activities.find((a) => a.id === activityToToggleArchive)?.isArchived ? "Confirm Unarchiving" : "Confirm Archiving"}
          <IconButton
            onClick={() => setOpenArchiveModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: colors.redAccent[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {activities.find((a) => a.id === activityToToggleArchive)?.isArchived ? "unarchive" : "archive"} this activity?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmToggleArchive} variant="contained" color="warning">
            {activities.find((a) => a.id === activityToToggleArchive)?.isArchived ? "Unarchive" : "Archive"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Categories Modal */}
      <Dialog open={openCategoriesModal} onClose={() => setOpenCategoriesModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ position: 'relative' }}>
          Manage Categories
          <IconButton
            aria-label="close"
            onClick={() => setOpenCategoriesModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: colors.redAccent[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            backgroundColor={colors.primary[400]}
            borderRadius="3px"
            p={1}
            mb={2}
          >
            <InputBase
              sx={{ ml: 2, flex: 1, color: colors.grey[100] }}
              placeholder="Search categories"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
            />
            <IconButton type="button" sx={{ p: 1, color: colors.grey[100] }}>
              <SearchIcon />
            </IconButton>
          </Box>

          <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <Box
                  key={cat._id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  mb={1}
                  bgcolor={colors.primary[500]}
                  borderRadius="4px"
                >
                  <Typography sx={{ color: colors.grey[100] }}>
                    {cat.name} ({cat.totalActivities} activities)
                  </Typography>
                  <Box>
                    <IconButton
                      color="secondary"
                      onClick={() => openEditModalFunc({ id: cat._id, name: cat.name })}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(cat._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: colors.grey[100] }}>No categories found</Typography>
            )}
          </Box>

          {editedCategory && (
            <Box mt={2}>
              <TextField
                fullWidth
                label="Edit Category Name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
              <Box display="flex" gap={1} mt={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdateCategory}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setEditedCategory(null)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {categoryToDelete && (
            <Box mt={2}>
              <Typography>Are you sure you want to delete this category?</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmDelete}
                >
                  Delete
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setCategoryToDelete(null)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>

      {/* Statistics Modal */}
      <Dialog open={openStatsModal} onClose={() => setOpenStatsModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ position: 'relative' }}>
          Activity Statistics
          <IconButton
            aria-label="close"
            onClick={() => setOpenStatsModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: colors.redAccent[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {categories.length > 0 ? (
              <Box
                backgroundColor={colors.primary[400]}
                p={3}
                borderRadius="8px"
                boxShadow="0 2px 10px rgba(0,0,0,0.2)"
              >
                <Typography
                  variant="h6"
                  color={colors.blueAccent[300]}
                  fontWeight="bold"
                  mb={2}
                >
                  Activities per Category (Total, Published, Archived)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categories.map((cat) => ({
                      name: cat.name,
                      totalActivities: cat.totalActivities,
                      publishedActivities: cat.publishedActivities,
                      archivedActivities: cat.archivedActivities,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
                    <XAxis
                      dataKey="name"
                      stroke={colors.grey[100]}
                      tick={{ fill: colors.grey[100] }}
                    />
                    <YAxis
                      stroke={colors.grey[100]}
                      tick={{ fill: colors.grey[100] }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.primary[500],
                        border: `1px solid ${colors.grey[700]}`,
                        borderRadius: "4px",
                        color: colors.grey[100],
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="totalActivities"
                      fill={colors.blueAccent[500]}
                      barSize={20}
                      name="Total Activities"
                    />
                    <Bar
                      dataKey="publishedActivities"
                      fill={colors.greenAccent[500]}
                      barSize={20}
                      name="Published Activities"
                    />
                    <Bar
                      dataKey="archivedActivities"
                      fill={colors.redAccent[500]}
                      barSize={20}
                      name="Archived Activities"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography sx={{ color: colors.grey[100] }}>
                No statistics available
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Activities;