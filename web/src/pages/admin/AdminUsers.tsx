import { Button } from '@mui/material';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import type { Paged, School } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { PageHeader, Section } from '@/components/ui';
import { useCreateParam } from '@/components/AdminCommon';
import { PeopleDirectory } from '@/components/AdminPeople';

export default function AdminUsersPage() {
  const [open, setOpen] = useCreateParam();
  const schools = useGet<Paged<School>>('/schools', { limit: 200 });
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Everyone with a Nanoskool account"
        actions={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setOpen(true)}>
            Add user
          </Button>
        }
      />
      <Section title="Directory">
        <PeopleDirectory
          roles={['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent']}
          createRoles={['school_admin', 'teacher', 'student', 'parent', 'partner', 'super_admin']}
          createOpen={open}
          onCreateClose={() => setOpen(false)}
          schools={schools.data?.items}
          columns={['role', 'school', 'class', 'lastLogin']}
        />
      </Section>
    </>
  );
}
