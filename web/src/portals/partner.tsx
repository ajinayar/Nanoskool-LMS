import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DoorFrontOutlined from '@mui/icons-material/DoorFrontOutlined';
import { PartnerDoorsPage } from '@/pages/shared/DoorPages';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import { PartnerCoursesPage, PartnerDashboard, PartnerSchoolDetailPage, PartnerSchoolsPage, PartnerUsersPage } from '@/pages/partner/PartnerPages';
import { QuizDetailPage } from '@/components/AdminQuiz';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'partner',
  base: '/partner',
  title: 'Partner',
  nav: [
    { label: 'Dashboard', path: '', icon: <DashboardOutlined />, group: 'Overview' },
    { label: 'Schools', path: 'schools', icon: <ApartmentOutlined />, group: 'Network' },
    { label: 'Courses', path: 'courses', icon: <MenuBookOutlined />, group: 'Network' },
    { label: 'Genius Doors', path: 'doors', icon: <DoorFrontOutlined />, group: 'Network' },
    { label: 'Users', path: 'users', icon: <PeopleOutlined />, group: 'Network' },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined />, group: 'Communication' },
    { label: 'Events', path: 'events', icon: <EventOutlined />, group: 'Communication' },
  ],
  routes: [
    { path: '', element: <PartnerDashboard /> },
    { path: 'schools', element: <PartnerSchoolsPage /> },
    { path: 'schools/:id', element: <PartnerSchoolDetailPage /> },
    { path: 'courses', element: <PartnerCoursesPage /> },
    { path: 'doors', element: <PartnerDoorsPage /> },
    { path: 'users', element: <PartnerUsersPage /> },
    { path: 'quizzes/:id', element: <QuizDetailPage /> },
    ...sharedRoutes({ nanobot: false }),
  ],
};
