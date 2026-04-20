import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { ProcurementProvider } from '@/procurement/ProcurementProvider'
import { SupabaseRequiredGate } from '@/lib/SupabaseRequiredGate'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SupabaseRequiredGate>
        <AuthProvider>
          <ProcurementProvider>
            <App />
          </ProcurementProvider>
        </AuthProvider>
      </SupabaseRequiredGate>
    </BrowserRouter>
  </StrictMode>,
)
