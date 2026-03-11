import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Image as ImageIcon,
  LayoutGrid,
  Paintbrush,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useCallback, useState } from "react";

export type WallpaperConfig = {
  type: "none" | "gradient" | "pattern" | "image";
  value: string; // CSS gradient string, pattern class key, or data URL
  label: string;
  overlay: "dark" | "light" | "none";
};

const WALLPAPER_KEY = "melina_chat_wallpaper";

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  type: "none",
  value: "",
  label: "Default Theme",
  overlay: "none",
};

export function loadWallpaper(): WallpaperConfig {
  try {
    const saved = localStorage.getItem(WALLPAPER_KEY);
    if (saved) return JSON.parse(saved) as WallpaperConfig;
  } catch {}
  return DEFAULT_WALLPAPER;
}

export function saveWallpaper(config: WallpaperConfig) {
  try {
    localStorage.setItem(WALLPAPER_KEY, JSON.stringify(config));
  } catch {}
}

const GRADIENTS: WallpaperConfig[] = [
  {
    type: "gradient",
    value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    label: "Deep Space",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
    label: "Midnight Blue",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #200122, #6f0000)",
    label: "Crimson Dusk",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #0d0d0d, #1a0a0a, #2d0a0a)",
    label: "Melina Red",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #003300, #004d00, #001a00)",
    label: "Matrix Green",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #141414, #1e1e2e, #2a2a3e)",
    label: "HUD Dark",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #667eea, #764ba2)",
    label: "Violet Dream",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #f093fb, #f5576c)",
    label: "Pink Sunset",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #4facfe, #00f2fe)",
    label: "Arctic Sky",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #43e97b, #38f9d7)",
    label: "Emerald",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #fa709a, #fee140)",
    label: "Sunrise",
    overlay: "dark",
  },
  {
    type: "gradient",
    value: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    label: "Lavender",
    overlay: "dark",
  },
];

const PATTERNS: WallpaperConfig[] = [
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
    label: "Diagonal Lines",
    overlay: "dark",
  },
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ffffff' fill-opacity='0.07'/%3E%3C/svg%3E")`,
    label: "Dot Grid",
    overlay: "dark",
  },
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3Cpath d='M30 0v60M0 30h60'/%3E%3C/g%3E%3C/svg%3E")`,
    label: "Grid",
    overlay: "dark",
  },
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66zm0-2l26-14.9V18L28 2 2 18v31.1L28 64z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
    label: "Hexagons",
    overlay: "dark",
  },
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ff4444' fill-opacity='0.04'%3E%3Ccircle cx='40' cy='40' r='2'/%3E%3Ccircle cx='0' cy='0' r='2'/%3E%3Ccircle cx='80' cy='0' r='2'/%3E%3Ccircle cx='0' cy='80' r='2'/%3E%3Ccircle cx='80' cy='80' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
    label: "Red Dots",
    overlay: "dark",
  },
  {
    type: "pattern",
    value: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%234444ff' stroke-opacity='0.06' stroke-width='1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/svg%3E")`,
    label: "Waves",
    overlay: "dark",
  },
];

const UNSPLASH_PHOTOS: { id: string; label: string }[] = [
  { id: "1419242902818-48554168e518", label: "Starry Night" },
  { id: "1506905925346-21bda4d32df4", label: "Mountains" },
  { id: "1518020382113-a7e8fc38eac9", label: "Galaxy" },
  { id: "1475924156734-496f6cac6ec1", label: "Aurora" },
  { id: "1501854140801-50d01698950b", label: "Aerial Forest" },
  { id: "1464822759023-fed622ff2c3b", label: "Forest Path" },
  { id: "1507525428034-b723cf961d3e", label: "Beach Sunset" },
  { id: "1441974231531-c6227db76b6e", label: "Forest Light" },
  { id: "1493246507139-91e8fad9978e", label: "Mountain Lake" },
  { id: "1518791841217-8f162f1912da", label: "Serene Cat" },
  { id: "1558618666-fcd25c85cd64", label: "Cyberpunk City" },
  { id: "1477959858617-67f85cf4f1df", label: "City Skyline" },
  { id: "1480714378702-abb713d0949c", label: "Night City" },
  { id: "1519501025264-65ba15a82390", label: "Architecture" },
  { id: "1682686581740-2c5f76eb86b7", label: "Abstract" },
  { id: "1579546929518-9e396f3cc809", label: "Gradient Abstract" },
  { id: "1558591710-4b4a1ae0f148", label: "Dark Mountains" },
  { id: "1544716278-ca5e3f4abd8c", label: "Forest Dark" },
  { id: "1542401886-e574ba21b771", label: "Space" },
  { id: "1451187580459-43490279c0fa", label: "Earth from Space" },
];

