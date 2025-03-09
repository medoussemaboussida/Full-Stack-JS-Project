import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Avatar,
  Button,
  Modal,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import VisibilityIcon from "@mui/icons-material/Visibility";

const Forum = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [forums, setForums] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedForum, setSelectedForum] = useState(null);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/forum/getForum");
        const data = await response.json();
        setForums(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, []);

  const handleViewComments = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`
      );
      const data = await response.json();
      setComments(data);
      setSelectedForum(forumId);
      setOpenModal(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des commentaires:", error);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedForum(null);
    setComments([]);
  };

  return (
    <Box m="20px">
      <Header
        title="FORUM MANAGEMENT"
        subtitle="List of forum topics and their comments"
      />
      <Box mt={4}>
        {forums.map((forum, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            bgcolor={colors.primary[400]}
            p={2}
            borderRadius={2}
            mb={2}
            boxShadow={3}
          >
            {forum.forum_photo && (
              <img
                src={forum.forum_photo}
                alt="Forum"
                style={{
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  marginRight: 16,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            <Box>
              <Typography variant="h4">
                <strong>Forum topic : </strong> {forum.title}
              </Typography>
              <br />
              <Typography variant="h5">
                <strong>Posted By :</strong>{" "}
                {forum.user_id?.username || "Unknown"} &nbsp; &nbsp;
                <span
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #00BFFF", // Cadre bleu
                    color: "#00BFFF", // Texte bleu
                    padding: "2px 8px",
                    borderRadius: "20px",
                    boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                    fontSize: "0.875rem", // Petit texte
                  }}
                >
                  {forum.user_id?.level} {forum.user_id?.speciality}
                </span>
              </Typography>
              <br />
              <Box
                mt={1}
                p={1}
                bgcolor={colors.blueAccent[700]}
                borderRadius={1}
                sx={{ maxHeight: 100, overflowY: "auto" }}
              >
                <Typography variant="h6">
                  <strong>Description : </strong> {forum.description}
                </Typography>
              </Box>
              <br />
              <Button
                variant="contained"
                color="info"
                size="medium"
                startIcon={<VisibilityIcon />}
                onClick={() => handleViewComments(forum._id)}
              >
                View comments
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Modal des commentaires */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "60%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2}>
            Comments for Forum Topic:{" "}
            {forums.find((forum) => forum._id === selectedForum)?.title}
          </Typography>

          {/* Affichage des commentaires dans un modal */}
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <Box key={index} mb={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    src={`http://localhost:5000/uploads/${comment.user_id?.user_photo}`}
                    alt="User Avatar"
                    sx={{
                      width: 40,
                      height: 40,
                      objectFit: "cover",
                    }}
                  />
                  <Box display="flex" flexDirection="row" alignItems="center">
                    <Typography variant="body1">
                      {comment.user_id?.username}
                    </Typography>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Typography variant="body2" sx={{ color: "#00BFFF" }}>
                      <span
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid #00BFFF", // Cadre bleu
                          color: "#00BFFF", // Texte bleu
                          padding: "2px 8px",
                          borderRadius: "20px",
                          boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                          fontSize: "0.875rem", // Petit texte
                        }}
                      >
                        {comment.user_id?.level} {comment.user_id?.speciality}
                      </span>
                    </Typography>
                  </Box>
                </Box>
                <br />
                <Box
                  display="flex"
                  alignItems="center"
                  bgcolor={colors.primary[400]}
                  p={2}
                  borderRadius={2}
                  mb={2}
                  boxShadow={3}
                  sx={{ maxHeight: 100, overflowY: "auto" }}
                >
                  <Typography variant="h6">{comment.content}</Typography>
                </Box>{" "}
              </Box>
            ))
          ) : (
            <Typography variant="body2">No comments available.</Typography>
          )}

          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Forum;
