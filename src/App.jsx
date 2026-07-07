import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Homepage from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import PropertyWorkspace from './pages/PropertyWorkspace';
import PropertyComparison from './pages/PropertyComparison';
import DocumentCenter from './pages/DocumentCenter';
import NeighborhoodIntel from './pages/NeighborhoodIntel';
import NegotiationCenter from './pages/NegotiationCenter';
import PropertyAnalyzer from './pages/PropertyAnalyzer';
import DealAnalyzer from './pages/DealAnalyzer';
import PropertyReport from './pages/PropertyReport';
import BenefitsFinder from './pages/BenefitsFinder';
import AIAdvisor from './pages/AIAdvisor';
import MarketIntelligence from './pages/MarketIntelligence';
import TaxCenter from './pages/TaxCenter';
import PropertySearch from './pages/PropertySearch';
import InteractiveMap from './pages/InteractiveMap';
import MortgageCalculator from './pages/MortgageCalculator';
import RentalROI from './pages/RentalROI';
import CashFlowAnalyzer from './pages/CashFlowAnalyzer';
import PortfolioDashboard from './pages/PortfolioDashboard';
import PhotoGallery from './pages/PhotoGallery';
import DevStudio from './pages/DevStudio';
import ArchitectureIntelligence from './pages/ArchitectureIntelligence';
import MainDashboard from './pages/MainDashboard';
import ScoreEngine from './pages/ScoreEngine';
import MarketHeatMap from './pages/MarketHeatMap';
import DealPipeline from './pages/DealPipeline';
import PortfolioTracker from './pages/PortfolioTracker';
import AIAdvisorChat from './pages/AIAdvisorChat';
import './styles/global.css';
import './App.css';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"                element={<Homepage />} />
              <Route path="/dashboard"       element={<Dashboard />} />
              <Route path="/workspace"       element={<PropertyWorkspace />} />
              <Route path="/property-workspace" element={<PropertyWorkspace />} />
              <Route path="/comparison"      element={<PropertyComparison />} />
              <Route path="/comparison-center" element={<PropertyComparison />} />
              <Route path="/documents"       element={<DocumentCenter />} />
              <Route path="/document-center" element={<DocumentCenter />} />
              <Route path="/neighborhood"    element={<NeighborhoodIntel />} />
              <Route path="/negotiation"     element={<NegotiationCenter />} />
              <Route path="/analyzer"        element={<PropertyAnalyzer />} />
              <Route path="/deal-analyzer"   element={<DealAnalyzer />} />
              <Route path="/report"          element={<PropertyReport />} />
              <Route path="/property-report" element={<PropertyReport />} />
              <Route path="/benefits"        element={<BenefitsFinder />} />
              <Route path="/tax-center"      element={<TaxCenter />} />
              <Route path="/tax"             element={<TaxCenter />} />
              <Route path="/advisor"         element={<AIAdvisor />} />
              <Route path="/ai-advisor"      element={<AIAdvisor />} />
              <Route path="/market"          element={<MarketIntelligence />} />
              <Route path="/property-search" element={<PropertySearch />} />
              <Route path="/map"             element={<InteractiveMap />} />
              <Route path="/interactive-map" element={<InteractiveMap />} />
              <Route path="/mortgage-calc"   element={<MortgageCalculator />} />
              <Route path="/mortgage-calculator" element={<MortgageCalculator />} />
              <Route path="/rental-roi"      element={<RentalROI />} />
              <Route path="/cash-flow"       element={<CashFlowAnalyzer />} />
              <Route path="/cash-flow-analyzer" element={<CashFlowAnalyzer />} />
              <Route path="/portfolio"       element={<PortfolioDashboard />} />
              <Route path="/portfolio-dashboard" element={<PortfolioDashboard />} />
              <Route path="/gallery"         element={<PhotoGallery />} />
              <Route path="/photo-gallery"   element={<PhotoGallery />} />
              <Route path="/dev-studio"      element={<DevStudio />} />
              <Route path="/development-studio" element={<DevStudio />} />
              <Route path="/architecture"    element={<ArchitectureIntelligence />} />
              <Route path="/bim"             element={<ArchitectureIntelligence />} />
              <Route path="/architecture-intelligence" element={<ArchitectureIntelligence />} />
              <Route path="/main-dashboard"           element={<MainDashboard />} />
              <Route path="/score-engine"             element={<ScoreEngine />} />
              <Route path="/market-heat-map"          element={<MarketHeatMap />} />
              <Route path="/deal-pipeline"           element={<DealPipeline />} />
              <Route path="/portfolio-tracker"        element={<PortfolioTracker />} />
              <Route path="/ai-advisor-chat"          element={<AIAdvisorChat />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </>
  );
}
