import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Select, MenuItem, InputLabel, FormControl, Alert , IconButton, InputBase
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Header from "../../components/Header";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material"; 
import { tokens } from "../../theme"; // Ensure you import tokens from your theme

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
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

 // Charger les utilisateurs avec filtres (recherche + rôle)
 const fetchUsers = (query = "", role = "") => {
  let url = "http://localhost:5000/users/search";
  const queryParams = [];

  if (query) {
    queryParams.push(`username=${query}`);
    queryParams.push(`email=${query}`);  // Allow search by both username and email
  }
  if (role) queryParams.push(`role=${role}`);

  if (queryParams.length > 0) {
    url += `?${queryParams.join("&")}`;
  }

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.users)) {
        setUsers(data.users.map((user) => ({ id: user._id, ...user, etat: user.etat })));
      }
    })
    .catch((err) => console.error("❌ Error fetching users:", err));
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
      setError("Valid name and email required !");
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
      .catch((err) => console.error(" Erreur :", err));
  };

  // Voir le profil d'un utilisateur
  const handleViewProfile = (id) => {
    fetch(`http://localhost:5000/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedUser(data);
        setOpenProfileModal(true);
      })
      .catch((err) => console.error(" Error retrieving profile :", err));
  };
  

  const handleEtatChange = async (id, newEtat) => {
    console.log(`🔄 Change of state from user${id} to ${newEtat}`);
  
    const endpoint = newEtat === "Actif" ? "activate" : "deactivate"; 
  
    try {
      const response = await fetch(`http://localhost:5000/users/updateEtat/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etat: newEtat }) 
      });
  
      const data = await response.json();
      console.log("📩 Server response :", data);
  
      if (response.ok) {
        alert(`✅ User ${newEtat.toLowerCase()} successfully !`);
  
        // 🔹 Met à jour directement l'é
        // tat React pour éviter un rechargement complet
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === id ? { ...user, etat: newEtat } : user
          )
        );
      } else {
        alert(` Error : ${data.message || "Unknown problem"}`);
      }
    } catch (error) {
      console.error("Error when changing state :", error);
      alert(" An error has occurred !");
    }
  };
  
  
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "username", headerName: "Nom", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "role", headerName: "Rôle", flex: 1 },

    
    {
      field: "Etat du compte",
      headerName: "Account Status",
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
         
          {/* Liste déroulante pour Activer/Désactiver */}
          <FormControl fullWidth size="small">
  <Select
value={params.row.etat === "Actif" ? "Actif" : "Désactivé"}
onChange={(e) => handleEtatChange(params.row.id, e.target.value)}
  >
    <MenuItem value="Actif">Enable</MenuItem>
    <MenuItem value="Désactivé">Disable</MenuItem>
    </Select>
</FormControl>


      </Box>
      ),
    },
  
        {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button variant="contained" color="secondary" size="small" startIcon={<EditIcon />} onClick={() => handleOpen(params.row)}>
            Update
          </Button>
          <Button variant="contained" color="info" size="small" startIcon={<VisibilityIcon />} onClick={() => handleViewProfile(params.row.id)}>
            View
          </Button>
      </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title="Account management" subtitle="Users" />

{/* Top Bar - Search, Filter, and Add User */}
<Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
  
    {/* ADD USER BUTTON */}
    <Button 
    variant="contained" 
    color="primary" 
    startIcon={<AddIcon />} 
    onClick={() => handleOpen()}
  >
    Add User
  </Button>
  {/* SEARCH BAR */}
  <Box
    display="flex"
    backgroundColor={colors.primary[400]} // Matches the theme
    borderRadius="3px"
    p={1}
    width="100%"
    maxWidth="500px" // Adjust as needed
  >
    <InputBase 
      sx={{ ml: 2, flex: 1, color: colors.grey[100] }} 
      placeholder="Search for a user"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <IconButton type="button" sx={{ p: 1, color: colors.grey[100] }}>
      <SearchIcon />
    </IconButton>
  </Box>

  {/* FILTER ROLE */}
  <FormControl sx={{ minWidth: 200 }}>
    <InputLabel>Filter by Role</InputLabel>
    <Select 
      value={selectedRole} 
      onChange={(e) => setSelectedRole(e.target.value)}
    >
      <MenuItem value="">All</MenuItem>
      <MenuItem value="teacher">Teacher</MenuItem>
      <MenuItem value="psychiatrist">Psychiatrist</MenuItem>
      <MenuItem value="association_member">Association Member</MenuItem>
    </Select>
  </FormControl>



</Box>

      {/* Tableau des utilisateurs */}
      <Box sx={{ height: 500, width: "100%" }}>
        <DataGrid checkboxSelection rows={users} columns={columns} />
      </Box>

      {/* 🔹 Modal Voir Profil */}
      <Dialog 
  open={openProfileModal} 
  onClose={() => setOpenProfileModal(false)}
  maxWidth="md" // Augmente la taille de la modal (peut aussi être "lg")
  fullWidth // Permet d'occuper toute la largeur
>
  <DialogTitle sx={{ fontSize: "1.5rem", fontWeight: "bold" ,textAlign: "center" }}>
  User profile 
  </DialogTitle>
  
  <DialogContent sx={{ padding: "15px", fontSize: "1.2rem" }}>
    {selectedUser ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center",  textAlign: "center"}}>
         <Typography><strong>User Name :</strong> {selectedUser.username}</Typography>
        <Typography><strong>Email :</strong> {selectedUser.email}</Typography>
        <Typography><strong>Role :</strong> {selectedUser.role}</Typography>
        <Typography><strong>Age :</strong> {new Date().getFullYear() - new Date(selectedUser.dob).getFullYear()} years old</Typography>
      </Box>
    ) : (
      <Typography>Loading...</Typography>
    )}
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setOpenProfileModal(false)} sx={{ fontSize: "1.1rem" }}>
      CLOSE
    </Button>
  </DialogActions>
</Dialog>


      {/* 🔹 Modal Ajouter/Modifier */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Update User" : "Add User"}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Nom" name="username" value={formData.username} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Email" name="email" value={formData.email} onChange={handleChange} />
          <TextField fullWidth margin="dense" label="Date of birth" type="date" name="dob" value={formData.dob ? formData.dob.split("T")[0] : ""} onChange={handleChange} />
          
          {/* Sélection du rôle */}
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} onChange={handleChange}>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="psychiatrist">Psychiatrist</MenuItem>
              <MenuItem value="association_member">Association member</MenuItem>
            </Select>
          </FormControl>

          
          {/* Affichage des erreurs */}
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

export default Team;