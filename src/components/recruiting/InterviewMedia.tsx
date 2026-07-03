import { useRef, useState } from "react";
import {
  Mic, UploadCloud, Loader2, Trash2, Play, Pause, FileAudio, FileText,
  ChevronDown, Sparkles, AlertTriangle, ThumbsUp, ThumbsDown, MinusCircle,
  Quote, ImageIcon, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Candidate, CandidateMedia, Soundbite,
  useCandidateMedia, useCreateMedia, useDeleteMedia, useAnalyzeInterview,
} from "@/hooks/useRecruiting";
import { uploadCandidateFile } from "@/lib/storage";
import { toast } from "sonner";

const LABELS: Record<string, { text: string; hsl: string }> = {
  strength: { text: "Strength", hsl: "var(--emerald)" },
  skill: { text: "Skill", hsl: "var(--cyan)" },
  culture: { text: "Culture", hsl: "var(--holo)" },
  logistics: { text: "Logistics", hsl: "var(--gold)" },
  concern: { text: "Concern", hsl: "var(--orange)" },
  red_flag: { text: "Red flag", hsl: "var(--destructive)" },
};

const REC: Record<string, { text: string; hsl: string; Icon: typeof ThumbsUp }> = {
  advance: { text: "Advance", hsl: "var(--emerald)", Icon: ThumbsUp },
  hold: { text: "Hold", hsl: "var(--gold)", Icon: MinusCircle },
  reject: { text: "Pass", hsl: "var(--destructive)", Icon: ThumbsDown },
};

