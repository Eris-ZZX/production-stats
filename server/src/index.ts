import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

initDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve built frontend static files
const distPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(distPath));

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

// SPA fallback: serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Global JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err.message || err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend served from: ${distPath}`);
});
