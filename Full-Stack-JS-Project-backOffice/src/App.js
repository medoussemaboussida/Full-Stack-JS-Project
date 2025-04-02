import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/dashboard";
import Team from "./scenes/team";
import Publication from "./scenes/publication/publication";
import Invoices from "./scenes/invoices";
import Contacts from "./scenes/contacts";
import Bar from "./scenes/bar";
import Form from "./scenes/form";
import Line from "./scenes/line";
import Pie from "./scenes/pie";
import FAQ from "./scenes/faq";
import Geography from "./scenes/geography";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Calendar from "./scenes/calendar/calendar";
import Forum from "./scenes/forum/forum";
import Appointment from "./scenes/Appointment/Appointment";
import { NotificationProvider } from "./scenes/publication/NotificationContext"; // Importer le NotificationProvider
import Activities from "./scenes/passtime/activities";
import Categories from "./scenes/passtime/Categories";

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Vérifier si un token est déjà stocké
    let storedToken = localStorage.getItem("jwt-token");

    if (!storedToken) {
      // Récupérer le token depuis l'URL si nécessaire
      const params = new URLSearchParams(location.search);
      const urlToken = params.get("token");

      if (urlToken) {
        localStorage.setItem("jwt-token", urlToken);
        storedToken = urlToken;
        console.log("✅ Token récupéré depuis l'URL et stocké !");
        
        // Nettoyer l’URL uniquement après avoir stocké le token
        window.history.replaceState({}, document.title, "/");
      }
    } else {
      console.log("🔄 Token déjà présent dans localStorage !");
    }
  }, [location]);
  
  return (
    <NotificationProvider> {/* Envelopper l'application avec NotificationProvider */}
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="app">
            <Sidebar isSidebar={isSidebar} />
            <main className="content">
              <Topbar setIsSidebar={setIsSidebar} />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/team" element={<Team />} />
                <Route path="/publication" element={<Publication />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/form" element={<Form />} />
                <Route path="/bar" element={<Bar />} />
                <Route path="/pie" element={<Pie />} />
                <Route path="/line" element={<Line />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/geography" element={<Geography />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/appointment" element={<Appointment />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/categories" element={<Categories />} />

              </Routes>
            </main>
          </div>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </NotificationProvider>
  );
}

export default App;