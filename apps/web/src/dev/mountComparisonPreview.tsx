import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ComparisonPreview } from './ComparisonPreview';
import '../styles.css';
import './quotation-preview.css';
import './comparison-preview.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ComparisonPreview /></StrictMode>);
