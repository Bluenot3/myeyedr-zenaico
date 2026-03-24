import { MapPin } from "lucide-react";

const regions = [
  {
    name: "DC",
    colorClass: "bg-region-dc",
    sites: [
      "FBR Club",
      "George M. Ferris Clubhouse #6",
      "Richard England Clubhouse #14",
      "Jelleff Community Center",
    ],
  },
  {
    name: "Maryland",
    colorClass: "bg-region-md",
    sites: [
      "Benjamin Stoddert Middle School",
      "Charles Carroll Middle School",
      "Drew Freeman Middle School",
      "James Gholson Middle School",
      "Nicolas Orem Middle School",
      "Oxon Hill Middle School",
      "Palmer Park Recreation Center",
      "Galway Elementary School",
      "Germantown Club",
      "Germantown Elementary School",
    ],
  },
  {
    name: "Virginia",
    colorClass: "bg-region-va",
    sites: [
      "Dunbar Alexandria Olympic Club",
      "Bailey's Boys & Girls Club",
      "Murraygate Village Club",
      "Hylton Club",
      "Martin K. Alloy Club",
      "Heiser Club",
      "Ox-Hill Club",
      "Annandale Club",
    ],
  },
  {
    name: "Virtual",
    colorClass: "bg-region-virtual",
    sites: ["Clubhouse @ Your House"],
  },
];

const LocationDirectory = () => {
  return (
    <section id="locations" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display text-foreground">
          Locations by Region
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          All BGCGW clubs and sites organized by geographic region.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {regions.map((region) => (
          <div
            key={region.name}
            className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <span
                className={`${region.colorClass} h-2.5 w-2.5 rounded-full shrink-0`}
              />
              <h3 className="font-display font-semibold text-lg text-foreground">
                {region.name}
              </h3>
              <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {region.sites.length} {region.sites.length === 1 ? "site" : "sites"}
              </span>
            </div>
            <ul className="space-y-1.5">
              {region.sites.map((site) => (
                <li
                  key={site}
                  className="flex items-center gap-2 text-sm text-foreground/85"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {site}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LocationDirectory;
