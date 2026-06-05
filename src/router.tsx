import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import StationFpyList from './pages/Dashboard/StationFpyList';
import SectionFpyList from './pages/Dashboard/SectionFpyList';
import TopDefectBoard from './pages/Dashboard/TopDefectBoard';
import StationTrend from './pages/Dashboard/StationTrend';
import SectionTrend from './pages/Dashboard/SectionTrend';
import DefectTrend from './pages/Dashboard/DefectTrend';
import ProductionEntry from './pages/DataStats/ProductionEntry';
import InspectionEntry from './pages/DataStats/InspectionEntry';
import StationDetailEntry from './pages/DataStats/StationDetailEntry';
import ProductList from './pages/DataConfig/ProductList';
import StationTree from './pages/DataConfig/StationTree';
import DefectCodes from './pages/DataConfig/DefectCodes';
import DefectFieldMaintenance from './pages/DataConfig/DefectFieldMaintenance';
import StationFieldMaintenance from './pages/DataConfig/StationFieldMaintenance';
import ProductLineManager from './pages/DataConfig/ProductLineManager';
import AdminAccountManager from './pages/DataConfig/AdminAccountManager';
import AdminLayout from './components/AdminLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard/station-fpy" replace /> },
      { path: 'dashboard/station-fpy', element: <StationFpyList /> },
      { path: 'dashboard/section-fpy', element: <SectionFpyList /> },
      { path: 'dashboard/top', element: <TopDefectBoard /> },
      { path: 'dashboard/station-trend', element: <StationTrend /> },
      { path: 'dashboard/section-trend', element: <SectionTrend /> },
      { path: 'dashboard/defect-trend', element: <DefectTrend /> },
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
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { path: 'product-lines', element: <ProductLineManager /> },
      { path: 'station-fields', element: <StationFieldMaintenance /> },
      { path: 'defect-fields', element: <DefectFieldMaintenance /> },
      { path: 'accounts', element: <AdminAccountManager /> },
    ],
  },
]);
