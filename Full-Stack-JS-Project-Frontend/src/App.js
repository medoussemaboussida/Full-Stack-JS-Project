import React from 'react'; 
import About from './pages/About';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Forgot_Password from './pages/Forgot-Password';
import DetailsStudent from './pages/details-student';
import Reset_Password from './pages/Reset-Password';
import AccountDisabled from './pages/AccountDisabled'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Forum from './pages/Forum';
import AddForum from './pages/AddForum';
import ForumModerate from './pages/ForumModerate'

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

        <Route path="/AccountDisabled" element={<AccountDisabled />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/addforum" element={<AddForum />} />
        <Route path="/moderateForum" element={<ForumModerate />} />



        </Routes>
      </BrowserRouter>
       
    )
}

export default App;