import type { Competency, TemplateKind } from "@/hooks/useRecruiting";

/**
 * Position-specific phone-screen and interview blueprints.
 *
 * Every generated form uses the SAME structure as the Patient Service Coordinator
 * forms (rich 0–4 competencies with area, evidence, two questions, quick script,
 * listen-for, anchors and red flags) — only the questions change per position.
 *
 * Each form also carries the shared CHARACTER block: work ethic, reliability,
 * teamwork and coachability — the signals that predict what kind of team member
 * someone actually becomes.
 */

type Rich = Omit<Competency, "weight"> & { weight?: number };

const comp = (c: Rich): Competency => ({
  weight: 10,
  label: c.title || c.label || "",
  guidance: c.guidance || c.evidence || "",
  ...c,
} as Competency);

/* ------------------------------------------------------------------ */
/* Shared character / work-ethic block                                  */
/* ------------------------------------------------------------------ */

export const CORE_INTERVIEW: Competency[] = [
  comp({
    id: "work_ethic", title: "Work Ethic + Drive", area: "Effort / Standards",
    evidence: "Picks up the unglamorous work, finishes what they start, and holds a standard when no one is watching.",
    q1: "Tell me about the hardest stretch you've had at work — heavy volume, short staffing, or a bad week. What did you personally do differently?",
    q2: "Describe something at a past job that nobody wanted to do. How did it end up getting done?",
    quick: "Do they run toward work or wait to be assigned it?",
    lookFor: "Specific effort with a specific outcome, staying late by choice, taking on prep/cleanup, pride in finishing, no self-glorifying vagueness.",
    anchors: "4 = takes ownership beyond their lane with proof. 3 = solid, dependable effort. 2 = does the job as told. 1 = needs pushing. 0 = deflects effort onto others.",
    redFlags: "Cannot name a hard stretch; every story is about someone else's failure; 'that wasn't my job'; complains about being asked to help.",
  }),
  comp({
    id: "reliability", title: "Reliability + Attendance", area: "Dependability / Schedule Integrity",
    evidence: "Shows up on time, gives notice, and protects the schedule the team is counting on.",
    q1: "Walk me through your attendance over the last year — how many times were you late or out unplanned, and why?",
    q2: "Your shift starts at 8:00 and something goes wrong at home at 7:20. What do you actually do?",
    quick: "Will this person be here, on time, on the days we need them?",
    lookFor: "Owns their record honestly, calls early not after start time, has a real backup plan for transportation and childcare, understands coverage impact.",
    anchors: "4 = near-perfect record with a real contingency plan. 3 = reliable with rare, communicated exceptions. 2 = a few unexplained gaps. 1 = pattern of lateness. 0 = no-call/no-show history or blames everyone else.",
    redFlags: "Vague about attendance, transportation is 'usually fine', texts after shift start, minimizes the impact on coworkers.",
  }),
  comp({
    id: "team", title: "Team Contribution + Attitude", area: "Culture / Coworkers",
    evidence: "Makes the office easier to work in — jumps in, communicates, and doesn't create drama.",
    q1: "Tell me about a coworker who was hard to work with. What did you do, and what would they say about you?",
    q2: "When your part of the day is caught up and a teammate is buried, what happens next?",
    quick: "Would the current team be better or heavier with them in it?",
    lookFor: "Goes to the person directly, assumes good intent, offers help unprompted, credits the team, keeps patient-facing composure.",
    anchors: "4 = lifts the whole floor. 3 = good teammate. 2 = neutral, stays in their lane. 1 = friction. 0 = gossip, blame, or hostility.",
    redFlags: "Trash-talks past coworkers or managers, 'everywhere I've worked was toxic', competitive with teammates, waits to be asked for help.",
  }),
  comp({
    id: "coachability", title: "Coachability + Ownership", area: "Feedback / Accountability",
    evidence: "Takes correction without ego, changes behavior, and owns mistakes before someone finds them.",
    q1: "Tell me about the last piece of critical feedback you got. What exactly changed afterward?",
    q2: "Describe a mistake that affected a customer or patient. How did you handle it and what did you put in place so it wouldn't repeat?",
    quick: "Can we coach them once and see it stick?",
    lookFor: "Names the feedback plainly, no defensiveness, describes the specific change, self-reports errors, asks clarifying questions.",
    anchors: "4 = actively seeks feedback and applies it fast. 3 = accepts and adjusts. 2 = accepts but slow to change. 1 = defensive. 0 = argues or hides mistakes.",
    redFlags: "'I can't think of any feedback', blames the trainer, hides errors, repeats the same mistake, treats coaching as criticism.",
  }),
  comp({
    id: "integrity", title: "Integrity + Patient Trust", area: "Ethics / HIPAA / Cash Handling",
    evidence: "Protects patient information, money, and product — and tells the truth when it costs them something.",
    q1: "You realize you gave a patient the wrong pricing after they've already left. What do you do?",
    q2: "What would you do if a coworker asked you to look up a friend's patient record or apply an unauthorized discount?",
    quick: "Do they do the right thing when it's inconvenient?",
    lookFor: "Immediate disclosure, escalates to a manager, understands privacy is non-negotiable, no rationalizing shortcuts.",
    anchors: "4 = clear, principled, escalates properly. 3 = right answer with prompting. 2 = hesitant. 1 = would let it slide. 0 = rationalizes a violation.",
    redFlags: "Would 'wait and see', jokes about looking up records, discounts to avoid conflict, hides errors from a manager.",
  }),
];

