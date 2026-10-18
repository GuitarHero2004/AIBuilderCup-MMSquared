import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QuotationPreview } from './QuotationPreview';
import '../styles.css';
import './quotation-preview.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><QuotationPreview /></StrictMode>,
);
