import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export default function AvatarCropDialog({
  imageSrc, open, onClose, onCropped,
}: {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_: Area, p: Area) => setPixels(p), []);

  const handleSave = async () => {
    if (!pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imageSrc, pixels);
      onCropped(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Lõika profiilipilt</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[280px] bg-muted rounded-sm overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="mt-3">
          <label className="block text-[13px] mb-1">Suum</label>
          <input type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSave} disabled={busy}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-sm text-sm cursor-pointer flex-1 disabled:opacity-50">
            {busy ? "Salvestan..." : "Salvesta"}
          </button>
          <button onClick={onClose}
            className="border border-border px-4 py-1.5 rounded-sm text-sm cursor-pointer bg-background">
            Tühista
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
