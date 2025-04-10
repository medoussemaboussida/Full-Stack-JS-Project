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
import { useTheme, Snackbar } from "@mui/material"; 
import { tokens } from "../../theme"; // Ensure you import tokens from your theme

const Team = () => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", role: "", dob: "", password: "" });
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });  
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // success ou error
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(""); // ✅ Valeur par défaut "Tous"
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [flashMessage, setFlashMessage] = useState("");
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");  // Add this line
  const [openModal, setOpenModal] = useState(false);  // Add this state





 // Charger les utilisateurs avec filtres (recherche + rôle)
 const [page, setPage] = useState(0);  // Page actuelle
const [pageSize, setPageSize] = useState(20); // Nombre d'éléments par page
const [totalUsers, setTotalUsers] = useState(0); // Total des utilisateurs

const fetchUsers = (query = "", role = "", page = 0, limit = 20) => {
  let url = `http://localhost:5000/users/search?page=${page + 1}&limit=${limit}`;
  const queryParams = [];

  if (query) {
    queryParams.push(`username=${query}`);
    queryParams.push(`email=${query}`);
  }
  if (role) queryParams.push(`role=${role}`);

  if (queryParams.length > 0) {
    url += `&${queryParams.join("&")}`;
  }

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.users)) {
        setUsers(data.users.map((user) => ({ id: user._id, ...user, etat: user.etat })));
        setTotalUsers(data.totalUsers || 0);
      }
    })
    .catch((err) => console.error("❌ Error fetching users:", err));
};

// Recharger les utilisateurs à chaque changement de page ou de filtre
useEffect(() => {
  fetchUsers(searchQuery, selectedRole, page, pageSize);
}, [searchQuery, selectedRole, page, pageSize]);




 

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
    if (!formData.username || !formData.dob || !formData.role) {
      setNotification({ open: true, message: "All fields must be valid!", severity: "error" });
      return;
    }
    if (!formData.email.match(/^[a-zA-Z0-9._%+-]+@esprit\.tn$/) ) {
      setNotification({ open: true, message: "email must end with @esprit.tn", severity: "error" });
      return;
    }
     // Vérifier que la date de naissance n'est pas dans le futur
  const today = new Date();
  const birthDate = new Date(formData.dob);
  if (birthDate > today) {
    setNotification({ open: true, message: "Date of birth cannot be in the future!", severity: "error" });
    return;
  }

  // Vérifier si l'âge est >= 18 ans
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--; // Ajustement si l'anniversaire n'est pas encore passé cette année
  }

  if (age < 18) {
    setNotification({ open: true, message: "The user must be at least 18 years old!", severity: "error" });
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
  
        // Afficher une notification de succès
        setNotification({ open: true, message: "User added successfully!", severity: "success" });
      })
      .catch((err) => {
        console.error("❌ Error :", err);
        setNotification({ open: true, message: "Failed to add user!", severity: "error" });
      });
  };
  
  // Voir le profil d'un utilisateur
  const handleViewProfile = (id) => {
    fetch(`http://localhost:5000/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedUser(data);
        setOpenProfileModal(true);
      })
      .catch((err) => console.error("❌ Error retrieving profile :", err));
  };
  

  // Change account state (activate/deactivate)
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
      console.log("📩 Server response:", data);
  
      if (response.ok) {
        setStatusMessage(`${newEtat === "Actif" ? "Activated" : "Deactivated"} user successfully!`);
        setOpenModal(true); // Show the modal
  
        // Close the modal after 2 seconds
        setTimeout(() => {
          setOpenModal(false);  // Close the modal after 2 seconds
        }, 2000);
  
        // Update React state for users
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === id ? { ...user, etat: newEtat } : user
          )
        );
      } else {
        alert(`❌ Error: ${data.message || "Unknown problem"}`);
      }
    } catch (error) {
      console.error("❌ Error when changing state:", error);
      alert("❌ An error has occurred!");
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
    <MenuItem value="Actif">Enabled</MenuItem>
    <MenuItem value="Désactivé">Disabled</MenuItem>
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
      {/* Titre + Notification alignée */}
      {/* Titre + Notification sur la même ligne */}
<Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
  {/* Titre */}
  <Header title="Account management" subtitle="Users" />

  {/* Notification Snackbar à droite */}
  <Snackbar
    anchorOrigin={{ vertical: "top", horizontal: "center " }}
    open={notification.open}
    autoHideDuration={3000}
    onClose={() => setNotification({ ...notification, open: false })}
    sx={{
      marginLeft: "auto", // Pousse vers la droite
      "& .MuiSnackbarContent-root": {
        fontSize: "1.2rem",
        fontWeight: "bold",
        backgroundColor: notification.severity === "success" ? "#4CAF50" : "#F44336",
        color: "#FFF",
      },
    }}
  >
    <Alert
      onClose={() => setNotification({ ...notification, open: false })}
      severity={notification.severity}
      sx={{ width: "50%", fontSize: "1.1rem" }}
    >
      {notification.message}
    </Alert>
  </Snackbar>
</Box>

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
      <MenuItem value="student">Student</MenuItem>
    </Select>
  </FormControl>



</Box>

      {/* Tableau des utilisateurs */}
      <Box sx={{ height: 500, width: "100%" }}>
  <DataGrid
    rows={users}
    columns={columns}
    pageSize={pageSize}
    rowCount={totalUsers}
    pagination
    paginationMode="server"
    onPageChange={(newPage) => setPage(newPage)}
    onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
  />
</Box>


      {openModal && (
  <Dialog open={openModal} onClose={() => setOpenModal(false)}>
    <DialogTitle>Account Status Update</DialogTitle>
    <DialogContent>
      <Typography>{statusMessage}</Typography>
    </DialogContent>
  </Dialog>
)}



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
              <MenuItem value="student">Student</MenuItem>
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