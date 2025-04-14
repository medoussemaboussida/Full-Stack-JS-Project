import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Alert, IconButton, InputBase,
  Divider, Chip, Badge, Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Header from "../../components/Header";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import html2pdf from "html2pdf.js";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", start_date: "", end_date: "", event_type: "", status: "" });
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();
  const theme = useTheme();

  const token = localStorage.getItem("jwt-token");

  // Récupérer tous les événements pour le backoffice
  const fetchEvents = async (query = "") => {
    let url = query
      ? `http://localhost:5000/events/searchEvents?searchTerm=${query}`
      : "http://localhost:5000/events/getAllEvents";

    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();

      console.log("📋 Données brutes des événements:", data);

      if (Array.isArray(data)) {
        const eventsWithParticipantCount = data.map(event => ({
          id: event._id,
          ...event,
          participantCount: event.participants?.length || 0,
          created_by_username: event.created_by?.username || "Unknown",
          isApproved: event.isApproved !== undefined ? event.isApproved : false, // Valeur par défaut
        }));
        setEvents(eventsWithParticipantCount);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("❌ Error fetching events:", err);
      setNotification({ open: true, message: "Failed to load events", severity: "error" });
    }
  };

  // Filtrer les événements par statut
  const filterEvents = (eventsList, status) => {
    let filtered = [...eventsList];
    if (status !== "all") {
      filtered = filtered.filter(event => event.status === status);
    }
    return filtered;
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEvents(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const filtered = filterEvents(events, statusFilter);
    setFilteredEvents(filtered);
  }, [events, statusFilter]);

  // Ouvre le formulaire pour ajouter/éditer un événement
  const handleOpen = (event = null) => {
    setFormData(event ? {
      title: event.title,
      description: event.description,
      start_date: event.start_date.slice(0, 16),
      end_date: event.end_date.slice(0, 16),
      event_type: event.event_type,
      status: event.status,
    } : { title: "", description: "", start_date: "", end_date: "", event_type: "", status: "" });
    setOpen(true);
    setError("");
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.start_date || !formData.end_date || !formData.event_type || !formData.status) {
      setNotification({ open: true, message: "All fields must be filled!", severity: "error" });
      return;
    }

    const method = formData.id ? "PUT" : "POST";
    const url = formData.id
      ? `http://localhost:5000/events/${formData.id}`
      : "http://localhost:5000/events/addEvent";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save event");
        return res.json();
      })
      .then((data) => {
        fetchEvents();
        handleClose();
        setNotification({ open: true, message: "Event saved successfully!", severity: "success" });
      })
      .catch((err) => {
        console.error("❌ Error:", err);
        setNotification({ open: true, message: "Failed to save event!", severity: "error" });
      });
  };

  // Voir les détails d'un événement
  const handleViewDetails = (id) => {
    fetch(`http://localhost:5000/events/getEvent/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch event details");
        return res.json();
      })
      .then((data) => {
        setSelectedEvent({
          ...data,
          participantCount: data.participants?.length || 0,
          created_by_username: data.created_by?.username || "Unknown",
        });
        setOpenDetailsModal(true);
      })
      .catch((err) => {
        console.error("❌ Error retrieving event:", err);
        setNotification({ open: true, message: "Failed to load event details", severity: "error" });
      });
  };

  // Supprimer un événement
  const handleOpenDeleteConfirm = (eventId) => {
    setEventToDelete(eventId);
    setOpenDeleteConfirmModal(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirmModal(false);
    setEventToDelete(null);
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/events/${eventToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete event");
      }

      fetchEvents();
      setNotification({ open: true, message: "Event deleted successfully!", severity: "success" });
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error("❌ Error deleting event:", err);
      setNotification({
        open: true,
        message: err.message || "Failed to delete event!",
        severity: "error",
      });
    }
  };

  // Approuver ou désactiver un événement
  const handleToggleApproval = async (id, isApproved) => {
    try {
      const res = await fetch(`http://localhost:5000/events/toggleApproval/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved }),
      });

      if (!res.ok) throw new Error("Failed to toggle approval");
      const data = await res.json();

      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === id ? { ...event, isApproved: data.data.isApproved } : event
        )
      );
      setNotification({ open: true, message: `Event ${isApproved ? "approved" : "disabled"} successfully!`, severity: "success" });
    } catch (err) {
      console.error("❌ Error toggling approval:", err);
      setNotification({ open: true, message: "Failed to toggle approval", severity: "error" });
    }
  };

  // Générer un PDF avec la liste des événements
  const generatePDF = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const eventsByMonth = sortedEvents.reduce((acc, event) => {
      const date = new Date(event.start_date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(event);
      return acc;
    }, {});

    let htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; }
        h2 { color: #555; margin-top: 20px; }
        .event { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .title { font-weight: bold; font-size: 16px; color: #2c3e50; }
        .description { font-size: 14px; color: #666; }
        .meta { font-size: 12px; color: #888; }
      </style>
      <h1>All Events</h1>
    `;

    Object.keys(eventsByMonth).forEach((month) => {
      htmlContent += `<h2>${month}</h2>`;
      eventsByMonth[month].forEach((event) => {
        htmlContent += `
          <div class="event">
            <div class="title">${event.title}</div>
            <div class="description">${event.description}</div>
            <div class="meta">
              Start: ${new Date(event.start_date).toLocaleString()} | 
              End: ${new Date(event.end_date).toLocaleString()} | 
              Type: ${event.event_type} | 
              Status: ${event.status} | 
              Approved: ${event.isApproved ? "Yes" : "No"} | 
              Created By: ${event.created_by_username} | 
              Participants: ${event.participantCount}
            </div>
          </div>
        `;
      });
    });

    const element = document.createElement("div");
    element.innerHTML = htmlContent;
    html2pdf()
      .from(element)
      .set({
        margin: 1,
        filename: "Events_by_Month.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .save()
      .catch((err) => {
        console.error("Error generating PDF:", err);
        setNotification({ open: true, message: "Failed to generate PDF!", severity: "error" });
      });
  };

  // Colonnes du DataGrid
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "description", headerName: "Description", flex: 1.5 },
    {
      field: "start_date",
      headerName: "Start Date",
      flex: 1,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: "end_date",
      headerName: "End Date",
      flex: 1,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    { field: "event_type", headerName: "Event Type", flex: 1 },
    {
      field: "created_by_username",
      headerName: "Created By",
      flex: 1,
      renderCell: (params) => (
        <Typography>{params.value || "Unknown"}</Typography>
      ),
    },
    {
      field: "participantCount",
      headerName: "Participants",
      flex: 1,
      renderCell: (params) => (
        <Chip
          icon={<PeopleIcon />}
          label={params.value}
          sx={{ backgroundColor: "#4caf50", color: "#fff" }}
        />
      ),
    },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "isApproved",
      headerName: "Approval",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value ? "Disable Event" : "Approve Event"}>
          <IconButton
            color={params.value ? "success" : "warning"}
            onClick={() => handleToggleApproval(params.row.id, !params.value)}
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
          <Tooltip title="View Details">
            <IconButton
              color="info"
              onClick={() => handleViewDetails(params.row.id)}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Event">
            <IconButton
              color="warning"
              onClick={() => handleOpen(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Event">
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

  return (
    <Box m="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
        <Header title="Events" subtitle="List of all events and their participants" />
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

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" backgroundColor="#424242" borderRadius="3px" p={1} width="100%" maxWidth="500px">
          <InputBase
            sx={{ ml: 2, flex: 1, color: "#fff" }}
            placeholder="Search for an Event"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton type="button" sx={{ p: 1, color: "#fff" }}>
            <SearchIcon />
          </IconButton>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: "#fff", "&.Mui-focused": { color: "#4caf50" } }}>
            Filter by Status
          </InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              backgroundColor: "#424242",
              color: "#fff",
              borderRadius: "8px",
              height: "48px",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#616161" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#4caf50" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#4caf50", boxShadow: "0 0 8px #4caf50" },
              "& .MuiSvgIcon-root": { color: "#fff" },
              "& .MuiSelect-select": { padding: "12px" },
            }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="upcoming">Upcoming</MenuItem>
            <MenuItem value="ongoing">Ongoing</MenuItem>
            <MenuItem value="past">Past</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={generatePDF}
          sx={{
            backgroundColor: "#1976d2",
            color: "#fff",
            "&:hover": { backgroundColor: "#115293" },
            height: "48px",
            padding: "0 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            },
          }}
        >
          Generate PDF
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => handleOpen()}
          sx={{
            height: "48px",
            padding: "0 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            },
          }}
        >
          Add Event
        </Button>
      </Box>

      <Box sx={{ height: 500, width: "100%", minWidth: "1200px" }}>
        <DataGrid checkboxSelection rows={filteredEvents} columns={columns} />
      </Box>

      {/* Modal pour les détails de l'événement */}
      <Dialog
        open={openDetailsModal}
        onClose={() => setOpenDetailsModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#424242",
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.8rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: "#1976d2",
            color: "#fff",
            padding: "16px 24px",
            borderBottom: "1px solid #616161",
          }}
        >
          Event Details
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: "#424242",
            color: "#fff",
          }}
        >
          {selectedEvent ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                alignItems: "center",
                textAlign: "center",
                animation: "fadeIn 0.5s ease-in",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "#4caf50",
                  marginBottom: "10px",
                  wordWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                {selectedEvent.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: "1.6",
                  color: "#e0e0e0",
                  backgroundColor: "#616161",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
                  maxWidth: "100%",
                  wordWrap: "break-word",
                }}
              >
                {selectedEvent.description}
              </Typography>
              <Chip
                label={`Status: ${selectedEvent.status}`}
                sx={{
                  fontSize: "1rem",
                  padding: "6px 12px",
                  backgroundColor:
                    selectedEvent.status === "upcoming" ? "#ffca28" :
                    selectedEvent.status === "ongoing" ? "#4caf50" :
                    selectedEvent.status === "past" ? "#f44336" :
                    selectedEvent.status === "canceled" ? "#9e9e9e" : "#1976d2",
                  color: "#fff",
                  fontWeight: "500",
                  borderRadius: "16px",
                }}
              />
              <Chip
                label={`Approved: ${selectedEvent.isApproved ? "Yes" : "No"}`}
                sx={{
                  fontSize: "1rem",
                  padding: "6px 12px",
                  backgroundColor: selectedEvent.isApproved ? "#4caf50" : "#ff9800",
                  color: "#fff",
                  fontWeight: "500",
                  borderRadius: "16px",
                }}
              />
              <Box sx={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
                <Typography sx={{ fontSize: "1rem", color: "#bdbdbd" }}>
                  <strong>Start:</strong> {new Date(selectedEvent.start_date).toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: "1rem", color: "#bdbdbd" }}>
                  <strong>End:</strong> {new Date(selectedEvent.end_date).toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: "1rem", color: "#bdbdbd" }}>
                  <strong>Type:</strong> {selectedEvent.event_type}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "1rem", color: "#bdbdbd" }}>
                <strong>Created By:</strong> {selectedEvent.created_by_username}
              </Typography>
              <Chip
                icon={<PeopleIcon />}
                label={`Participants: ${selectedEvent.participantCount}`}
                sx={{ backgroundColor: "#4caf50", color: "#fff", fontSize: "1rem", padding: "6px 12px" }}
              />
            </Box>
          ) : (
            <Typography sx={{ textAlign: "center", color: "#bdbdbd", fontSize: "1.2rem" }}>
              No event data available
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: "#424242",
            borderTop: "1px solid #616161",
          }}
        >
          <Button
            onClick={() => setOpenDetailsModal(false)}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: "#fff",
              borderColor: "#616161",
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: "#616161", borderColor: "#757575" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog
        open={openDeleteConfirmModal}
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#424242",
            overflow: "hidden",
            transition: "all 0.3s ease-in-out",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.5rem",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: "#f44336",
            color: "#fff",
            padding: "16px 24px",
            borderBottom: "1px solid #616161",
          }}
        >
          Confirmer la Suppression
        </DialogTitle>
        <DialogContent
          sx={{
            padding: "24px",
            backgroundColor: "#424242",
            color: "#fff",
          }}
        >
          <Typography sx={{ fontSize: "1.2rem", textAlign: "center" }}>
            Are you sure you want to delete this event? This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            padding: "16px 24px",
            backgroundColor: "#424242",
            borderTop: "1px solid #616161",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={handleCloseDeleteConfirm}
            variant="outlined"
            sx={{
              fontSize: "1.1rem",
              color: "#fff",
              borderColor: "#616161",
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: "#616161", borderColor: "#757575" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteEvent}
            variant="contained"
            sx={{
              fontSize: "1.1rem",
              backgroundColor: "#f44336",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: "#d32f2f" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour ajouter/éditer un événement */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{formData.id ? "Update Event" : "Add Event"}</DialogTitle>
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
          <TextField
            fullWidth
            margin="dense"
            label="Start Date"
            type="datetime-local"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            margin="dense"
            label="End Date"
            type="datetime-local"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Event Type</InputLabel>
            <Select name="event_type" value={formData.event_type} onChange={handleChange}>
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="in-person">In-Person</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} onChange={handleChange}>
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="ongoing">Ongoing</MenuItem>
              <MenuItem value="past">Past</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </Select>
          </FormControl>
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

export default Events;

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);