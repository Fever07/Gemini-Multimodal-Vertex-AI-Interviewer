import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isConnected: boolean;
  volume: number; // 0 to 1
}

export const Visualizer: React.FC<VisualizerProps> = ({ isConnected, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let currentHeight = 0;

    const render = () => {
      // Smooth interpolation
      const targetHeight = volume * canvas.height * 3; // Amplify
      currentHeight += (targetHeight - currentHeight) * 0.2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isConnected) {
        ctx.fillStyle = '#4285f4'; // Google Blue
        const barWidth = 4;
        const gap = 2;
        const totalBars = Math.floor(canvas.width / (barWidth + gap));
        
        for (let i = 0; i < totalBars; i++) {
           // Create a wave effect based on time and index
           const offset = Math.sin(Date.now() * 0.01 + i * 0.5) * 10;
           const h = Math.max(2, currentHeight + offset);
           
           const x = i * (barWidth + gap);
           const y = (canvas.height - h) / 2;
           
           // Opacity based on distance from center for a localized glow effect
           const center = totalBars / 2;
           const dist = Math.abs(i - center);
           const opacity = Math.max(0.2, 1 - (dist / center));
           
           ctx.globalAlpha = opacity;
           ctx.fillRect(x, y, barWidth, h);
        }
      } else {
        // Flat line when disconnected
        ctx.fillStyle = '#333';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isConnected, volume]);

  return <canvas ref={canvasRef} width={200} height={40} className="w-full h-full" />;
};