const fmt = (s: number | null | undefined) => {
  if (s == null || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

function AudioItem({ media, candidate }: { media: CandidateMedia; candidate: Candidate }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const del = useDeleteMedia();
  const analyze = useAnalyzeInterview();
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  const seek = (start: number | null, i: number) => {
    const a = audioRef.current;
    if (!a || start == null) return;
    a.currentTime = start;
    a.play();
    setPlaying(true);
    setActive(i);
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  const rec = media.recommendation ? REC[media.recommendation] : null;
  const processing = media.status === "processing";

  return (
    <div className="glass-panel rounded-xl p-3.5 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/12 border border-emerald/25 text-emerald">
          <FileAudio className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{media.label || media.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {processing ? "Transcribing & finding soundbites…" : media.duration_seconds ? `${fmt(media.duration_seconds)} · ${media.soundbites?.length || 0} soundbites` : "Audio"}
          </p>
        </div>
        {rec && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
            style={{ color: `hsl(${rec.hsl})`, background: `hsl(${rec.hsl} / 0.12)`, border: `1px solid hsl(${rec.hsl} / 0.3)` }}>
            <rec.Icon className="h-3 w-3" /> {rec.text}
          </span>
        )}
        <button onClick={() => del.mutate({ id: media.id, candidate_id: media.candidate_id })} className="tap-target text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Player */}
      <div className="flex items-center gap-2 rounded-lg bg-background/50 border border-border/60 p-2">
        <button onClick={toggle} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald text-emerald-foreground hover:brightness-110 transition tap-target"
          style={{ background: "hsl(var(--emerald))", color: "hsl(var(--emerald-foreground, var(--background)))" }}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <audio
          ref={audioRef}
          src={media.url}
          controls
          className="h-8 w-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setActive(null); }}
        />
      </div>

      {processing && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" /> Working through the recording — this can take a minute.
        </div>
      )}

      {media.status === "error" && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/8 border border-destructive/25 p-2">
          <span className="text-[11px] text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {media.error || "Could not analyze."}</span>
          <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={analyze.isPending}
            onClick={() => analyze.mutate({ mediaId: media.id, candidateId: media.candidate_id, url: media.url, candidate })}>
            Retry
          </Button>
        </div>
      )}

      {media.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg bg-background/40 border border-border/50 p-2.5">{media.summary}</p>
      )}

      {/* Soundbites */}
      {media.soundbites?.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="micro-label text-[10px] text-muted-foreground">Key Soundbites — tap to replay</span>
          </div>
          {media.soundbites.map((s: Soundbite, i: number) => {
            const meta = LABELS[s.label] || { text: s.label, hsl: "var(--muted-foreground)" };
            const isActive = active === i;
            return (
              <button
                key={i}
                onClick={() => seek(s.start, i)}
                disabled={s.start == null}
                className={`w-full text-left rounded-lg border p-2.5 transition-all tap-target ${isActive ? "border-emerald/50 bg-emerald/8" : "border-border/60 bg-background/40 hover:border-emerald/30"} ${s.start == null ? "opacity-70" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide"
                    style={{ color: `hsl(${meta.hsl})`, background: `hsl(${meta.hsl} / 0.12)` }}>
                    {meta.text}
                  </span>
                  {s.start != null && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald font-mono">
                      <Play className="h-2.5 w-2.5" /> {fmt(s.start)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-foreground/90 leading-snug flex gap-1.5">
                  <Quote className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <span>“{s.quote}”</span>
                </p>
                {s.note && <p className="text-[10px] text-muted-foreground mt-1 pl-4.5">{s.note}</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Transcript */}
      {media.transcript && (
        <div>
          <button onClick={() => setShowTranscript((v) => !v)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3 w-3 transition-transform ${showTranscript ? "rotate-180" : ""}`} /> Full transcript
          </button>
          {showTranscript && (
            <p className="mt-2 text-[11px] text-muted-foreground/90 leading-relaxed rounded-lg bg-background/40 border border-border/50 p-2.5 max-h-56 overflow-y-auto whitespace-pre-wrap">
              {media.transcript}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FileItem({ media }: { media: CandidateMedia }) {
  const del = useDeleteMedia();
  const Icon = media.media_type === "image" ? ImageIcon : media.media_type === "video" ? FileAudio : Paperclip;
  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-holo/12 border border-holo/25 text-holo">
          <Icon className="h-4 w-4" />
        </div>
        <a href={media.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-xs font-medium text-foreground truncate hover:text-emerald hover:underline">
          {media.label || media.name}
        </a>
        <button onClick={() => del.mutate({ id: media.id, candidate_id: media.candidate_id })} className="tap-target text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {media.media_type === "image" && (
        <img src={media.url} alt={media.name} className="mt-2 rounded-lg border border-border/50 max-h-52 w-full object-cover" loading="lazy" />
      )}
    </div>
  );
}

export default function InterviewMedia({ candidate }: { candidate: Candidate }) {
  const { data: media = [], isLoading } = useCandidateMedia(candidate.id);
  const createMedia = useCreateMedia();
  const analyze = useAnalyzeInterview();
  const [uploading, setUploading] = useState(false);
  const audioInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const classify = (type: string): string => {
    if (type.startsWith("audio")) return "audio";
    if (type.startsWith("video")) return "video";
    if (type.startsWith("image")) return "image";
    return "document";
  };

  const handleUpload = async (files: FileList | null, forceAudio: boolean) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind = forceAudio ? "audio" : classify(file.type);
        const { url } = await uploadCandidateFile(file);
        const row = await createMedia.mutateAsync({
          candidate_id: candidate.id,
          name: file.name,
          url,
          media_type: kind,
          content_type: file.type,
          size: file.size,
          status: kind === "audio" ? "processing" : "ready",
        });
        if (kind === "audio" && row) {
          analyze.mutate({ mediaId: row.id, candidateId: candidate.id, url, candidate });
        }
      }
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const audioMedia = media.filter((m) => m.media_type === "audio");
  const otherMedia = media.filter((m) => m.media_type !== "audio");

  return (
    <div className="space-y-4">
      {/* Upload actions */}
      <div className="grid grid-cols-2 gap-2">
        <input ref={audioInput} type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => { handleUpload(e.target.files, true); e.target.value = ""; }} />
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files, false); e.target.value = ""; }} />
        <Button variant="default" className="btn-optic gap-1.5 text-xs h-11" disabled={uploading} onClick={() => audioInput.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Interview audio
        </Button>
        <Button variant="outline" className="gap-1.5 text-xs h-11" disabled={uploading} onClick={() => fileInput.current?.click()}>
          <UploadCloud className="h-4 w-4" /> Other files
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center -mt-1">
        Upload interview recordings — we transcribe them and surface the key soundbites you can replay while deciding.
      </p>

      {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-emerald" /></div>}

      {!isLoading && media.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
          <Mic className="h-7 w-7 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-xs text-foreground font-medium">No interviews yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Add an audio recording to get instant soundbites.</p>
        </div>
      )}

      {audioMedia.map((m) => <AudioItem key={m.id} media={m} candidate={candidate} />)}

      {otherMedia.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-holo" />
            <span className="micro-label text-[10px] text-muted-foreground">Attachments</span>
          </div>
          {otherMedia.map((m) => <FileItem key={m.id} media={m} />)}
        </div>
      )}
    </div>
  );
}
