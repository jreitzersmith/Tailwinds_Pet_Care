import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import HomePage from './features/home/HomePage.jsx';
import ServicesPage from './features/services/ServicesPage.jsx';
import AboutPage from './features/about/AboutPage.jsx';
import ContactPage from './features/contact/ContactPage.jsx';
import ServiceAreaPage from './features/serviceArea/ServiceAreaPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import SignupPage from './features/auth/SignupPage.jsx';
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx';
import UpdatePasswordPage from './features/auth/UpdatePasswordPage.jsx';
import BookingPage from './features/booking/BookingPage.jsx';
import PortalPage from './features/portal/PortalPage.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route path='/' element={<HomePage />} />
            <Route path='/services' element={<ServicesPage />} />
            <Route path='/about' element={<AboutPage />} />
            <Route path='/contact' element={<ContactPage />} />
            <Route path='/service-area' element={<ServiceAreaPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/signup' element={<SignupPage />} />
            <Route path='/reset-password' element={<ResetPasswordPage />} />
            <Route path='/update-password' element={<UpdatePasswordPage />} />
            <Route path='/book' element={
              <ProtectedRoute><BookingPage /></ProtectedRoute>
            } />
            <Route path='/portal' element={
              <ProtectedRoute><PortalPage /></ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
