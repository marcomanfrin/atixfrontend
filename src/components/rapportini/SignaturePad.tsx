import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eraser, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number; pressure: number };
type Stroke = Point[];

export interface SignaturePadHandle {
  /** PNG data URL of the signature, or null when nothing has been drawn */
  toDataUrl: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

const LINE_WIDTH = 2.4;

// Signature capture shared by the technician wizard and the public signing page.
// Pointer events cover finger, stylus and mouse; the canvas is scaled by devicePixelRatio
// so strokes stay sharp on high-density screens. Strokes are kept as vectors, which makes
// undo trivial and lets us redraw after a resize.
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onChange, disabled = false, invalid = false, className }, ref) => {
    const { t } = useTranslation('reports');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentRef = useRef<Stroke | null>(null);
    const [strokeCount, setStrokeCount] = useState(0);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a2e4a';
      for (const stroke of strokesRef.current) {
        drawStroke(ctx, stroke);
      }
    }, []);

    const resize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    }, [redraw]);

    useEffect(() => {
      resize();
      const observer = new ResizeObserver(resize);
      if (canvasRef.current) observer.observe(canvasRef.current);
      return () => observer.disconnect();
    }, [resize]);

    const notify = (count: number) => {
      setStrokeCount(count);
      onChange?.(count === 0);
    };

    const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        // mouse reports 0.5 constantly; touch without force support reports 0
        pressure: event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5,
      };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      currentRef.current = [pointFrom(event)];
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const stroke = currentRef.current;
      if (!stroke || disabled) return;
      event.preventDefault();
      stroke.push(pointFrom(event));
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawStroke(ctx, stroke.slice(-2));
    };

    const handlePointerUp = () => {
      const stroke = currentRef.current;
      currentRef.current = null;
      if (!stroke) return;
      // a single tap counts as a dot
      if (stroke.length === 1) stroke.push({ ...stroke[0], x: stroke[0].x + 0.1 });
      strokesRef.current = [...strokesRef.current, stroke];
      redraw();
      notify(strokesRef.current.length);
    };

    const undo = () => {
      strokesRef.current = strokesRef.current.slice(0, -1);
      redraw();
      notify(strokesRef.current.length);
    };

    const clear = useCallback(() => {
      strokesRef.current = [];
      redraw();
      notify(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [redraw]);

    useImperativeHandle(ref, () => ({
      toDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;
        return canvas.toDataURL('image/png');
      },
      clear,
      isEmpty: () => strokesRef.current.length === 0,
    }), [clear]);

    return (
      <div className={cn('space-y-2', className)}>
        <div
          className={cn(
            'relative rounded-md border-2 border-dashed bg-white',
            invalid ? 'border-destructive' : 'border-muted-foreground/30',
            disabled && 'opacity-60',
          )}
        >
          <canvas
            ref={canvasRef}
            className="block h-48 w-full touch-none cursor-crosshair sm:h-56"
            aria-label={t('signature.padLabel')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={(e) => { if (currentRef.current && e.buttons === 0) handlePointerUp(); }}
          />
          {strokeCount === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t('signature.placeholder')}
            </span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={disabled || strokeCount === 0}>
            <Undo2 className="mr-1 h-4 w-4" />
            {t('signature.undo')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clear} disabled={disabled || strokeCount === 0}>
            <Eraser className="mr-1 h-4 w-4" />
            {t('signature.clear')}
          </Button>
        </div>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.length < 2) return;
  for (let i = 1; i < stroke.length; i++) {
    const from = stroke[i - 1];
    const to = stroke[i];
    ctx.lineWidth = LINE_WIDTH * (0.6 + to.pressure * 0.8);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
}
