import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
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
