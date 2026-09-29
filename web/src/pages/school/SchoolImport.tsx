import { Alert, Box, Button, Chip, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Papa from 'papaparse';
import { useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import type { ClassSection } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { CardGrid, DataTable, Empty, PageHeader, QueryState, Section, StatCard } from '@/components/ui';
import { BackLink, FormError, downloadCsv } from '@/components/AdminCommon';

const COLUMNS = ['name', 'email', 'username', 'grade', 'section', 'rollNo', 'gender', 'parentName', 'parentEmail', 'parentPhone'] as const;
type Col = (typeof COLUMNS)[number];
type Row = Record<Col, string>;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RX = /^[a-zA-Z0-9._-]{3,60}$/;
const MAX_ROWS = 1000;

/** Accepts common header spellings ("Roll No", "parent_email", "Student Name"). */
const HEADER_ALIASES: Record<string, Col> = {
  name: 'name', studentname: 'name', fullname: 'name', student: 'name',
  email: 'email', studentemail: 'email',
  username: 'username', login: 'username',
  grade: 'grade', class: 'grade', std: 'grade', standard: 'grade',
  section: 'section', div: 'section', division: 'section',
  rollno: 'rollNo', roll: 'rollNo', rollnumber: 'rollNo',
  gender: 'gender', sex: 'gender',
  parentname: 'parentName', guardianname: 'parentName',
  parentemail: 'parentEmail', guardianemail: 'parentEmail',
  parentphone: 'parentPhone', guardianphone: 'parentPhone', parentmobile: 'parentPhone', phone: 'parentPhone',
};
const normHeader = (h: string) => HEADER_ALIASES[h.toLowerCase().replace(/[^a-z]/g, '')] ?? h;

interface Checked {
  row: Row;
  line: number;
  errors: string[];
  className?: string;
}

interface ImportResult {
  created: number;
  failed: number;
  results: { row: number; ok: boolean; name: string; username?: string; tempPassword?: string; error?: string }[];
}

function validate(rows: Row[], classes: ClassSection[]): Checked[] {
  const seenUser = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  return rows.map((r, i) => {
    const errors: string[] = [];
    if (!r.name) errors.push('Name is missing');
    const g = Number(r.grade);
    let className: string | undefined;
    if (!r.grade) errors.push('Grade is missing');
    else if (!Number.isInteger(g) || g < 1 || g > 12) errors.push('Grade must be a number from 1 to 12');
    if (!r.section) errors.push('Section is missing');
    if (r.grade && r.section && Number.isInteger(g)) {
      const cls = classes.find((c) => c.grade === g && c.section.toUpperCase() === r.section.toUpperCase());
      if (!cls) errors.push(`No class Grade ${g} - ${r.section.toUpperCase()}. Create it first.`);
      else className = cls.name;
    }
    if (r.email && !EMAIL_RX.test(r.email)) errors.push('Email is not valid');
    if (r.username && !USERNAME_RX.test(r.username)) errors.push('Username: 3+ letters, numbers, dots or dashes');
    if (r.parentEmail && !EMAIL_RX.test(r.parentEmail)) errors.push('Parent email is not valid');
    if (r.gender && !['male', 'female', 'other', 'm', 'f'].includes(r.gender.toLowerCase())) errors.push('Gender should be male, female or other');
    const u = r.username.toLowerCase();
    if (u) {
      if (seenUser.has(u)) errors.push(`Same username as row ${seenUser.get(u)}`);
      else seenUser.set(u, i + 1);
    }
    const e = r.email.toLowerCase();
    if (e) {
      if (seenEmail.has(e)) errors.push(`Same email as row ${seenEmail.get(e)}`);
      else seenEmail.set(e, i + 1);
    }
    return { row: r, line: i + 1, errors, className };
  });
}

const genderOf = (g: string) => {
  const v = g.toLowerCase();
  return v === 'm' ? 'male' : v === 'f' ? 'female' : v;
};

export default function StudentImportPage() {
  const me = useMe();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const classes = useGet<ClassSection[]>('/classes');
  // Opened from a class page (?classId=): every row goes into that class unless the file says otherwise
  const [params] = useSearchParams();
  const target = classes.data?.find((c) => c._id === params.get('classId'));
  const [fileName, setFileName] = useState('');
  const [checked, setChecked] = useState<Checked[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sent, setSent] = useState<Checked[]>([]);
  const imp = useSend<{ rows: Record<string, string>[] }, ImportResult>('post', '/users/import', {
    invalidate: ['/users', '/classes', '/dashboard', '/reports'],
    onSuccess: (r) => {
      setResult(r);
      if (r.failed) toast.info(`${r.created} students added, ${r.failed} could not be added`);
      else toast.success(`${r.created} students added`);
    },
  });

  const template = () => {
    const cls = target ?? classes.data?.[0];
    downloadCsv('nanoskool-students-template.csv', [...COLUMNS], [
      ['Aarav Sharma', '', '', cls?.grade ?? 6, cls?.section ?? 'A', '1', 'male', 'Priya Sharma', 'priya.sharma@example.com', '9876543210'],
      ['Diya Nair', 'diya.nair@example.com', '', cls?.grade ?? 6, cls?.section ?? 'A', '2', 'female', '', '', ''],
    ]);
  };

  const onFile = (f: File) => {
    setParseError(null);
    setResult(null);
    setFileName(f.name);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normHeader,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        if (!fields.includes('name') || (!target && (!fields.includes('grade') || !fields.includes('section')))) {
          setChecked(null);
          setParseError(target ? 'The file needs at least a name column. Download the template to see the format.' : 'The file needs at least the columns name, grade and section. Download the template to see the format.');
          return;
        }
        if (res.data.length > MAX_ROWS) {
          setChecked(null);
          setParseError(`The file has ${res.data.length} rows. Import at most ${MAX_ROWS} at a time.`);
          return;
        }
        const rows: Row[] = res.data.map((d) => {
          const r = Object.fromEntries(COLUMNS.map((c) => [c, String(d[c] ?? '').trim()])) as Row;
          if (target && !r.grade && !r.section) {
            r.grade = String(target.grade);
            r.section = target.section;
          }
          return r;
        });
        if (!rows.length) {
          setChecked(null);
          setParseError('The file has no student rows.');
          return;
        }
        setChecked(validate(rows, classes.data ?? []));
      },
      error: (err) => setParseError(`Could not read the file: ${err.message}`),
    });
  };

  const valid = checked?.filter((c) => !c.errors.length) ?? [];
  const invalid = checked?.filter((c) => c.errors.length) ?? [];
  const step = result ? 2 : checked ? 1 : 0;

  const runImport = () => {
    const rows = valid.map(({ row }) => {
      const out: Record<string, string> = { name: row.name, grade: row.grade, section: row.section.toUpperCase() };
      if (row.email) out.email = row.email;
      if (row.username) out.username = row.username;
      if (row.rollNo) out.rollNo = row.rollNo;
      if (row.gender) out.gender = genderOf(row.gender);
      if (row.parentName) out.parentName = row.parentName;
      if (row.parentEmail) out.parentEmail = row.parentEmail;
      if (row.parentPhone) out.parentPhone = row.parentPhone;
      return out;
    });
    setSent(valid);
    imp.mutate({ rows });
  };

  const credentials = result?.results.filter((r) => r.ok && r.tempPassword) ?? [];
  const downloadCredentials = () =>
    downloadCsv(
      `nanoskool-student-logins-${new Date().toISOString().slice(0, 10)}.csv`,
      ['name', 'class', 'username', 'temporary password'],
      credentials.map((r) => [r.name, sent[r.row - 1]?.className ?? '', r.username ?? '', r.tempPassword ?? '']),
    );

  const reset = () => {
    setChecked(null);
    setResult(null);
    setFileName('');
    setSent([]);
    imp.reset();
  };

  return (
    <>
      {target ? <BackLink to={`/school/classes/${target._id}`} label={target.name} /> : <BackLink to="/school/students" label="Students" />}
      <PageHeader
        title={target ? `Import students into ${target.name}` : 'Import students'}
        subtitle={
          target
            ? `Upload a class list as a CSV file (Excel: File → Save as → CSV). Rows without a grade and section go into ${target.name}.`
            : `Add many students to ${me.school?.name ?? 'your school'} at once from a CSV file (Excel: File → Save as → CSV).`
        }
      />
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        <Step>
          <StepLabel>Choose a file</StepLabel>
        </Step>
        <Step>
          <StepLabel>Check the rows</StepLabel>
        </Step>
        <Step>
          <StepLabel>Save logins</StepLabel>
        </Step>
      </Stepper>
      <QueryState q={classes}>
        {(cls) => (
          <>
            {!cls.length && (
              <Alert severity="warning" sx={{ mb: 2 }} action={<Button component={RouterLink} to="/school/classes?new=1">Create class</Button>}>
                Create your classes first. Each row is matched to a class by its grade and section.
              </Alert>
            )}
            {step === 0 && (
              <Section title="1. Prepare your file">
                <Stack spacing={2}>
                  <Typography>
                    {target ? (
                      <>
                        One row per student. Required column: <b>name</b>. You can leave <b>grade</b> and <b>section</b> empty; those students join <b>{target.name}</b>. Optional: email, username, rollNo, gender, parentName, parentEmail, parentPhone.
                      </>
                    ) : (
                      <>
                        One row per student. Required columns: <b>name</b>, <b>grade</b>, <b>section</b>. Optional: email, username, rollNo, gender, parentName, parentEmail, parentPhone.
                      </>
                    )}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Students without an email get a username and a one-time password that you download at the end. If you give a parent email, the parent gets their own account (or the child is linked to an existing parent with that email).
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={template}>
                      Download template
                    </Button>
                    <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => fileRef.current?.click()} disabled={!cls.length}>
                      Choose CSV file
                    </Button>
                  </Stack>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    data-testid="csv-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFile(f);
                      e.target.value = '';
                    }}
                  />
                  {parseError && <Alert severity="error">{parseError}</Alert>}
                </Stack>
              </Section>
            )}
            {step === 1 && checked && (
              <>
                <CardGrid min={180}>
                  <StatCard label="Rows in file" value={checked.length} hint={fileName} />
                  <StatCard label="Ready to import" value={valid.length} color="success.main" icon={<CheckCircle />} />
                  <StatCard label="Need fixing" value={invalid.length} color="error.main" icon={<ErrorOutline />} />
                </CardGrid>
                <Box sx={{ mt: 2 }} />
                {invalid.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Rows with problems will be skipped. Fix them in your spreadsheet and import them again later, or choose a corrected file now.
                  </Alert>
                )}
                <Section
                  title="2. Check the rows"
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button onClick={reset}>Choose another file</Button>
                      <Button variant="contained" onClick={runImport} disabled={!valid.length || imp.isPending}>
                        {imp.isPending ? 'Importing…' : `Import ${valid.length} student${valid.length === 1 ? '' : 's'}`}
                      </Button>
                    </Stack>
                  }
                >
                  <FormError error={imp.error} />
                  <DataTable
                    rows={checked.map((c) => ({ ...c, _id: String(c.line) }))}
                    columns={[
                      { key: 'line', label: '#', width: 40, render: (c) => c.line },
                      { key: 'ok', label: 'Status', render: (c) => (c.errors.length ? <Chip size="small" color="error" label="Fix" /> : <Chip size="small" color="success" label="Ready" />) },
                      { key: 'name', label: 'Name', render: (c) => <Box component="b" sx={{ whiteSpace: 'nowrap' }}>{c.row.name || '—'}</Box> },
                      { key: 'class', label: 'Class', render: (c) => <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{c.className ?? `${c.row.grade || '?'} - ${c.row.section || '?'}`}</Box> },
                      { key: 'roll', label: 'Roll', render: (c) => c.row.rollNo || '—' },
                      { key: 'login', label: 'Sign-in', render: (c) => c.row.email || (c.row.username ? `@${c.row.username}` : <Typography variant="body2" color="text.secondary">Username created for you</Typography>) },
                      { key: 'parent', label: 'Parent', render: (c) => (c.row.parentEmail ? `${c.row.parentName || 'Parent'} · ${c.row.parentEmail}` : '—') },
                      { key: 'errors', label: 'Problems', width: 280, render: (c) => (c.errors.length ? <Typography variant="body2" color="error.main">{c.errors.join('; ')}</Typography> : '—') },
                    ]}
                  />
                </Section>
              </>
            )}
            {step === 2 && result && (
              <>
                <CardGrid min={180}>
                  <StatCard label="Added" value={result.created} color="success.main" icon={<CheckCircle />} />
                  <StatCard label="Not added" value={result.failed + invalid.length} color="error.main" icon={<ErrorOutline />} hint={invalid.length ? `${invalid.length} skipped before import` : undefined} />
                  <StatCard label="Logins to hand out" value={credentials.length} />
                </CardGrid>
                <Box sx={{ mt: 2 }} />
                {credentials.length > 0 && (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                      <Button color="inherit" variant="outlined" startIcon={<FileDownloadOutlined />} onClick={downloadCredentials}>
                        Download logins
                      </Button>
                    }
                  >
                    Download the usernames and one-time passwords now. For security they are not stored and will not be shown again once you leave this page.
                  </Alert>
                )}
                <Section
                  title="3. Results"
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button onClick={reset}>Import another file</Button>
                      <Button variant="contained" component={RouterLink} to="/school/students">
                        Done
                      </Button>
                    </Stack>
                  }
                >
                  <DataTable
                    rows={result.results.map((r) => ({ ...r, _id: String(r.row) }))}
                    empty={<Empty title="Nothing was imported" />}
                    columns={[
                      { key: 'row', label: '#', width: 40, render: (r) => sent[r.row - 1]?.line ?? r.row },
                      { key: 'ok', label: 'Result', render: (r) => (r.ok ? <Chip size="small" color="success" label="Added" /> : <Chip size="small" color="error" label="Failed" />) },
                      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
                      { key: 'class', label: 'Class', render: (r) => sent[r.row - 1]?.className ?? '—' },
                      { key: 'login', label: 'Sign-in', render: (r) => (r.ok ? r.username ?? sent[r.row - 1]?.row.email ?? '—' : '—') },
                      { key: 'pw', label: 'One-time password', render: (r) => (r.tempPassword ? <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.tempPassword}</Box> : r.ok ? <Typography variant="body2" color="text.secondary">Invitation emailed</Typography> : '—') },
                      { key: 'err', label: 'Problem', render: (r) => (r.error ? <Typography variant="body2" color="error.main">{r.error}</Typography> : '—') },
                    ]}
                  />
                </Section>
              </>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
