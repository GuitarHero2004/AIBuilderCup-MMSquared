import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { readConfig } from './config/environment';
import { initializeSession } from './auth/firebase';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
try {
  const config = readConfig(import.meta.env);
  const services = initializeSession(config);
  root.render(<StrictMode><App config={config} services={services} /></StrictMode>);
} catch (error) {
  root.render(<main className="configuration-page"><span className="eyebrow">GREENPROCURE</span><h1>Connect your workspace</h1><p>The app needs explicit environment configuration before it can start.</p><div className="alert error-alert" role="alert">{error instanceof Error ? error.message : 'Configuration is incomplete.'}</div><p>For local development, copy <code>apps/web/.env.example</code> to <code>apps/web/.env.local</code>, start the emulators and API, then restart the web server. See the repository README for commands.</p></main>);
}
