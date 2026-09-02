import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </Providers>
  );
}
