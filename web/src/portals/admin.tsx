import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import HandshakeOutlined from '@mui/icons-material/HandshakeOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import { PartnerDetailPage, PartnersPage } from '@/pages/admin/AdminPartners';
import { AdminSchoolDetailPage, AdminSchoolsPage } from '@/pages/admin/AdminSchools';
import AdminUsersPage from '@/pages/admin/AdminUsers';
import CourseStudioPage from '@/pages/admin/AdminCourses';
import CourseEditorPage from '@/pages/admin/AdminCourseEditor';
import { QuizDetailPage } from '@/components/AdminQuiz';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import AssessmentStudioPage from '@/pages/admin/AdminAssessment';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'super_admin',
  base: '/admin',
  title: 'Super admin',
  look: 'clarity',
  groupActions: { Organisations: 'schools?new=1', Content: 'courses?new=1', Communication: 'announcements' },
  nav: [
    { label: 'Dashboard', path: '', icon: <DashboardOutlined />, group: 'Overview' },
    { label: 'Partners', path: 'partners', icon: <HandshakeOutlined />, group: 'Organisations' },
    { label: 'Schools', path: 'schools', icon: <ApartmentOutlined />, group: 'Organisations' },
    { label: 'Users', path: 'users', icon: <PeopleOutlined />, group: 'Organisations' },
    { label: 'Course studio', path: 'courses', icon: <MenuBookOutlined />, group: 'Content' },
    { label: 'Assessment studio', path: 'assessment', icon: <PsychologyOutlined />, group: 'Content' },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined />, group: 'Communication' },
    { label: 'Events', path: 'events', icon: <EventOutlined />, group: 'Communication' },
  ],
  routes: [
    { path: '', element: <AdminDashboard /> },
    { path: 'partners', element: <PartnersPage /> },
    { path: 'partners/:id', element: <PartnerDetailPage /> },
    { path: 'schools', element: <AdminSchoolsPage /> },
    { path: 'schools/:id', element: <AdminSchoolDetailPage /> },
    { path: 'users', element: <AdminUsersPage /> },
    { path: 'courses', element: <CourseStudioPage /> },
    { path: 'courses/:id/edit', element: <CourseEditorPage /> },
    { path: 'quizzes/:id', element: <QuizDetailPage /> },
    { path: 'assessment', element: <AssessmentStudioPage /> },
    ...sharedRoutes({ nanobot: false }),
  ],
};