function unsplashThumb(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=400&q=70&auto=format`;
}

function unsplashFull(id: string) {
  return `url("https://images.unsplash.com/photo-${id}?w=1920&q=80&auto=format")`;
}

function GalleryTab({
  preview,
  onSelect,
}: {
  preview: WallpaperConfig;
  onSelect: (config: WallpaperConfig) => void;
}) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const isSelected = (id: string) =>
    preview.type === "image" && preview.value === unsplashFull(id);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {UNSPLASH_PHOTOS.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            data-ocid={`wallpaper.gallery.item.${i + 1}`}
            onClick={() =>
              onSelect({
                type: "image",
                value: unsplashFull(photo.id),
                label: photo.label,
                overlay: "dark",
              })
            }
            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected(photo.id)
                ? "border-primary shadow-lg shadow-primary/30"
                : "border-border/40 hover:border-border"
            }`}
          >
            {/* Skeleton shown until image loads */}
            {!loaded[photo.id] && (
              <Skeleton className="absolute inset-0 rounded-none" />
            )}
            <img
              src={unsplashThumb(photo.id)}
              alt={photo.label}
              loading="lazy"
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                loaded[photo.id] ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() =>
                setLoaded((prev) => ({ ...prev, [photo.id]: true }))
              }
            />
            {/* Label */}
            <div className="absolute inset-0 flex items-end p-1.5 pointer-events-none">
              <span className="text-[9px] text-white/90 font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-full">
                {photo.label}
              </span>
            </div>
            {/* Selected checkmark */}
            {isSelected(photo.id) && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Unsplash attribution */}
      <p className="text-[10px] text-muted-foreground text-center py-1">
        Photos from{" "}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Unsplash
        </a>
      </p>
    </div>
  );
}

