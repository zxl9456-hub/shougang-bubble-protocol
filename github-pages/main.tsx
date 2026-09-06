import { createRoot } from 'react-dom/client';
import Game from '../components/game/Game';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(<Game />);
