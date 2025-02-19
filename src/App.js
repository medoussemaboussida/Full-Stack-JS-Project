import React from 'react'; 
import About from './pages/About';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Forgot_Password from './pages/Forgot-Password';
import { BrowserRouter, Routes, Route } from 'react-router-dom';


function App(){
    return(
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Forgot_Password />} />

      </Routes>
      </BrowserRouter>
       
    )
}

export default App;