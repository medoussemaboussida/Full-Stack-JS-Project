import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Select, MenuItem, InputLabel, FormControl, Alert 
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Header from "../../components/Header";

const Team = () => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", role: "", dob: "", password: "" });
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(""); // ✅ Valeur par défaut "Tous"

 // Charger les utilisateurs avec filtres (recherche + rôle)
 const fetchUsers = (query = "", role = "") => {
  let url = "http://localhost:5000/users/search";
  const queryParams = [];

  if (query) queryParams.push(`username=${query}`);
  if (role) queryParams.push(`role=${role}`);

  if (queryParams.length > 0) {
    url += `?${queryParams.join("&")}`;
  }

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.users)) {
        setUsers(data.users.map((user) => ({ id: user._id, ...user })));
      }
    })
    .catch((err) => console.error("❌ Erreur lors de la récupération :", err));
};

  useEffect(() => {
    fetchUsers();
  }, []);

// Recherche dynamique avec filtre rôle
useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    fetchUsers(searchQuery, selectedRole);
  }, 500); // Attendre 500ms avant d'exécuter la recherche

  return () => clearTimeout(delayDebounceFn);
}, [searchQuery, selectedRole]);

  // Recherche dynamique
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 500); // Attendre 500ms avant d'exécuter la recherche

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Ouvrir la modal d'ajout/modification
  const handleOpen = (user = null) => {
    setFormData(user || { username: "", email: "", role: "", dob: "", password: "" });
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  // Modifier un champ
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Ajouter ou Modifier un utilisateur avec redirection
  const handleSubmit = () => {
    if (!formData.username || !formData.email.match(/\S+@\S+\.\S+/)) {
      setError("Nom et email valides requis !");
      return;
    }

    const method = formData.id ? "PUT" : "POST";
    const url = formData.id 
      ? `http://localhost:5000/users/${formData.id}` 
      : "http://localhost:5000/users/create";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        fetchUsers();
        handleClose();
        navigate("/team");
      })
      .catch((err) => console.error("❌ Erreur :", err));
  };

  // Voir le profil d'un utilisateur
  const handleViewProfile = (id) => {
    fetch(`http://localhost:5000/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedUser(data);
        setOpenProfileModal(true);
      })
      .catch((err) => console.error("❌ Erreur lors de la récupération du profil :", err));
  };

  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "username", headerName: "Nom", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "role",
      headerName: "Rôle",
      flex: 1,
      renderHeader: () => (
        <FormControl fullWidth size="small">
          <InputLabel>Rôle</InputLabel>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem> {/* ✅ Sélection par défaut */}
            <MenuItem value="teacher">Enseignant</MenuItem>
            <MenuItem value="psychiatrist">Psychiatre</MenuItem>
            <MenuItem value="association_member">Membre d'association</MenuItem>
          </Select>
        </FormControl>
      ),
    },
        {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button variant="contained" color="secondary" size="small" startIcon={<EditIcon />} onClick={() => handleOpen(params.row)}>
            Modifier
          </Button>
          <Button variant="contained" color="info" size="small" startIcon={<VisibilityIcon />} onClick={() => handleViewProfile(params.row.id)}>
            Voir
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="UTILISATEURS" subtitle="Gestion des comptes" />

      {/* Champ de recherche */}
      <TextField
        fullWidth
        label="Rechercher un utilisateur"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Bouton Ajouter un utilisateur */}
      <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Ajouter un utilisateur
      </Button>

      {/* Tableau des utilisateurs */}
      <Box sx={{ height: 500, width: "100%" }}>
        <DataGrid checkboxSelection rows={users} columns={columns} />
      </Box>

      {/* 🔹 Modal Voir Profil */}
      <Dialog open={openProfileModal} onClose={() => setOpenProfileModal(false)}>
        <DialogTitle>Profil de l'utilisateur</DialogTitle>
        <DialogContent>
          {selectedUser ? (
            <Box>
              <Typography><strong>Nom :</strong> {selectedUser.username}</Typography>
              <Typography><strong>Email :</strong> {selectedUser.email}</Typography>
              <Typography><strong>Rôle :</strong> {selectedUser.role}</Typography>
              <Typography><strong>Âge :</strong> {new Date().getFullYear() - new Date(selectedUser.dob).getFullYear()} ans</Typography>
            </Box>
          ) : (
            <Typography>Chargement...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProfileModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* 🔹 Modal Ajouter/Modifier */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Nom" name="username" value={formData.username} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Email" name="email" value={formData.email} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Date de naissance" type="date" name="dob" value={formData.dob} onChange={handleChange} />
          
          {/* Sélection du rôle */}
          <FormControl fullWidth margin="dense">
            <InputLabel>Rôle</InputLabel>
            <Select name="role" value={formData.role} onChange={handleChange}>
              <MenuItem value="student">Étudiant</MenuItem>
              <MenuItem value="teacher">Enseignant</MenuItem>
              <MenuItem value="psychiatrist">Psychiatre</MenuItem>
              <MenuItem value="association_member">Membre d'association</MenuItem>
            </Select>
          </FormControl>

          {/* Champ mot de passe */}
          <TextField fullWidth margin="dense" label="Mot de passe" type="password" name="password" value={formData.password} onChange={handleChange} />

          {/* Affichage des erreurs */}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formData.id ? "Mettre à jour" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Team;
