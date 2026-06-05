import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import stationsRouter from './routes/stations.js';
import defectCodesRouter from './routes/defectCodes.js';
import defectFieldsRouter from './routes/defectFields.js';
import stationFieldsRouter from './routes/stationFields.js';
import productionRecordsRouter from './routes/productionRecords.js';
import stationDetailsRouter from './routes/stationDetails.js';
import inspectionRecordsRouter from './routes/inspectionRecords.js';
import adminAccountsRouter from './routes/adminAccounts.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

initDB();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/product-lines', productsRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/defect-codes', defectCodesRouter);
app.use('/api/defect-fields', defectFieldsRouter);
app.use('/api/station-fields', stationFieldsRouter);
app.use('/api/production-records', productionRecordsRouter);
app.use('/api/station-details', stationDetailsRouter);
app.use('/api/inspection-records', inspectionRecordsRouter);
app.use('/api/admin-accounts', adminAccountsRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
