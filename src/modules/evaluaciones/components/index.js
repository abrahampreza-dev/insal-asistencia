// Exámenes y Administración
export { default as ExamBuilder } from './ExamBuilder/ExamBuilder';
export { default as ExamTaking } from './ExamTaking/ExamTaking';
export { default as AdminExamenes } from './AdminExamenes';

// Monitoreo en Tiempo Real y Panel Docente
export { default as TeacherDashboard } from './TeacherDashboard/TeacherDashboard';
export { default as LiveGameView } from './TeacherDashboard/LiveGameView';
export { default as StudentActivityDetail } from './TeacherDashboard/StudentActivityDetail';
export { default as StudentMatrix } from './TeacherDashboard/StudentMatrix';
export { default as LiveMetricsPanel } from './TeacherDashboard/LiveMetricsPanel';

// Reportes y Analíticas
export { default as AnalyticsDashboard } from './Reports/AnalyticsDashboard';
export { default as ItemAnalysisChart } from './Reports/ItemAnalysisChart';
export { default as StudentReport } from './Reports/StudentReport';
export { default as PDFCertificate } from './Reports/PDFCertificate';

// Utilidades de Examen
export { default as CircularTimer } from './ExamTaking/CircularTimer';
export { default as QuestionRenderer } from './ExamTaking/QuestionRenderer';