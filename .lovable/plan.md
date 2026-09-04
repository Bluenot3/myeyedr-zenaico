# Interview recording + speaker-accurate transcripts

Goal: interviews done in person or over the phone get captured cleanly inside the app, transcribed at the highest quality available, and split by who was talking — with the candidate's lines clearly separated from the interviewer's.

## What exists today

- The Interview tab only accepts an already-recorded file. There is no way to record an interview from inside the app.
- Transcription already runs through Scribe with speaker separation switched on, and per-word speaker tags are saved.
- The transcript is displayed as one flat block of text, so those speaker tags are never shown, and the AI that picks the soundbites reads the same unlabeled text — so an interviewer's line can be quoted as if the candidate said it.

## What gets built

### 1. Record inside the app

- A **Record interview** button next to the existing upload, with a session panel: big timer, live input-level meter, pause/resume, stop, discard.
- Two modes, each with one line of guidance:
  - **In person** — one device between both people.
  - **Phone** — put the call on speakerphone (or use a headset) so both voices reach the mic.
- A live level meter plus a warning if the input is near-silent or very quiet, so nobody discovers a dead mic after a 45-minute interview.
- Long interviews are captured in rolling complete audio segments, so a browser crash or accidental tab close never loses the whole session.
- The finished recording is saved with the candidate exactly like an upload today (original file always kept), then transcribed automatically.

### 2. Better transcription quality

- Highest-accuracy model, with a fallback if an account doesn't have it.
- Tell the transcriber how many people are on the recording (defaults to 2, adjustable to 3+ for panel interviews) — this measurably improves who-said-what.
- Audio is captured at a clean speech sample rate and sent as a complete, decodable file, which removes the most common cause of garbled or rejected recordings.
- Long recordings are transcribed in overlapping chunks and stitched back together with correct timestamps, so a one-hour interview is transcribed in full instead of getting cut off.

### 3. Who said what

- Words are grouped into speaker turns with start/end times.
- The system decides which speaker is the candidate (the person answering, not asking) and labels the rest as interviewer / panel.
- A one-tap **"Wrong person"** control lets you reassign a speaker; every turn, soundbite and quote re-labels instantly and the correction is saved.
- The soundbite and recommendation analysis now reads the labeled transcript, so quotes are only ever attributed to the person who actually said them.

### 4. Reading the transcript

- Transcript renders as a conversation: speaker name, colour, timestamp, tap any line to jump the audio there.
- The current line highlights and scrolls itself as the recording plays.
- Search inside the transcript, plus copy and download.
- Per-speaker talk-time split (a quick read on whether the interviewer talked more than the candidate).

## Technical notes

- New recorder component using Web Audio PCM capture encoded to 16 kHz mono WAV per segment (not `MediaRecorder` timeslices, which produce headerless fragments that the transcriber rejects, and which break on iOS Safari).
- `analyze-interview` edge function: keep ElevenLabs Scribe (`scribe_v2`, `scribe_v1` fallback) with `diarize: true`, add `num_speakers`, `language_code`, request word timestamps; add chunked transcription with time-offset merge and speaker-id reconciliation across chunks; build `turns` from words; pass a speaker-labeled transcript into the Lovable AI analysis call and require quotes to carry a speaker id; validate each quote's speaker before saving a soundbite.
- Migration on `candidate_media`: `turns jsonb default '[]'`, `speakers jsonb default '[]'` (id, role, label, talk seconds), `speaker_roles jsonb default '{}'` (manual overrides), `capture_mode text` (in_person | phone | upload), `num_speakers int`. RLS/grants follow the table's existing policies — no new tables.
- Client guards: reject sub-2 KB / near-silent captures with a re-record prompt, cap per-request upload size, surface the real transcription error text instead of a generic failure.
- Existing uploads keep working: rows without `turns` fall back to today's flat transcript view.

## Out of scope

- The Indeed / auto-intake work discussed just before this stays parked; nothing here touches it.
- No changes to scorecards, pipeline, or candidate cards.
