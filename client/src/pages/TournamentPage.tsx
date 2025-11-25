import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Settings, Users, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Types
type TournamentData = {
  r1: string[];
  qf: string[];
  sf: string[];
  f: string[];
  champ: string;
};

const INITIAL_DATA: TournamentData = {
  r1: Array(16).fill("TBD"),
  qf: Array(8).fill("TBD"),
  sf: Array(4).fill("TBD"),
  f: Array(2).fill("TBD"),
  champ: "TBD",
};

const STORAGE_KEY = "cs16_tournament_data";

export default function TournamentPage() {
  const [data, setData] = useState<TournamentData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState("bracket");
  const [svgLines, setSvgLines] = useState<React.ReactNode[]>([]);
  const bracketRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tournament data", e);
      }
    }
  }, []);

  // Save data function
  const saveData = (newData: TournamentData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  // Draw lines effect
  useEffect(() => {
    if (activeTab === "bracket") {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(drawLines, 100);
      window.addEventListener("resize", drawLines);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", drawLines);
      };
    }
  }, [activeTab, data]);

  const drawLines = () => {
    if (!bracketRef.current) return;

    const container = bracketRef.current;
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const newLines: React.ReactNode[] = [];

    const stages = [
      { id: "r1", count: 16 },
      { id: "qf", count: 8 },
      { id: "sf", count: 4 },
      { id: "f", count: 2 },
    ];

    for (let s = 0; s < stages.length - 1; s++) {
      const currentStage = stages[s];
      const nextStage = stages[s + 1];
      
      const teamsPerMatch = currentStage.count / nextStage.count;

      for (let i = 0; i < nextStage.count; i++) {
        const startIdx = i * teamsPerMatch;
        const endIdx = startIdx + teamsPerMatch;

        const firstEl = document.getElementById(`${currentStage.id}-${startIdx}`);
        const lastEl = document.getElementById(`${currentStage.id}-${endIdx - 1}`);
        const nextEl = document.getElementById(`${nextStage.id}-${i}`);

        if (!firstEl || !lastEl || !nextEl) continue;

        const rect1 = firstEl.getBoundingClientRect();
        const rect2 = lastEl.getBoundingClientRect();
        const nextRect = nextEl.getBoundingClientRect();

        const y1 = rect1.top - containerRect.top + scrollTop + rect1.height / 2;
        const y2 = rect2.top - containerRect.top + scrollTop + rect2.height / 2;
        const x1 = rect1.right - containerRect.left + scrollLeft;
        
        const nextY = nextRect.top - containerRect.top + scrollTop + nextRect.height / 2;
        const nextX = nextRect.left - containerRect.left + scrollLeft;

        const midX = x1 + (nextX - x1) / 2;

        const d = `
          M ${x1} ${y1}
          L ${midX} ${y1}
          L ${midX} ${y2}
          L ${x1} ${y2}
          M ${midX} ${(y1 + y2) / 2}
          L ${nextX} ${(y1 + y2) / 2}
          L ${nextX} ${nextY}
        `;

        newLines.push(
          <path
            key={`${currentStage.id}-${i}`}
            d={d}
            stroke="rgba(255, 68, 68, 0.4)"
            strokeWidth="1.5"
            fill="none"
            className="drop-shadow-[0_0_2px_rgba(255,68,68,0.5)]"
          />
        );
      }
    }
    setSvgLines(newLines);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-600 to-red-900 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">
                CS 1.6
              </span>{" "}
              MASTERS
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeTab === "bracket" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("bracket")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold transition-all",
                activeTab === "bracket" && "bg-red-600/10 text-red-500 hover:bg-red-600/20"
              )}
            >
              <Trophy className="w-3 h-3 mr-2" />
              Bracket
            </Button>
            <Button
              variant={activeTab === "admin" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("admin")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold transition-all",
                activeTab === "admin" && "bg-red-600/10 text-red-500 hover:bg-red-600/20"
              )}
            >
              <Settings className="w-3 h-3 mr-2" />
              Admin Panel
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
        <AnimatePresence mode="wait">
          {activeTab === "bracket" ? (
            <motion.div
              key="bracket"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              <div 
                ref={bracketRef}
                className="flex-1 relative overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/50 via-[#0a0a0a] to-[#0a0a0a] border border-white/5 rounded-xl shadow-2xl"
              >
                {/* SVG Overlay */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 min-w-[1000px] min-h-[600px]">
                  {svgLines}
                </svg>

                {/* Bracket Content */}
                <div className="flex items-center justify-start gap-16 p-12 min-w-max z-10 relative h-full">
                  {/* Round of 16 */}
                  <BracketColumn 
                    title="Round of 16" 
                    teams={data.r1} 
                    idPrefix="r1"
                  />

                  {/* Quarter Finals */}
                  <BracketColumn 
                    title="Quarter Finals" 
                    teams={data.qf} 
                    idPrefix="qf"
                  />

                  {/* Semi Finals */}
                  <BracketColumn 
                    title="Semi Finals" 
                    teams={data.sf} 
                    idPrefix="sf"
                  />

                  {/* Finals */}
                  <BracketColumn 
                    title="Finals" 
                    teams={data.f} 
                    idPrefix="f"
                  />

                  {/* Champion */}
                  <div className="flex flex-col items-center justify-center ml-8">
                    <div className="mb-6 text-center animate-pulse">
                      <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-500/60 font-bold mb-2">Champion</div>
                    <div className="px-8 py-4 bg-gradient-to-b from-yellow-900/20 to-black border border-yellow-500/30 rounded-xl text-xl font-bold text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.15)] min-w-[200px] text-center">
                      {data.champ}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              <AdminPanel data={data} onSave={saveData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BracketColumn({ title, teams, idPrefix }: { title: string, teams: string[], idPrefix: string }) {
  return (
    <div className="flex flex-col gap-6 min-w-[160px] z-10">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold text-center border-b border-white/5 pb-2 mb-2">
        {title}
      </div>
      <div className="flex flex-col justify-around h-full gap-4">
        {teams.map((team, i) => (
          <motion.div
            key={`${idPrefix}-${i}`}
            id={`${idPrefix}-${i}`}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 68, 68, 0.1)" }}
            className={cn(
              "px-4 py-3 rounded-md text-xs font-medium border transition-all duration-300 cursor-default relative overflow-hidden group",
              team !== "TBD" 
                ? "bg-gradient-to-r from-neutral-900 to-neutral-800 border-red-500/30 text-white shadow-[0_0_10px_rgba(220,38,38,0.1)]" 
                : "bg-neutral-900/50 border-white/5 text-white/30"
            )}
          >
            <div className="absolute left-0 top-0 w-[2px] h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="truncate block max-w-[140px]">{team}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ data, onSave }: { data: TournamentData, onSave: (d: TournamentData) => void }) {
  const [formData, setFormData] = useState<TournamentData>(data);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (section: keyof TournamentData, index: number | null, value: string) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (index !== null && Array.isArray(newData[section])) {
        (newData[section] as string[])[index] = value;
      } else if (index === null && typeof newData[section] === 'string') {
        (newData as any)[section] = value;
      }
      return newData;
    });
  };

  const handleSave = () => {
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <Card className="bg-[#0f0f0f] border-white/10 shadow-2xl">
      <CardHeader className="border-b border-white/5 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white">Tournament Configuration</CardTitle>
            <p className="text-sm text-white/40 mt-1">Manage participating teams and match results</p>
          </div>
          <Button 
            onClick={handleSave}
            className={cn(
              "font-bold transition-all",
              isSaved ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isSaved ? <><Save className="w-4 h-4 mr-2" /> Saved</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] p-6">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Round of 16 */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-red-500 font-bold flex items-center gap-2">
                <Users className="w-3 h-3" /> Round of 16
              </h3>
              <div className="grid gap-3">
                {formData.r1.map((team, i) => (
                  <div key={`r1-${i}`} className="flex items-center gap-3 group">
                    <span className="text-[10px] text-white/20 w-6 font-mono">{(i + 1).toString().padStart(2, '0')}</span>
                    <Input
                      value={team === "TBD" ? "" : team}
                      onChange={(e) => handleChange('r1', i, e.target.value || "TBD")}
                      placeholder="Team Name"
                      className="bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-red-500/5 text-xs h-8 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {/* Quarter Finals */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-red-500 font-bold flex items-center gap-2">
                  <Users className="w-3 h-3" /> Quarter Finals
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {formData.qf.map((team, i) => (
                    <Input
                      key={`qf-${i}`}
                      value={team === "TBD" ? "" : team}
                      onChange={(e) => handleChange('qf', i, e.target.value || "TBD")}
                      placeholder={`QF ${i+1}`}
                      className="bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-red-500/5 text-xs h-8"
                    />
                  ))}
                </div>
              </div>

              {/* Semi Finals */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-red-500 font-bold flex items-center gap-2">
                  <Users className="w-3 h-3" /> Semi Finals
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {formData.sf.map((team, i) => (
                    <Input
                      key={`sf-${i}`}
                      value={team === "TBD" ? "" : team}
                      onChange={(e) => handleChange('sf', i, e.target.value || "TBD")}
                      placeholder={`SF ${i+1}`}
                      className="bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-red-500/5 text-xs h-8"
                    />
                  ))}
                </div>
              </div>

              {/* Finals & Champ */}
              <div className="p-6 bg-gradient-to-br from-red-900/10 to-black border border-red-500/20 rounded-xl space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-red-400 font-bold">Finalists</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {formData.f.map((team, i) => (
                      <Input
                        key={`f-${i}`}
                        value={team === "TBD" ? "" : team}
                        onChange={(e) => handleChange('f', i, e.target.value || "TBD")}
                        placeholder={`Finalist ${i+1}`}
                        className="bg-black/40 border-red-500/20 text-red-100 focus:border-red-500 text-xs h-9"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-red-500/20">
                  <h3 className="text-xs uppercase tracking-wider text-yellow-500 font-bold flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> Champion
                  </h3>
                  <Input
                    value={formData.champ === "TBD" ? "" : formData.champ}
                    onChange={(e) => handleChange('champ', null, e.target.value || "TBD")}
                    placeholder="Champion Name"
                    className="bg-yellow-500/10 border-yellow-500/30 text-yellow-200 focus:border-yellow-500 h-10 font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
