import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import Maintenance from './maintenance/Maintenance.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* <Maintenance /> */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
