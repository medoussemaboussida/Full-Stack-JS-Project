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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Header from "../../components/Header";
import { jwtDecode } from "jwt-decode";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editedCategory, setEditedCategory] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [error, setError] = useState("");
  const [adminId, setAdminId] = useState(null);

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
        closeEditModal();
        fetchCategories();
      })
      .catch((err) => {
        console.error("❌ Update error:", err);
        setError("Failed to update category");
      });
  };

  // 🗑️ Supprimer une catégorie (préparation)
  const handleDelete = (id) => {
    alert("Suppression non encore implémentée !");
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
    { field: "name", headerName: "Category Name", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => openEditModalFunc(params.row)}
          >
            Edit
          </Button>
          <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
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

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddModal(true)}
        >
          Add Category
        </Button>
      </Box>

      <Box sx={{ height: 400 }}>
        <DataGrid rows={rows} columns={columns} />
      </Box>

      {/* ➕ Modal Add */}
      <Dialog open={openAddModal} onClose={closeAddModal}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            margin="dense"
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddModal}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✏️ Modal Edit */}
      <Dialog open={openEditModal} onClose={closeEditModal}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Category Name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            margin="dense"
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditModal}>Cancel</Button>
          <Button onClick={handleUpdateCategory} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories;
