import React from 'react'; 
import About from './pages/About';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Forgot_Password from './pages/Forgot-Password';
import DetailsStudent from './pages/details-student';
import Reset_Password from './pages/Reset-Password';
import AccountDisabled from './pages/AccountDisabled';
import Publication from './pages/Publication';
import PublicationPsychiatristAll from './pages/PublicationPsychiatristAll';
import PublicationDetailPsy from './pages/PublicationDetailPsy';
import PsychiatristList from './pages/PsychiatristList ';
import AddPublication from './pages/AddPublication';
import FavoriteActivities from './pages/favoriteActivities';
import AppointmentHistory from './pages/AppointmentHistory';
import Chat from './pages/Chat';



import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VerifyAccount from './pages/VerifyAuth';
import AddForum from './pages/AddForum';
import Forum from './pages/Forum';


function App(){

    return(
      <BrowserRouter>
      <Routes>
        {/* Rediriger la racine ("/") vers "/login" */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Forgot_Password />} />
        <Route path="/student" element={<DetailsStudent />} />
        <Route path="/reset-password/:token" element={<Reset_Password />} />
        <Route path="/verify-account/:token" element={<VerifyAccount/>} />

        <Route path="/AccountDisabled" element={<AccountDisabled />} />
        <Route path="/Publication" element={<Publication />} />
        <Route path="/PublicationPsychiatristAll" element={<PublicationPsychiatristAll />} />
        <Route path="/PublicationDetailPsy/:id" element={<PublicationDetailPsy />} />
        <Route path="/PsychiatristList" element={<PsychiatristList />} />
        <Route path="/AddPublication" element={<AddPublication />} />
        
        <Route path="/favoriteActivities" element={<FavoriteActivities />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/AddForum" element={<AddForum />} />
        <Route path="/appointment-history" element={<AppointmentHistory />} />
        <Route path="/chat" element={<Chat />} />






        </Routes>
      </BrowserRouter>
       
    )
}

export default App;
