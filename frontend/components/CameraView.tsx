
import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageData: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isReady, setIsReady] = useState(false);

  const capture = useCallback(() => {
    // Menggunakan resolusi tinggi 1200x1600 (3:4) untuk hasil foto yang pas
    const imageSrc = webcamRef.current?.getScreenshot({ width: 1200, height: 1600 });
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const videoConstraints = {
    width: { ideal: 1200 }, // Sesuaikan dengan resolusi yang diinginkan
    height: { ideal: 1600 },
    aspectRatio: 3/4,
    facingMode: "user",
  };

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-[3/4] max-w-[320px] mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
      <Webcam
        audio={false}
        ref={webcamRef as any}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={() => setIsReady(true)}
        mirrored={true}
        screenshotQuality={0.95} 
        disablePictureInPicture={true}
        forceScreenshotSourceSize={true} // Pastikan resolusi sesuai batasan
        imageSmoothing={true}
        className="w-full h-full object-cover"
        onUserMediaError={(err) => {
          console.error("Webcam Error:", err);
          alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
        }}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 z-10">
          <RefreshCw className="animate-spin mb-4 text-rose-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Menyiapkan Kamera...</p>
        </div>
      )}

      {isReady && (
        <>
          <div className="absolute top-6 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_#f43f5e]"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Selfie Mode Active</span>
            </div>
          </div>

          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-6 z-20">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full">
              Posisikan Wajah di Tengah
            </p>
            
            <button
              onClick={capture}
              className="relative group p-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95"
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
                 <div className="w-[72px] h-[72px] rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center text-white transition-transform group-hover:scale-90">
                       <Camera size={28} strokeWidth={2.5} />
                    </div>
                 </div>
              </div>
            </button>
          </div>
        </>
      )}
      
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[75%] border-2 border-dashed border-white/20 rounded-[3rem]"></div>
      </div>
    </div>
  );
};

export default CameraView;
