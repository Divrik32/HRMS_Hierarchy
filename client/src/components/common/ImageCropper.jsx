
import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const SUPPORTED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });

const getCroppedImage = async (imageSrc, pixelCrop, file) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const mimeType = file.type;
  const quality = mimeType === "image/png" ? undefined : 0.92;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Image cropping failed."));
      },
      mimeType,
      quality
    );
  });

  const extension = SUPPORTED_TYPES[mimeType];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  return new File([blob], `${baseName}-cropped.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
};

const ImageCropper = ({ file, onCancel, onCrop }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCrop = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    try {
      setSaving(true);

      const croppedFile = await getCroppedImage(
        imageUrl,
        croppedAreaPixels,
        file
      );

      onCrop(croppedFile);
    } catch (error) {
      console.error("Image crop error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Crop Image
          </h2>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative h-[350px] w-full bg-slate-900">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <ZoomOut size={18} className="text-slate-500" />

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-blue-600"
            />

            <ZoomIn size={18} className="text-slate-500" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCrop}
                disabled={saving || !croppedAreaPixels}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Cropping..." : "Crop & Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
