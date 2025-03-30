import { Box, IconButton, useTheme, Tooltip } from "@mui/material";
import { useContext } from "react";
import { ColorModeContext, tokens } from "../../theme";
import InputBase from "@mui/material/InputBase";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SearchIcon from "@mui/icons-material/Search";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:5000";

const Topbar = ({ setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        console.log("Aucun token trouvé, déconnexion côté client uniquement");
        localStorage.removeItem("jwt-token");
        navigate("/");
        window.location.href = "http://localhost:3000/login";
        return;
      }

      await axios.post(
        `${BASE_URL}/api/users/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      localStorage.removeItem("jwt-token");
      console.log("✅ Déconnexion réussie !");
      navigate("/");
      window.location.href = "http://localhost:3000/login";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error.response?.data || error.message);
      localStorage.removeItem("jwt-token");
      navigate("/");
      window.location.href = "http://localhost:3000/login";
    }
  };

  return (
    <Box display="flex" justifyContent="flex-end" alignItems="center" p={2}>
      {/* BARRE DE RECHERCHE MASQUÉE */}
      <Box display="none">
        <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" />
        <IconButton type="button" sx={{ p: 1 }}>
          <SearchIcon />
        </IconButton>
      </Box>

      {/* ✅ TOUS LES ICONES À DROITE */}
      <Box display="flex" gap={2}>
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? (
            <DarkModeOutlinedIcon />
          ) : (
            <LightModeOutlinedIcon />
          )}
        </IconButton>
        <IconButton>
          <SettingsOutlinedIcon />
        </IconButton>
        <IconButton>
          <PersonOutlinedIcon />
        </IconButton>
        <Tooltip
          title={
            <span style={{ fontSize: "13px", color: colors.grey[1000] }}>
              Logout
            </span>
          }
          arrow
          componentsProps={{
            tooltip: {
              sx: {
                backgroundColor: colors.grey[900],
                padding: "10px 15px",
                "& .MuiTooltip-arrow": {
                  color: colors.grey[900],
                },
              },
            },
          }}
        >
          <IconButton onClick={handleLogout}>
            <LogoutOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Topbar;