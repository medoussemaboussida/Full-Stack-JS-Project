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
import Activities from './pages/Activities';
import AppointmentHistory from './pages/AppointmentHistory';
import Chat from './pages/Chat';
import AddActivity from './pages/add-activity';
import Associations from './pages/Associations';
import AssociationDetails from './pages/AssociationDetails';
import AddAssociation from './pages/AddAssociation';
import AddEvent from './pages/AddEvent';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import VerifyAccount from './pages/VerifyAuth';
import AddForum from './pages/AddForum';
import Forum from './pages/Forum';
import Navbar from './pages/Navbar';
import Footer from './pages/Footer';
import EditActivity from './pages/edit-activity'; // Make sure you have this component for editing
import ActivitySchedule from './pages/ActivitySchedule';
import Events from './pages/events';
import EventDetails from './pages/EventDetails';
import ForumModerate from './pages/ForumModerate';
import StudentDashboard from './pages/StudentDashboard';
import SleepCalculator from './pages/SleepCalculator';
import Exercises from './pages/Exercices';
import Problem from './pages/Problem';
import ProblemList from './pages/ProblemList';


const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavFooter = ['/login', '/register', '/forgot-password', '/reset-password/:token', '/verify-account/:token', '/AccountDisabled'].some(path => 
      location.pathname === path || location.pathname.startsWith('/reset-password') || location.pathname.startsWith('/verify-account')
  );

  return (
      <div className="app-container">
          {!hideNavFooter && <Navbar />}
          <main>{children}</main>
          {!hideNavFooter && <Footer />}
      </div>
  );
};

function App(){

    return(
      <BrowserRouter>
      <Layout>
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





        <Route path="/forum" element={<Forum />} />
        <Route path="/AddForum" element={<AddForum />} />
        <Route path="/moderateForum" element={<ForumModerate />} />
        <Route path="/appointment-history" element={<AppointmentHistory />} />
        <Route path="/chat" element={<Chat />} />

        <Route path="/Activities" element={<Activities />} />
        <Route path="/add-activity" element={<AddActivity />} />
        <Route path="/edit-activity/:id" element={<EditActivity />} />
        <Route path="/activity-schedule" element={<ActivitySchedule />} />


        <Route path="/add-association" element={<AddAssociation />} />
        <Route path="/Associations" element={<Associations />} />
        <Route path="/AssociationDetails/:id" element={<AssociationDetails />} />
        <Route path="/add-event" element={<AddEvent />} />
        <Route path="/Events" element={<Events />} />
        <Route path="/event/:id" element={<EventDetails />} />

        <Route path="/StudentDashboard" element={<StudentDashboard />} />
        <Route path="/SleepCalculator" element={<SleepCalculator />} />
        <Route path="/Exercices" element={<Exercises />} />

        <Route path="/add-Problem" element={<Problem />} />
        <Route path="/List-problems" element={<ProblemList />} />


        </Routes>
            </Layout>
        </BrowserRouter>
       
    )
}

export default App;
