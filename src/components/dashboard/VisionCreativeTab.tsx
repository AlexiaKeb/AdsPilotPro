import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Upload, Loader2, Sparkles, Zap, CheckCircle2, Save, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCreative, type CreativeDiagnostic, type AxeScore } from "@/lib/audit-creative.functions";

type Sector = "ecommerce" | "infoproduit" | "service";
type Objectif = "vente" | "lead" | "trafic" | "notoriete";

const SECTORS: { id: Sector; label: string }[] = [
  { id: "ecommerce", label: "E-commerce" },
  { id: "infoproduit", label: "Infoproduit" },
  { id: "service", label: "Service" },
];

const OBJECTIFS: { id: Objectif; label: string }[] = [
  { id: "vente", label: "Vente directe" },
  { id: "lead", label: "Lead" },
  { id: "trafic", label: "Trafic" },
  { id: "notoriete", label: "Notoriété" },
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESS_THRESHOLD = 1024 * 1024; // 1MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82),
  );
  const base64 = await blobToBase64(blob);
  return { base64, mediaType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fileToBase64Raw(file: File): Promise<string> {
  const blob = file as Blob;
  return blobToBase64(blob);
}

export function VisionCreativeTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ base64: string; mediaType: string } | null>(null);
  const [sector, setSector] = useState<Sector>("ecommerce");
  const [objectif, setObjectif] = useState<Objectif>("vente");
  const [hookRate, setHookRate] = useState<string>("");
  const [ctr, setCtr] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<CreativeDiagnostic | null>(null);
  const [saving, setSaving] = useState(false);

  const analyze = useServerFn(analyzeCreative);

  const onFileSelected = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Format non supporté — JPG, PNG ou WebP uniquement");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image trop lourde — max 5MB");
      return;
    }
    setDiagnostic(null);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      if (file.size > COMPRESS_THRESHOLD) {
        const meta = await compressImage(file);
        setFileMeta(meta);
      } else {
        const base64 = await fileToBase64Raw(file);
        setFileMeta({
          base64,
          mediaType: file.type as "image/jpeg" | "image/png" | "image/webp",
        });
      }
    } catch {
      toast.error("Impossible de lire l'image");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const onAnalyze = async () => {
    if (!fileMeta) return;
    setLoading(true);
    setDiagnostic(null);
    try {
      const result = await analyze({
        data: {
          image_base64: fileMeta.base64,
          media_type: fileMeta.mediaType as "image/jpeg" | "image/png" | "image/webp",
          sector: SECTORS.find((s) => s.id === sector)!.label,
          objectif: OBJECTIFS.find((o) => o.id === objectif)!.label,
          hook_rate: hookRate ? parseFloat(hookRate) : null,
          ctr: ctr ? parseFloat(ctr) : null,
        },
      });
      setDiagnostic(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Analyse temporairement indisponible. ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!diagnostic) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Session expirée");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("audits").insert({
      user_id: u.user.id,
      sector,
      inputs: {
        module: "vision_creative",
        sector,
        objectif,
        hook_rate: hookRate ? parseFloat(hookRate) : null,
        ctr: ctr ? parseFloat(ctr) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results: { module: "vision_creative", ...diagnostic } as any,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Audit créatif sauvegardé");
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="card-cockpit p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-bold uppercase tracking-widest text-sm">Vision Créative</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Analyse IA de votre créative Meta Ads par Oracle Vision
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed transition p-8 flex flex-col items-center justify-center text-center ${
            dragOver ? "border-[#6C63FF] bg-[#6C63FF]/10" : "border-[#6C63FF]/50 bg-surface-2/50 hover:bg-surface-2"
          }`}
          style={{ minHeight: 200 }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Aperçu créative"
              className="rounded-lg object-contain"
              style={{ maxHeight: 300, width: "auto" }}
            />
          ) : (
            <>
              <Upload className="h-10 w-10 text-[#6C63FF] mb-3" />
              <div className="font-display font-bold uppercase tracking-widest text-sm">
                Déposez votre créative ici
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP — Photo ou capture vidéo
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRef.current?.click();
                }}
                className="mt-4 px-4 py-2 rounded-lg border border-border bg-surface text-xs font-display font-bold uppercase tracking-widest hover:border-primary transition inline-flex items-center gap-2"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Parcourir
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelected(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Context fields */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          <SelectField label="Secteur" value={sector} onChange={(v) => setSector(v as Sector)} options={SECTORS} />
          <SelectField label="Objectif" value={objectif} onChange={(v) => setObjectif(v as Objectif)} options={OBJECTIFS} />
          <InputField label="Hook Rate 3s" value={hookRate} onChange={setHookRate} placeholder="ex: 28" unit="%" />
          <InputField label="CTR actuel" value={ctr} onChange={setCtr} placeholder="ex: 1.2" unit="%" />
        </div>

        <button
          onClick={onAnalyze}
          disabled={!fileMeta || loading}
          className="mt-5 btn-hero w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Oracle Vision analyse votre créative…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Analyser cette créative
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {diagnostic && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <VerdictCard d={diagnostic} />

          <div className="grid grid-cols-1 gap-4">
            <AxeCard axe={diagnostic.axes.hook_visuel} />
            <AxeCard axe={diagnostic.axes.lisibilite_message} />
            <AxeCard axe={diagnostic.axes.clarte_offre} />
            <AxeCard axe={diagnostic.axes.format_mobile} />
            <AxeCard axe={diagnostic.axes.appel_action} />
          </div>

          <div
            className="rounded-xl p-5 border"
            style={{ background: "rgba(108, 99, 255, 0.15)", borderColor: "#6C63FF" }}
          >
            <div className="flex items-center gap-2 text-[#6C63FF] mb-2">
              <Zap className="h-4 w-4" />
              <div className="text-[10px] uppercase tracking-widest font-display font-bold">
                ⚡ Action prioritaire cette semaine
              </div>
            </div>
            <div className="text-sm text-white font-bold leading-relaxed">
              {diagnostic.action_prioritaire}
            </div>
          </div>

          <div
            className="rounded-xl p-5 border"
            style={{ background: "rgba(0, 229, 160, 0.1)", borderColor: "#00E5A0" }}
          >
            <div className="flex items-center gap-2 text-[#00E5A0] mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <div className="text-[10px] uppercase tracking-widest font-display font-bold">
                ✓ Conserve absolument
              </div>
            </div>
            <div className="text-sm text-foreground/90 leading-relaxed">{diagnostic.point_fort}</div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="btn-hero w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-display font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder cet audit créatif
          </button>
        </motion.div>
      )}
    </div>
  );
}

function verdictColor(v: "VERT" | "ORANGE" | "ROUGE") {
  if (v === "VERT") return "#00E5A0";
  if (v === "ORANGE") return "#FF9500";
  return "#FF3B5C";
}

function scoreColor(score: number) {
  if (score >= 9) return "#00E5A0";
  if (score >= 7) return "#A8FF78";
  if (score >= 5) return "#FF9500";
  return "#FF3B5C";
}

function VerdictCard({ d }: { d: CreativeDiagnostic }) {
  const color = verdictColor(d.verdict);
  return (
    <div className="card-cockpit p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span
            className="inline-block px-3 py-1 rounded-md text-[10px] uppercase tracking-widest font-display font-bold"
            style={{ background: color, color: "#0a0a0a" }}
          >
            Verdict {d.verdict}
          </span>
          <div className="mt-3 italic text-sm text-foreground/90 max-w-xl">{d.verdict_phrase}</div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-6xl font-bold" style={{ color }}>
            {d.score_global}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mt-1">
            Score global
          </div>
        </div>
      </div>
    </div>
  );
}

function AxeCard({ axe }: { axe: AxeScore }) {
  const color = scoreColor(axe.score);
  const pct = (axe.score / 10) * 100;
  const isWeak = axe.score < 7;
  const isStrong = axe.score >= 8;

  return (
    <div className="card-cockpit p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-widest font-display font-bold">{axe.label}</div>
        <div className="font-mono-data text-sm font-bold" style={{ color }}>
          {axe.score}/10
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-input mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{axe.analyse}</div>

      {isWeak && (
        <div
          className="mt-3 rounded-lg p-3 border"
          style={{ background: "rgba(255,59,92,0.1)", borderColor: "rgba(255,59,92,0.3)" }}
        >
          <div className="text-[10px] uppercase tracking-widest font-display font-bold text-[#FF3B5C] mb-1">
            Correction →
          </div>
          <div className="text-sm text-white leading-relaxed">{axe.correction}</div>
        </div>
      )}

      {isStrong && (
        <div
          className="mt-3 rounded-lg p-3 border"
          style={{ background: "rgba(0,229,160,0.1)", borderColor: "rgba(0,229,160,0.3)" }}
        >
          <div className="text-[10px] uppercase tracking-widest font-display font-bold text-[#00E5A0] mb-1">
            ✓ Point fort
          </div>
          <div className="text-sm text-foreground/90 leading-relaxed">{axe.correction}</div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-input/40 text-sm font-mono focus:border-primary outline-none transition"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label, value, onChange, placeholder, unit,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-input/40 focus-within:border-primary transition">
        <input
          type="number"
          step="0.1"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none text-sm font-mono-data"
        />
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
    </label>
  );
}