export const CORE_PHONE: Competency[] = [
  comp({
    id: "reliability_phone", title: "Reliability + Availability", area: "Schedule / Commute / Attendance",
    evidence: "Availability, commute and attendance history line up with the opening — no surprises later.",
    q1: "This role is [hours/days] at [location]. Does that work for your schedule and commute, and when could you start?",
    q2: "How many unplanned absences or late arrivals have you had in the last six months, and what caused them?",
    quick: "Can they actually be here, on time, for the hours we need?",
    lookFor: "Confirmed hours, reliable transportation, honest attendance answer, realistic start date, no hidden second-job conflicts.",
    anchors: "4 = fully available with a clean record. 3 = available with minor notes. 2 = some constraints. 1 = significant conflicts. 0 = cannot meet the core schedule.",
    redFlags: "Vague or shifting availability, 'my ride is usually reliable', dodges the attendance question, needs a long delay to start.",
  }),
  comp({
    id: "work_ethic_phone", title: "Work Ethic Snapshot", area: "Effort / Motivation",
    evidence: "Gives a concrete example of hard work and a real reason for wanting this role — not just any job.",
    q1: "What's the busiest work environment you've handled, and what did you do to keep up?",
    q2: "Why this role at MyEyeDr, and what are you looking for in your next team?",
    quick: "Real motivation and real effort, or just applying everywhere?",
    lookFor: "Specific pace/volume detail, pride in the work, researched the role, wants stability and growth, positive about past teams.",
    anchors: "4 = motivated with concrete proof of effort. 3 = solid answers. 2 = generic. 1 = unclear motivation. 0 = only pay/short-term.",
    redFlags: "Doesn't know what the role is, negative about every past employer, wants a placeholder job, no examples of busy work.",
  }),
];

/* ------------------------------------------------------------------ */
/* Position-specific blocks                                            */
/* ------------------------------------------------------------------ */

export interface RoleBlueprint {
  key: string;
  role: string;
  match: string[];        // lowercase fragments used to auto-match a position title
  summary: string;
  phone: Competency[];
  interview: Competency[];
}

