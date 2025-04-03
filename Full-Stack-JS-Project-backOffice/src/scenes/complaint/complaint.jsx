import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Avatar,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Modal,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import DeleteIcon from "@mui/icons-material/Delete";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminComplaints = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState(null);

  // Récupérer toutes les réclamations (pour l'admin)
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        if (!token) {
          console.error("No token found.");
          toast.error("No token found. Please log in as an admin.");
          return;
        }

        const response = await fetch("http://localhost:5000/complaint/getComplaint", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setComplaints(data);
          setFilteredComplaints(data);
        } else {
          console.error("Erreur lors de la récupération des réclamations:", data.message);
          toast.error("Failed to load complaints: " + data.message);
        }
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
        toast.error("Error loading complaints!");
      }
    };

    fetchComplaints();
  }, []);

  // Filtrer et trier les réclamations
  useEffect(() => {
    let updatedComplaints = [...complaints];

    // Filtrer par recherche
    if (searchQuery) {
      updatedComplaints = updatedComplaints.filter((complaint) => {
        const userName = complaint.user_id?.username?.toLowerCase() || "";
        const subject = complaint.subject?.toLowerCase() || "";
        const description = complaint.description?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return userName.includes(query) || subject.includes(query) || description.includes(query);
      });
    }

    // Filtrer par statut
    if (statusFilter !== "all") {
      updatedComplaints = updatedComplaints.filter((complaint) => complaint.status === statusFilter);
    }

    // Trier par date
    updatedComplaints.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredComplaints(updatedComplaints);
  }, [searchQuery, sortOption, statusFilter, complaints]);

  // Supprimer une réclamation
  const handleDeleteComplaint = async (complaintId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaint/deleteComplaint/${complaintId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setComplaints(complaints.filter((complaint) => complaint._id !== complaintId));
        setFilteredComplaints(filteredComplaints.filter((complaint) => complaint._id !== complaintId));
        setOpenDeleteModal(false);
        toast.success("Complaint deleted successfully!");
      } else {
        console.error("Erreur lors de la suppression de la réclamation:", data.message);
        toast.error("Failed to delete complaint: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la réclamation:", error);
      toast.error("Error deleting complaint!");
    }
  };

  // Mettre à jour le statut d'une réclamation
  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaint/updateComplaintStatus/${complaintId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Mettre à jour l'état local
        setComplaints(
          complaints.map((complaint) =>
            complaint._id === complaintId ? { ...complaint, status: newStatus } : complaint
          )
        );
        setFilteredComplaints(
          filteredComplaints.map((complaint) =>
            complaint._id === complaintId ? { ...complaint, status: newStatus } : complaint
          )
        );
        toast.success("Complaint status updated successfully!");
      } else {
        console.error("Erreur lors de la mise à jour du statut:", data.message);
        toast.error("Failed to update status: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Error updating status!");
    }
  };

  return (
    <Box m="20px">
      {/* Ajout du composant ToastContainer pour afficher les notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <Header
        title="COMPLAINTS MANAGEMENT"
        subtitle="List of all user complaints"
      />

      {/* Filtres et recherche */}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <TextField
          label="Search by username, subject, or description"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
        />
        <Box display="flex" gap={2}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Liste des réclamations */}
      <Box mt={4}>
        {filteredComplaints.length > 0 ? (
          filteredComplaints.map((complaint, index) => (
            <Box
              key={index}
              bgcolor={colors.primary[400]}
              p={2}
              borderRadius={2}
              mb={2}
              boxShadow={3}
            >
              {/* Informations de l'utilisateur et de la réclamation */}
              <Box>
                {/* Photo et nom d'utilisateur alignés */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar
                    src={
                      complaint.user_id?.user_photo
                        ? `http://localhost:5000${complaint.user_id.user_photo}`
                        : "/assets/default_user.png"
                    }
                    alt="User Avatar"
                    sx={{ width: 30, height: 30 }}
                  />
                  <Typography variant="h5">
                    <strong>Posted By: </strong> {complaint.user_id?.username || "Unknown"}
                    <span
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #00BFFF",
                        color: "#00BFFF",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                        fontSize: "0.875rem",
                        marginLeft: "8px",
                      }}
                    >
                      {complaint.user_id?.level || "N/A"} {complaint.user_id?.speciality || "N/A"}
                    </span>
                  </Typography>
                </Box>
                <br />
                <Typography variant="h6">
                  <strong>Subject: </strong> {complaint.subject}
                </Typography>
                <Box
                  mt={1}
                  p={1}
                  bgcolor={colors.blueAccent[700]}
                  borderRadius={1}
                  sx={{ maxHeight: 100, overflowY: "auto" }}
                >
                  <Typography variant="body1">
                    <strong>Description: </strong> {complaint.description}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Posted at:{" "}
                  {new Date(complaint.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <br />
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    color={
                      complaint.status === "pending"
                        ? "orange"
                        : complaint.status === "resolved"
                        ? "green"
                        : "red"
                    }
                  >
                    <strong>Status: </strong>
                  </Typography>
                  <FormControl sx={{ minWidth: 120 }}>
                    <Select
                      value={complaint.status}
                      onChange={(e) => handleUpdateStatus(complaint._id, e.target.value)}
                      sx={{
                        height: "30px",
                        color:
                          complaint.status === "pending"
                            ? "orange"
                            : complaint.status === "resolved"
                            ? "green"
                            : "red",
                      }}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <br />
                {/* Bouton de suppression en bas */}
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="error"
                    size="medium"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setComplaintToDelete(complaint._id);
                      setOpenDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            </Box>
          ))
        ) : (
          <Typography variant="body1" textAlign="center">
            No complaints found.
          </Typography>
        )}
      </Box>

      {/* Modal de confirmation de suppression */}
      <Modal open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "40%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Confirm Deletion
          </Typography>
          <Typography variant="body1" mb={2} color="white">
            Are you sure you want to delete this complaint? This action cannot be undone.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDeleteComplaint(complaintToDelete)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminComplaints;