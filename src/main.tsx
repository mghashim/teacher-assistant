import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

// Auto-register offline service worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New version available, reloading in background');
  },
  onOfflineReady() {
    console.log('[PWA] Teacher Assistant is fully ready for 100% offline usage on tablet');
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