export const ROLE_BLUEPRINTS: RoleBlueprint[] = [
  {
    key: "psc",
    role: "Patient Service Coordinator",
    match: ["patient service", "patient services", "front desk", "receptionist", "coordinator"],
    summary: "Front-desk phones, scheduling, insurance verification and patient experience.",
    phone: [
      comp({
        id: "psc_phone_manner", title: "Communication + Phone Presence", area: "Phone Manner / Clarity",
        evidence: "Answers professionally, speaks clearly, listens, and is easy to understand on the phone.",
        q1: "Tell me a little about yourself and what interests you about this front-desk role at MyEyeDr.",
        q2: "How comfortable are you spending most of the day on the phone and computer with patients?",
        quick: "Clear, warm, professional and easy to understand by phone?",
        lookFor: "Warm greeting, clear speech, good listening, concise answers, positive tone.",
        anchors: "4 = polished and warm. 3 = clear and professional. 2 = flat or wordy. 1 = hard to follow. 0 = unprofessional.",
        redFlags: "Mumbles, background chaos, distracted, dismissive tone, cannot answer simple questions.",
      }),
      comp({
        id: "psc_phone_ops", title: "Front-Desk Experience", area: "Scheduling / Insurance / Systems",
        evidence: "Has handled multi-line phones, scheduling software, insurance or payments in a real setting.",
        q1: "Walk me through a typical day at your last front-desk or customer-facing job — volume, systems, and what you owned.",
        q2: "What experience do you have verifying insurance, collecting payments, or handling scheduling software?",
        quick: "Do they have transferable front-desk mechanics?",
        lookFor: "Named systems, patient/customer volume, payment or eligibility exposure, accuracy habits.",
        anchors: "4 = direct optical/medical front-desk experience. 3 = strong adjacent experience. 2 = some exposure. 1 = minimal. 0 = none and no interest.",
        redFlags: "Cannot describe daily duties, avoided phones, no system exposure at all.",
      }),
    ],
    interview: [
      comp({
        id: "psc_tech", title: "Technology + System Learning", area: "EHR / Scheduling Systems",
        evidence: "Learns scheduling, records, insurance tools and phones without avoidable errors.",
        q1: "Tell me about a time you had to learn a new computer system quickly. How did you avoid mistakes while still moving fast?",
        q2: "This role uses phones, scheduling, patient records, insurance tools and internal messages. What would your first two weeks of learning look like?",
        quick: "Can they learn multiple systems fast and check their own work?",
        lookFor: "A repeatable learning method — notes, checklists, verifying before submitting, asking early.",
        anchors: "4 = repeatable method with proof. 3 = trainable and careful. 2 = vague process. 1 = heavy support. 0 = resistant or careless.",
        redFlags: "'I'm bad with computers', guesses instead of verifying, defensive about system errors.",
      }),
      comp({
        id: "psc_insurance", title: "Insurance + Eligibility Accuracy", area: "Authorizations / Coverage",
        evidence: "Verifies demographics, eligibility and coverage before telling a patient what is owed.",
        q1: "A patient is at the desk and their insurance isn't verifying. What steps do you take before telling them they're not covered?",
        q2: "Describe a time small details in a policy, order or form mattered. How did you catch the error?",
        quick: "Do they verify first and escalate when unsure?",
        lookFor: "Checks DOB, member ID, plan, effective date, prior notes, payer portal, escalation path.",
        anchors: "4 = verification-first and understands risk. 3 = careful and coachable. 2 = partial process. 1 = creates rework. 0 = guesses coverage.",
        redFlags: "Promises coverage, quotes a price without checking, dismisses detail work.",
      }),
      comp({
        id: "psc_service", title: "Patient Experience Under Pressure", area: "De-escalation / Lobby Control",
        evidence: "Keeps a full lobby calm, ringing phones answered, and upset patients handled without escalation.",
        q1: "Three patients are waiting, two lines are ringing and a doctor needs you. What order do you handle it in and why?",
        q2: "Tell me about the angriest customer or patient you've dealt with. What did you say, and how did it end?",
        quick: "Can they triage and de-escalate at the same time?",
        lookFor: "Acknowledges the person in front of them, sets expectations, holds calls properly, apologizes without over-promising, involves a manager at the right point.",
        anchors: "4 = calm triage with a real script. 3 = handles it with structure. 2 = manages but reactive. 1 = freezes or rushes. 0 = argues with patients.",
        redFlags: "Matches the patient's tone, avoids the phone, over-promises refunds, needs a manager for everything.",
      }),
    ],
  },
  {
    key: "optician",
    role: "Licensed Optician",
    match: ["optician", "optical lead", "eyewear consultant"],
    summary: "Frame styling, measurements, lens recommendations, adjustments and troubleshooting.",
    phone: [
      comp({
        id: "opt_phone_cred", title: "Licensure + Optical Background", area: "Credentials / Experience",
        evidence: "Licensure/certification status, years dispensing, and the lens and frame lines they know.",
        q1: "Tell me about your optical background — licensure or ABO status, years dispensing, and the practice type.",
        q2: "Which lens designs, coatings and frame lines are you most comfortable recommending, and why?",
        quick: "Real dispensing depth, or retail-only exposure?",
        lookFor: "Current license/certification, PAL and high-index familiarity, measurement confidence, lab relationships.",
        anchors: "4 = licensed with strong dispensing depth. 3 = solid experience. 2 = retail optical only. 1 = minimal. 0 = none.",
        redFlags: "Unclear license status, cannot name lens options, only rang up sales.",
      }),
      comp({
        id: "opt_phone_sales", title: "Consultative Selling Instinct", area: "Capture / Patient Value",
        evidence: "Talks about recommendations in terms of patient need, not pressure or discounts.",
        q1: "How do you decide what to recommend to a patient who says 'just give me the cheapest'?",
        q2: "What were your capture or second-pair numbers, and how did you get them?",
        quick: "Do they sell by educating rather than pushing?",
        lookFor: "Lifestyle questions, benefit framing, comfortable presenting price, tracks their own numbers.",
        anchors: "4 = consultative with metrics. 3 = solid approach. 2 = order-taker. 1 = discount-first. 0 = pressure tactics.",
        redFlags: "Apologizes for price, leads with discounts, no idea of their own performance.",
      }),
    ],
    interview: [
      comp({
        id: "opt_measure", title: "Measurement + Dispensing Precision", area: "PD / OC / Fitting",
        evidence: "Takes accurate measurements, verifies the Rx, and catches problems before the lab does.",
        q1: "Walk me through your process for a progressive fit from frame selection to final verification.",
        q2: "A patient returns saying the new progressives make them dizzy. How do you diagnose it?",
        quick: "Do they have a repeatable, verification-based process?",
        lookFor: "Seg height and OC verification, frame fit before measurement, checks Rx against the order, remake ownership.",
        anchors: "4 = precise, systematic, diagnoses remakes correctly. 3 = solid fundamentals. 2 = basic. 1 = guesswork. 0 = blames the lab.",
        redFlags: "Measures without adjusting the frame first, no verification step, high remake rate they can't explain.",
      }),
      comp({
        id: "opt_troubleshoot", title: "Troubleshooting + Recovery", area: "Remakes / Adjustments / Warranty",
        evidence: "Turns an unhappy eyewear experience into a retained patient without giving away the practice.",
        q1: "Tell me about a difficult remake or a patient who hated their new glasses. What did you do?",
        q2: "How do you handle a warranty request that's outside policy?",
        quick: "Can they solve the problem and protect the relationship and the margin?",
        lookFor: "Diagnoses before apologizing, explains options clearly, knows when to involve the doctor or manager, documents the fix.",
        anchors: "4 = diagnoses and recovers cleanly. 3 = handles it. 2 = defers quickly. 1 = concedes everything. 0 = argues with the patient.",
        redFlags: "Immediately refunds, blames the doctor, avoids upset patients.",
      }),
      comp({
        id: "opt_board", title: "Board + Inventory Ownership", area: "Merchandising / Stock",
        evidence: "Treats the frame board, inventory and lab flow as theirs — clean, stocked, and accurate.",
        q1: "How did you keep your frame board and inventory in shape at your last practice?",
        q2: "What did you do when a job was late from the lab and the patient was waiting?",
        quick: "Ownership of the physical business, not just the sale.",
        lookFor: "Cycle counts, merchandising by collection, proactive lab follow-up, proactive patient communication.",
        anchors: "4 = full ownership with process. 3 = keeps up. 2 = does it when asked. 1 = inconsistent. 0 = ignores it.",
        redFlags: "Never touched inventory, waits for patients to chase late jobs.",
      }),
    ],
  },
  {
    key: "tech",
    role: "Optometric Technician",
    match: ["technician", "optometric tech", "ophthalmic", "pretest", "contact lens tech"],
    summary: "Pretesting, workup accuracy, patient flow and doctor support.",
    phone: [
      comp({
        id: "tech_phone_bg", title: "Clinical Exposure", area: "Pretest / Medical Setting",
        evidence: "Experience with pretest equipment or a comparable clinical setting and patient handling.",
        q1: "What clinical or medical-office experience do you have, and which equipment have you run?",
        q2: "How comfortable are you being hands-on with patients — drops, imaging, close contact all day?",
        quick: "Clinical comfort and hands-on willingness.",
        lookFor: "Autorefractor, tonometry, retinal imaging, visual fields, chart documentation, comfort with elderly and pediatric patients.",
        anchors: "4 = direct optometric tech experience. 3 = adjacent clinical. 2 = customer service only. 1 = minimal. 0 = uncomfortable hands-on.",
        redFlags: "Squeamish, no interest in the clinical side, won't touch equipment.",
      }),
      comp({
        id: "tech_phone_pace", title: "Pace + Accuracy Balance", area: "Patient Flow",
        evidence: "Understands that a slow workup backs up the doctor and a sloppy one is worse.",
        q1: "Describe the busiest patient or customer flow you've worked. How many people per day and how did you keep quality up?",
        q2: "What do you do when you're behind and someone is waiting on you?",
        quick: "Speed without cutting corners.",
        lookFor: "Prioritization, communicating delays, double-checking entries, asking for help early.",
        anchors: "4 = fast and accurate with a method. 3 = balanced. 2 = one or the other. 1 = slow and unaware. 0 = rushes and errs.",
        redFlags: "Rushes and 'fixes it later', hides being behind, no sense of flow.",
      }),
    ],
    interview: [
      comp({
        id: "tech_workup", title: "Workup Accuracy + Documentation", area: "Pretest / Charting",
        evidence: "Runs a complete, accurate workup and documents it so the doctor can trust it cold.",
        q1: "Walk me through the pretest workup you'd run before the doctor sees a comprehensive exam patient.",
        q2: "You get a reading that looks wrong or inconsistent. What do you do?",
        quick: "Complete, verified, well-documented workups.",
        lookFor: "Repeats questionable readings, flags abnormals, records history accurately, never guesses a value.",
        anchors: "4 = thorough with self-checks. 3 = reliable. 2 = needs reminders. 1 = frequent gaps. 0 = enters unverified data.",
        redFlags: "Would 'just chart it', doesn't repeat outliers, treats charting as paperwork.",
      }),
      comp({
        id: "tech_patient", title: "Patient Handling + Instruction", area: "Chair-side Manner",
        evidence: "Puts nervous, elderly and pediatric patients at ease and gets clean results anyway.",
        q1: "How do you handle a patient who's anxious about the puff test or won't hold still for imaging?",
        q2: "Tell me about teaching someone something physical — contact lens insertion, a device, a procedure.",
        quick: "Calm, clear, patient — and still gets the data.",
        lookFor: "Explains before doing, plain language, patience with repetition, respects dignity and privacy.",
        anchors: "4 = exceptional chair-side manner. 3 = warm and effective. 2 = mechanical. 1 = impatient. 0 = dismissive.",
        redFlags: "Frustrated by slow patients, skips explanation, talks over people.",
      }),
      comp({
        id: "tech_doctor", title: "Doctor Support + Anticipation", area: "Clinic Teamwork",
        evidence: "Keeps the doctor moving — rooms ready, charts prepped, next patient staged.",
        q1: "How would you keep a doctor on schedule during a fully booked day?",
        q2: "Tell me about a time you anticipated what a supervisor needed before being asked.",
        quick: "Do they run ahead of the schedule or behind it?",
        lookFor: "Pre-reads the schedule, stages rooms and charts, communicates delays early, protects doctor time.",
        anchors: "4 = anticipates consistently. 3 = responsive and reliable. 2 = task-driven. 1 = reactive. 0 = has to be directed constantly.",
        redFlags: "Waits to be told, disappears between patients, doesn't watch the schedule.",
      }),
    ],
  },
  {
    key: "optical_sales",
    role: "Optical Sales Associate",
    match: ["sales associate", "optical associate", "retail", "eyewear specialist"],
    summary: "Frame styling, patient hand-off, capture rate and retail floor execution.",
    phone: [
      comp({
        id: "sales_phone_bg", title: "Retail + Service Background", area: "Experience",
        evidence: "Has worked a customer-facing floor with real targets and real volume.",
        q1: "Tell me about your retail or service experience — what did you sell and what were you measured on?",
        q2: "What part of working with customers do you actually enjoy?",
        quick: "Genuine service orientation with target exposure.",
        lookFor: "Named metrics, repeat-customer stories, energy about helping people.",
        anchors: "4 = strong retail with metrics. 3 = solid service background. 2 = limited. 1 = none. 0 = dislikes customer contact.",
        redFlags: "Only wants back-of-house work, negative about customers.",
      }),
      comp({
        id: "sales_phone_style", title: "Styling Confidence", area: "Frames / Recommendations",
        evidence: "Comfortable giving an honest opinion on how eyewear looks and fits.",
        q1: "A patient asks 'does this look good on me?' and it doesn't. What do you say?",
        q2: "How would you help someone who says they hate everything on the board?",
        quick: "Honest, warm, and helpful — not a yes-person.",
        lookFor: "Tactful honesty, narrows options, asks about lifestyle and face shape, keeps it positive.",
        anchors: "4 = confident and tactful. 3 = helpful. 2 = agreeable to everything. 1 = avoids opinions. 0 = blunt or rude.",
        redFlags: "'I'd just say yes', no framework for narrowing choices.",
      }),
    ],
    interview: [
      comp({
        id: "sales_capture", title: "Capture + Hand-off Execution", area: "Exam-to-Optical Flow",
        evidence: "Owns the hand-off from the exam room to the optical so patients don't walk out with just an Rx.",
        q1: "A patient finishes their exam and says they'll 'think about it' and order online. What do you do?",
        q2: "How would you build value in a second pair or premium lens without pressuring the patient?",
        quick: "Do they convert without damaging trust?",
        lookFor: "Warm hand-off language, asks about daily life, presents good/better/best, closes without apology.",
        anchors: "4 = converts consistently through education. 3 = solid approach. 2 = order-taker. 1 = lets patients walk. 0 = pressures people.",
        redFlags: "Leads with discounts, avoids the price conversation, treats the hand-off as optional.",
      }),
      comp({
        id: "sales_accuracy", title: "Order Accuracy + Follow-through", area: "Details / Dispense",
        evidence: "Gets the order right the first time and follows the job through to dispense.",
        q1: "How do you make sure an order is right before it goes to the lab?",
        q2: "Tell me about a mistake you made on an order. How did you find it and what did you do?",
        quick: "Detail discipline under a busy floor.",
        lookFor: "Reads back the order, verifies Rx and measurements, tracks jobs, calls patients proactively.",
        anchors: "4 = verification habit with follow-through. 3 = careful. 2 = occasional misses. 1 = frequent rework. 0 = careless.",
        redFlags: "No verification step, blames the lab, doesn't follow up on jobs.",
      }),
      comp({
        id: "sales_floor", title: "Floor Presence + Initiative", area: "Retail Environment",
        evidence: "Keeps the floor clean and stocked and greets patients before they have to look for help.",
        q1: "It's slow and the floor is quiet. What are you doing?",
        q2: "How do you handle two patients needing help at the same time?",
        quick: "Self-starter on a quiet floor and composed on a busy one.",
        lookFor: "Cleans, restocks, learns product, follows up with pending patients, acknowledges the second patient immediately.",
        anchors: "4 = always productive and aware. 3 = stays busy. 2 = waits for direction. 1 = on their phone. 0 = disappears.",
        redFlags: "'Wait for customers', can't name downtime work, ignores waiting patients.",
      }),
    ],
  },
  {
    key: "office_manager",
    role: "Office / Practice Manager",
    match: ["manager", "practice manager", "office manager", "lead"],
    summary: "Team leadership, schedule and coverage, KPIs, escalations and doctor partnership.",
    phone: [
      comp({
        id: "mgr_phone_scope", title: "Leadership Scope", area: "Team Size / P&L",
        evidence: "Has actually led people — hiring, scheduling, coaching, and owning numbers.",
        q1: "How many people have you directly managed, and what were you accountable for?",
        q2: "Which metrics did you own, and how did you move them?",
        quick: "Real management, or senior individual contributor?",
        lookFor: "Hiring and coaching ownership, schedule/coverage ownership, named KPIs with direction of change.",
        anchors: "4 = full team + numbers ownership. 3 = supervisory. 2 = keyholder only. 1 = none. 0 = misrepresents scope.",
        redFlags: "Vague on team size, cannot name a metric, describes managing tasks not people.",
      }),
      comp({
        id: "mgr_phone_avail", title: "Coverage Commitment", area: "Schedule / Flexibility",
        evidence: "Understands that a manager covers gaps — including Saturdays and call-outs.",
        q1: "How do you handle a Saturday call-out when the office is fully booked?",
        q2: "What's your availability, including weekends and coverage across nearby offices?",
        quick: "Will they own coverage, not escalate it?",
        lookFor: "Steps in personally first, has a call list, flexible on weekends, protects the patient schedule.",
        anchors: "4 = owns coverage fully. 3 = handles it. 2 = escalates quickly. 1 = limited availability. 0 = won't cover.",
        redFlags: "Expects someone else to solve call-outs, no weekend availability for a weekend-open practice.",
      }),
    ],
    interview: [
      comp({
        id: "mgr_coaching", title: "Coaching + Accountability", area: "Performance Management",
        evidence: "Holds standards with people they like — addresses issues early and documents.",
        q1: "Tell me about the last time you had to correct a strong performer's behavior. What did you say?",
        q2: "How have you handled someone with repeated attendance problems?",
        quick: "Do they coach directly, or avoid conflict?",
        lookFor: "Direct, timely, specific conversations, documentation, follow-up cadence, escalation when needed.",
        anchors: "4 = coaches early with documentation. 3 = addresses issues. 2 = delays. 1 = avoids. 0 = only complains upward.",
        redFlags: "'I just did it myself', waits for review time, never documented anything.",
      }),
      comp({
        id: "mgr_numbers", title: "Business + Schedule Ownership", area: "KPIs / Capacity",
        evidence: "Runs the schedule, capture and capacity like an operator, not a spectator.",
        q1: "The office is under its exam capacity for the month. What are the first three things you check?",
        q2: "How would you improve optical capture without pressuring patients?",
        quick: "Do they diagnose the business or just report it?",
        lookFor: "Looks at schedule fill, no-show rate, recall, hand-off process, staffing mix; makes a concrete plan.",
        anchors: "4 = diagnoses and plans. 3 = knows the levers. 2 = general answers. 1 = no framework. 0 = blames traffic.",
        redFlags: "Blames external factors only, no idea what drives volume.",
      }),
      comp({
        id: "mgr_doctor", title: "Doctor + Regional Partnership", area: "Collaboration / Escalation",
        evidence: "Partners with the doctor and regional leadership instead of working around them.",
        q1: "How do you handle a disagreement with a doctor about patient flow or staffing?",
        q2: "What would you escalate to your regional manager versus solve yourself?",
        quick: "Mature judgment about ownership and escalation.",
        lookFor: "Private, data-based conversations, clear escalation thresholds, no triangulating through staff.",
        anchors: "4 = strong partnership judgment. 3 = collaborative. 2 = passive. 1 = avoids or escalates everything. 0 = confrontational.",
        redFlags: "Complains about doctors to staff, escalates every decision, or never escalates real risk.",
      }),
    ],
  },
  {
    key: "billing",
    role: "Insurance / Billing Specialist",
    match: ["billing", "insurance", "revenue", "claims"],
    summary: "Claims, eligibility, denials, patient balances and payer follow-up.",
    phone: [
      comp({
        id: "bill_phone_bg", title: "Claims + Payer Experience", area: "Background",
        evidence: "Has worked claims, denials or eligibility with real payers and systems.",
        q1: "Which payers and billing systems have you worked with, and what was your daily claim volume?",
        q2: "What types of denials did you handle most often, and how did you work them?",
        quick: "Hands-on claims depth.",
        lookFor: "Named payers and portals, denial categories, appeal process, aging report familiarity.",
        anchors: "4 = strong claims experience incl. vision plans. 3 = medical billing experience. 2 = posting only. 1 = minimal. 0 = none.",
        redFlags: "Cannot name a payer or denial type, only did data entry.",
      }),
      comp({
        id: "bill_phone_detail", title: "Detail + Follow-through", area: "Accuracy",
        evidence: "Tracks open items until they're resolved instead of letting them age.",
        q1: "How do you keep track of claims you're waiting on?",
        q2: "Tell me about an aging balance you chased down. How long did it take and what did you do?",
        quick: "Persistence and organization.",
        lookFor: "Worklists, tickler dates, escalation to payer reps, documented notes.",
        anchors: "4 = disciplined system with proof. 3 = organized. 2 = informal. 1 = reactive. 0 = lets items age.",
        redFlags: "'I just remember them', no tracking method, gives up after one call.",
      }),
    ],
    interview: [
      comp({
        id: "bill_denials", title: "Denial Resolution + Root Cause", area: "Appeals / Rework",
        evidence: "Fixes the claim and the process that caused the denial.",
        q1: "Walk me through how you work a denial from receipt to resolution.",
        q2: "You see the same denial reason three times in a week. What do you do?",
        quick: "Do they fix causes or just resubmit?",
        lookFor: "Reads the remit code, verifies eligibility and coding, appeals with documentation, feeds fixes back to the front desk.",
        anchors: "4 = resolves and prevents. 3 = resolves reliably. 2 = resubmits blindly. 1 = writes off. 0 = ignores.",
        redFlags: "Resubmits without diagnosis, writes off to clear the queue, never communicates upstream.",
      }),
      comp({
        id: "bill_patient", title: "Patient Balance Conversations", area: "Collections / Empathy",
        evidence: "Explains what a patient owes clearly and collects without damaging the relationship.",
        q1: "A patient is upset about a balance they say they were never told about. How do you handle the call?",
        q2: "How do you set up a payment arrangement while protecting the practice?",
        quick: "Firm, clear and human at the same time.",
        lookFor: "Reviews the account before responding, explains the EOB in plain language, offers options, documents the agreement.",
        anchors: "4 = clear, empathetic and collects. 3 = handles it. 2 = defers. 1 = waives to end conflict. 0 = argues.",
        redFlags: "Waives balances to avoid conflict, reads jargon at patients, no documentation.",
      }),
      comp({
        id: "bill_compliance", title: "Compliance + Coding Integrity", area: "HIPAA / Coding",
        evidence: "Will not bend coding or share information, even under pressure to get a claim paid.",
        q1: "A provider asks you to change a code so a claim will pay. What do you do?",
        q2: "How do you handle a request for records from someone other than the patient?",
        quick: "Non-negotiable on compliance.",
        lookFor: "Refuses politely, documents, escalates, knows release-of-information rules.",
        anchors: "4 = clear and principled with process. 3 = right answer. 2 = hesitant. 1 = would comply reluctantly. 0 = would comply.",
        redFlags: "'Whatever gets it paid', casual about record access.",
      }),
    ],
  },
];

