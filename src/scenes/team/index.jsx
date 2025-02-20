import { useState, useEffect } from "react";
import { 
  Box, Typography, useTheme, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Select, MenuItem, InputLabel, FormControl, Alert 
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ArchiveIcon from "@mui/icons-material/Archive";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Header from "../../components/Header";

const Team = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", role: "student", dob: "", level: "", password: "" });
  const [error, setError] = useState("");  // Ajout d'un état pour gérer les erreurs

  // Charger les utilisateurs depuis l'API
  useEffect(() => {
    fetch("http://localhost:5001/users/all")
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((user, index) => ({
          id: user._id || index,
          username: user.username,
          age: new Date().getFullYear() - new Date(user.dob).getFullYear(),
          email: user.email,
          role: user.role,
          verified: user.isVerified ? "✔️" : "❌",
        }));
        setUsers(formattedData);
      })
      .catch((err) => console.error("❌ Erreur lors de la récupération :", err));
  }, []);
  

  // Ouvrir la modal (Ajout ou Modification)
  const handleOpen = (user = null) => {
    setFormData(user || { username: "", email: "", role: "student", dob: "", level: "", password: "" });
    setOpen(true);
    setError("");  // Réinitialiser l'erreur lors de l'ouverture de la modal
  };
  
  const handleClose = () => setOpen(false);

  // Modifier les champs du formulaire
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  

  // Ajouter ou Modifier un utilisateur
  const handleSubmit = () => {
    if (!formData.username) {  
      setError("Le nom d'utilisateur est requis !");
      return;
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError("L'email est requis et doit être valide !");
      return;
    }
    
    // Ajoute d'autres validations si nécessaire
  
    const method = formData.id ? "PUT" : "POST";
    const url = formData.id ? `http://localhost:5001/users/${formData.id}` : "http://localhost:5001/users/create";
  
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(formData.id ? "Utilisateur mis à jour !" : "Utilisateur ajouté !");
        setUsers((prev) => (formData.id ? prev.map((u) => (u.id === data.id ? data : u)) : [...prev, data]));
        handleClose();
      })
      .catch((err) => console.error("❌ Erreur :", err));
  };
  

  // Archiver un utilisateur
  const handleArchive = (id) => {
    if (window.confirm("Voulez-vous vraiment archiver cet utilisateur ?")) {
      fetch(`http://localhost:5001/users/archive/${id}`, { method: "PATCH" })
        .then((res) => res.json())
        .then(() => {
          alert("Utilisateur archivé !");
          setUsers(users.filter((user) => user.id !== id));
        })
        .catch((err) => console.error("❌ Erreur lors de l'archivage :", err));
    }
  };

  // Voir le profil d'un utilisateur
  const handleViewProfile = (id) => {
    window.location.href = `/profile/${id}`;
  };

  // Colonnes du tableau
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "username", headerName: "Nom", flex: 1 },
    { field: "age", headerName: "Âge", type: "number", headerAlign: "left", align: "left" },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "role", headerName: "Rôle", flex: 1 },
    { field: "verified", headerName: "Vérifié", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button variant="contained" color="secondary" size="small" startIcon={<EditIcon />} onClick={() => handleOpen(params.row)}>
            Modifier
          </Button>
          <Button variant="contained" color="warning" size="small" startIcon={<ArchiveIcon />} onClick={() => handleArchive(params.row.id)}>
            Archiver
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
      
      {/* Bouton Ajouter un utilisateur */}
      <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Ajouter un utilisateur
      </Button>

      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
        }}
      >
        <DataGrid checkboxSelection rows={users} columns={columns}  />
      </Box>

      {/* Modal d'Ajout/Modification */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Nom" name="username" value={formData.username} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Email" name="email" value={formData.email} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Date de naissance" type="date" name="dob" value={formData.dob} onChange={handleChange} />
          
          {/* Liste déroulante pour le rôle */}
          <FormControl fullWidth margin="dense">
            <InputLabel>Rôle</InputLabel>
            <Select name="role" value={formData.role} onChange={handleChange}>
              <MenuItem value="student">Étudiant</MenuItem>
              <MenuItem value="teacher">Enseignant</MenuItem>
              <MenuItem value="psychiatrist">Psychiatre</MenuItem>
            </Select>
          </FormControl>

          {/* Champ niveau (uniquement pour les étudiants) */}
          {formData.role === "student" && (
            <TextField fullWidth margin="dense" label="Niveau" type="number" name="level" value={formData.level} onChange={handleChange} />
          )}

          {/* Champ mot de passe */}
          <TextField
            fullWidth
            margin="dense"
            label="Mot de passe"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />

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
