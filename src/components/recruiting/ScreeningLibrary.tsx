import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Trash2, ClipboardList, MessageSquareQuote, Search, X, GripVertical, ClipboardCheck } from "lucide-react";
import { useScreeningTemplates, useInterviewQuestions, useCreateTemplate, useCreateQuestion, useDeleteQuestion } from "@/hooks/useRecruiting";
import ScorecardTemplatesManager from "./ScorecardTemplatesManager";
import { toast } from "sonner";

export default function ScreeningLibrary() {
  const { data: templates = [] } = useScreeningTemplates();
  const { data: questions = [] } = useInterviewQuestions();
  const createTemplate = useCreateTemplate();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [qSearch, setQSearch] = useState("");
  const [qCat, setQCat] = useState("All");

  // Template builder
  const [tOpen, setTOpen] = useState(false);
  const [tForm, setTForm] = useState({ name: "", category: "Clinical", description: "" });
  const [criteria, setCriteria] = useState<{ label: string; weight: number }[]>([{ label: "", weight: 25 }]);

  // Question builder
  const [qOpen, setQOpen] = useState(false);
  const [qForm, setQForm] = useState({ question: "", category: "Behavioral", role: "", difficulty: "standard", guidance: "" });

  const categories = useMemo(() => ["All", ...Array.from(new Set(questions.map((q) => q.category)))], [questions]);
  const filteredQ = useMemo(
    () => questions.filter((q) => (qCat === "All" || q.category === qCat) && (!qSearch || [q.question, q.role, q.guidance].some((f) => f.toLowerCase().includes(qSearch.toLowerCase())))),
    [questions, qCat, qSearch]
  );
  const groupedQ = useMemo(() => {
    const m: Record<string, typeof questions> = {};
    filteredQ.forEach((q) => { (m[q.category] = m[q.category] || []).push(q); });
    return m;
  }, [filteredQ]);

  const submitTemplate = async () => {
    if (!tForm.name.trim()) return;
    await createTemplate.mutateAsync({ ...tForm, criteria: criteria.filter((c) => c.label.trim()) as any });
    setTForm({ name: "", category: "Clinical", description: "" });
    setCriteria([{ label: "", weight: 25 }]);
    setTOpen(false);
  };
  const submitQuestion = async () => {
    if (!qForm.question.trim()) return;
    await createQuestion.mutateAsync(qForm);
    setQForm({ question: "", category: "Behavioral", role: "", difficulty: "standard", guidance: "" });
    setQOpen(false);
  };

  const copyQ = (t: string) => { navigator.clipboard.writeText(t); toast.success("Question copied"); };

  return (
    <div className="space-y-4 animate-rise">
      <div>
        <h2 className="font-display text-2xl font-bold">Screening Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Standardized templates and a shared question bank for consistent, fair evaluations.</p>
      </div>

      <Tabs defaultValue="scorecards">
        <TabsList>
          <TabsTrigger value="scorecards" className="gap-1.5 text-xs"><ClipboardCheck className="h-3.5 w-3.5" /> Scorecards</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5 text-xs"><MessageSquareQuote className="h-3.5 w-3.5" /> Question Bank</TabsTrigger>
        </TabsList>

        {/* Scorecards */}
        <TabsContent value="scorecards" className="mt-4">
          <ScorecardTemplatesManager />
        </TabsContent>


        {/* Templates */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Dialog open={tOpen} onOpenChange={setTOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> New Template</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg glass-panel max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display text-xl">Screening Template</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label className="text-[10px]">Name *</Label><Input value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} className="mt-1" placeholder="e.g. Optometric Technician Screen" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-[10px]">Category</Label><Input value={tForm.category} onChange={(e) => setTForm({ ...tForm, category: e.target.value })} className="mt-1" /></div>
                  </div>
                  <div><Label className="text-[10px]">Description</Label><Input value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} className="mt-1" /></div>
                  <div>
                    <div className="flex items-center justify-between mb-1"><Label className="text-[10px]">Scoring criteria</Label><button onClick={() => setCriteria((c) => [...c, { label: "", weight: 10 }])} className="text-[10px] text-emerald inline-flex items-center gap-0.5"><Plus className="h-3 w-3" /> Add</button></div>
                    <div className="space-y-1.5">
                      {criteria.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                          <Input value={c.label} onChange={(e) => setCriteria((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Criterion" className="h-8 text-xs flex-1" />
                          <Input type="number" value={c.weight} onChange={(e) => setCriteria((arr) => arr.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))} className="h-8 text-xs w-16" />
                          <span className="text-[10px] text-muted-foreground">%</span>
                          <button onClick={() => setCriteria((arr) => arr.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                  <Button variant="outline" onClick={() => setTOpen(false)}>Cancel</Button>
                  <Button onClick={submitTemplate} disabled={!tForm.name.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">Save Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="glass-panel rounded-xl p-4 hover-lift">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-wide text-emerald">{t.category}</span>
                  </div>
                </div>
                {t.description && <p className="text-[11px] text-muted-foreground mt-1.5">{t.description}</p>}
                <div className="mt-3 space-y-1.5">
                  {(t.criteria || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-40 shrink-0 text-[11px] text-foreground/85 truncate">{c.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald" style={{ width: `${c.weight}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{c.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Questions */}
        <TabsContent value="questions" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder="Search questions…" className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-card/60" />
            </div>
            <select value={qCat} onChange={(e) => setQCat(e.target.value)} className="h-9 px-3 text-xs rounded-lg border border-input bg-card/60">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Dialog open={qOpen} onOpenChange={setQOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5 bg-emerald text-primary-foreground hover:bg-emerald/90"><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg glass-panel">
                <DialogHeader><DialogTitle className="font-display text-xl">Add Interview Question</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label className="text-[10px]">Question *</Label><Input value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-[10px]">Category</Label>
                      <select value={qForm.category} onChange={(e) => setQForm({ ...qForm, category: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm mt-1">
                        <option>Behavioral</option><option>Role-specific</option><option>Situational</option><option>Culture</option>
                      </select>
                    </div>
                    <div><Label className="text-[10px]">Role (optional)</Label><Input value={qForm.role} onChange={(e) => setQForm({ ...qForm, role: e.target.value })} className="mt-1" /></div>
                  </div>
                  <div><Label className="text-[10px]">What to look for</Label><Input value={qForm.guidance} onChange={(e) => setQForm({ ...qForm, guidance: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                  <Button variant="outline" onClick={() => setQOpen(false)}>Cancel</Button>
                  <Button onClick={submitQuestion} disabled={!qForm.question.trim()} className="bg-emerald text-primary-foreground hover:bg-emerald/90">Add to Bank</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedQ).map(([cat, qs]) => (
              <div key={cat}>
                <p className="micro-label text-emerald text-[10px] mb-2">{cat}</p>
                <div className="space-y-2">
                  {qs.map((q) => (
                    <div key={q.id} className="glass-panel rounded-lg p-3 group">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-foreground/90">{q.question}</p>
                        <button onClick={() => copyQ(q.question)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
                        <button onClick={() => deleteQuestion.mutate(q.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {q.role && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-holo/10 text-holo">{q.role}</span>}
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{q.difficulty}</span>
                        {q.guidance && <span className="text-[10px] text-muted-foreground italic truncate">💡 {q.guidance}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredQ.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No questions match.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
