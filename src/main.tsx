import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { useSessionStore, snapshotSession } from './state/sessionStore';
import { loadFromStorage, makeDebouncedSaver } from './state/persistence';

const stored = loadFromStorage();
if (stored) useSessionStore.getState().setAll(stored);

const save = makeDebouncedSaver(500);
useSessionStore.subscribe((state) => save(snapshotSession(state)));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
