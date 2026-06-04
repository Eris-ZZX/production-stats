import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import StationFpyList from './pages/Dashboard/StationFpyList';
import SectionFpyList from './pages/Dashboard/SectionFpyList';
import TopDefectBoard from './pages/Dashboard/TopDefectBoard';
import TrendBoard from './pages/Dashboard/TrendBoard';
import ProductionEntry from './pages/DataStats/ProductionEntry';
import InspectionEntry from './pages/DataStats/InspectionEntry';
import StationDetailEntry from './pages/DataStats/StationDetailEntry';
import ProductList from './pages/DataConfig/ProductList';
import StationTree from './pages/DataConfig/StationTree';
import DefectCodes from './pages/DataConfig/DefectCodes';
import DefectFieldMaintenance from './pages/DataConfig/DefectFieldMaintenance';
import StationFieldMaintenance from './pages/DataConfig/StationFieldMaintenance';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard/station-fpy" replace /> },
      { path: 'dashboard/station-fpy', element: <StationFpyList /> },
      { path: 'dashboard/section-fpy', element: <SectionFpyList /> },
      { path: 'dashboard/top', element: <TopDefectBoard /> },
      { path: 'dashboard/trend', element: <TrendBoard /> },
      { path: 'data-stats/production', element: <ProductionEntry /> },
      { path: 'data-stats/inspection', element: <InspectionEntry /> },
      { path: 'data-stats/station-detail', element: <StationDetailEntry /> },
      { path: 'data-config/products', element: <ProductList /> },
      { path: 'data-config/stations', element: <StationTree /> },
      { path: 'data-config/defects', element: <DefectCodes /> },
      { path: 'data-config/defect-fields', element: <DefectFieldMaintenance /> },
      { path: 'data-config/station-fields', element: <StationFieldMaintenance /> },
    ],
  },
]);
