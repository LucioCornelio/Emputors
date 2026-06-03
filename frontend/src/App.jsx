import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Leat11Draft from './pages/Leat11Draft';
import AdvancedSearch from './pages/AdvancedSearch';
import BuildOrders from './pages/BuildOrders';
import BuildOrderDetail from './pages/BuildOrderDetail';
import Home from './pages/Home';

// 1. Añadimos el import real
import CurrentEvent from './pages/CurrentEvent'; 

// 2. Borramos el placeholder de CurrentEvent y dejamos el resto:
const PastEvents = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>📚 Past Events</h2><p>Tournament archive in development...</p></div>;
const HallOfFame = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>🏅 Hall of Fame</h2><p>Palmarés in development...</p></div>;
const Roster = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>⚔️ Clan Roster</h2><p>Member list in development...</p></div>;
const About = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>🛡️ About</h2><p>Philosophy and Rules...</p></div>;

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#161920', fontFamily: 'Segoe UI, sans-serif' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools/leat11" element={<Leat11Draft />} />
          <Route path="/tools/advanced-search" element={<AdvancedSearch />} />
          <Route path="/academy/build-orders" element={<BuildOrders />} />
          <Route path="/academy/build-orders/:buildId" element={<BuildOrderDetail />} />
          
          {/* El elemento de la ruta ya está correcto, ahora cogerá el import real */}
          <Route path="/tournaments/current" element={<CurrentEvent />} />
          <Route path="/tournaments/past-events" element={<PastEvents />} />
          <Route path="/tournaments/hall-of-fame" element={<HallOfFame />} />
          
          <Route path="/clan/roster" element={<Roster />} />
          <Route path="/clan/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;