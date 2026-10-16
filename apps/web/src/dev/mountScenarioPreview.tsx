import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ScenarioPreview } from './ScenarioPreview';
import '../styles.css';
import './quotation-preview.css';
import './comparison-preview.css';
import './scenario-preview.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ScenarioPreview /></StrictMode>);
