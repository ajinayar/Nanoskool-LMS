import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard';
import { TeacherClassDetailPage, TeacherClassesPage, TeacherStudentPage } from '@/pages/teacher/ClassPages';
import { TeacherAssignmentDetailPage, TeacherAssignmentsPage } from '@/pages/teacher/AssignmentPages';
import { TeacherQuizDetailPage, TeacherQuizEditPage, TeacherQuizzesPage } from '@/pages/teacher/QuizPages';
import { TeacherAttendancePage } from '@/pages/teacher/AttendancePages';
import { TeacherRemarksPage } from '@/pages/teacher/RemarkPages';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import { ClassOutcomesPage, ReviewPage } from '@/pages/shared/ReviewPages';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'teacher',
  base: '/teacher',
  title: 'Teacher',
  nav: [
    { label: 'Dashboard', path: '', icon: <DashboardOutlined /> },
    { label: 'My classes', path: 'classes', icon: <ClassOutlined />, group: 'Teaching' },
    { label: 'Assignments', path: 'assignments', icon: <AssignmentOutlined />, group: 'Teaching' },
    { label: 'Quizzes', path: 'quizzes', icon: <QuizOutlined />, group: 'Teaching' },
    { label: 'Attendance', path: 'attendance', icon: <EventAvailableOutlined />, group: 'Teaching' },
    { label: 'Remarks', path: 'remarks', icon: <RateReviewOutlined />, group: 'Teaching' },
    { label: 'Evidence to check', path: 'evidence', icon: <FactCheckOutlined />, group: 'Learning journey' },
    { label: 'Learning outcomes', path: 'outcomes', icon: <InsightsOutlined />, group: 'Learning journey' },
    { label: 'Courses', path: 'courses', icon: <MenuBookOutlined />, group: 'Learning' },
    { label: 'NanoBot', path: 'nanobot', icon: <SmartToyOutlined />, group: 'Learning' },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined />, group: 'School' },
    { label: 'Events', path: 'events', icon: <EventOutlined />, group: 'School' },
  ],
  routes: [
    { path: '', element: <TeacherDashboard /> },
    { path: 'classes', element: <TeacherClassesPage /> },
    { path: 'classes/:id', element: <TeacherClassDetailPage /> },
    { path: 'students/:id', element: <TeacherStudentPage /> },
    { path: 'assignments', element: <TeacherAssignmentsPage /> },
    { path: 'assignments/:id', element: <TeacherAssignmentDetailPage /> },
    { path: 'quizzes', element: <TeacherQuizzesPage /> },
    { path: 'quizzes/new', element: <TeacherQuizEditPage /> },
    { path: 'quizzes/:id', element: <TeacherQuizDetailPage /> },
    { path: 'quizzes/:id/edit', element: <TeacherQuizEditPage /> },
    { path: 'attendance', element: <TeacherAttendancePage /> },
    { path: 'remarks', element: <TeacherRemarksPage /> },
    { path: 'evidence', element: <ReviewPage /> },
    { path: 'outcomes', element: <ClassOutcomesPage studentBase="/teacher/students/" /> },
    ...sharedRoutes({ nanobot: true }),
  ],
};
