import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './features/home/HomePage.jsx';
import ServicesPage from './features/services/ServicesPage.jsx';
import AboutPage from './features/about/AboutPage.jsx';
import ContactPage from './features/contact/ContactPage.jsx';
import ServiceAreaPage from './features/serviceArea/ServiceAreaPage.jsx';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path='/' element={<HomePage />} />
          <Route path='/services' element={<ServicesPage />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/contact' element={<ContactPage />} />
          <Route path='/service-area' element={<ServiceAreaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
