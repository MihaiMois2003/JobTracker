import { addDays, format } from 'date-fns'
import { newId } from '../../lib/id'
import type {
  Application,
  Contact,
  EmploymentType,
  Interview,
  Priority,
  SalaryPeriod,
  SourceName,
  Status,
  TimelineEvent,
  WorkMode,
} from '../applications/types'

interface Seed {
  title: string
  company: string
  location: string
  workMode: WorkMode
  employmentType?: EmploymentType
  source: SourceName
  url: string
  priority?: Priority
  cv?: string
  tags: string[]
  salary?: [number, number, string, SalaryPeriod]
  salaryOffered?: number
  /** Status history as [day offset from today, status]; the first entry is when it was saved. */
  history: Array<[number, Status]>
  deadline?: number
  followUp?: number
  interviews?: Array<[number, string, Interview['type'], Interview['outcome'], string?]>
  contacts?: Array<Pick<Contact, 'name' | 'role' | 'email'>>
  notes?: string
}

const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')
const stampAt = (offset: number, hour = 10) => {
  const d = addDays(new Date(), offset)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}

const SEEDS: Seed[] = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Bitdefender',
    location: 'București, România',
    workMode: 'hybrid',
    source: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/4100000001/',
    priority: 3,
    cv: 'CV v3 – frontend',
    tags: ['React', 'TypeScript', 'Testing Library', 'Design systems'],
    salary: [14000, 18000, 'RON', 'month'],
    history: [[-21, 'saved'], [-18, 'applied'], [-12, 'screening'], [-6, 'interview']],
    interviews: [
      [-6, '11:00', 'hr', 'passed', 'https://meet.google.com/abc-defg-hij'],
      [2, '14:30', 'technical', 'pending', 'https://meet.google.com/xyz-uvwx-rst'],
    ],
    contacts: [{ name: 'Ioana Marin', role: 'Talent Acquisition', email: 'ioana.marin@example.com' }],
    notes: 'Echipa de consumer web. Întreabă de procesul de code review și de cum măsoară performanța.',
  },
  {
    title: 'Product Engineer',
    company: 'Notion',
    location: 'Remote (EU)',
    workMode: 'remote',
    source: 'company',
    url: 'https://jobs.ashbyhq.com/notion/demo-product-engineer',
    priority: 3,
    cv: 'CV v3 – frontend',
    tags: ['TypeScript', 'React', 'Product thinking'],
    salary: [150000, 190000, 'USD', 'year'],
    history: [[-11, 'saved'], [-9, 'applied']],
    followUp: -2,
  },
  {
    title: 'Frontend Developer',
    company: 'eMAG',
    location: 'București, România',
    workMode: 'onsite',
    source: 'ejobs',
    url: 'https://www.ejobs.ro/user/locuri-de-munca/frontend-developer/demo1',
    cv: 'CV v2 – generalist',
    tags: ['Vue', 'JavaScript', 'E-commerce'],
    history: [[-2, 'saved']],
    deadline: 3,
  },
  {
    title: 'React Developer',
    company: 'Endava',
    location: 'Cluj-Napoca, România',
    workMode: 'hybrid',
    source: 'bestjobs',
    url: 'https://www.bestjobs.eu/ro/loc-de-munca/react-developer-demo',
    cv: 'CV v2 – generalist',
    tags: ['React', 'Redux', 'Agile'],
    salary: [11000, 14000, 'RON', 'month'],
    history: [[-12, 'saved'], [-10, 'applied'], [-4, 'screening']],
    contacts: [{ name: 'Andrei Popa', role: 'Recruiter', email: 'andrei.popa@example.com' }],
  },
  {
    title: 'Software Engineer, Payments UI',
    company: 'Stripe',
    location: 'Dublin, Ireland',
    workMode: 'hybrid',
    source: 'company',
    url: 'https://stripe.com/jobs/search?gh_jid=demo1',
    cv: 'CV v3 – frontend',
    tags: ['TypeScript', 'Payments', 'Accessibility'],
    salary: [90000, 130000, 'EUR', 'year'],
    history: [[-44, 'saved'], [-40, 'applied'], [-33, 'screening'], [-25, 'interview'], [-20, 'rejected']],
    interviews: [[-25, '16:00', 'technical', 'failed']],
    notes: 'Feedback: system design bun, dar au vrut mai multă experiență cu plăți. De reaplicat peste 6 luni.',
  },
  {
    title: 'UI Engineer',
    company: 'UiPath',
    location: 'Remote (România)',
    workMode: 'remote',
    source: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/4100000002/',
    priority: 3,
    cv: 'CV v3 – frontend',
    tags: ['Angular', 'TypeScript', 'Design systems'],
    salary: [17000, 22000, 'RON', 'month'],
    salaryOffered: 21000,
    history: [[-38, 'saved'], [-35, 'applied'], [-28, 'screening'], [-21, 'interview'], [-3, 'offer']],
    interviews: [
      [-21, '10:00', 'hr', 'passed'],
      [-14, '13:00', 'technical', 'passed'],
      [-10, '17:00', 'final', 'passed'],
    ],
    contacts: [
      { name: 'Maria Ionescu', role: 'Engineering Manager', email: 'maria.ionescu@example.com' },
      { name: 'Radu Stan', role: 'Recruiter', email: 'radu.stan@example.com' },
    ],
    notes: 'Oferta expiră vineri. Negociere: 23.000 net + buget de training.',
  },
  {
    title: 'Fullstack Engineer',
    company: 'Revolut',
    location: 'Remote',
    workMode: 'remote',
    source: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/4100000003/',
    cv: 'CV v2 – generalist',
    tags: ['Node.js', 'React', 'Fintech'],
    history: [[-52, 'saved'], [-50, 'applied'], [-15, 'ghosted']],
  },
  {
    title: 'Frontend Engineer, Express',
    company: 'Adobe',
    location: 'București, România',
    workMode: 'hybrid',
    source: 'company',
    url: 'https://careers.adobe.com/us/en/job/demo-frontend',
    cv: 'CV v3 – frontend',
    tags: ['Web components', 'Performance'],
    history: [[-29, 'saved'], [-27, 'applied']],
  },
  {
    title: 'Web Developer, Tools',
    company: 'Ubisoft',
    location: 'București, România',
    workMode: 'hybrid',
    source: 'bestjobs',
    url: 'https://www.bestjobs.eu/ro/loc-de-munca/web-developer-tools-demo',
    cv: 'CV v2 – generalist',
    tags: ['React', 'Electron', 'Internal tools'],
    history: [[-17, 'saved'], [-16, 'applied']],
  },
  {
    title: 'Senior Frontend Engineer, Plan',
    company: 'GitLab',
    location: 'Remote (EMEA)',
    workMode: 'remote',
    source: 'company',
    url: 'https://job-boards.greenhouse.io/gitlab/jobs/demo1',
    priority: 3,
    cv: 'CV v3 – frontend',
    tags: ['Vue', 'GraphQL', 'Remote-first'],
    salary: [80000, 110000, 'USD', 'year'],
    history: [[-15, 'saved'], [-14, 'applied'], [-7, 'screening'], [-2, 'interview']],
    interviews: [[5, '15:00', 'hr', 'pending', 'https://zoom.us/j/000000000']],
  },
  {
    title: 'Frontend Lead',
    company: 'Bolt',
    location: 'Remote (Europe)',
    workMode: 'remote',
    employmentType: 'contract',
    source: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/4100000004/',
    priority: 3,
    tags: ['Leadership', 'React', 'Mobile web'],
    history: [[-1, 'saved']],
    deadline: 10,
  },
  {
    title: 'Design Systems Engineer',
    company: 'Atlassian',
    location: 'Remote',
    workMode: 'remote',
    source: 'company',
    url: 'https://www.atlassian.com/company/careers/details/demo1',
    cv: 'CV v3 – frontend',
    tags: ['Design systems', 'Accessibility', 'React'],
    history: [[-4, 'saved'], [-3, 'applied']],
  },
  {
    title: 'JavaScript Developer',
    company: 'Ness Digital Engineering',
    location: 'Timișoara, România',
    workMode: 'onsite',
    source: 'ejobs',
    url: 'https://www.ejobs.ro/user/locuri-de-munca/javascript-developer/demo2',
    cv: 'CV v1',
    tags: ['JavaScript', 'Angular'],
    history: [[-33, 'saved'], [-30, 'applied'], [-22, 'withdrawn']],
    notes: 'M-am retras: 100% la birou, naveta prea lungă.',
  },
  {
    title: 'Frontend Developer',
    company: 'Tremend',
    location: 'București, România',
    workMode: 'hybrid',
    source: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/4100000005/',
    cv: 'CV v3 – frontend',
    tags: ['Next.js', 'TypeScript'],
    salary: [12000, 15000, 'RON', 'month'],
    history: [[-2, 'saved'], [-1, 'applied']],
  },
  {
    title: 'Accessibility Engineer',
    company: 'Spotify',
    location: 'Stockholm, Sweden',
    workMode: 'hybrid',
    source: 'company',
    url: 'https://jobs.lever.co/spotify/demo-a11y',
    cv: 'CV v3 – frontend',
    tags: ['Accessibility', 'WCAG', 'React'],
    history: [[-24, 'saved'], [-22, 'applied'], [-15, 'screening'], [-9, 'rejected']],
    contacts: [{ name: 'Elin Berg', role: 'Recruiter', email: 'elin.berg@example.com' }],
  },
]

