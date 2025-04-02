import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Typography,
  Snackbar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import Header from "../../components/Header";
import { jwtDecode } from "jwt-decode";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editedCategory, setEditedCategory] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [adminId, setAdminId] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // 🔐 Récupération de l'adminId via JWT
  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      const decoded = jwtDecode(token);
      setAdminId(decoded.id);
    }
  }, []);

  // 🔄 Récupérer toutes les catégories
  const fetchCategories = () => {
    fetch("http://localhost:5000/users/categories", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
    })
      .then((res) => res.json())
      .then(setCategories)
      .catch((err) => console.error("❌ Error loading categories", err));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ➕ Ajouter une catégorie
  const handleAddCategory = () => {
    if (!newCategoryName) {
      setError("Category name is required.");
      return;
    }

    fetch(`http://localhost:5000/users/categories/${adminId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
      },
      body: JSON.stringify({ name: newCategoryName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add category");
        return res.json();
      })
      .then(() => {
        setSuccessMessage("Category added successfully!");
        closeAddModal();
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Error adding category:", err);
        setError("Failed to add category");
      });
  };

  // ✏️ Ouvrir le modal d'édition
  const openEditModalFunc = (category) => {
    setEditedCategory(category);
    setEditedName(category.name);
    setError("");
    setOpenEditModal(true);
  };

  // ✅ Modifier une catégorie
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
        closeEditModal();
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Update error:", err);
        setError("Failed to update category");
      });
  };

  // 🗑️ Supprimer une catégorie
  const handleDelete = (id) => {
    setCategoryToDelete(id);
    setOpenDeleteModal(true);
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
        setOpenDeleteModal(false);
        setCategoryToDelete(null);
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Delete error:", err);
        setError("Failed to delete category");
      });
  };

  // 🧹 Fermer les modaux
  const closeAddModal = () => {
    setOpenAddModal(false);
    setNewCategoryName("");
    setError("");
  };

  const closeEditModal = () => {
    setOpenEditModal(false);
    setEditedCategory(null);
    setEditedName("");
    setError("");
  };

  // 📊 Colonnes du DataGrid
  const columns = [
    {
      field: "name",
      headerName: "Category Name",
      flex: 1,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: "medium" }}>{params.value}</Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <IconButton
            color="primary"
            onClick={() => openEditModalFunc(params.row)}
            sx={{
              "&:hover": { backgroundColor: colors.primary[700] },
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            color="error"
            onClick={() => handleDelete(params.row.id)}
            sx={{
              "&:hover": { backgroundColor: colors.redAccent[700] },
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  const rows = categories.map((cat) => ({
    id: cat._id,
    name: cat.name,
  }));

  return (
    <Box m="20px">
      <Header title="Manage Categories" subtitle="Create and edit activity categories" />

      {/* Bouton Add Category */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddModal(true)}
          sx={{
            backgroundColor: colors.greenAccent[500],
            "&:hover": { backgroundColor: colors.greenAccent[700] },
            padding: "8px 16px",
            fontWeight: "bold",
          }}
        >
          Add Category
        </Button>
      </Box>

      {/* Tableau des catégories */}
      <Box
        sx={{
          height: 400,
          backgroundColor: colors.primary[400],
          borderRadius: "8px",
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${colors.primary[200]}`,
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            color: colors.grey[100],
            fontWeight: "bold",
          },
          "& .MuiDataGrid-row": {
            "&:nth-of-type(odd)": {
              backgroundColor: colors.primary[500],
            },
            "&:hover": {
              backgroundColor: colors.primary[600],
            },
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          disableSelectionOnClick
        />
      </Box>

      {/* ➕ Modal Add */}
      <Dialog
        open={openAddModal}
        onClose={closeAddModal}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            backgroundColor: colors.primary[400],
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: colors.grey[100] }}>
          Add New Category
        </DialogTitle>
        <DialogContent sx={{ padding: "20px" }}>
          <TextField
            fullWidth
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            margin="dense"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.grey[300] },
                "&:hover fieldset": { borderColor: colors.blueAccent[500] },
                "&.Mui-focused fieldset": { borderColor: colors.blueAccent[500] },
              },
              "& .MuiInputLabel-root": { color: colors.grey[100] },
            }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ padding: "0 20px 20px" }}>
          <Button
            onClick={closeAddModal}
            sx={{ color: colors.grey[100], "&:hover": { backgroundColor: colors.primary[500] } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCategory}
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              "&:hover": { backgroundColor: colors.greenAccent[700] },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✏️ Modal Edit */}
      <Dialog
        open={openEditModal}
        onClose={closeEditModal}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            backgroundColor: colors.primary[400],
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: colors.blueAccent[700], color: colors.grey[100] }}>
          Edit Category
        </DialogTitle>
        <DialogContent sx={{ padding: "20px" }}>
          <TextField
            fullWidth
            label="Category Name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            margin="dense"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.grey[300] },
                "&:hover fieldset": { borderColor: colors.blueAccent[500] },
                "&.Mui-focused fieldset": { borderColor: colors.blueAccent[500] },
              },
              "& .MuiInputLabel-root": { color: colors.grey[100] },
            }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ padding: "0 20px 20px" }}>
          <Button
            onClick={closeEditModal}
            sx={{ color: colors.grey[100], "&:hover": { backgroundColor: colors.primary[500] } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateCategory}
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              "&:hover": { backgroundColor: colors.greenAccent[700] },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🗑️ Modal Delete Confirmation */}
      <Dialog
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            backgroundColor: colors.primary[400],
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: colors.redAccent[700], color: colors.grey[100] }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ padding: "20px" }}>
          <Typography sx={{ color: colors.grey[100] }}>
            Are you sure you want to delete this category? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: "0 20px 20px" }}>
          <Button
            onClick={() => setOpenDeleteModal(false)}
            sx={{ color: colors.grey[100], "&:hover": { backgroundColor: colors.primary[500] } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{
              backgroundColor: colors.redAccent[500],
              "&:hover": { backgroundColor: colors.redAccent[700] },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les messages de succès */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%", backgroundColor: colors.greenAccent[600], color: colors.grey[100] }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Categories;