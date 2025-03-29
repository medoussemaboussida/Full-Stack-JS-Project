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
import Header from "../../components/Header";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import { jwtDecode } from "jwt-decode";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "", imageUrl: "" });
  const [error, setError] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalActivities, setTotalActivities] = useState(0);

  // Fetch admin ID from JWT token
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

  // Fetch activities with search, filter, and pagination
  const fetchActivities = useCallback(
    (query = "", category = "", pageNum = 0, limit = 20) => {
      if (!adminId) return;

      let url = `http://localhost:5000/users/list/activities?page=${pageNum + 1}&limit=${limit}&createdBy=${adminId}`;
      const queryParams = [];
      if (query) queryParams.push(`title=${query}&description=${query}`);
      if (category) queryParams.push(`category=${category}`);
      if (queryParams.length > 0) {
        url += `&${queryParams.join("&")}`;
      }

      console.log("Fetching URL:", url);

      fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            return res.text().then((text) => {
              throw new Error(`Server returned ${res.status}: ${text}`);
            });
          }
          return res.json();
        })
        .then((data) => {
          console.log("Raw response data:", data);
          let activitiesArray = [];
          if (Array.isArray(data)) {
            // Cas où le backend renvoie directement un tableau
            activitiesArray = data;
          } else if (Array.isArray(data.activities)) {
            // Cas où le backend renvoie un objet avec une propriété "activities"
            activitiesArray = data.activities;
          } else {
            console.error("Unexpected data format:", data);
            return;
          }

          const mappedActivities = activitiesArray.map((activity) => ({
            id: activity._id,
            ...activity,
          }));
          setActivities(mappedActivities);
          // Si totalActivities n'est pas fourni, utiliser la longueur du tableau
          setTotalActivities(data.totalActivities || activitiesArray.length);
        })
        .catch((err) => console.error("❌ Error fetching activities:", err));
    },
    [adminId]
  );

  // Re-fetch activities on search, filter, or pagination change
  useEffect(() => {
    if (adminId) {
      const delayDebounceFn = setTimeout(() => {
        fetchActivities(searchQuery, selectedCategory, page, pageSize);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, selectedCategory, page, pageSize, adminId, fetchActivities]);

  // Open modal for adding/editing
  const handleOpen = (activity = null) => {
    setFormData(activity || { title: "", description: "", category: "", imageUrl: "" });
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add or update an activity
  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.category) {
      setError("All fields are required!");
      return;
    }

    const method = formData.id ? "PUT" : "POST";
    const url = formData.id
      ? `http://localhost:5000/users/psychiatrist/${adminId}/update-activity/${formData.id}`
      : `http://localhost:5000/users/psychiatrist/${adminId}/add-activity`;

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
      body: JSON.stringify({ ...formData, createdBy: adminId }),
    })
      .then((res) => res.json())
      .then((data) => {
        fetchActivities(searchQuery, selectedCategory, page, pageSize);
        handleClose();
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setError("Failed to save activity!");
      });
  };

  // View activity details
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

  // Delete activity
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
        fetchActivities(searchQuery, selectedCategory, page, pageSize);
        setOpenDeleteModal(false);
        setActivityToDelete(null);
      })
      .catch((err) => console.error("❌ Error deleting activity:", err));
  };

  // DataGrid columns
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "description", headerName: "Description", flex: 1.5 },
    { field: "category", headerName: "Category", flex: 1 },
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
      {/* Header */}
      <Header title="Activity Management" subtitle="Manage Activities (Admin)" />

      {/* Top Bar - Search, Filter, and Add Activity */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Activity
        </Button>

        {/* Search Bar */}
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

        {/* Filter by Category */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Professional and Intellectual">Professional and Intellectual</MenuItem>
            <MenuItem value="Wellness and Relaxation">Wellness and Relaxation</MenuItem>
            <MenuItem value="Social and Relationship">Social and Relationship</MenuItem>
            <MenuItem value="Physical and Sports">Physical and Sports</MenuItem>
            <MenuItem value="Leisure and Cultural">Leisure and Cultural</MenuItem>
            <MenuItem value="Consumption and Shopping">Consumption and Shopping</MenuItem>
            <MenuItem value="Domestic and Organizational">Domestic and Organizational</MenuItem>
            <MenuItem value="Nature and Animal-Related">Nature and Animal-Related</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Activities Table */}
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

      {/* Add/Edit Modal */}
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
              <MenuItem value="Professional and Intellectual">Professional and Intellectual</MenuItem>
              <MenuItem value="Wellness and Relaxation">Wellness and Relaxation</MenuItem>
              <MenuItem value="Social and Relationship">Social and Relationship</MenuItem>
              <MenuItem value="Physical and Sports">Physical and Sports</MenuItem>
              <MenuItem value="Leisure and Cultural">Leisure and Cultural</MenuItem>
              <MenuItem value="Consumption and Shopping">Consumption and Shopping</MenuItem>
              <MenuItem value="Domestic and Organizational">Domestic and Organizational</MenuItem>
              <MenuItem value="Nature and Animal-Related">Nature and Animal-Related</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="dense"
            label="Image URL (optional)"
            name="imageUrl"
            value={formData.imageUrl}
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

      {/* View Modal */}
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
                <strong>Category:</strong> {selectedActivity.category}
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

      {/* Delete Confirmation Modal */}
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