import HomeOutlined from '@mui/icons-material/HomeOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import { ParentChildPage, ParentChildrenPage, ParentHome, ParentQuizPage } from '@/pages/parent/ParentPages';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'parent',
  base: '/parent',
  title: 'Parent',
  nav: [
    { label: 'Home', path: '', icon: <HomeOutlined /> },
    { label: 'My children', path: 'children', icon: <FamilyRestroomOutlined /> },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined /> },
    { label: 'Events', path: 'events', icon: <EventOutlined /> },
    { label: 'NanoBot', path: 'nanobot', icon: <SmartToyOutlined /> },
  ],
  routes: [
    { path: '', element: <ParentHome /> },
    { path: 'children', element: <ParentChildrenPage /> },
    { path: 'children/:id', element: <ParentChildPage /> },
    { path: 'quizzes/:id', element: <ParentQuizPage /> },
    ...sharedRoutes({ nanobot: true }),
  ],
};
