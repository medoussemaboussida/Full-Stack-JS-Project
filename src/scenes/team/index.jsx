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
  const [archivedUsers, setArchivedUsers] = useState([]);  // Nouvel état pour les utilisateurs archivés
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", role: "student", dob: "", level: "", password: "" });
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);  // Etat pour afficher la liste des utilisateurs archivés
  const [selectedUser, setSelectedUser] = useState(null);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  
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

  // Charger les utilisateurs archivés depuis l'API
  useEffect(() => {
    fetch("http://localhost:5001/users/archived")
        .then((res) => res.json())
        .then((data) => {
            if (Array.isArray(data)) {
                const formattedData = data
                    .filter(user => user.isArchived) // On ne prend que les utilisateurs archivés
                    .map((user) => ({
                        id: user._id,
                        username: user.username,
                        age: new Date().getFullYear() - new Date(user.dob).getFullYear(),
                        email: user.email,
                        role: user.role,
                        verified: user.isVerified ? "✔️" : "❌",
                    }));
                setArchivedUsers(formattedData);
            } else {
                console.error("Les données retournées ne sont pas un tableau.");
            }
        })
        .catch((err) => {
            console.error("❌ Erreur lors de la récupération des utilisateurs archivés :", err);
        });
}, []);

  
  // Ouvrir la modal (Ajout ou Modification)
  const handleOpen = (user = null) => {
    setFormData(user || { username: "", email: "", role: "student", dob: "", level: "", password: "" });
    setOpen(true);
    setError("");
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

    // Assurez-vous que le rôle est valide
    if (!["student", "teacher", "psychiatrist"].includes(formData.role)) {
        setError("Le rôle est invalide !");
        return;
    }

    console.log("🚀 Données envoyées au backend :", formData);

    const method = formData.id ? "PUT" : "POST";
    const url = formData.id ? `http://localhost:5001/users/${formData.id}` : "http://localhost:5001/users/create";

    fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Erreur inconnue");
        }
        return data;
    })
    .then((data) => {
        console.log("✔️ Réponse reçue du backend :", data);
        alert("Utilisateur ajouté avec succès !");
        setUsers((prev) => [...prev, { ...data.user, id: data.user._id }]); // Mise à jour de la liste avec l'utilisateur ajouté
        handleClose();
    })
    .catch((err) => {
        console.error("❌ Erreur lors de la création de l'utilisateur :", err);
        setError(err.message || "Une erreur est survenue !");
    });
};


  // Archiver un utilisateur
  const handleArchive = (id) => {
    if (window.confirm("Voulez-vous vraiment archiver cet utilisateur ?")) {
        fetch(`http://localhost:5001/users/archive/${id}`, { method: "PATCH" })
            .then((res) => res.json())
            .then((data) => {
                if (data.message === "Utilisateur archivé avec succès.") {
                    alert("Utilisateur archivé !");
                    setUsers((prevUsers) => prevUsers.filter(user => user.id !== id)); // Supprime de la liste active

                    fetch(`http://localhost:5001/users/${id}`) // Recharger les infos de l'utilisateur archivé
                        .then((res) => res.json())
                        .then((archivedUser) => {
                            setArchivedUsers(prevArchived => [...prevArchived, {
                                id: archivedUser._id,
                                username: archivedUser.username,
                                age: new Date().getFullYear() - new Date(archivedUser.dob).getFullYear(),
                                email: archivedUser.email,
                                role: archivedUser.role,
                                verified: archivedUser.isVerified ? "✔️" : "❌",
                            }]);
                        })
                        .catch(err => console.error("❌ Erreur lors de la récupération de l'utilisateur archivé :", err));
                }
            })
            .catch((err) => console.error("❌ Erreur lors de l'archivage :", err));
    }
};

  
useEffect(() => {
  console.log("📢 État de openProfileModal :", openProfileModal);
}, [openProfileModal]);


  // Voir le profil d'un utilisateur
  const handleViewProfile = (id) => {
    fetch(`http://localhost:5001/users/${id}`)
        .then((res) => res.json())
        .then((data) => {
            if (data && data._id) {
                console.log("✅ Utilisateur récupéré :", data);
                setSelectedUser(data);

                setTimeout(() => {
                    setOpenProfileModal(true);
                }, 200); // Petit délai pour éviter les erreurs d'affichage
            } else {
                console.error("⚠️ Erreur: Utilisateur non trouvé !");
                alert("Utilisateur non trouvé !");
            }
        })
        .catch((err) => console.error("❌ Erreur lors de la récupération de l'utilisateur :", err));
  };


  // Colonnes du tableau
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "username", headerName: "Nom", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "role", headerName: "Rôle", flex: 1 },
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

      {/* Bouton pour afficher les utilisateurs archivés */}
      <Button variant="contained" color="secondary" onClick={() => setShowArchived(!showArchived)} sx={{ mb: 2 }}>
  {showArchived ? "Retour à la liste des utilisateurs" : "Afficher les utilisateurs archivés"}
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
        <DataGrid checkboxSelection rows={showArchived ? archivedUsers : users} columns={columns}  />
      </Box>
{/* 🔹 Modale de profil de l'utilisateur */}
<Dialog open={openProfileModal} onClose={() => setOpenProfileModal(false)}
        sx={{ visibility: openProfileModal ? "visible" : "hidden", opacity: openProfileModal ? 1 : 0, transition: "opacity 0.3s" }}>
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
