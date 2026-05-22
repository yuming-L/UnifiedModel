import React from 'react'
import ReactDOM from 'react-dom/client'
import './design/tokens.css'
import './app.css'
import { App } from './App'
import { I18nProvider, initI18n } from './i18n'
import { zhCN } from './i18n/zh-CN'
import { en } from './i18n/en'

initI18n({ 'zh-CN': zhCN, en })

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
