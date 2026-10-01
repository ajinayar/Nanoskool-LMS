import HomeOutlined from '@mui/icons-material/HomeOutlined';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import { StudentHomeByGrade } from '@/student/homes';
import { RewardsPage } from '@/student/RewardsPage';
import { StudentUnitPage } from '@/student/StudentUnitPage';
import { StudentCoursePage } from '@/student/StudentCoursePage';
import { StudentCoursesPage } from '@/pages/student/StudentCourses';
import { StudentAssignmentDetailPage, StudentAssignmentsPage } from '@/pages/student/StudentAssignments';
import { StudentQuizPage, StudentQuizzesPage } from '@/pages/student/StudentQuizzes';
import { StudentProgressPage } from '@/pages/student/StudentProgress';
import FolderSpecialOutlined from '@mui/icons-material/FolderSpecialOutlined';
import ExploreOutlined from '@mui/icons-material/ExploreOutlined';
import { KnowYourselfPage, MissionPage, StudentPortfolioPage, ThinkingPuzzlesPage, ToolDemoPage } from '@/student/journey';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import { sharedRoutes } from './shared';
import type { Portal } from './types';

export const portal: Portal = {
  role: 'student',
  base: '/student',
  title: 'Student',
  look: 'student',
  nav: [
    { label: 'Home', path: '', icon: <HomeOutlined /> },
    { label: 'My courses', path: 'courses', icon: <AutoStoriesOutlined />, group: 'Learn' },
    { label: 'Assignments', path: 'assignments', icon: <AssignmentOutlined />, group: 'Learn' },
    { label: 'Quizzes', path: 'quizzes', icon: <QuizOutlined />, group: 'Learn' },
    { label: 'My progress', path: 'progress', icon: <InsightsOutlined />, group: 'Learn' },
    { label: 'Rewards', path: 'rewards', icon: <EmojiEventsOutlined />, group: 'Learn' },
    { label: 'My portfolio', path: 'portfolio', icon: <FolderSpecialOutlined />, group: 'Learn' },
    { label: 'Genius Quest', path: 'assessment', icon: <ExploreOutlined />, group: 'Learn' },
    { label: 'Know Yourself', path: 'know-yourself', icon: <PsychologyOutlined />, group: 'Learn' },
    { label: 'Thinking Puzzles', path: 'thinking', icon: <ExtensionOutlined />, group: 'Learn' },
    { label: 'NanoBot', path: 'nanobot', icon: <SmartToyOutlined />, group: 'Learn' },
    { label: 'Announcements', path: 'announcements', icon: <CampaignOutlined />, group: 'School' },
    { label: 'Events', path: 'events', icon: <EventOutlined />, group: 'School' },
  ],
  routes: [
    { path: '', element: <StudentHomeByGrade /> },
    { path: 'rewards', element: <RewardsPage /> },
    { path: 'portfolio', element: <StudentPortfolioPage /> },
    { path: 'assessment', element: <MissionPage /> },
    { path: 'know-yourself', element: <KnowYourselfPage /> },
    { path: 'thinking', element: <ThinkingPuzzlesPage /> },
    { path: 'tool-demo', element: <ToolDemoPage /> },
    // Lessons are laid out by age (see src/student/StudentUnitPage.tsx)
    { path: 'units/:id', element: <StudentUnitPage /> },
    { path: 'courses', element: <StudentCoursesPage /> },
    { path: 'courses/:id', element: <StudentCoursePage /> },
    { path: 'assignments', element: <StudentAssignmentsPage /> },
    { path: 'assignments/:id', element: <StudentAssignmentDetailPage /> },
    { path: 'quizzes', element: <StudentQuizzesPage /> },
    { path: 'quizzes/:id', element: <StudentQuizPage /> },
    { path: 'progress', element: <StudentProgressPage /> },
    // Our 'courses' replaces the shared catalogue; drop the shared one to avoid a duplicate route key
    ...sharedRoutes({ nanobot: true }).filter((r) => r.path !== 'courses' && r.path !== 'courses/:id' && r.path !== 'units/:id'),
  ],
};
