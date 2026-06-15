import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './design/tokens.css'
import './app.css'
import { App } from './App'
<<<<<<< HEAD
import { I18nProvider, initI18n } from './i18n'
import { zhCN } from './i18n/zh-CN'
import { en } from './i18n/en'

initI18n({ 'zh-CN': zhCN, en })
=======
import { I18nProvider } from './i18n'
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
<<<<<<< HEAD
      <App />
=======
      <BrowserRouter>
        <App />
      </BrowserRouter>
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06
    </I18nProvider>
  </React.StrictMode>,
)