function WallpaperSwatch({
  config,
  selected,
  onClick,
}: {
  config: WallpaperConfig;
  selected: boolean;
  onClick: () => void;
}) {
  const bgStyle: React.CSSProperties =
    config.type === "none"
      ? { background: "var(--background)" }
      : config.type === "gradient"
        ? { background: config.value }
        : config.type === "pattern"
          ? { backgroundColor: "#1a1a2e", backgroundImage: config.value }
          : {
              backgroundImage: config.value,
              backgroundSize: "cover",
              backgroundPosition: "center",
            };

  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid="wallpaper.swatch_button"
      className={`relative w-full aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
        selected
          ? "border-primary shadow-lg shadow-primary/30"
          : "border-border/40 hover:border-border"
      }`}
      style={bgStyle}
    >
      <div className="absolute inset-0 flex items-end p-1.5">
        <span className="text-[10px] text-white/90 font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-full">
          {config.label}
        </span>
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

interface WallpaperPickerProps {
  current: WallpaperConfig;
  onApply: (config: WallpaperConfig) => void;
}

export function WallpaperPicker({ current, onApply }: WallpaperPickerProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<WallpaperConfig>(current);
  const [uploadError, setUploadError] = useState("");

  const handleApply = () => {
    onApply(preview);
    saveWallpaper(preview);
    setOpen(false);
  };

  const handleReset = () => {
    setPreview(DEFAULT_WALLPAPER);
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview({
        type: "image",
        value: `url("${dataUrl}")`,
        label: file.name.replace(/\.[^.]+$/, ""),
        overlay: "dark",
      });
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPreview(current);
          setOpen(true);
        }}
        data-ocid="wallpaper.open_modal_button"
        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        title="Change wallpaper"
      >
        <Paintbrush className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          data-ocid="wallpaper.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-primary" />
              Chat Wallpaper
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
            {/* Preview strip */}
            <div
              className="relative rounded-lg overflow-hidden h-24 flex-shrink-0 border border-border/40"
              style={
                preview.type === "none"
                  ? { background: "var(--background)" }
                  : preview.type === "gradient"
                    ? { background: preview.value }
                    : ({
                        backgroundColor: "#1a1a2e",
                        backgroundImage:
                          preview.type === "pattern"
                            ? preview.value
                            : undefined,
                        backgroundImage2:
                          preview.type === "image" ? preview.value : undefined,
                      } as React.CSSProperties)
              }
            >
              {preview.type === "image" && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: preview.value,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              {preview.overlay === "dark" && (
                <div className="absolute inset-0 bg-black/25" />
              )}
              {preview.overlay === "light" && (
                <div className="absolute inset-0 bg-white/20" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col gap-1.5">
                  <div className="self-start bg-white/15 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-2xl rounded-bl-sm border border-white/10 max-w-[180px]">
                    Hey! How are you?
                  </div>
                  <div className="self-end bg-primary/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-2xl rounded-br-sm max-w-[180px]">
                    I&apos;m doing great, thanks!
                  </div>
                </div>
              </div>
              <div className="absolute bottom-1.5 left-2 text-[10px] text-white/60">
                Preview — {preview.label}
              </div>
            </div>

            <Tabs
              defaultValue="gradients"
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <TabsList
                className="flex-shrink-0 grid grid-cols-4 w-full"
                data-ocid="wallpaper.tab"
              >
                <TabsTrigger
                  value="gradients"
                  data-ocid="wallpaper.gradients_tab"
                >
                  Gradients
                </TabsTrigger>
                <TabsTrigger
                  value="patterns"
                  data-ocid="wallpaper.patterns_tab"
                >
                  Patterns
                </TabsTrigger>
                <TabsTrigger value="upload" data-ocid="wallpaper.upload_tab">
                  My Photo
                </TabsTrigger>
                <TabsTrigger
                  value="gallery"
                  data-ocid="wallpaper.gallery_tab"
                  className="gap-1"
                >
                  <LayoutGrid className="w-3 h-3" />
                  Gallery
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-3 min-h-0">
                <TabsContent value="gradients" className="mt-0">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* Default option */}
                    <WallpaperSwatch
                      config={DEFAULT_WALLPAPER}
                      selected={preview.type === "none"}
                      onClick={() => setPreview(DEFAULT_WALLPAPER)}
                    />
                    {GRADIENTS.map((g) => (
                      <WallpaperSwatch
                        key={g.label}
                        config={g}
                        selected={
                          preview.type === "gradient" &&
                          preview.value === g.value
                        }
                        onClick={() => setPreview(g)}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="patterns" className="mt-0">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {PATTERNS.map((p) => (
                      <WallpaperSwatch
                        key={p.label}
                        config={p}
                        selected={
                          preview.type === "pattern" &&
                          preview.value === p.value
                        }
                        onClick={() => setPreview(p)}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-0">
                  <div className="flex flex-col items-center gap-4 py-4">
                    <label
                      htmlFor="wallpaper-upload"
                      data-ocid="wallpaper.upload_button"
                      className="flex flex-col items-center gap-3 w-full max-w-xs p-8 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Upload from gallery
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WEBP up to 5 MB
                        </p>
                      </div>
                      <input
                        id="wallpaper-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                        data-ocid="wallpaper.dropzone"
                      />
                    </label>
                    {uploadError && (
                      <p
                        className="text-xs text-destructive"
                        data-ocid="wallpaper.error_state"
                      >
                        {uploadError}
                      </p>
                    )}
                    {preview.type === "image" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ImageIcon className="w-3 h-3" />
                        <span>{preview.label} selected</span>
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="gallery" className="mt-0">
                  <GalleryTab preview={preview} onSelect={setPreview} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/40 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              data-ocid="wallpaper.reset_button"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                data-ocid="wallpaper.cancel_button"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                data-ocid="wallpaper.save_button"
                className="gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChatWallpaperOverlay({ config }: { config: WallpaperConfig }) {
  if (config.type === "none") return null;

  const bgStyle: React.CSSProperties =
    config.type === "gradient"
      ? { background: config.value }
      : config.type === "pattern"
        ? { backgroundColor: "#1a1a2e", backgroundImage: config.value }
        : {
            backgroundImage: config.value,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "local",
          };

  return (
    <>
      {/* Wallpaper base layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={bgStyle}
        data-ocid="wallpaper.canvas_target"
      />
      {/* Readability overlay */}
      {config.overlay === "dark" && (
        <div className="absolute inset-0 pointer-events-none bg-black/30" />
      )}
      {config.overlay === "light" && (
        <div className="absolute inset-0 pointer-events-none bg-white/20" />
      )}
    </>
  );
}
