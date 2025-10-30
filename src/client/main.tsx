import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UnlockProvider } from './hooks/useUnlocks';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UnlockProvider>
      <App />
    </UnlockProvider>
  </StrictMode>
);
