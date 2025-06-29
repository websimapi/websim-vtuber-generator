const { useState, useEffect, useRef, memo } = React;

const CameraSection = memo(({ isCameraActive, setIsCameraActive, trackingData, videoRef, canvasRef }) => (
    <div className="camera-section">
        <h2>🎥 Live Animation</h2>
        <div className="camera-controls">
            <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`camera-btn ${isCameraActive ? 'active' : ''}`}
            >
                {isCameraActive ? '🔴 Stop Camera' : '📹 Start Camera'}
            </button>
            <div className="camera-status">
                {isCameraActive ? (
                    trackingData?.faceLandmarks ?
                        '✅ Face tracking active' :
                        '⏳ Initializing tracking...'
                ) : (
                    '⚫ Camera off'
                )}
            </div>
        </div>

        {isCameraActive && (
            <div className="camera-container">
                <div className="video-container">
                    <video
                        ref={videoRef}
                        className="video-feed"
                        autoPlay
                        muted
                        playsInline
                    />
                    <canvas
                        ref={canvasRef}
                        className="tracking-overlay"
                    />
                </div>
            </div>
        )}
    </div>
));

function useHolistic(isCameraActive) {
    const [trackingData, setTrackingData] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const holisticRef = useRef(null);
    const cameraRef = useRef(null);

    const drawLandmarks = (ctx, landmarks, color, size) => {
        if (!landmarks) return;
        ctx.fillStyle = color;
        landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, size, 0, 2 * Math.PI);
            ctx.fill();
        });
    };

    const onHolisticResults = (results) => {
        setTrackingData(results);

        if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 3) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (canvas.width !== videoRef.current.videoWidth || canvas.height !== videoRef.current.videoHeight) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Don't draw video to canvas, keep it separate to avoid flicker and use video-feed CSS
            // ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            if (results.faceLandmarks) drawLandmarks(ctx, results.faceLandmarks, 'rgba(255, 107, 107, 0.7)', 1);
            if (results.poseLandmarks) drawLandmarks(ctx, results.poseLandmarks, 'rgba(69, 183, 209, 0.7)', 2);
        }
    };
    
    useEffect(() => {
        const initializeCamera = async () => {
            if (!videoRef.current) return;
            try {
                const holistic = new Holistic({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
                });
                holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    refineFaceLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                holistic.onResults(onHolisticResults);
                holisticRef.current = holistic;

                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        if (holisticRef.current && videoRef.current && videoRef.current.readyState >= 3) {
                            await holisticRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 640,
                    height: 480
                });
                cameraRef.current = camera;
                await camera.start();
            } catch (error) {
                console.error('Error initializing camera:', error);
            }
        };
        
        const stopCamera = () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
                cameraRef.current = null;
            }
            if (holisticRef.current) {
                holisticRef.current.close();
                holisticRef.current = null;
            }
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
            }
            setTrackingData(null);
        };

        if (isCameraActive) {
            initializeCamera();
        } else {
            stopCamera();
        }

        return () => stopCamera();
    }, [isCameraActive]);

    return { trackingData, videoRef, canvasRef };
}
