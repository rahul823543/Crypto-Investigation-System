import { Routes, Route } from 'react-router-dom';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<main className="p-8"><h1>Crypto Investigation System</h1></main>} />
      <Route path="*" element={<main className="p-8"><p>Page not found</p></main>} />
    </Routes>
  );
}
