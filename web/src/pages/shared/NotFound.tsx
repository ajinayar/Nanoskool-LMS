import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Stack sx={{ alignItems: 'center', py: 10, textAlign: 'center' }} spacing={2}>
      <Typography variant="h4">Page not found</Typography>
      <Typography color="text.secondary">The page you are looking for does not exist or you do not have access to it.</Typography>
      <Button variant="contained" component={RouterLink} to="/">
        Go home
      </Button>
    </Stack>
  );
}
