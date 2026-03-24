import { useState } from "react";
import { MapPin, Plus, Trash2, Edit3, Save, X } from "lucide-react";
import { useLocations, useCreateLocation, useUpdateLocation, Location } from "@/hooks/useCandidates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const regionColors: Record<string, string> = {
  DC: "bg-region-dc",
  Maryland: "bg-region-md",
  Virginia: "bg-region-va",
  Virtual: "bg-region-virtual",
};

export default function AdminLocationManager() {
  const { data: locations = [], isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editManager, setEditManager] = useState("");
  const [editSiteName, setEditSiteName] = useState("");
  const [newRegion, setNewRegion] = useState("DC");
  const [newSiteName, setNewSiteName] = useState("");
  const [newManager, setNewManager] = useState("");

  const grouped = locations.reduce<Record<string, Location[]>>((acc, loc) => {
    if (!acc[loc.region]) acc[loc.region] = [];
    acc[loc.region].push(loc);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!newSiteName.trim()) return;
    await createLocation.mutateAsync({ region: newRegion, site_name: newSiteName.trim(), manager: newManager.trim() });
    setNewSiteName("");
    setNewManager("");
    setAddOpen(false);
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditManager(loc.manager);
    setEditSiteName(loc.site_name);
  };

  const saveEdit = async (loc: Location) => {
    await updateLocation.mutateAsync({ id: loc.id, manager: editManager, site_name: editSiteName });
    setEditingId(null);
  };

  const deactivate = async (loc: Location) => {
    await updateLocation.mutateAsync({ id: loc.id, active: false });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">
            Location Manager
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            Add, edit, or deactivate sites. Changes reflect across the tracker.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Region</Label>
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="DC">DC</option>
                  <option value="Maryland">Maryland</option>
                  <option value="Virginia">Virginia</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Site Name</Label>
                <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} placeholder="e.g. New Club Location" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Manager (optional)</Label>
                <Input value={newManager} onChange={(e) => setNewManager(e.target.value)} placeholder="Manager name" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!newSiteName.trim()}>Add Site</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["DC", "Maryland", "Virginia", "Virtual"].map((region) => {
          const sites = grouped[region] || [];
          return (
            <div key={region} className="bg-card rounded-lg border border-border p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`${regionColors[region]} h-2.5 w-2.5 rounded-full`} />
                <h3 className="font-display font-semibold text-foreground">{region}</h3>
                <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {sites.length}
                </span>
              </div>
              {sites.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No active sites</p>
              ) : (
                <ul className="space-y-1.5">
                  {sites.map((loc) => (
                    <li key={loc.id} className="group">
                      {editingId === loc.id ? (
                        <div className="flex flex-col gap-1.5 bg-muted/50 rounded-md p-2">
                          <Input
                            value={editSiteName}
                            onChange={(e) => setEditSiteName(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Site name"
                          />
                          <Input
                            value={editManager}
                            onChange={(e) => setEditManager(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Manager name"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => saveEdit(loc)}>
                              <Save className="h-3 w-3" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-foreground/85 py-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{loc.site_name}</span>
                            {loc.manager && (
                              <span className="text-[10px] text-muted-foreground">{loc.manager}</span>
                            )}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(loc)} className="p-1 hover:bg-muted rounded">
                              <Edit3 className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => deactivate(loc)} className="p-1 hover:bg-destructive/10 rounded">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