/** About 15 realistic applications across every status, dated relative to today, marked `demo`. */
export function buildDemoApplications(currency: string): Array<{ id: string; data: Omit<Application, 'id'> }> {
  return SEEDS.map((s) => {
    const timeline: TimelineEvent[] = []
    let prev: Status | undefined
    for (const [offset, status] of s.history) {
      timeline.push(
        prev === undefined
          ? { id: newId(), at: stampAt(offset, 9), type: 'created', to: status }
          : { id: newId(), at: stampAt(offset), type: 'status', from: prev, to: status },
      )
      prev = status
    }
    const interviews: Interview[] = (s.interviews ?? []).map(([offset, time, type, outcome, location]) => ({
      id: newId(),
      at: `${day(offset)}T${time}`,
      durationMin: type === 'final' ? 60 : 45,
      type,
      location: location ?? '',
      people: '',
      notes: '',
      questions: '',
      outcome,
    }))
    // Each interview was scheduled about five days ahead (never in the future).
    for (const [offset, , type] of s.interviews ?? []) {
      timeline.push({ id: newId(), at: stampAt(Math.min(offset - 5, -1), 8), type: 'interview_added', detail: type })
    }
    const applied = s.history.find(([, st]) => st !== 'saved')
    const status = s.history[s.history.length - 1][1]
    const last = timeline.reduce((a, e) => (e.at > a ? e.at : a), timeline[0].at)
    const [salaryMin, salaryMax, cur, period] = s.salary ?? [null, null, currency, null]
    const open = ['applied', 'screening', 'interview'].includes(status)

    return {
      id: newId(),
      data: {
        title: s.title,
        company: s.company,
        companyWebsite: '',
        location: s.location,
        workMode: s.workMode,
        employmentType: s.employmentType ?? 'full_time',
        salaryMin,
        salaryMax,
        currency: cur,
        salaryPeriod: period,
        salaryOffered: s.salaryOffered ?? null,
        description: '',
        tags: s.tags,
        sourceUrl: s.url,
        sourceName: s.source,
        status,
        priority: s.priority ?? 2,
        cvVersion: s.cv ?? '',
        cvId: null,
        cvVersionId: null,
        cvLabelSnapshot: '',
        cvDeleted: false,
        appliedAt: applied ? day(applied[0]) : null,
        deadline: s.deadline !== undefined ? day(s.deadline) : null,
        nextFollowUpAt: s.followUp !== undefined ? day(s.followUp) : open ? day(4) : null,
        notes: s.notes ?? '',
        contacts: (s.contacts ?? []).map((c) => ({ id: newId(), phone: '', linkedin: '', ...c })),
        interviews,
        timeline,
        archived: false,
        listingClosed: false,
        ghostDismissedAt: null,
        demo: true,
        createdAt: timeline[0].at,
        updatedAt: last,
      },
    }
  })
}
