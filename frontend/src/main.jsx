import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import { HERO_ART } from './assets/art';

// Expose the bundled banner artwork to CSS so the hero and login screens can
// use it as a background layer without reaching out to an image CDN.
document.documentElement.style.setProperty('--hero-art', `url("${HERO_ART}")`);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
