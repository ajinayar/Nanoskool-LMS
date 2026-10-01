/** Shared views for the learning journey: outcome bands, skill bars, guidance cards and the portfolio. */
import { Avatar, Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import NavigationRounded from '@mui/icons-material/NavigationRounded';
import TurnRightRounded from '@mui/icons-material/TurnRightRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import PlayCircleRounded from '@mui/icons-material/PlayCircleRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import LinkRounded from '@mui/icons-material/LinkRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { BAND_LABEL, BAND_TONE, STAGES, STAGE_INFO, type Stage, type Advice, type Evidence, type OutcomeBand, type Portfolio, type PortfolioSkill } from '@/api/journey';
import { fmtDate } from './ui';

export function BandChip({ band, score, size = 'small' }: { band: OutcomeBand | null | undefined; score?: number | null; size?: 'small' | 'medium' }) {
  if (!band) return <Chip size={size} label="No evidence yet" sx={{ bgcolor: '#EEEEF2', color: '#5D6275', fontWeight: 600 }} />;
  const [bg, fg] = BAND_TONE[band];
  return <Chip size={size} label={`${BAND_LABEL[band]}${score != null ? ` · ${score}%` : ''}`} sx={{ bgcolor: bg, color: fg, fontWeight: 650 }} />;
}

/** A heatmap cell colour for a score. */
export function bandColor(band: OutcomeBand | null | undefined) {
  return band ? BAND_TONE[band] : ['#F1F1F4', '#9A9AA6'];
}

/** The five growth stages as a small track: past stages filled, the current one large. */
export function StageTrack({ stage, compact }: { stage: Stage | null | undefined; compact?: boolean }) {
  const at = stage ? STAGES.indexOf(stage) : -1;
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: compact ? 0.25 : 0.5 }} aria-label={stage ? `Stage: ${STAGE_INFO[stage].label}` : 'Not assessed yet'}>
      {STAGES.map((st, i) => {
        const on = i <= at;
        const here = i === at;
        return (
          <Tooltip key={st} title={`${STAGE_INFO[st].label}: ${STAGE_INFO[st].adult}`}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <Box sx={{ width: compact ? 6 : 12, height: 3, borderRadius: 2, bgcolor: on ? STAGE_INFO[st].color : '#E6E3DC' }} />}
              <Box sx={{ width: here ? (compact ? 26 : 34) : compact ? 18 : 24, height: here ? (compact ? 26 : 34) : compact ? 18 : 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: here ? (compact ? 15 : 19) : compact ? 10 : 13, bgcolor: on ? STAGE_INFO[st].soft : '#F4F2EE', border: here ? `2px solid ${STAGE_INFO[st].color}` : '1px solid transparent', filter: on ? 'none' : 'grayscale(1)', opacity: on ? 1 : 0.45, transition: 'all .2s' }}>
                {STAGE_INFO[st].icon}
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/**
 * My Genius Tree: each Genius Habit is a branch, growing Seed → Sprout → Sapling → Bloom → Fruit.
 * Shows the academic name for adults, and growth since the first Genius Quest.
 */
export function GeniusTree({ skills, audience = 'adult' }: { skills: PortfolioSkill[]; audience?: 'adult' | 'child' }) {
  if (!skills.some((s) => s.latest != null))
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ fontSize: 34 }}>🌰</Typography>
        <Typography color="text.secondary">{audience === 'child' ? 'Take your Genius Quest to plant your Genius Tree!' : 'The Genius Quest has not been taken yet, so the tree is still to be planted.'}</Typography>
      </Box>
    );
  const blooming = skills.filter((s) => s.level === 'bloom' || s.level === 'fruit').length;
  const fruit = skills.filter((s) => s.level === 'fruit').length;
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {fruit ? `${fruit} habit${fruit === 1 ? ' is' : 's are'} bearing fruit 🍎 · ` : ''}
        {blooming} of {skills.length} habits blooming or beyond
      </Typography>
      {skills.map((s) => {
        const st = s.level;
        const grew = s.firstStage && st && STAGES.indexOf(st) > STAGES.indexOf(s.firstStage);
        return (
          <Stack key={s._id} direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: { xs: 1, sm: 2 }, p: 1.25, borderRadius: 2.5, bgcolor: st === 'fruit' ? '#FFF6EF' : '#FBFAF7', border: '1px solid', borderColor: st === 'fruit' ? '#FFD5B8' : '#EFEBE3' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color || '#8B6CEF', flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 15 }} noWrap>
                  {s.habit || s.name}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 2.25 }}>
                {audience === 'adult' && s.habit && s.habit !== s.name ? `${s.name} · ` : ''}
                {st ? (audience === 'child' ? STAGE_INFO[st].child : STAGE_INFO[st].adult) : 'Not assessed yet'}
                {grew ? ` · grew from ${STAGE_INFO[s.firstStage!].label}` : ''}
              </Typography>
            </Box>
            <StageTrack stage={st} />
            <Box sx={{ width: { sm: 78 }, textAlign: { sm: 'right' } }}>
              {st && (
                <Typography variant="body2" sx={{ fontWeight: 700, color: STAGE_INFO[st].color }}>
                  {STAGE_INFO[st].label}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Older name kept so existing pages keep working. */
export const SkillBars = ({ skills }: { skills: PortfolioSkill[]; compare?: boolean }) => <GeniusTree skills={skills} />;

const ADVICE_ICON: Record<Advice['kind'], [ReactNode, string, string]> = {
  setup: [<SettingsRounded key="s" />, '#E3E8FB', '#2E4BB8'],
  next: [<NavigationRounded key="n" />, '#D3EEDD', '#1D6B3E'],
  reroute: [<TurnRightRounded key="r" />, '#FCE0B8', '#86500A'],
  alert: [<WarningAmberRounded key="a" />, '#FBD5C6', '#9A3A16'],
  strength: [<StarRounded key="t" />, '#E6DCFB', '#4C2F9C'],
};

/** "Google Maps" style directions: where you are, the next turn, and any reroutes. */
export function GuidanceList({ advice, base, empty = 'All on track. Nothing needs attention right now.', limit }: { advice: Advice[]; base?: string; empty?: string; limit?: number }) {
  const list = limit ? advice.slice(0, limit) : advice;
  if (!list.length) return <Typography color="text.secondary">{empty}</Typography>;
  return (
    <Stack spacing={1.25}>
      {list.map((a) => {
        const [icon, bg, fg] = ADVICE_ICON[a.kind] ?? ADVICE_ICON.next;
        return (
          <Stack key={a.key} direction="row" spacing={1.5} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#FAFAFB', border: '1px solid #EEEEF2', alignItems: 'flex-start' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: bg, color: fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 650, fontSize: 15 }}>{a.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {a.text}
              </Typography>
              {a.why && (
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                  Why: {a.why}
                </Typography>
              )}
            </Box>
            {a.action && base != null && (
              <Button size="small" variant="outlined" component={RouterLink} to={`${base}${a.action.to}`} sx={{ flexShrink: 0 }}>
                {a.action.label}
              </Button>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

const isImg = (u: string) => /\.(png|jpe?g|webp|gif|heic)$/i.test(u);
const isVid = (u: string) => /\.(mp4|mov|webm)$/i.test(u);

export function EvidenceMediaView({ e, height = 150 }: { e: Evidence; height?: number }) {
  const m = e.media?.[0];
  if (!m)
    return (
      <Box sx={{ height, bgcolor: '#F4F1FF', display: 'grid', placeItems: 'center', color: '#4C2F9C', px: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {e.source === 'tool' ? `Tool result · ${e.score ?? '—'}%` : (e.caption ?? 'Written work')}
        </Typography>
      </Box>
    );
  if (m.kind === 'photo' || isImg(m.url)) return <Box component="img" src={m.url} alt={e.caption ?? 'Evidence'} sx={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />;
  if (m.kind === 'video' || isVid(m.url)) return <Box component="video" src={m.url} controls preload="metadata" sx={{ width: '100%', height, objectFit: 'cover', display: 'block', bgcolor: '#000' }} />;
  return (
    <Box component="a" href={m.url} target="_blank" rel="noopener" sx={{ height, bgcolor: '#F1F4FB', display: 'grid', placeItems: 'center', color: '#2E4BB8', textDecoration: 'none' }}>
      <Stack sx={{ alignItems: 'center' }} spacing={0.5}>
        {m.kind === 'link' ? <LinkRounded /> : <DescriptionOutlined />}
        <Typography variant="body2">{m.name || (m.kind === 'link' ? 'Open link' : 'Open file')}</Typography>
      </Stack>
    </Box>
  );
}

export function EvidenceCard({ e, footer }: { e: Evidence; footer?: ReactNode }) {
  const title = e.activity?.title ?? e.activityTitle ?? e.unit?.title ?? 'Evidence';
  return (
    <Card variant="outlined" sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'relative' }}>
        <EvidenceMediaView e={e} />
        {(e.media?.length ?? 0) > 1 && <Chip size="small" label={`+${e.media.length - 1}`} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }} />}
        {e.media?.[0] && isVid(e.media[0].url) && <PlayCircleRounded sx={{ position: 'absolute', left: 8, top: 8, color: '#fff', opacity: 0.85 }} />}
      </Box>
      <CardContent sx={{ flex: 1, p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Typography sx={{ fontWeight: 650, fontSize: 14.5 }} noWrap title={title}>
          {title}
        </Typography>
        {e.caption && (
          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {e.caption}
          </Typography>
        )}
        <Stack direction="row" spacing={0.75} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {e.status === 'verified' ? <Chip size="small" icon={<VerifiedRounded />} label={e.score != null ? `${e.score}%` : 'Verified'} sx={{ bgcolor: '#D3EEDD', color: '#1D6B3E', '& .MuiChip-icon': { color: '#1D6B3E' } }} /> : e.status === 'returned' ? <Chip size="small" label="Try again" sx={{ bgcolor: '#FCE0B8', color: '#86500A' }} /> : <Chip size="small" label="Waiting for teacher" sx={{ bgcolor: '#EEEEF2' }} />}
          <Typography variant="caption" color="text.secondary">
            {fmtDate(e.createdAt)}
          </Typography>
        </Stack>
        {e.feedback && (
          <Typography variant="body2" sx={{ mt: 1, p: 1, borderRadius: 1.5, bgcolor: '#FFF8E6', fontSize: 13 }}>
            “{e.feedback}”
          </Typography>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}

/** The year portfolio: skills growth, learning outcomes by course and unit, and chosen work. */
export function PortfolioView({ p, renderEvidenceFooter, printable = true, audience = 'adult' }: { p: Portfolio; renderEvidenceFooter?: (e: Evidence) => ReactNode; printable?: boolean; audience?: 'adult' | 'child' }) {
  const s = p.student;
  const all = p.courses.flatMap((c) => c.units.flatMap((u) => u.evidence));
  const featured = p.featured.length ? p.featured : all.filter((e) => e.status === 'verified').slice(0, 6);
  return (
    <Box className="portfolio">
      <Card sx={{ mb: 2.5, '@media print': { boxShadow: 'none', border: 'none' } }}>
        <CardContent sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar src={s.avatarUrl} sx={{ width: 72, height: 72, fontSize: 28, bgcolor: '#8B6CEF', color: '#fff' }}>
            {s.name[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {s.name}
            </Typography>
            <Typography color="text.secondary">
              {[s.class?.name, s.school?.name, s.class?.academicYear].filter(Boolean).join(' · ')}
            </Typography>
            {s.interests?.length > 0 && (
              <Stack direction="row" sx={{ mt: 1, gap: 0.75, flexWrap: 'wrap' }}>
                {s.interests.map((i) => (
                  <Chip key={i} size="small" label={i} />
                ))}
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={3} sx={{ textAlign: 'center' }}>
            {[
              [p.stats.averageOutcome == null ? '—' : `${p.stats.averageOutcome}%`, 'Average outcome'],
              [p.stats.mastered, 'Units mastered'],
              [p.stats.verified, 'Pieces of evidence'],
            ].map(([v, l]) => (
              <Box key={String(l)}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {v}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {l}
                </Typography>
              </Box>
            ))}
          </Stack>
          {printable && (
            <Button variant="outlined" startIcon={<PrintOutlined />} onClick={() => window.print()} sx={{ '@media print': { display: 'none' } }}>
              Print showcase
            </Button>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2.5, background: 'linear-gradient(180deg, #F4FAEE 0%, #FFFFFF 42%)' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, gap: 1, mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 750, fontSize: 18 }}>🌳 My Genius Tree</Typography>
              <Typography variant="body2" color="text.secondary">
                Every child is a seed of genius. {p.skills.assessedAt ? `Last Genius Quest ${fmtDate(p.skills.assessedAt)}.` : ''}
              </Typography>
            </Box>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {STAGES.map((st) => (
                <Typography key={st} variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {STAGE_INFO[st].icon} {STAGE_INFO[st].label}
                </Typography>
              ))}
            </Stack>
          </Stack>
          <GeniusTree skills={p.skills.skills} audience={audience} />
        </CardContent>
      </Card>

      <Box sx={{ mb: 2.5 }}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 650, mb: 2 }}>Learning outcomes</Typography>
            {p.courses.length === 0 && <Typography color="text.secondary">No courses yet.</Typography>}
            <Stack spacing={2.25}>
              {p.courses.map((c) => (
                <Box key={c._id}>
                  <Typography variant="body2" sx={{ fontWeight: 650, mb: 1 }}>
                    {c.title}
                  </Typography>
                  <Stack spacing={0.75}>
                    {c.units.map((u) => (
                      <Stack key={u._id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={u.title}>
                          {u.title}
                        </Typography>
                        <Box sx={{ width: 110, display: { xs: 'none', sm: 'block' } }}>
                          <LinearProgress variant="determinate" value={u.score ?? 0} sx={{ height: 6, borderRadius: 3, bgcolor: '#EEEEF2', '& .MuiLinearProgress-bar': { bgcolor: bandColor(u.band)[1] } }} />
                        </Box>
                        <BandChip band={u.band} score={u.score} />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Typography sx={{ fontWeight: 650, mb: 1.5 }}>{p.featured.length ? 'Showcase: chosen work' : 'Recent work'}</Typography>
      {featured.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No evidence yet. Projects, videos and tool results appear here once a teacher checks them.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', mb: 3 }}>
          {featured.map((e) => (
            <EvidenceCard key={e._id} e={e} footer={renderEvidenceFooter?.(e)} />
          ))}
        </Box>
      )}
      {all.length > featured.length && (
        <>
          <Typography sx={{ fontWeight: 650, mb: 1.5, '@media print': { display: 'none' } }}>All evidence ({all.length})</Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', '@media print': { display: 'none' } }}>
            {all.map((e) => (
              <EvidenceCard key={e._id} e={e} footer={renderEvidenceFooter?.(e)} />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
