import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DoorFrontOutlined from '@mui/icons-material/DoorFrontOutlined';
import { SchoolDoorsPage } from '@/pages/shared/DoorPages';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { ClassDetailPage, ClassesPage } from '@/pages/school/SchoolClasses';
import { ParentsPage, StudentDetailPage, StudentsPage, TeacherDetailPage, TeachersPage } from '@/pages/school/SchoolPeople';
import StudentImportPage from '@/pages/school/SchoolImport';
import { SchoolAssignmentsPage, SchoolCoursesPage, SchoolDashboard, SchoolReportsPage, SchoolSettingsPage } from '@/pages/school/SchoolPages';
import { QuizDetailPage } from '@/components/AdminQuiz';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import { ClassOutcomesPage, ReviewPage } from '@/pages/shared/ReviewPages';
import { SchoolWellbeingPage, TeacherObservationsPage } from '@/pages/teacher/ObservationPages';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'school_admin',
  base: '/school',
  title: 'School',
  look: 'clarity',
  groupActions: { People: 'students?new=1', Communication: 'announcements' },
  nav: [
    { label: 'Dashboard', path: '', icon: <DashboardOutlined />, group: 'Overview' },
    { label: 'Classes', path: 'classes', icon: <ClassOutlined />, group: 'People' },
    { label: 'Teachers', path: 'teachers', icon: <CoPresentOutlined />, group: 'People' },
    { label: 'Students', path: 'students', icon: <SchoolOutlined />, group: 'People' },
    { label: 'Parents', path: 'parents', icon: <FamilyRestroomOutlined />, group: 'People' },
    { label: 'Courses', path: 'courses', icon: <MenuBookOutlined />, group: 'Learning' },
    { label: 'Genius Doors', path: 'doors', icon: <DoorFrontOutlined />, group: 'Learning' },
    { label: 'Assignments', path: 'assignments', icon: <AssignmentOutlined />, group: 'Learning' },
    { label: 'Learning outcomes', path: 'outcomes', icon: <InsightsOutlined />, group: 'Learning' },
    { label: 'Evidence', path: 'evidence', icon: <FactCheckOutlined />, group: 'Learning' },
    { label: 'Wellbeing', path: 'wellbeing', icon: <ForumOutlined />, group: 'Learning' },
    { label: 'Reports', path: 'reports', icon: <BarChartOutlined />, group: 'Learning' },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined />, group: 'Communication' },
    { label: 'Events', path: 'events', icon: <EventOutlined />, group: 'Communication' },
    { label: 'School settings', path: 'settings', icon: <SettingsOutlined />, group: 'School' },
  ],
  routes: [
    { path: '', element: <SchoolDashboard /> },
    { path: 'classes', element: <ClassesPage /> },
    { path: 'classes/:id', element: <ClassDetailPage /> },
    { path: 'teachers', element: <TeachersPage /> },
    { path: 'teachers/:id', element: <TeacherDetailPage /> },
    { path: 'students', element: <StudentsPage /> },
    { path: 'students/import', element: <StudentImportPage /> },
    { path: 'students/:id', element: <StudentDetailPage /> },
    { path: 'parents', element: <ParentsPage /> },
    { path: 'courses', element: <SchoolCoursesPage /> },
    { path: 'doors', element: <SchoolDoorsPage /> },
    { path: 'assignments', element: <SchoolAssignmentsPage /> },
    { path: 'reports', element: <SchoolReportsPage /> },
    { path: 'outcomes', element: <ClassOutcomesPage studentBase="/school/students/" /> },
    { path: 'wellbeing', element: <SchoolWellbeingPage /> },
    { path: 'observations', element: <TeacherObservationsPage /> },
    { path: 'evidence', element: <ReviewPage /> },
    { path: 'settings', element: <SchoolSettingsPage /> },
    { path: 'quizzes/:id', element: <QuizDetailPage /> },
    ...sharedRoutes({ nanobot: false }),
  ],
};
