import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth';
import App from './App.tsx';
import './index.css';
import { enforceLatinDigits } from './utils/numerals';

const rootElement = document.getElementById('root')!;
enforceLatinDigits(rootElement);

createRoot(rootElement).render(
    <BrowserRouter>
        <AuthProvider>
            <App />
        </AuthProvider>
    </BrowserRouter>
);
