import { Navigate, Route, Routes } from 'react-router-dom'
import AnalysisPage from './pages/AnalysisPage'
import HomePage from './pages/HomePage'

/** 주소(URL)별로 보여줄 화면을 정한다 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/analysis/:pnu" element={<AnalysisPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
