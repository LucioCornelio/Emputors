import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Leat11Draft from './pages/Leat11Draft';
import AdvancedSearch from './pages/AdvancedSearch';
import BuildOrders from './pages/BuildOrders';
import BuildOrderDetail from './pages/BuildOrderDetail';
import Home from './pages/Home';

// Placeholders (Sección por sección las iremos creando)
const CivFilter = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>🔍 Civ Filter</h2><p>In development...</p></div>;
const Tournaments = () => <div style={{ padding: '3rem', color: '#fff', textAlign: 'center' }}><h2>🏆 Tournaments</h2><p>Archive and Brackets in development...</p></div>;
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
          <Route path="/esports/tournaments" element={<Tournaments />} />
          <Route path="/esports/hall-of-fame" element={<HallOfFame />} />
          <Route path="/clan/roster" element={<Roster />} />
          <Route path="/clan/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;