'use client';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`splash ${done ? 'done' : ''}`}
      id="splash"
      aria-label="Carregando a barbearia"
    >
      <div className="splash-inner">
        <div
          className="splash-mark logo-image"
          role="img"
          aria-label="Logomarca Barbearia Emanuel Sousa"
        />
        <h1>Emanuel Sousa</h1>
        <p>Estilo • Precisão • Confiança</p>
        <div className="progress-line">
          <span />
        </div>
      </div>
    </div>
  );
}
