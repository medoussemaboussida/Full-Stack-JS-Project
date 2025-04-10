import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputBase, Alert, IconButton, Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import Header from "../../components/Header"; // Assurez-vous que ce composant existe
import Snackbar from '@mui/material/Snackbar';
import axios from "axios";

const Associations = () => {
  const [associations, setAssociations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ Name_association: "", Description_association: "", contact_email_association: "", support_type: "" });
  const [error, setError] = useState("");
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [associationToDelete, setAssociationToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Ajout de l'état isLoading
  const navigate = useNavigate();

  const token = localStorage.getItem("jwt-token");

  // Récupérer toutes les associations pour le back-office
  const fetchAssociations = async () => {
    try {
      console.log('Fetching all associations from API...');
      const token = localStorage.getItem('jwt-token');
      if (!token) throw new Error('No token found');
      const response = await fetch('http://localhost:5000/association/getAssociations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('API Response:', data);
      setAssociations(data.map(assoc => ({ ...assoc, id: assoc._id }))); // Ajout de l'id pour DataGrid
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching associations:', err);
      setNotification({ open: true, message: `Failed to load associations: ${err.message}`, severity: 'error' });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociations();
  }, []);

  // Pas besoin de fetchAssociations dans ce useEffect car il n'y a pas de recherche côté serveur pour l'instant
  // useEffect(() => {
  //   const delayDebounceFn = setTimeout(() => {
  //     fetchAssociations(searchQuery);
  //   }, 500);
  //   return () => clearTimeout(delayDebounceFn);
  // }, [searchQuery]);

  // Ouvre le formulaire pour ajouter/éditer une association
  const handleOpen = (association = null) => {
    setFormData(association ? {
      Name_association: association.Name_association,
      Description_association: association.Description_association,
      contact_email_association: association.contact_email_association,
      support_type: association.support_type,
    } : { Name_association: "", Description_association: "", contact_email_association: "", support_type: "" });
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.Name_association || !formData.Description_association || !formData.contact_email_association || !formData.support_type) {
      setNotification({ open: true, message: "All fields must be filled!", severity: "error" });
      return;
    }

    const method = selectedAssociation ? "PUT" : "POST";
    const url = selectedAssociation
      ? `http://localhost:5000/association/updateAssociation/${selectedAssociation._id}`
      : "http://localhost:5000/association/addAssociation";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save association");
      fetchAssociations();
      handleClose();
      setNotification({ open: true, message: "Association saved successfully!", severity: "success" });
    } catch (err) {
      console.error("❌ Error:", err);
      setNotification({ open: true, message: "Failed to save association!", severity: "error" });
    }
  };

  // Voir les détails d'une association
  const handleViewDetails = (id) => {
    fetch(`http://localhost:5000/association/getAssociationById/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch association details");
        return res.json();
      })
      .then((data) => {
        setSelectedAssociation({
          ...data,
          user_username: data.user_id?.username || "Unknown",
        });
        setOpenDetailsModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving association:", err);
        setNotification({ open: true, message: "Failed to load association details", severity: "error" });
      });
  };

  // Supprimer une association
  const handleOpenDeleteConfirm = (associationId) => {
    setAssociationToDelete(associationId);
    setOpenDeleteConfirmModal(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirmModal(false);
    setAssociationToDelete(null);
  };

  const handleDeleteAssociation = async () => {
    if (!associationToDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/association/deleteAssociation/${associationToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete association");
      fetchAssociations();
      setNotification({ open: true, message: "Association deleted successfully!", severity: "success" });
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error("❌ Error deleting association:", err);
      setNotification({ open: true, message: "Failed to delete association!", severity: "error" });
    }
  };

  // Basculer l’approbation d’une association
  const handleToggleApproval = async (id, isApproved) => {
    try {
      const res = await fetch(`http://localhost:5000/association/toggleApproval/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: !isApproved }), // Inverser l'état actuel
      });

      if (!res.ok) throw new Error("Failed to toggle approval");
      const data = await res.json();

      setAssociations(prevAssociations =>
        prevAssociations.map(assoc =>
          assoc.id === id ? { ...assoc, isApproved: data.data.isApproved } : assoc
        )
      );
      setNotification({ open: true, message: `Association ${!isApproved ? "approved" : "disabled"} successfully!`, severity: "success" });
    } catch (err) {
      console.error("❌ Error toggling approval:", err);
      setNotification({ open: true, message: "Failed to toggle approval", severity: "error" });
    }
  };

  // Colonnes du DataGrid
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "Name_association", headerName: "Nom", flex: 1 },
    { field: "Description_association", headerName: "Description", flex: 1.5 },
    { field: "contact_email_association", headerName: "Email", flex: 1 },
    { field: "support_type", headerName: "Type de Support", flex: 1 },
    { field: "user_username", headerName: "Créée par", flex: 1 },
    {
      field: "isApproved",
      headerName: "Approbation",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value ? "Désactiver l'association" : "Approuver l'association"}>
          <IconButton
            color={params.value ? "success" : "warning"}
            onClick={() => handleToggleApproval(params.row.id, params.value)}
          >
            {params.value ? <CheckCircleIcon /> : <CancelIcon />}
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" gap={1} sx={{ alignItems: "center" }}>
          <Tooltip title="Voir les détails">
            <IconButton
              color="info"
              onClick={() => handleViewDetails(params.row.id)}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Éditer l'association">
            <IconButton
              color="warning"
              onClick={() => handleOpen(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer l'association">
            <IconButton
              color="error"
              onClick={() => handleOpenDeleteConfirm(params.row.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Filtrer les associations en fonction de la recherche
  const filteredAssociations = associations.filter(assoc =>
    assoc.Name_association.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assoc.Description_association.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box m="20px">
      {isLoading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Header title="Associations" subtitle="Liste de toutes les associations" />
            <Snackbar
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              open={notification.open}
              autoHideDuration={6000}
              onClose={() => setNotification({ ...notification, open: false })}
            >
              <Alert
                onClose={() => setNotification({ ...notification, open: false })}
                severity={notification.severity}
                sx={{ width: "100%" }}
              >
                {notification.message}
              </Alert>
            </Snackbar>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" backgroundColor="#424242" borderRadius="3px" p={1} width="100%" maxWidth="500px">
              <InputBase
                sx={{ ml: 2, flex: 1, color: "#fff" }}
                placeholder="Rechercher une association"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <IconButton type="button" sx={{ p: 1, color: "#fff" }}>
                <SearchIcon />
              </IconButton>
            </Box>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleOpen()}
              sx={{ height: "48px" }}
            >
              Ajouter une Association
            </Button>
          </Box>

          <Box sx={{ height: 500, width: "100%" }}>
            <DataGrid checkboxSelection rows={filteredAssociations} columns={columns} />
          </Box>

          {/* Modal pour les détails de l'association */}
          <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)}>
            <DialogTitle>Détails de l'Association</DialogTitle>
            <DialogContent>
              {selectedAssociation ? (
                <>
                  <Typography><strong>Nom :</strong> {selectedAssociation.Name_association}</Typography>
                  <Typography><strong>Description :</strong> {selectedAssociation.Description_association}</Typography>
                  <Typography><strong>Email :</strong> {selectedAssociation.contact_email_association}</Typography>
                  <Typography><strong>Type de Support :</strong> {selectedAssociation.support_type}</Typography>
                  <Typography><strong>Créée par :</strong> {selectedAssociation.user_username}</Typography>
                  <Typography><strong>Approuvée :</strong> {selectedAssociation.isApproved ? "Oui" : "Non"}</Typography>
                  {selectedAssociation.logo_association && (
                    <img src={`http://localhost:5000${selectedAssociation.logo_association}`} alt="Logo" style={{ maxWidth: "200px" }} />
                  )}
                </>
              ) : (
                <Typography>Aucune donnée disponible</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetailsModal(false)}>Fermer</Button>
            </DialogActions>
          </Dialog>

          {/* Modal de confirmation de suppression */}
          <Dialog open={openDeleteConfirmModal} onClose={handleCloseDeleteConfirm}>
            <DialogTitle>Confirmer la Suppression</DialogTitle>
            <DialogContent>
              <Typography>Êtes-vous sûr de vouloir supprimer cette association ? Cette action est irréversible.</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteConfirm}>Annuler</Button>
              <Button onClick={handleDeleteAssociation} color="error">Supprimer</Button>
            </DialogActions>
          </Dialog>

          {/* Modal pour ajouter/éditer une association */}
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{selectedAssociation ? "Modifier l'Association" : "Ajouter une Association"}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                margin="dense"
                label="Nom"
                name="Name_association"
                value={formData.Name_association}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                margin="dense"
                label="Description"
                name="Description_association"
                value={formData.Description_association}
                onChange={handleChange}
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                margin="dense"
                label="Email de Contact"
                name="contact_email_association"
                value={formData.contact_email_association}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                margin="dense"
                label="Type de Support"
                name="support_type"
                value={formData.support_type}
                onChange={handleChange}
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Annuler</Button>
              <Button onClick={handleSubmit} variant="contained" color="primary">
                {selectedAssociation ? "Mettre à jour" : "Ajouter"}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default Associations;