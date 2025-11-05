import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { eventAPI } from "@/lib/api";
import { toast } from "sonner";

export default function EventAgreementSign() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [companySign, setCompanySign] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await eventAPI.getById(id!);
        setEvent(res.data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = () => setIsDrawing(false);
  const clearSign = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };

  const handleUploadCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCompanySign(String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      const clientSign = canvasRef.current?.toDataURL();
      const payload: any = { clientSign, companySign };
      await eventAPI.saveAgreement(id!, payload);
      toast.success("Signatures saved");
      navigate(-1);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to save signatures");
    }
  };

  if (loading || !event) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Agreement e-Sign</h1>
      <Card>
        <CardHeader>
          <CardTitle>Client e-Sign</CardTitle>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="border rounded-md w-full"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
          />
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={clearSign}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Sign</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleUploadCompany}
          />
          {companySign && (
            <img
              src={companySign}
              className="mt-2 h-24 object-contain"
              alt="Company sign"
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button onClick={save}>Save Signatures</Button>
      </div>
    </div>
  );
}