export const blueprintFor = (title: string): RoleBlueprint | null => {
  const t = (title || "").toLowerCase();
  if (!t) return null;
  return (
    ROLE_BLUEPRINTS.find((b) => b.match.some((m) => t.includes(m))) || null
  );
};

const reid = (c: Competency, prefix: string): Competency => ({
  ...c,
  id: `${prefix}_${c.id}`,
  label: c.title || c.label,
  guidance: c.guidance || c.evidence || "",
});

/** Build the competency list for one blueprint + form kind (role-specific first, character block after). */
export function buildCompetencies(bp: RoleBlueprint, kind: Exclude<TemplateKind, "scorecard">): Competency[] {
  const prefix = kind === "phone_screen" ? "ps" : "iv";
  const specific = (kind === "phone_screen" ? bp.phone : bp.interview).map((c) => reid(c, prefix));
  const core = (kind === "phone_screen" ? CORE_PHONE : CORE_INTERVIEW).map((c) => reid(c, prefix));
  const all = [...specific, ...core];
  const weight = Math.round(100 / all.length);
  return all.map((c) => ({ ...c, weight }));
}

export interface GeneratedForm {
  name: string;
  role: string;
  kind: Exclude<TemplateKind, "scorecard">;
  description: string;
  competencies: Competency[];
}

export function buildForms(bp: RoleBlueprint, roleLabel?: string): GeneratedForm[] {
  const role = roleLabel?.trim() || bp.role;
  return [
    {
      name: `${role} — Phone Screen`,
      role,
      kind: "phone_screen",
      description: "Phone screen scorecard — quick 0–4 screen covering role fit plus work ethic and reliability, to decide who advances.",
      competencies: buildCompetencies(bp, "phone_screen"),
    },
    {
      name: `${role} — Interview Evaluation`,
      role,
      kind: "interview",
      description: "Interactive interview evaluation — score each competency 0–4 with evidence, including the work-ethic, reliability and teamwork block.",
      competencies: buildCompetencies(bp, "interview"),
    },
  ];
}
