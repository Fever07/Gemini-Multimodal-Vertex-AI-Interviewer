import React, { useEffect, useRef } from 'react';
import { VIDEO_ASSETS } from '../constants';

interface AvatarProps {
  isTalking: boolean;
  isActive: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ isTalking, isActive }) => {
  const listeningVideoRef = useRef<HTMLVideoElement>(null);
  const talkingVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive) {
      const playVideo = async (ref: React.RefObject<HTMLVideoElement | null>) => {
        try {
          if (ref.current) {
            await ref.current.play();
          }
        } catch (err) {
          console.warn("Video playback failed:", err);
        }
      };
      
      playVideo(listeningVideoRef);
      playVideo(talkingVideoRef);
    } else {
      listeningVideoRef.current?.pause();
      talkingVideoRef.current?.pause();
    }
  }, [isActive]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900">
      {/* Listening Loop (Default / Bottom Layer) */}
      <video
        ref={listeningVideoRef}
        src={VIDEO_ASSETS.LISTENING}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out"
        style={{ opacity: 1 }} // Always visible, covered by talking layer
      />

      {/* Talking Loop (Top Layer) */}
      <video
        ref={talkingVideoRef}
        src={VIDEO_ASSETS.TALKING}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ease-in-out"
        style={{ opacity: isTalking ? 1 : 0 }}
      />
      
      {/* Overlay to darken slightly for text contrast if needed */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      
      <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
         <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider transition-colors duration-300 ${isTalking ? 'bg-green-500/80 text-white' : 'bg-white/10 text-white/50'}`}>
            {isTalking ? 'INTERVIEWER SPEAKING' : 'LISTENING TO CANDIDATE'}
         </span>
      </div>
    </div>
  );
};