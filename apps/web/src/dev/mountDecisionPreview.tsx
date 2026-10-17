import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionPreview } from './DecisionPreview';
import '../styles.css';
import './quotation-preview.css';
import './decision-preview.css';

createRoot(document.getElementById('root')!).render(<StrictMode><DecisionPreview /></StrictMode>);
